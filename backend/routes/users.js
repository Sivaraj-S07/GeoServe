/**
 * routes/users.js — PostgreSQL version
 */
const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { requireRole } = require("../middleware/role");

const ONLINE_MS = 5 * 60 * 1000;

function isOnline(lastSeenAt) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_MS;
}

function safe(u) {
  return {
    id: Number(u.id),
    // Always expose English name in both `name` and `nameEn` for consistent display.
    name: u.name_en || u.name || "",
    nameEn: u.name_en || u.name || "",
    email: u.email, role: u.role,
    avatar: u.avatar||"", lat: Number(u.lat), lng: Number(u.lng),
    pincode: u.pincode||"", street: u.street||"", phone: u.phone||"",
    referralCode: u.referral_code||"", loyaltyPoints: u.loyalty_points||0,
    createdAt: u.created_at, lastSeenAt: u.last_seen_at||null,
    isOnline: isOnline(u.last_seen_at),
  };
}

/* GET /api/users — admin only, role===user only */
router.get("/", requireRole("admin"), async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE role='user' ORDER BY created_at DESC");
    res.json(rows.map(safe));
  } catch(err) {
    console.error("[users/]", err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* GET /api/users/stats */
router.get("/stats", requireRole("admin"), async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT role,last_seen_at FROM users");
    const total         = rows.length;
    const admins        = rows.filter(u=>u.role==="admin").length;
    const workers       = rows.filter(u=>u.role==="worker").length;
    const users         = rows.filter(u=>u.role==="user").length;
    const onlineUsers   = rows.filter(u=>u.role==="user"  && isOnline(u.last_seen_at)).length;
    const onlineWorkers = rows.filter(u=>u.role==="worker"&& isOnline(u.last_seen_at)).length;
    res.json({ total,admins,workers,users,onlineUsers,onlineWorkers });
  } catch(err) {
    console.error("[users/stats]", err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* GET /api/users/online-activity */
router.get("/online-activity", requireRole("admin"), async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE role!='admin' ORDER BY last_seen_at DESC NULLS LAST"
    );
    res.json(rows.filter(u=>isOnline(u.last_seen_at)).map(safe));
  } catch(err) {
    console.error("[users/online-activity]", err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* DELETE /api/users/:id */
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error:"Cannot delete yourself" });
    const { rowCount } = await pool.query("DELETE FROM users WHERE id=$1", [id]);
    if (!rowCount) return res.status(404).json({ error:"User not found" });
    res.json({ message:"User deleted" });
  } catch(err) {
    console.error("[users/delete]", err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

module.exports = router;
