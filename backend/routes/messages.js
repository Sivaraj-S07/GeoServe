/**
 * routes/messages.js
 * 
 * In-app messaging between Users and Workers.
 * Messages are only accessible to participants of a confirmed booking.
 * Contact details (phone) are only revealed after booking is accepted/confirmed.
 */

const express = require("express");
const router  = express.Router();
const fs      = require("fs");
const path    = require("path");
const { verifyToken } = require("../middleware/auth");

const MESSAGES_FILE  = path.join(__dirname, "../data/messages.json");
const BOOKINGS_FILE  = path.join(__dirname, "../data/bookings.json");
const USERS_FILE     = path.join(__dirname, "../data/users.json");
const WORKERS_FILE   = path.join(__dirname, "../data/workers.json");

const readMessages  = () => {
  try { return JSON.parse(fs.readFileSync(MESSAGES_FILE, "utf-8")); }
  catch { return []; }
};
const writeMessages = (d) => fs.writeFileSync(MESSAGES_FILE, JSON.stringify(d, null, 2));
const readBookings  = () => JSON.parse(fs.readFileSync(BOOKINGS_FILE, "utf-8"));
const readUsers     = () => JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
const readWorkers   = () => JSON.parse(fs.readFileSync(WORKERS_FILE, "utf-8"));

// Helper: check if user is a participant of a booking
function isParticipant(booking, userId, role) {
  if (role === "admin") return true;
  if (booking.userId === userId) return true;
  // Worker: check by workerUserId (direct) or via workers table
  if (booking.workerUserId === userId) return true;
  if (role === "worker") {
    const workers = readWorkers();
    const wp = workers.find(w => w.userId === userId);
    if (wp && booking.workerId === wp.id) return true;
  }
  return false;
}

/**
 * GET /api/messages/:bookingId
 * Get all messages for a booking (participants only)
 */
router.get("/:bookingId", verifyToken, (req, res) => {
  const bookingId = parseInt(req.params.bookingId);
  const bookings  = readBookings();
  const booking   = bookings.find(b => b.id === bookingId);

  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (!isParticipant(booking, req.user.id, req.user.role))
    return res.status(403).json({ error: "Not a participant of this booking" });

  const messages = readMessages().filter(m => m.bookingId === bookingId);

  // Include contact details only for accepted/in_progress/completed/confirmed bookings
  const contactVisible = ["accepted", "in_progress", "completed", "confirmed"].includes(booking.status);
  let contactInfo = null;

  if (contactVisible) {
    const users   = readUsers();
    const workers = readWorkers();
    const userRec   = users.find(u => u.id === booking.userId);
    const workerRec = workers.find(w => w.id === booking.workerId);

    contactInfo = {
      user: {
        name:   booking.userName || userRec?.name || "",
        // prefer phone set on booking at creation time
        phone:  booking.userPhone || userRec?.phone || "",
        avatar: userRec?.avatar || "",
      },
      worker: workerRec ? {
        name:   workerRec.name,
        phone:  workerRec.phone || "",
        avatar: workerRec.avatar || "",
      } : null,
    };
  }

  res.json({ messages, contactInfo, contactVisible });
});

/**
 * POST /api/messages/:bookingId
 * Send a message (participants of accepted+ booking only)
 */
router.post("/:bookingId", verifyToken, (req, res) => {
  const bookingId = parseInt(req.params.bookingId);
  const bookings  = readBookings();
  const booking   = bookings.find(b => b.id === bookingId);

  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (!isParticipant(booking, req.user.id, req.user.role))
    return res.status(403).json({ error: "Not a participant of this booking" });

  // Allow messaging once booking is accepted
  if (!["accepted", "in_progress", "completed", "confirmed"].includes(booking.status))
    return res.status(400).json({ error: "Messaging is available only after booking is accepted" });

  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Message text is required" });

  const messages = readMessages();
  const msg = {
    id:         Date.now(),
    bookingId,
    senderId:   req.user.id,
    senderName: req.user.name,
    senderRole: req.user.role,
    text:       text.trim(),
    createdAt:  new Date().toISOString(),
    read:       false,
  };
  messages.push(msg);
  writeMessages(messages);
  res.status(201).json(msg);
});

/**
 * GET /api/messages/:bookingId/unread
 * Count unread messages for a booking participant
 */
router.get("/:bookingId/unread", verifyToken, (req, res) => {
  const bookingId = parseInt(req.params.bookingId);
  const bookings  = readBookings();
  const booking   = bookings.find(b => b.id === bookingId);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const messages = readMessages().filter(
    m => m.bookingId === bookingId && m.senderId !== req.user.id && !m.read
  );
  res.json({ count: messages.length });
});

/**
 * PATCH /api/messages/:bookingId/read
 * Mark all messages from other party as read
 */
router.patch("/:bookingId/read", verifyToken, (req, res) => {
  const bookingId = parseInt(req.params.bookingId);
  const messages  = readMessages();
  let updated = 0;
  messages.forEach(m => {
    if (m.bookingId === bookingId && m.senderId !== req.user.id && !m.read) {
      m.read = true;
      updated++;
    }
  });
  writeMessages(messages);
  res.json({ marked: updated });
});

module.exports = router;
