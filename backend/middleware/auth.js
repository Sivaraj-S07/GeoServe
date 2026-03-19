const jwt  = require("jsonwebtoken");
const fs   = require("fs");
const path = require("path");

const SECRET     = process.env.JWT_SECRET || "geoserve_secret_2024";
const USERS_FILE = path.join(__dirname, "../data/users.json");

/** Update lastSeenAt for the authenticated user (fire-and-forget, never blocks) */
function touchLastSeen(userId) {
  try {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    const idx   = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx].lastSeenAt = new Date().toISOString();
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }
  } catch (_) { /* never crash the request over a heartbeat write */ }
}

function verifyToken(req, res, next) {
  const auth = req.headers["authorization"];
  if (!auth) return res.status(401).json({ error: "No token provided" });
  const token = auth.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token missing" });
  try {
    req.user = jwt.verify(token, SECRET);
    // Throttle writes: only update if last write was >30 s ago (stored in memory)
    const now = Date.now();
    if (!verifyToken._ts) verifyToken._ts = {};
    if (!verifyToken._ts[req.user.id] || now - verifyToken._ts[req.user.id] > 30_000) {
      verifyToken._ts[req.user.id] = now;
      setImmediate(() => touchLastSeen(req.user.id));
    }
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { verifyToken, SECRET };
