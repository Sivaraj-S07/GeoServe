/**
 * idempotencyStore.js
 *
 * Simple file-backed idempotency store.
 * Prevents double payments by recording every payment attempt keyed on
 * `booking_<id>` before the payment call and checking it on retry.
 *
 * In production you would swap this for Redis (SET NX + TTL) or a DB row,
 * but for the JSON-file persistence model used here this is consistent.
 */

const fs   = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "../data/idempotency.json");

// ─── Helpers ─────────────────────────────────────────────────────────────────
function readStore() {
  if (!fs.existsSync(FILE)) return {};
  try { return JSON.parse(fs.readFileSync(FILE, "utf-8")); }
  catch { return {}; }
}

function writeStore(store) {
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2));
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * check(key)
 * Returns the stored record if this key has already been processed,
 * or null if it hasn't.
 */
function check(key) {
  const store = readStore();
  return store[key] || null;
}

/**
 * lock(key)
 * Marks a key as "in-flight". Returns false if the key is already locked
 * (another request is mid-flight), true on success.
 */
function lock(key) {
  const store = readStore();
  if (store[key]?.status === "locked") return false;
  store[key] = { status: "locked", lockedAt: new Date().toISOString() };
  writeStore(store);
  return true;
}

/**
 * resolve(key, result)
 * Marks a locked key as completed and stores the final result.
 */
function resolve(key, result) {
  const store = readStore();
  store[key] = {
    status:      "completed",
    result,
    completedAt: new Date().toISOString(),
  };
  writeStore(store);
}

/**
 * release(key)
 * Removes a lock without completing (used on error so the call can be retried).
 */
function release(key) {
  const store = readStore();
  delete store[key];
  writeStore(store);
}

module.exports = { check, lock, resolve, release };
