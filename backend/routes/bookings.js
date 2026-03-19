/**
 * routes/bookings.js
 *
 * Full booking lifecycle with split payment:
 *   pending → accepted → in_progress → completed → confirmed
 *                                                     ↳ worker gets 95% (serviceCost)
 *                                                     ↳ admin  gets  5% (platformFee)
 *
 * New booking schema fields (v3.1):
 *   workerPayout        – INR amount sent to worker (= serviceCost)
 *   adminCommission     – INR amount credited to admin wallet (= platformFee)
 *   adminTransactionId  – ID of the admin wallet commission entry
 *   commissionStatus    – "pending" | "credited" | "pending_retry" | "skipped"
 *   splitDetails        – { workerPayout, adminCommission, total, rate }
 */

const express  = require("express");
const router   = express.Router();
const fs       = require("fs");
const path     = require("path");

const { verifyToken }                          = require("../middleware/auth");
const { requireRole }                          = require("../middleware/role");
const { processSplitPayment, isSimulationMode } = require("../services/paymentService");
const { calculateSplit }                        = require("../services/commissionService");
const idempotency                               = require("../services/idempotencyStore");
const { addHistoryEntry }                       = require("../services/historyService");

// ─── File helpers ─────────────────────────────────────────────────────────────
const BOOK_FILE   = path.join(__dirname, "../data/bookings.json");
const WORKER_FILE = path.join(__dirname, "../data/workers.json");

const readBookings  = () => JSON.parse(fs.readFileSync(BOOK_FILE,   "utf-8"));
const readWorkers   = () => JSON.parse(fs.readFileSync(WORKER_FILE, "utf-8"));
const writeBookings = (d) => fs.writeFileSync(BOOK_FILE, JSON.stringify(d, null, 2));

