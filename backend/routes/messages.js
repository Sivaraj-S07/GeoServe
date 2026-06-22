/**
 * routes/messages.js — PostgreSQL version
 */
const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { verifyToken } = require("../middleware/auth");

async function isParticipant(booking, userId, role) {
  if (role==="admin") return true;
  if (Number(booking.user_id)===userId) return true;
  if (Number(booking.worker_user_id)===userId) return true;
  if (role==="worker") {
    const { rows } = await pool.query("SELECT id FROM workers WHERE user_id=$1",[userId]);
    if (rows.length && Number(rows[0].id)===Number(booking.worker_id)) return true;
  }
  return false;
}

/* GET /api/messages/:bookingId */
router.get("/:bookingId", verifyToken, async (req, res) => {
  try {
    const bookingId=parseInt(req.params.bookingId);
    const { rows:br } = await pool.query("SELECT * FROM bookings WHERE id=$1",[bookingId]);
    if (!br.length) return res.status(404).json({ error:"Booking not found" });
    const booking=br[0];
    if (!await isParticipant(booking,req.user.id,req.user.role))
      return res.status(403).json({ error:"Not a participant of this booking" });

    const { rows:msgs } = await pool.query(
      "SELECT * FROM messages WHERE booking_id=$1 ORDER BY created_at ASC",[bookingId]
    );
    const messages=msgs.map(m=>({
      id:Number(m.id),bookingId:Number(m.booking_id),senderId:Number(m.sender_id),
      senderName:m.sender_name,senderRole:m.sender_role,text:m.text,
      read:m.read,createdAt:m.created_at,
    }));

    const contactVisible=["accepted","in_progress","completed","confirmed"].includes(booking.status);
    let contactInfo=null;
    if (contactVisible) {
      const { rows:ur }=await pool.query("SELECT * FROM users WHERE id=$1",[booking.user_id]);
      const { rows:wr }=await pool.query("SELECT * FROM workers WHERE id=$1",[booking.worker_id]);
      const u=ur[0]||{}, w=wr[0]||null;
      contactInfo={
        user:{ name:booking.user_name||u.name||"",phone:booking.user_phone||u.phone||"",avatar:u.avatar||"" },
        worker:w?{ name:w.name,phone:w.phone||"",avatar:w.avatar||"" }:null,
      };
    }
    res.json({ messages, contactInfo, contactVisible });
  } catch(err) {
    console.error("[messages/get]",err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* POST /api/messages/:bookingId */
router.post("/:bookingId", verifyToken, async (req, res) => {
  try {
    const bookingId=parseInt(req.params.bookingId);
    const { rows:br } = await pool.query("SELECT * FROM bookings WHERE id=$1",[bookingId]);
    if (!br.length) return res.status(404).json({ error:"Booking not found" });
    const booking=br[0];
    if (!await isParticipant(booking,req.user.id,req.user.role))
      return res.status(403).json({ error:"Not a participant of this booking" });
    if (!["accepted","in_progress","completed","confirmed"].includes(booking.status))
      return res.status(400).json({ error:"Messaging is available only after booking is accepted" });
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error:"Message text is required" });
    if (typeof text!=="string"||text.trim().length>2000) return res.status(400).json({ error:"Message must be 1-2000 characters" });

    const id=Date.now();
    const { rows } = await pool.query(
      `INSERT INTO messages(id,booking_id,sender_id,sender_name,sender_role,text,read,created_at)
       VALUES($1,$2,$3,$4,$5,$6,false,NOW()) RETURNING *`,
      [id,bookingId,req.user.id,req.user.name,req.user.role,text.trim()]
    );
    const msg={ id:Number(rows[0].id),bookingId,senderId:req.user.id,senderName:req.user.name,senderRole:req.user.role,text:text.trim(),read:false,createdAt:rows[0].created_at };

    const push=req.app.locals.pushNotification;
    if (push) {
      const recipientId=req.user.role==="user"?Number(booking.worker_user_id):Number(booking.user_id);
      const recipientRole=req.user.role==="user"?"worker":"user";
      push(`${recipientRole}:${recipientId}`,{type:"message",bookingId,message:msg});
    }
    res.status(201).json(msg);
  } catch(err) {
    console.error("[messages/post]",err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* GET /api/messages/:bookingId/unread */
router.get("/:bookingId/unread", verifyToken, async (req, res) => {
  try {
    const bookingId=parseInt(req.params.bookingId);
    const { rows:br } = await pool.query("SELECT id FROM bookings WHERE id=$1",[bookingId]);
    if (!br.length) return res.status(404).json({ error:"Booking not found" });
    const { rows } = await pool.query(
      "SELECT COUNT(*) FROM messages WHERE booking_id=$1 AND sender_id!=$2 AND read=false",
      [bookingId,req.user.id]
    );
    res.json({ count:parseInt(rows[0].count)||0 });
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* PATCH /api/messages/:bookingId/read */
router.patch("/:bookingId/read", verifyToken, async (req, res) => {
  try {
    const bookingId=parseInt(req.params.bookingId);
    const { rowCount } = await pool.query(
      "UPDATE messages SET read=true WHERE booking_id=$1 AND sender_id!=$2 AND read=false",
      [bookingId,req.user.id]
    );
    res.json({ marked:rowCount });
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

module.exports = router;
