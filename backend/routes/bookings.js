/**
 * routes/bookings.js — GeoServe v6
 *
 * Payment security hardening:
 *  - Input validation and sanitization on all numeric cost fields
 *  - payment_mode stored on booking at confirm time
 *  - addHistoryEntry called on successful confirm
 *  - Idempotency key includes booking id + user id (prevents cross-user reuse)
 *  - Worker cannot set status to completed (only users can)
 *  - Confirm endpoint accepts both "completed" and "in_progress" status
 */

"use strict";

const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { verifyToken }                           = require("../middleware/auth");
const { requireRole }                           = require("../middleware/role");
const { processSplitPayment, isSimulationMode } = require("../services/paymentService");
const { calculateSplit }                        = require("../services/commissionService");
const idempotency                               = require("../services/idempotencyStore");
const { addHistoryEntry }                       = require("../services/historyService");

const VALID_STATUSES = ["pending","accepted","rejected","in_progress","completed","confirmed"];
const VALID_PAYMENT_MODES = ["upi", "cash", "pending"];

// ── toJS mapper ───────────────────────────────────────────────────────────────
function toJS(b) {
  return {
    id:                  Number(b.id),
    userId:              Number(b.user_id),
    // Always use the English name snapshot; fall back to the legacy column.
    // This ensures English is shown even when the worker registered in Tamil UI.
    userName:            b.user_name_en   || b.user_name   || "",
    userNameEn:          b.user_name_en   || b.user_name   || "",
    workerId:            Number(b.worker_id),
    workerUserId:        b.worker_user_id ? Number(b.worker_user_id) : null,
    workerName:          b.worker_name_en || b.worker_name || "",
    workerNameEn:        b.worker_name_en || b.worker_name || "",
    category:            b.category,
    date:                b.date,
    notes:               b.notes,
    status:              b.status,
    duration:            Number(b.duration),
    hourlyRate:          Number(b.hourly_rate),
    serviceCost:         Number(b.service_cost),
    distanceCost:        Number(b.distance_cost),
    distanceKm:          Number(b.distance_km),
    distanceRate:        Number(b.distance_rate),
    platformFee:         Number(b.platform_fee),
    cost:                Number(b.cost),
    workerPayout:        Number(b.worker_payout),
    adminCommission:     Number(b.admin_commission),
    adminTransactionId:  b.admin_transaction_id,
    commissionStatus:    b.commission_status,
    splitDetails:        b.split_details || {},
    paymentStatus:       b.payment_status,
    paymentMode:         b.payment_mode || "pending",
    transactionId:       b.transaction_id,
    customerPaymentRef:  b.customer_payment_ref || "",
    paidAt:              b.paid_at,
    userLat:             b.user_lat  ? Number(b.user_lat)  : null,
    userLng:             b.user_lng  ? Number(b.user_lng)  : null,
    userPhone:           b.user_phone,
    userAddress:         b.user_address,
    workStartedAt:       b.work_started_at,
    statusHistory:       b.status_history || [],
    isRated:             b.is_rated || false,
    createdAt:           b.created_at,
    updatedAt:           b.updated_at,
  };
}

// ── Sanitize / validate cost fields ──────────────────────────────────────────
function sanitizeCosts({ cost, serviceCost, platformFee, distanceCost, distanceKm, distanceRate, hourlyRate, duration }) {
  const sc  = Math.max(0, Number(serviceCost)  || 0);
  const dc  = Math.max(0, Number(distanceCost) || 0);
  const pf  = Math.max(0, Number(platformFee)  || 0);
  const tot = Math.max(0, Number(cost)         || sc + dc + pf);
  return {
    sc, dc, pf, tot,
    dkm:  Math.max(0, Number(distanceKm)  || 0),
    dr:   Math.max(0, Number(distanceRate) || 0),
    hr:   Math.max(0, Number(hourlyRate)   || 75),
    dur:  Math.max(0.25, Number(duration)  || 1),
  };
}

