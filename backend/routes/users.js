const express = require("express");
const router  = express.Router();
const fs      = require("fs");
const path    = require("path");
const { requireRole } = require("../middleware/role");

const FILE  = path.join(__dirname, "../data/users.json");
const read  = () => JSON.parse(fs.readFileSync(FILE, "utf-8"));
const write = (d) => fs.writeFileSync(FILE, JSON.stringify(d, null, 2));

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function isOnline(user) {
  if (!user.lastSeenAt) return false;
  return Date.now() - new Date(user.lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

const safe = u => ({
  id:           u.id,
  name:         u.name,
  email:        u.email,
  role:         u.role,
  avatar:       u.avatar || "",
  lat:          u.lat,
  lng:          u.lng,
  pincode:      u.pincode      || "",
  street:       u.street       || "",
  phone:        u.phone        || "",
  referralCode: u.referralCode || "",
  loyaltyPoints:u.loyaltyPoints ?? 0,
  createdAt:    u.createdAt,
  lastSeenAt:   u.lastSeenAt   || null,
  isOnline:     isOnline(u),
});

/* GET /api/users — admin only, returns ONLY role==="user" accounts (workers excluded) */
router.get("/", requireRole("admin"), (req, res) => {
  const allUsers   = read();
  // ✅ STRICTLY return only role==="user" — admins and workers are excluded
  const usersOnly  = allUsers.filter(u => u.role === "user").map(safe);
  res.json(usersOnly);
});

/* GET /api/users/stats — admin only */
router.get("/stats", requireRole("admin"), (req, res) => {
  const users = read();
  res.json({
    total:         users.length,
    admins:        users.filter(u => u.role === "admin").length,
    workers:       users.filter(u => u.role === "worker").length,
    users:         users.filter(u => u.role === "user").length,
    onlineUsers:   users.filter(u => u.role === "user"   && isOnline(u)).length,
    onlineWorkers: users.filter(u => u.role === "worker" && isOnline(u)).length,
  });
});

/* GET /api/users/online-activity — admin only: recently-active users & workers for dashboard */
router.get("/online-activity", requireRole("admin"), (req, res) => {
  const users  = read();
  const active = users
    .filter(u => u.role !== "admin" && isOnline(u))
    .map(safe)
    .sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt));
  res.json(active);
});

/* DELETE /api/users/:id — admin only */
router.delete("/:id", requireRole("admin"), (req, res) => {
  const id       = parseInt(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: "Cannot delete yourself" });
  const users    = read();
  const filtered = users.filter(u => u.id !== id);
  if (filtered.length === users.length) return res.status(404).json({ error: "User not found" });
  write(filtered);
  res.json({ message: "User deleted" });
});

module.exports = router;