const VALID_STATUSES = ["pending", "accepted", "rejected", "in_progress", "completed", "confirmed"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pushHistory(booking, status, changedBy, note = "") {
  if (!Array.isArray(booking.statusHistory)) booking.statusHistory = [];
  booking.statusHistory.push({
    status,
    changedBy,
    changedAt: new Date().toISOString(),
    note,
  });
}

// ─── GET /api/bookings ────────────────────────────────────────────────────────
router.get("/", verifyToken, (req, res) => {
  let bookings = readBookings();
  const { role, id } = req.user;

  if (role === "admin") return res.json(bookings);
  if (role === "worker") {
    const { workerId } = req.query;
    bookings = workerId
      ? bookings.filter(b => b.workerId === parseInt(workerId))
      : bookings.filter(b => b.workerUserId === id);
    return res.json(bookings);
  }
  return res.json(bookings.filter(b => b.userId === id));
});

// ─── POST /api/bookings ───────────────────────────────────────────────────────
router.post("/", requireRole("user"), (req, res) => {
  const {
    workerId, category, date, notes, workerName,
    duration, cost, serviceCost, platformFee, hourlyRate,
    userLat, userLng, userPhone, userAddress,
  } = req.body;

  if (!workerId || !date)
    return res.status(400).json({ error: "workerId and date are required" });

  const bookings = readBookings();
  const now      = new Date().toISOString();

  // Pre-compute split breakdown so it's queryable immediately
  const sc   = Number(serviceCost) || 0;
  const pf   = Number(platformFee) || 0;
  const total = Number(cost) || sc + pf;

  // Find the worker's userId so messages/contact auth works
  const workerRecord = readWorkers().find(w => w.id === parseInt(workerId));
  const resolvedWorkerUserId = workerRecord?.userId || null;

  // ── Guard: only allow booking if worker is currently active ──────────────
  if (!workerRecord || !workerRecord.availability) {
    return res.status(400).json({
      error: "This worker is not currently active. Please select an available worker.",
    });
  }

  const newBooking = {
    id:            Date.now(),
    userId:        req.user.id,
    userName:      req.user.name,
    workerId:      parseInt(workerId),
    workerUserId:  resolvedWorkerUserId,
    workerName:    workerName || "Unknown Worker",
    category:      category  || "",
    date,
    notes:         notes || "",
    status:        "pending",
    duration:      duration    || 1,
    hourlyRate:    hourlyRate  || 75,
    // ── Cost fields ──────────────────────────────────────────────────────
    serviceCost:        sc,
    platformFee:        pf,
    cost:               total,
    // ── Commission fields (populated on confirm) ─────────────────────────
    workerPayout:       sc,          // ← how much worker will receive
    adminCommission:    pf,          // ← how much admin will receive
    adminTransactionId: null,
    commissionStatus:   "pending",
    splitDetails: {
      workerPayout:    sc,
      adminCommission: pf,
      total:           total,
      rate:            0.05,
    },
    // ── Payment fields ────────────────────────────────────────────────────
    paymentStatus: "unpaid",
    transactionId: null,
    paidAt:        null,
    // ── User location & contact (for worker navigation) ──────────────────
    userLat:     parseFloat(userLat) || null,
    userLng:     parseFloat(userLng) || null,
    userPhone:   userPhone || "",
    userAddress: userAddress || "",
    statusHistory: [{
      status:    "pending",
      changedBy: req.user.id,
      changedAt: now,
      note:      "Booking created",
    }],
    createdAt:  now,
    updatedAt:  now,
  };

  bookings.push(newBooking);
  writeBookings(bookings);

  // ── Record booking to history ─────────────────────────────────────────────
  addHistoryEntry({
    type:        "booking",
    actorId:     req.user.id,
    actorName:   req.user.name,
    actorEmail:  req.user.email,
    actorRole:   "user",
    bookingId:   newBooking.id,
    details:     `Booking created — ${category || "Service"} with ${workerName || "worker"} on ${date}. Total: ₹${total}`,
    workerName:  workerName || "Unknown Worker",
    category:    category  || "",
    date,
    cost:        total,
    status:      "pending",
  });

  res.status(201).json(newBooking);
});

// ─── PATCH /api/bookings/:id/status ──────────────────────────────────────────
router.patch("/:id/status", verifyToken, (req, res) => {
  const id       = parseInt(req.params.id);
  const bookings = readBookings();
  const idx      = bookings.findIndex(b => b.id === id);
  if (idx === -1) return res.status(404).json({ error: "Booking not found" });

  const booking = bookings[idx];
  const { status, note } = req.body;
  const { role, id: userId } = req.user;

  if (!VALID_STATUSES.includes(status))
    return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(", ")}` });

  if (role === "worker") {
    const WORKER_TRANSITIONS = {
      pending:     ["accepted", "rejected"],
      accepted:    ["in_progress"],
      in_progress: ["completed"],
      completed:   ["confirmed"],  // ✅ Allow worker to confirm cash payment
    };
    const allowed = WORKER_TRANSITIONS[booking.status] || [];
    if (!allowed.includes(status))
      return res.status(403).json({
        error: `Worker cannot transition '${booking.status}' → '${status}'`,
        allowedTransitions: allowed,
      });
  } else if (role === "user") {
    // Users must always use POST /bookings/:id/confirm to trigger payment processing.
    // Direct status patching is intentionally blocked to prevent bypassing payment.
    return res.status(403).json({
      error: "Users must use POST /bookings/:id/confirm to confirm completion.",
    });
  }

  pushHistory(booking, status, userId, note || "");
  booking.status    = status;
  booking.updatedAt = new Date().toISOString();

  // ✅ Track when work actually starts (for timer)
  if (status === "in_progress") {
    booking.workStartedAt = new Date().toISOString();
  }

  writeBookings(bookings);
  res.json(booking);
});

// ─── POST /api/bookings/:id/confirm ──────────────────────────────────────────
/**
 * User confirms the work is complete.
 * Triggers the split payment:
 *   • Worker receives serviceCost via Razorpay IMPS
 *   • Admin wallet is credited platformFee (5% commission)
 *
 * Full idempotency protection — safe to retry on network failure.
 */
router.post("/:id/confirm", requireRole("user"), async (req, res) => {
  const id       = parseInt(req.params.id);
  const bookings = readBookings();
  const idx      = bookings.findIndex(b => b.id === id);
  if (idx === -1) return res.status(404).json({ error: "Booking not found" });

  const booking = bookings[idx];

  // ── Guard 1: ownership ───────────────────────────────────────────────────
  if (booking.userId !== req.user.id)
    return res.status(403).json({ error: "You can only confirm your own bookings" });

  // ── Guard 2: status gate ─────────────────────────────────────────────────
  if (booking.status !== "completed")
    return res.status(400).json({
      error:         `Cannot confirm a booking with status '${booking.status}'. Worker must mark it 'completed' first.`,
      currentStatus: booking.status,
    });

  // ── Guard 3: idempotency ─────────────────────────────────────────────────
  const idemKey = `booking_${id}`;
  const existing = idempotency.check(idemKey);

  if (existing?.status === "completed") {
    return res.json({
      message:    "Payment already processed (idempotent response)",
      booking,
      payment:    existing.result,
      idempotent: true,
    });
  }

  if (existing?.status === "locked") {
    return res.status(409).json({
      error: "Payment is already being processed. Please wait a few seconds and retry.",
    });
  }

  const locked = idempotency.lock(idemKey);
  if (!locked)
    return res.status(409).json({ error: "Concurrent payment attempt blocked. Please retry." });

  try {
    // ── Load worker ────────────────────────────────────────────────────────
    const workers = readWorkers();
    const worker  = workers.find(w => w.id === booking.workerId);
    if (!worker) throw new Error(`Worker profile not found (workerId: ${booking.workerId})`);

    // ── Execute split payment ──────────────────────────────────────────────
    // processSplitPayment handles both worker IMPS payout + admin wallet credit
    const splitResult = await processSplitPayment(booking, worker);

    // ── Persist payment outcome onto booking ──────────────────────────────
    const now = new Date().toISOString();

    booking.status             = "confirmed";
    booking.paymentStatus      = "paid";
    booking.transactionId      = splitResult.worker.transactionId;  // worker txn
    booking.paidAt             = now;
    booking.workerPayout       = splitResult.split.workerPayout;
    booking.adminCommission    = splitResult.split.adminCommission;
    booking.adminTransactionId = splitResult.admin.adminTransactionId;
    booking.commissionStatus   = splitResult.admin.commissionStatus;  // "credited" | "pending_retry"
    booking.splitDetails       = {
      workerPayout:    splitResult.split.workerPayout,
      adminCommission: splitResult.split.adminCommission,
      total:           splitResult.split.total,
      rate:            splitResult.split.rate,
    };
    booking.updatedAt = now;

    const simLabel = isSimulationMode() ? "[SIMULATED] " : "";
    pushHistory(
      booking,
      "confirmed",
      req.user.id,
      `Confirmed by user. ${simLabel}` +
      `Worker paid ₹${splitResult.split.workerPayout} (txn: ${splitResult.worker.transactionId}). ` +
      `Admin commission ₹${splitResult.split.adminCommission} (${splitResult.admin.commissionStatus}).`
    );

    writeBookings(bookings);

    // ── Store idempotency result ───────────────────────────────────────────
    const paymentSummary = {
      transactionId:      splitResult.worker.transactionId,
      adminTransactionId: splitResult.admin.adminTransactionId,
      workerPayout:       splitResult.split.workerPayout,
      adminCommission:    splitResult.split.adminCommission,
      commissionStatus:   splitResult.admin.commissionStatus,
      paymentStatus:      "paid",
      paidAt:             now,
      mode:               splitResult.mode,
    };
    idempotency.resolve(idemKey, paymentSummary);

    return res.json({
      message: "Booking confirmed. Worker paid and platform commission credited.",
      booking,
      payment: paymentSummary,
    });

  } catch (err) {
    idempotency.release(idemKey);

    // Mark payment as failed without changing booking status
    const reloaded = readBookings();
    const failIdx  = reloaded.findIndex(b => b.id === id);
    if (failIdx !== -1) {
      reloaded[failIdx].paymentStatus = "failed";
      reloaded[failIdx].updatedAt     = new Date().toISOString();
      pushHistory(
        reloaded[failIdx],
        reloaded[failIdx].status,
        req.user.id,
        `Payment failed: ${err.message}`
      );
      writeBookings(reloaded);
    }

    console.error(`[Booking ${id}] Split payment error:`, err.message);
    return res.status(502).json({
      error:   "Payment processing failed. You may safely retry.",
      details: err.message,
    });
  }
});

// ─── GET /api/bookings/:id/history ───────────────────────────────────────────
router.get("/:id/history", verifyToken, (req, res) => {
  const id      = parseInt(req.params.id);
  const booking = readBookings().find(b => b.id === id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const { role, id: userId } = req.user;
  if (role !== "admin" && booking.userId !== userId && booking.workerUserId !== userId)
    return res.status(403).json({ error: "Not authorized" });

  res.json({
    bookingId:     id,
    statusHistory: booking.statusHistory || [],
    splitDetails:  booking.splitDetails  || null,
    paymentStatus: booking.paymentStatus,
    commissionStatus: booking.commissionStatus,
  });
});

// ─── DELETE /api/bookings/:id ─────────────────────────────────────────────────
router.delete("/:id", verifyToken, (req, res) => {
  const id       = parseInt(req.params.id);
  const bookings = readBookings();
  const booking  = bookings.find(b => b.id === id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (req.user.role !== "admin" && booking.userId !== req.user.id)
    return res.status(403).json({ error: "Not authorized" });
  writeBookings(bookings.filter(b => b.id !== id));
  res.json({ message: "Booking deleted" });
});

module.exports = router;
