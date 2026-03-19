/**
 * paymentService.js
 *
 * Razorpay payout integration for GeoServe.
 *
 * Exports two public functions:
 *  - processWorkerPayout(booking, worker)   — single payout to worker's bank
 *  - processSplitPayment(booking, worker)   — split: 95% worker + 5% admin wallet
 *
 * SIMULATION mode (default, no API keys): returns synthetic objects.
 * LIVE mode: set RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET + RAZORPAY_ACCOUNT_NUMBER.
 */

const https = require("https");
const { processAdminCommission, calculateSplit } = require("./commissionService");

// ─── Config ──────────────────────────────────────────────────────────────────
const KEY_ID     = process.env.RAZORPAY_KEY_ID     || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const FROM_ACCT  = process.env.RAZORPAY_ACCOUNT_NUMBER || "SIMULATED_ACCT";
const LIVE_MODE  = !!(KEY_ID && KEY_SECRET);

// ─── Low-level Razorpay HTTP ──────────────────────────────────────────────────
function rzpRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
    const opts = {
      hostname: "api.razorpay.com",
      path,
      method,
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Basic ${auth}`,
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(raw);
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject(new Error(parsed?.error?.description || `Razorpay error ${res.statusCode}`));
        } catch { reject(new Error("Failed to parse Razorpay response")); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

// ─── Simulation helpers ───────────────────────────────────────────────────────
function simPayoutId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

// ─── Fund Account (Razorpay live only) ───────────────────────────────────────
async function getOrCreateFundAccount(worker) {
  if (!worker.payoutAccount?.accountNumber || !worker.payoutAccount?.ifscCode)
    throw new Error("Worker has not set up a payout account.");

  const contact = await rzpRequest("POST", "/v1/contacts", {
    name:         worker.name,
    email:        worker.email || "",
    contact:      worker.phone || "",
    type:         "vendor",
    reference_id: `worker_${worker.id}`,
  });

  const fundAccount = await rzpRequest("POST", "/v1/fund_accounts", {
    contact_id:   contact.id,
    account_type: "bank_account",
    bank_account: {
      name:           worker.payoutAccount.accountHolderName || worker.name,
      ifsc:           worker.payoutAccount.ifscCode.toUpperCase(),
      account_number: worker.payoutAccount.accountNumber,
    },
  });

  return fundAccount.id;
}

// ─── Worker payout ────────────────────────────────────────────────────────────
/**
 * processWorkerPayout(booking, worker, amount)
 *
 * Transfers `amount` INR to the worker's bank via IMPS.
 * If amount is omitted, uses booking.serviceCost (worker's full service fee).
 */
async function processWorkerPayout(booking, worker, amount) {
  const payoutAmount = amount !== undefined ? amount : (booking.serviceCost || booking.cost);

  if (!LIVE_MODE) {
    const txnId = simPayoutId("SIM_WRK");
    console.log(
      `[PaymentService] SIMULATION — worker payout to ${worker.name}: ` +
      `₹${payoutAmount} (booking #${booking.id}) | txn: ${txnId}`
    );
    return {
      transactionId: txnId,
      status:        "processed",
      processedAt:   new Date().toISOString(),
      amount:        payoutAmount,
    };
  }

  const fundAccountId = await getOrCreateFundAccount(worker);

  const payout = await rzpRequest("POST", "/v1/payouts", {
    account_number:       FROM_ACCT,
    fund_account_id:      fundAccountId,
    amount:               Math.round(payoutAmount * 100),    // paise
    currency:             "INR",
    mode:                 "IMPS",
    purpose:              "payout",
    queue_if_low_balance: true,
    reference_id:         `booking_worker_${booking.id}`,   // idempotency at Razorpay
    narration:            `GeoServe #${booking.id} — ${booking.workerName}`,
    notes: {
      bookingId:   String(booking.id),
      workerId:    String(worker.id),
      type:        "worker_payout",
    },
  });

  return {
    transactionId: payout.id,
    status:        payout.status,
    processedAt:   new Date().toISOString(),
    amount:        payoutAmount,
  };
}

// ─── Split Payment (main entry point for booking confirm) ─────────────────────
/**
 * processSplitPayment(booking, worker)
 *
 * The single function called from POST /bookings/:id/confirm.
 * Orchestrates the full 95/5 split:
 *   Step 1 → Pay worker `serviceCost` via Razorpay IMPS
 *   Step 2 → Credit admin wallet `platformFee` (commission capture)
 *
 * If worker payout succeeds but admin credit fails, the booking is still
 * marked confirmed (worker was paid) and the commission is flagged as
 * "pending_retry" so admin can reconcile manually.
 *
 * @returns {Object} {
 *   worker:  { transactionId, status, amount },
 *   admin:   { adminTransactionId, commissionStatus, adminCommission },
 *   split:   { workerPayout, adminCommission, total, rate },
 *   mode,
 * }
 */
async function processSplitPayment(booking, worker) {
  const mode  = LIVE_MODE ? "live" : "simulation";
  const split = calculateSplit(booking);

  // ── Step 1: Worker Payout ─────────────────────────────────────────────────
  const workerResult = await processWorkerPayout(booking, worker, split.workerPayout);

  // ── Step 2: Admin Commission ──────────────────────────────────────────────
  let adminResult;
  try {
    adminResult = processAdminCommission(booking, mode);
  } catch (adminErr) {
    // Worker already paid — don't fail the whole confirm, flag commission
    console.error(
      `[PaymentService] Admin commission FAILED for booking #${booking.id}:`,
      adminErr.message,
      "— worker payout was already sent."
    );
    adminResult = {
      adminTransactionId: null,
      commissionStatus:   "pending_retry",
      adminCommission:    split.adminCommission,
      workerPayout:       split.workerPayout,
      commissionRate:     split.rate,
      split,
    };
  }

  console.log(
    `[PaymentService] Split complete — booking #${booking.id} | ` +
    `worker: ₹${split.workerPayout} (${workerResult.transactionId}) | ` +
    `admin: ₹${split.adminCommission} (${adminResult.adminTransactionId || "N/A"}) | ` +
    `mode: ${mode}`
  );

  return {
    worker:  workerResult,
    admin:   adminResult,
    split,
    mode,
  };
}

function isSimulationMode() { return !LIVE_MODE; }

module.exports = { processSplitPayment, processWorkerPayout, isSimulationMode };
