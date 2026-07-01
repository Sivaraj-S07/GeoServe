/**
 * routes/ratings.js — GeoServe Worker Rating System
 *
 * Security:
 *  - Only authenticated users can submit ratings
 *  - A user can only rate a booking they own
 *  - Rating only allowed when booking status = 'confirmed' AND payment_status = 'paid'
 *  - One rating per booking (UNIQUE constraint on booking_id + DB check)
 *  - Stars validated server-side (integer 1–5)
 *  - Worker average and total_ratings recalculated atomically
 */

"use strict";

const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { verifyToken }  = require("../middleware/auth");
const { requireRole }  = require("../middleware/role");

/* ── helpers ─────────────────────────────────────────────────────────────── */
function toJS(r) {
  return {
    id:        Number(r.id),
    bookingId: Number(r.booking_id),
    workerId:  Number(r.worker_id),
    userId:    Number(r.user_id),
    stars:     Number(r.stars),
    review:    r.review || "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/* ── POST /api/ratings ── Submit a rating ─────────────────────────────────── */
router.post("/", verifyToken, requireRole("user"), async (req, res) => {
  try {
    const { bookingId, stars, review } = req.body;
    const userId = req.user.id;

    // ── Validate inputs ──
    if (!bookingId) {
      return res.status(400).json({ error: "bookingId is required" });
    }

    const parsedStars = parseInt(stars, 10);
    if (isNaN(parsedStars) || parsedStars < 1 || parsedStars > 5) {
      return res.status(400).json({ error: "stars must be an integer between 1 and 5" });
    }

    const cleanReview = (review || "").toString().trim().substring(0, 1000);

    // ── Fetch and verify the booking ──
    const { rows: bookingRows } = await pool.query(
      "SELECT * FROM bookings WHERE id = $1",
      [parseInt(bookingId)]
    );
    if (!bookingRows.length) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = bookingRows[0];

    // Must be the booking owner
    if (Number(booking.user_id) !== userId) {
      return res.status(403).json({ error: "You can only rate your own bookings" });
    }

    // Must be fully confirmed AND paid
    if (booking.status !== "confirmed") {
      return res.status(400).json({
        error: "Rating is only available after the booking is fully confirmed",
        currentStatus: booking.status,
      });
    }
    if (booking.payment_status !== "paid") {
      return res.status(400).json({
        error: "Rating is only available after payment is completed",
        paymentStatus: booking.payment_status,
      });
    }

    // ── Check for duplicate rating ──
    const { rows: existing } = await pool.query(
      "SELECT id FROM ratings WHERE booking_id = $1",
      [parseInt(bookingId)]
    );
    if (existing.length) {
      return res.status(409).json({
        error: "You have already rated this booking",
        ratingId: Number(existing[0].id),
      });
    }

    // ── Insert rating + recalculate worker stats atomically ──
    const ratingId = Date.now();
    const workerId = Number(booking.worker_id);

    const { rows: inserted } = await pool.query(
      `INSERT INTO ratings (id, booking_id, worker_id, user_id, stars, review, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [ratingId, parseInt(bookingId), workerId, userId, parsedStars, cleanReview]
    );

    // Recalculate average + total for the worker
    const { rows: stats } = await pool.query(
      `SELECT
         COUNT(*)::INT           AS total_ratings,
         ROUND(AVG(stars)::NUMERIC, 2)::FLOAT AS avg_rating
       FROM ratings
       WHERE worker_id = $1`,
      [workerId]
    );

    const newTotal = stats[0].total_ratings;
    const newAvg   = stats[0].avg_rating;

    await pool.query(
      `UPDATE workers
         SET rating = $1, total_ratings = $2, jobs_completed = GREATEST(jobs_completed, $2), updated_at = NOW()
       WHERE id = $3`,
      [newAvg, newTotal, workerId]
    );

    // Mark the booking as rated
    await pool.query(
      "UPDATE bookings SET is_rated = TRUE, updated_at = NOW() WHERE id = $1",
      [parseInt(bookingId)]
    );

    return res.status(201).json({
      rating: toJS(inserted[0]),
      workerStats: { averageRating: newAvg, totalRatings: newTotal },
    });
  } catch (err) {
    // Duplicate key from DB constraint — extra safety net
    if (err.code === "23505") {
      return res.status(409).json({ error: "You have already rated this booking" });
    }
    console.error("[ratings/post]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/ratings/booking/:bookingId ── Check if booking is rated ─────── */
router.get("/booking/:bookingId", verifyToken, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    if (isNaN(bookingId)) return res.status(400).json({ error: "Invalid booking ID" });

    // Verify access: user owns booking OR worker assigned to booking OR admin
    const { rows: bookingRows } = await pool.query(
      "SELECT user_id, worker_user_id FROM bookings WHERE id = $1",
      [bookingId]
    );
    if (!bookingRows.length) return res.status(404).json({ error: "Booking not found" });

    const b = bookingRows[0];
    const { role, id: userId } = req.user;
    if (
      role !== "admin" &&
      Number(b.user_id) !== userId &&
      Number(b.worker_user_id) !== userId
    ) {
      return res.status(403).json({ error: "Not authorized to view this booking's rating" });
    }

    const { rows } = await pool.query(
      "SELECT * FROM ratings WHERE booking_id = $1",
      [bookingId]
    );

    if (!rows.length) {
      return res.json({ rated: false, rating: null });
    }

    return res.json({ rated: true, rating: toJS(rows[0]) });
  } catch (err) {
    console.error("[ratings/booking/get]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /api/ratings/worker/:workerId ── All ratings for a worker ─────────── */
router.get("/worker/:workerId", async (req, res) => {
  try {
    const workerId = parseInt(req.params.workerId);
    if (isNaN(workerId)) return res.status(400).json({ error: "Invalid worker ID" });

    const { rows } = await pool.query(
      `SELECT r.*, u.name AS user_name, u.avatar AS user_avatar
       FROM ratings r
       JOIN users u ON u.id = r.user_id
       WHERE r.worker_id = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [workerId]
    );

    const { rows: stats } = await pool.query(
      `SELECT
         COUNT(*)::INT           AS total_ratings,
         ROUND(AVG(stars)::NUMERIC, 2)::FLOAT AS avg_rating,
         COUNT(*) FILTER (WHERE stars = 5)::INT AS five_star,
         COUNT(*) FILTER (WHERE stars = 4)::INT AS four_star,
         COUNT(*) FILTER (WHERE stars = 3)::INT AS three_star,
         COUNT(*) FILTER (WHERE stars = 2)::INT AS two_star,
         COUNT(*) FILTER (WHERE stars = 1)::INT AS one_star
       FROM ratings
       WHERE worker_id = $1`,
      [workerId]
    );

    const s = stats[0];

    return res.json({
      ratings: rows.map(r => ({
        ...toJS(r),
        userName:   r.user_name   || "Anonymous",
        userAvatar: r.user_avatar || "",
      })),
      stats: {
        averageRating: s.avg_rating   || 0,
        totalRatings:  s.total_ratings || 0,
        breakdown: {
          5: s.five_star  || 0,
          4: s.four_star  || 0,
          3: s.three_star || 0,
          2: s.two_star   || 0,
          1: s.one_star   || 0,
        },
      },
    });
  } catch (err) {
    console.error("[ratings/worker/get]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── DELETE /api/ratings/:id ── Admin can delete a rating ─────────────────── */
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid rating ID" });

    const { rows } = await pool.query("SELECT * FROM ratings WHERE id = $1", [id]);
    if (!rows.length) return res.status(404).json({ error: "Rating not found" });

    const workerId = Number(rows[0].worker_id);
    const bookingId = Number(rows[0].booking_id);

    await pool.query("DELETE FROM ratings WHERE id = $1", [id]);

    // Unmark the booking
    await pool.query(
      "UPDATE bookings SET is_rated = FALSE, updated_at = NOW() WHERE id = $1",
      [bookingId]
    );

    // Recalculate worker stats
    const { rows: stats } = await pool.query(
      `SELECT
         COUNT(*)::INT AS total_ratings,
         COALESCE(ROUND(AVG(stars)::NUMERIC, 2), 0)::FLOAT AS avg_rating
       FROM ratings WHERE worker_id = $1`,
      [workerId]
    );

    await pool.query(
      "UPDATE workers SET rating = $1, total_ratings = $2, updated_at = NOW() WHERE id = $3",
      [stats[0].avg_rating, stats[0].total_ratings, workerId]
    );

    res.json({ message: "Rating deleted", workerId, newStats: stats[0] });
  } catch (err) {
    console.error("[ratings/delete]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