/* ── GET /api/bookings ────────────────────────────────────────────────────── */
/* OPTIMIZED: admin path now supports SQL pagination to avoid full-table fetch */
router.get("/", verifyToken, async (req, res) => {
  try {
    const { role, id } = req.user;
    let rows;

    if (role === "admin") {
      // Pagination support for admin — prevents full-table serialisation on every poll
      const limit  = Math.min(500, parseInt(req.query.limit) || 200);
      const offset = Math.max(0,   parseInt(req.query.offset) || 0);
      ({ rows } = await pool.query(
        "SELECT * FROM bookings ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        [limit, offset]
      ));
    } else if (role === "worker") {
      const { workerId } = req.query;
      if (workerId) {
        ({ rows } = await pool.query(
          "SELECT * FROM bookings WHERE worker_id=$1 ORDER BY created_at DESC",
          [parseInt(workerId)]
        ));
      } else {
        ({ rows } = await pool.query(
          "SELECT * FROM bookings WHERE worker_user_id=$1 ORDER BY created_at DESC",
          [id]
        ));
      }
    } else {
      ({ rows } = await pool.query(
        "SELECT * FROM bookings WHERE user_id=$1 ORDER BY created_at DESC",
        [id]
      ));
    }
    res.json(rows.map(toJS));
  } catch (err) {
    console.error("[bookings/get]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /api/bookings ───────────────────────────────────────────────────── */
router.post("/", requireRole("user"), async (req, res) => {
  try {
    const {
      workerId, category, date, notes, workerName,
      duration, cost, serviceCost, platformFee, hourlyRate,
      distanceCost, distanceKm, distanceRate,
      userLat, userLng, userPhone, userAddress,
    } = req.body;

    // ── Validation ──
    if (!workerId || !date) {
      return res.status(400).json({ error: "workerId and date are required" });
    }
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(date)) {
      return res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
    }

    const { rows: wr } = await pool.query("SELECT * FROM workers WHERE id=$1", [parseInt(workerId)]);
    if (!wr.length || !wr[0].availability) {
      return res.status(400).json({ error: "This worker is not currently active. Please select an available worker." });
    }

    // Fetch the booking user's bilingual name for the snapshot (req.user
    // from the JWT only carries the legacy single-language name).
    const { rows: ur } = await pool.query("SELECT name, name_en FROM users WHERE id=$1", [req.user.id]);
    const bookingUser = ur[0] || {};
    // Always capture the English name for the booking snapshot — prevents Tamil names
    // from being stored in booking records and showing up in English UI.
    const userNameEn   = bookingUser.name_en || bookingUser.name || req.user.name || "";
    const worker       = wr[0];
    // Use name_en from worker record; fall back to the request param, then legacy name.
    const workerNameEn = worker.name_en || worker.name || workerName || "Unknown Worker";

    const { sc, dc, pf, tot, dkm, dr, hr, dur } = sanitizeCosts({
      cost, serviceCost, platformFee, distanceCost, distanceKm, distanceRate, hourlyRate, duration,
    });

    const id  = Date.now();
    const now = new Date().toISOString();
    const statusHistory = [{ status: "pending", changedBy: req.user.id, changedAt: now, note: "Booking created" }];

    const { rows } = await pool.query(
      `INSERT INTO bookings(
         id, user_id, user_name, worker_id, worker_user_id, worker_name,
         category, date, notes, status, duration, hourly_rate,
         service_cost, distance_cost, distance_km, distance_rate,
         platform_fee, cost, worker_payout, admin_commission,
         commission_status, split_details, payment_status, payment_mode,
         user_lat, user_lng, user_phone, user_address,
         status_history, created_at, updated_at,
         user_name_en, user_name_ta, worker_name_en, worker_name_ta
       )
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,$11,
              $12,$13,$14,$15,$16,$17,$18,$19,
              'pending',$20,'unpaid','pending',
              $21,$22,$23,$24,$25,NOW(),NOW(),
              $26,$27,$28,$29)
       RETURNING *`,
      [
        id, req.user.id, req.user.name,
        parseInt(workerId), wr[0].user_id ? Number(wr[0].user_id) : null,
        (workerName || "Unknown Worker").substring(0, 100),
        (category   || "").substring(0, 100),
        date,
        (notes || "").substring(0, 500),
        dur, hr, sc, dc, dkm, dr, pf, tot,
        sc + dc, pf,
        JSON.stringify({ workerPayout: sc + dc, adminCommission: pf, serviceCost: sc, distanceCost: dc, total: tot, rate: 0.05 }),
        parseFloat(userLat) || null, parseFloat(userLng) || null,
        (userPhone   || "").substring(0, 20),
        (userAddress || "").substring(0, 300),
        JSON.stringify(statusHistory),
        userNameEn.substring(0, 100), "",
        workerNameEn.substring(0, 100), "",
      ]
    );

    const booking = toJS(rows[0]);

    await addHistoryEntry({
      type: "booking", actorId: req.user.id, actorName: req.user.name,
      actorEmail: req.user.email, actorRole: "user", bookingId: id,
      details: `Booking created — ${booking.category || "Service"} with ${booking.workerName} on ${date}. Service: ₹${sc}, Distance: ₹${dc}, Platform: ₹${pf}, Total: ₹${tot}`,
      workerName: booking.workerName, category: booking.category, date, cost: tot, status: "pending",
    });

    const push      = req.app.locals.pushNotification;
    const pushAdmin = req.app.locals.pushAdminNotification;
    if (pushAdmin) pushAdmin({ type: "new_booking", booking });
    if (req.app.locals.addAdminNotification) {
      req.app.locals.addAdminNotification({
        type: "new_booking", title: "New Booking",
        message: `${booking.userName || "A user"} booked ${booking.category || "a service"}${booking.workerName ? ` with ${booking.workerName}` : ""}`,
        link: "/bookings",
      });
    }
    if (push) push(`worker:${booking.workerUserId}`, { type: "new_booking", booking });

    res.status(201).json(booking);
  } catch (err) {
    console.error("[bookings/post]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── PATCH /api/bookings/:id/status ──────────────────────────────────────── */
router.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid booking ID" });

    const { rows: existing } = await pool.query("SELECT * FROM bookings WHERE id=$1", [id]);
    if (!existing.length) return res.status(404).json({ error: "Booking not found" });

    const booking    = existing[0];
    const { status, note } = req.body;
    const { role, id: userId } = req.user;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    // ── Role-based transition rules ──
    if (role === "worker") {
      const WORKER_TRANSITIONS = {
        pending:  ["accepted", "rejected"],
        accepted: ["in_progress", "rejected"],
      };
      const allowed = WORKER_TRANSITIONS[booking.status] || [];
      if (!allowed.includes(status)) {
        return res.status(403).json({
          error: `Worker cannot transition '${booking.status}' → '${status}'`,
          allowedTransitions: allowed,
        });
      }
      // Worker must own this booking
      if (Number(booking.worker_user_id) !== userId) {
        return res.status(403).json({ error: "You can only update your own bookings" });
      }
    } else if (role === "user") {
      if (status === "rejected" && booking.status === "accepted") {
        // User cancels their own accepted booking
        if (Number(booking.user_id) !== userId) {
          return res.status(403).json({ error: "You can only cancel your own bookings" });
        }
      } else if (status === "completed" && booking.status === "in_progress") {
        // User marks in-progress job as completed (before payment confirm)
        if (Number(booking.user_id) !== userId) {
          return res.status(403).json({ error: "You can only complete your own bookings" });
        }
      } else {
        return res.status(403).json({
          error: "Users must use POST /bookings/:id/confirm to confirm payment completion.",
        });
      }
    }
    // Admin can do any transition — no extra checks needed

    const history = Array.isArray(booking.status_history) ? booking.status_history : [];
    history.push({
      status,
      changedBy: userId,
      changedAt: new Date().toISOString(),
      note:      (note || "").substring(0, 200),
    });

    const updates = ["status=$1", "status_history=$2", "updated_at=NOW()"];
    const vals    = [status, JSON.stringify(history)];
    let i = 3;
    if (status === "in_progress") {
      updates.push(`work_started_at=$${i++}`);
      vals.push(new Date().toISOString());
    }
    vals.push(id);

    const { rows } = await pool.query(
      `UPDATE bookings SET ${updates.join(",")} WHERE id=$${i} RETURNING *`,
      vals
    );
    const updated = toJS(rows[0]);

    const push      = req.app.locals.pushNotification;
    const pushAdmin = req.app.locals.pushAdminNotification;
    if (push) push(`user:${updated.userId}`, { type: "booking_update", booking: updated, status });
    if (pushAdmin) pushAdmin({ type: "booking_update", booking: updated, status });

    res.json(updated);
  } catch (err) {
    console.error("[bookings/status]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /api/bookings/:id/confirm ──────────────────────────────────────── */
router.post("/:id/confirm", requireRole("user"), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid booking ID" });

  // Extract and validate payment mode from request
  const rawMode    = (req.body.paymentMode || req.body.payment_mode || "cash").toLowerCase().trim();
  const paymentMode = VALID_PAYMENT_MODES.includes(rawMode) ? rawMode : "cash";
  // Optional UPI transaction reference (UTR) the customer enters after paying
  // via the QR code — static UPI-intent QR codes have no server-side payment
  // callback, so this is the customer's confirmation of the completed payment.
  const customerPaymentRef = String(req.body.customerPaymentRef || req.body.customer_payment_ref || "").trim().slice(0, 100);

  try {
    const { rows: existing } = await pool.query("SELECT * FROM bookings WHERE id=$1", [id]);
    if (!existing.length) return res.status(404).json({ error: "Booking not found" });

    const booking = existing[0];

    // Security: user can only confirm their own booking
    if (Number(booking.user_id) !== req.user.id) {
      return res.status(403).json({ error: "You can only confirm your own bookings" });
    }

    // Status guard — must be in_progress or completed to confirm
    if (!["completed", "in_progress"].includes(booking.status)) {
      return res.status(400).json({
        error: `Cannot confirm a booking with status '${booking.status}'. The job must be started first.`,
        currentStatus: booking.status,
      });
    }

    // Already confirmed — idempotent response
    if (booking.status === "confirmed" || booking.payment_status === "paid") {
      return res.json({
        message: "Booking already confirmed.",
        booking: toJS(booking),
        idempotent: true,
      });
    }

    // Idempotency — scoped to booking + user to prevent cross-user replay
    const idemKey = `booking_confirm_${id}_${req.user.id}`;

    const existingIdem = await idempotency.check(idemKey);
    if (existingIdem?.status === "completed") {
      return res.json({
        message: "Payment already processed (idempotent response).",
        booking: toJS(booking),
        payment: existingIdem.result,
        idempotent: true,
      });
    }
    if (existingIdem?.status === "locked") {
      return res.status(409).json({ error: "Payment is already being processed. Please wait a moment and try again." });
    }

    const locked = await idempotency.lock(idemKey);
    if (!locked) {
      return res.status(409).json({ error: "Concurrent payment attempt blocked. Please retry shortly." });
    }

    try {
      // Fetch worker
      const { rows: wr } = await pool.query("SELECT * FROM workers WHERE id=$1", [booking.worker_id]);
      if (!wr.length) throw new Error(`Worker profile not found (workerId: ${booking.worker_id})`);
      const worker = wr[0];
      worker.payoutAccount = worker.payout_account || {};

      // Process payment split
      const splitResult = await processSplitPayment(toJS(booking), worker, paymentMode);

      const now     = new Date().toISOString();
      const history = Array.isArray(booking.status_history) ? [...booking.status_history] : [];
      const simLabel = isSimulationMode() ? "[SIMULATED] " : "";
      history.push({
        status:    "confirmed",
        changedBy: req.user.id,
        changedAt: now,
        note:      `${simLabel}Confirmed by user. Payment mode: ${paymentMode}. Worker paid ₹${splitResult.split.workerPayout} (txn: ${splitResult.worker.transactionId}). Admin commission ₹${splitResult.split.adminCommission} (${splitResult.admin.commissionStatus}).${customerPaymentRef ? ` Customer UPI ref: ${customerPaymentRef}.` : ""}`,
      });

      const splitDetails = {
        workerPayout:    splitResult.split.workerPayout,
        adminCommission: splitResult.split.adminCommission,
        serviceCost:     splitResult.split.serviceCost  || Number(booking.service_cost)  || 0,
        distanceCost:    splitResult.split.distanceCost || Number(booking.distance_cost) || 0,
        total:           splitResult.split.total,
        rate:            splitResult.split.rate,
        paymentMode,
      };

      const { rows: updated } = await pool.query(
        `UPDATE bookings SET
           status='confirmed',
           payment_status='paid',
           payment_mode=$1,
           transaction_id=$2,
           customer_payment_ref=$10,
           paid_at=NOW(),
           worker_payout=$3,
           admin_commission=$4,
           admin_transaction_id=$5,
           commission_status=$6,
           split_details=$7,
           status_history=$8,
           updated_at=NOW()
         WHERE id=$9
         RETURNING *`,
        [
          paymentMode,
          splitResult.worker.transactionId,
          splitResult.split.workerPayout,
          splitResult.split.adminCommission,
          splitResult.admin.adminTransactionId,
          splitResult.admin.commissionStatus,
          JSON.stringify(splitDetails),
          JSON.stringify(history),
          id,
          customerPaymentRef,
        ]
      );

      const confirmedBooking = toJS(updated[0]);

      // History entry for audit trail
      await addHistoryEntry({
        type:       "payment",
        actorId:    req.user.id,
        actorName:  req.user.name,
        actorEmail: req.user.email,
        actorRole:  "user",
        bookingId:  id,
        details:    `Payment confirmed (${paymentMode}). ${simLabel}Worker paid ₹${splitResult.split.workerPayout}. Admin commission ₹${splitResult.split.adminCommission}. Total ₹${splitResult.split.total}. Txn: ${splitResult.worker.transactionId}.`,
        workerName: confirmedBooking.workerName,
        category:   confirmedBooking.category,
        date:       confirmedBooking.date,
        cost:       confirmedBooking.cost,
        status:     "confirmed",
      });

      const paymentSummary = {
        transactionId:     splitResult.worker.transactionId,
        adminTransactionId:splitResult.admin.adminTransactionId,
        customerPaymentRef,
        workerPayout:      splitResult.split.workerPayout,
        adminCommission:   splitResult.split.adminCommission,
        commissionStatus:  splitResult.admin.commissionStatus,
        paymentStatus:     "paid",
        paymentMode,
        paidAt:            now,
        mode:              splitResult.mode,
        simulation:        isSimulationMode(),
      };

      await idempotency.resolve(idemKey, paymentSummary);

      // Push notifications
      const push      = req.app.locals.pushNotification;
      const pushAdmin = req.app.locals.pushAdminNotification;
      if (push) push(`worker:${confirmedBooking.workerUserId}`, { type: "payment_confirmed", booking: confirmedBooking });
      if (pushAdmin) pushAdmin({ type: "payment_confirmed", booking: confirmedBooking });

      return res.json({
        message: "Booking confirmed. Payment processed successfully.",
        booking: confirmedBooking,
        payment: paymentSummary,
      });

    } catch (err) {
      await idempotency.release(idemKey);

      // Mark payment as failed in DB
      try {
        const { rows: reloaded } = await pool.query("SELECT * FROM bookings WHERE id=$1", [id]);
        if (reloaded.length) {
          const history = Array.isArray(reloaded[0].status_history) ? [...reloaded[0].status_history] : [];
          history.push({
            status:    reloaded[0].status,
            changedBy: req.user.id,
            changedAt: new Date().toISOString(),
            note:      `Payment failed: ${err.message}`,
          });
          await pool.query(
            "UPDATE bookings SET payment_status='failed', status_history=$1, updated_at=NOW() WHERE id=$2",
            [JSON.stringify(history), id]
          );
        }
      } catch (dbErr) {
        console.error("[bookings/confirm] Failed to update payment_status to failed:", dbErr.message);
      }

      console.error(`[Booking ${id}] Split payment error:`, err.message);
      return res.status(502).json({
        error:   "Payment processing failed. Your booking is still saved — you may safely retry.",
        details: err.message,
      });
    }

  } catch (err) {
    console.error("[bookings/confirm]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/bookings/:id/history ───────────────────────────────────────── */
router.get("/:id/history", verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid booking ID" });

    const { rows } = await pool.query("SELECT * FROM bookings WHERE id=$1", [id]);
    if (!rows.length) return res.status(404).json({ error: "Booking not found" });

    const b = rows[0];
    const { role, id: userId } = req.user;
    if (role !== "admin" && Number(b.user_id) !== userId && Number(b.worker_user_id) !== userId) {
      return res.status(403).json({ error: "Not authorized to view this booking's history" });
    }

    res.json({
      bookingId:       id,
      statusHistory:   b.status_history || [],
      splitDetails:    b.split_details  || null,
      paymentStatus:   b.payment_status,
      paymentMode:     b.payment_mode   || "pending",
      commissionStatus:b.commission_status,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── DELETE /api/bookings/:id ─────────────────────────────────────────────── */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid booking ID" });

    const { rows } = await pool.query("SELECT * FROM bookings WHERE id=$1", [id]);
    if (!rows.length) return res.status(404).json({ error: "Booking not found" });

    const b    = rows[0];
    const { role, id: userId } = req.user;

    if (role === "admin") {
      await pool.query("DELETE FROM bookings WHERE id=$1", [id]);
      return res.json({ message: "Booking deleted by admin" });
    }
    if (role === "worker") {
      if (Number(b.worker_user_id) !== userId) {
        return res.status(403).json({ error: "Workers can only delete their own bookings" });
      }
      await pool.query("DELETE FROM bookings WHERE id=$1", [id]);
      return res.json({ message: "Booking deleted by worker" });
    }
    if (role === "user") {
      if (Number(b.user_id) !== userId) {
        return res.status(403).json({ error: "You can only delete your own bookings" });
      }
      const deletable = ["pending", "rejected", "confirmed"];
      if (!deletable.includes(b.status)) {
        return res.status(400).json({
          error: `Cannot delete a booking that is '${b.status}'. Only pending, rejected, or confirmed bookings can be deleted.`,
        });
      }
      await pool.query("DELETE FROM bookings WHERE id=$1", [id]);
      return res.json({ message: "Booking deleted successfully" });
    }
    return res.status(403).json({ error: "Not authorized to delete this booking." });
  } catch (err) {
    console.error("[bookings/delete]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
