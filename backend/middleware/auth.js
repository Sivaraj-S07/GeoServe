/**
 * middleware/auth.js
 *
 * JWT verification middleware.
 * Reads the token from:
 *   1. Authorization: Bearer <token>  header  (primary)
 *   2. gs_token cookie                        (browser fallback)
 *
 * Security:
 *  - Algorithm pinned to HS256 (prevents alg:none attacks)
 *  - id always normalized to Number (prevents string/int mismatch in ownership checks)
 *  - lastSeenAt updated via PostgreSQL, not JSON file (consistent with DB migration)
 *  - Update throttled to once per 60 s per user (fire-and-forget)
 */

"use strict";

const jwt  = require("jsonwebtoken");
const pool = require("../db/pool");

const SECRET = process.env.JWT_SECRET;

if (!SECRET || SECRET.includes("REPLACE_WITH") || SECRET === "geoserve_secret_2024") {
  if (process.env.NODE_ENV === "production") {
    // Hard fail in production — never use a default secret
    throw new Error(
      "[Auth] FATAL: JWT_SECRET is not set or is using an insecure default. " +
      "Set a strong, random 32+ character secret in your environment before deploying."
    );
  }
  console.warn(
    "[Auth] WARNING: JWT_SECRET is not set or is using an insecure default. " +
    "Set a strong, random 32+ character secret in your .env before deploying."
  );
}

const EFFECTIVE_SECRET = SECRET || "geoserve_secret_2024";

// ── lastSeenAt throttle ───────────────────────────────────────────────────────
const _lastSeenThrottle = new Map(); // userId → lastUpdateTimestamp
const THROTTLE_MS = 60_000; // 60 seconds

// Purge throttle entries older than 2× THROTTLE_MS to prevent unbounded growth
// (one user entry ≈ 50 bytes; 100k users ≈ 5 MB — still runs cleanup periodically)
setInterval(() => {
  const cutoff = Date.now() - THROTTLE_MS * 2;
  for (const [uid, ts] of _lastSeenThrottle) {
    if (ts < cutoff) _lastSeenThrottle.delete(uid);
  }
}, 10 * 60 * 1000).unref(); // every 10 min, unref so it doesn't keep process alive

function touchLastSeen(userId) {
  const now = Date.now();
  if (_lastSeenThrottle.has(userId) && now - _lastSeenThrottle.get(userId) < THROTTLE_MS) return;
  _lastSeenThrottle.set(userId, now);
  setImmediate(() => {
    pool.query("UPDATE users SET last_seen_at=NOW() WHERE id=$1", [userId]).catch(() => {/* ignore */});
  });
}

// ── verifyToken ───────────────────────────────────────────────────────────────
function verifyToken(req, res, next) {
  // 1. Authorization header
  let token = null;
  const auth = req.headers["authorization"];
  if (auth && auth.startsWith("Bearer ")) {
    token = auth.slice(7).trim();
  }

  // 2. Cookie fallback
  if (!token && req.cookies && req.cookies.gs_token) {
    token = req.cookies.gs_token;
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    req.user = jwt.verify(token, EFFECTIVE_SECRET, {
      algorithms: ["HS256"], // explicit algorithm — prevents alg confusion attacks
    });

    // Normalize id to Number (tokens from older code may carry it as a string)
    if (req.user && req.user.id !== undefined) {
      req.user.id = Number(req.user.id);
    }

    touchLastSeen(req.user.id);
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }
    return res.status(401).json({ error: "Invalid authentication token." });
  }
}

module.exports = { verifyToken, SECRET: EFFECTIVE_SECRET };
