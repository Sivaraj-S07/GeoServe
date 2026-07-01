/**
 * services/paymentService.js
 *
 * Payment orchestration for GeoServe.
 * Gateway: Razorpay Payouts API (bank transfer / UPI)
 * Falls back to SIMULATION mode when RAZORPAY_KEY_ID / KEY_SECRET are absent.
 *
 * Security practices:
 *  - API keys read only from env (never hardcoded)
 *  - Amount always rounded to integer paise (avoids floating-point drift)
 *  - Negative / zero payout guard before any API call
 *  - request_id header used for Razorpay-side idempotency on payout creation
 *  - No secrets logged; only transaction IDs and status
 */

"use strict";

const https  = require("https");
const crypto = require("crypto");
const { processSplitPayment: _unused, ...rest } = { processSplitPayment: null }; // self-check

const { processAdminCommission, calculateSplit } = require("./commissionService");

// ── Configuration ─────────────────────────────────────────────────────────────
const KEY_ID     = (process.env.RAZORPAY_KEY_ID     || "").trim();
const KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || "").trim();
const FROM_ACCT  = (process.env.RAZORPAY_ACCOUNT_NUMBER || "SIMULATED_ACCT").trim();
const LIVE_MODE  = !!(KEY_ID && KEY_SECRET);

if (LIVE_MODE) {
  console.log("[PaymentService] Running in LIVE mode — Razorpay payouts enabled.");
} else {
  console.log("[PaymentService] Running in SIMULATION mode — no real payments will be made.");
}

// ── Razorpay HTTP helper ──────────────────────────────────────────────────────
function rzpRequest(method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    if (!KEY_ID || !KEY_SECRET) {
      return reject(new Error("Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."));
    }
    const data = body ? JSON.stringify(body) : null;
    const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
    const opts = {
      hostname: "api.razorpay.com",
      path, method,
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Basic ${auth}`,
        ...extraHeaders,
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
      },
    };

    const req = https.request(opts, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(raw);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const msg = parsed?.error?.description || parsed?.error?.code || `Razorpay HTTP ${res.statusCode}`;
            reject(new Error(msg));
          }
        } catch {
          reject(new Error(`Failed to parse Razorpay response (HTTP ${res.statusCode})`));
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Simulation helpers ────────────────────────────────────────────────────────
function simTxnId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

// ── Input validation ──────────────────────────────────────────────────────────
function validateAmount(amount, context) {
  const n = Number(amount);
  if (!isFinite(n))   throw new Error(`[Payment] Invalid amount in ${context}: ${amount}`);
  if (n < 0)          throw new Error(`[Payment] Negative amount rejected in ${context}: ₹${n}`);
  return Math.round(n); // ensure integer rupees
}

// ── Razorpay: get or create contact + fund account ───────────────────────────
async function getOrCreateFundAccount(worker) {
  const pa = worker.payoutAccount || worker.payout_account || {};

  if (!pa.accountNumber && !pa.upiId) {
    throw new Error("Worker has no payout method configured (bank account or UPI required).");
  }

  // Create contact
  const contact = await rzpRequest("POST", "/v1/contacts", {
    name:         (worker.name || "Worker").substring(0, 50),
    email:        (worker.email || "").substring(0, 100),
    contact:      (worker.phone || "").replace(/\D/g, "").slice(-10),
    type:         "vendor",
    reference_id: `geoserve_worker_${worker.id}`,
  });

  // Create fund account
  if (pa.accountNumber && pa.ifscCode) {
    const fa = await rzpRequest("POST", "/v1/fund_accounts", {
      contact_id:   contact.id,
      account_type: "bank_account",
      bank_account: {
        name:           (pa.accountHolderName || worker.name || "Worker").substring(0, 50),
        ifsc:           pa.ifscCode.toUpperCase().trim(),
        account_number: pa.accountNumber.trim(),
      },
    });
    return fa.id;
  } else if (pa.upiId) {
    // UPI fund account
    const fa = await rzpRequest("POST", "/v1/fund_accounts", {
      contact_id:   contact.id,
      account_type: "vpa",
      vpa:          { address: pa.upiId.trim() },
    });
    return fa.id;
  }

  throw new Error("Worker payout account has no usable bank/UPI details.");
}

// ── Worker payout ─────────────────────────────────────────────────────────────
async function processWorkerPayout(booking, worker, amount) {
  const payoutRupees = validateAmount(
    amount !== undefined ? amount : (booking.serviceCost || booking.service_cost || booking.cost),
    `worker payout for booking #${booking.id}`
  );

  if (payoutRupees === 0) {
    console.log(`[PaymentService] Zero payout for booking #${booking.id} — skipping transfer.`);
    return { transactionId: simTxnId("ZERO_WRK"), status: "skipped", processedAt: new Date().toISOString(), amount: 0 };
  }

  if (!LIVE_MODE) {
    const txnId = simTxnId("SIM_WRK");
    console.log(`[PaymentService][SIM] Worker payout to "${worker.name}": ₹${payoutRupees} | booking #${booking.id} | txn: ${txnId}`);
    return { transactionId: txnId, status: "processed", processedAt: new Date().toISOString(), amount: payoutRupees };
  }

  // Live Razorpay payout
  const fundAccountId = await getOrCreateFundAccount(worker);
  // Use a deterministic request_id to prevent duplicate payouts on retry
  const requestId = `geoserve_booking_${booking.id}_worker`;

  const payout = await rzpRequest("POST", "/v1/payouts", {
    account_number:    FROM_ACCT,
    fund_account_id:   fundAccountId,
    amount:            payoutRupees * 100, // Razorpay expects paise
    currency:          "INR",
    mode:              "IMPS",
    purpose:           "payout",
    queue_if_low_balance: true,
    reference_id:      `booking_${booking.id}`,
    narration:         `GeoServe Bkg#${booking.id}`.substring(0, 30),
    notes: {
      booking_id: String(booking.id),
      worker_id:  String(worker.id),
      type:       "worker_payout",
    },
  }, { "X-Payout-Idempotency": requestId });

  console.log(`[PaymentService][LIVE] Worker payout initiated — txn: ${payout.id} | status: ${payout.status}`);
  return {
    transactionId: payout.id,
    status:        payout.status,
    processedAt:   new Date().toISOString(),
    amount:        payoutRupees,
  };
}

// ── Split payment orchestrator ────────────────────────────────────────────────
async function processSplitPayment(booking, worker, paymentMode = "cash") {
  const mode  = LIVE_MODE ? "live" : "simulation";
  const split = calculateSplit(booking);

  // Guard against negative splits
  if (split.workerPayout < 0 || split.adminCommission < 0) {
    throw new Error(`[Payment] Invalid split calculated — worker: ₹${split.workerPayout}, admin: ₹${split.adminCommission}`);
  }

  const workerResult = await processWorkerPayout(booking, worker, split.workerPayout);

  let adminResult;
  try {
    adminResult = await processAdminCommission(booking, mode);
  } catch (adminErr) {
    console.error(`[PaymentService] Admin commission FAILED for booking #${booking.id}:`, adminErr.message);
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
    `worker: ₹${split.workerPayout} | admin: ₹${split.adminCommission} | ` +
    `payment_mode: ${paymentMode} | mode: ${mode}`
  );

  return { worker: workerResult, admin: adminResult, split, mode, paymentMode };
}

function isSimulationMode() { return !LIVE_MODE; }

module.exports = { processSplitPayment, processWorkerPayout, isSimulationMode };
