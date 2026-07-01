/**
 * services/idempotencyStore.js — PostgreSQL version
 *
 * Prevents duplicate payment processing.
 * Locks expire after LOCK_TTL_MINUTES to avoid permanent stalls.
 */

"use strict";

const pool = require("../db/pool");

const LOCK_TTL_MINUTES = 10; // stale lock timeout

async function check(key) {
  const { rows } = await pool.query(
    "SELECT * FROM idempotency WHERE key=$1",
    [key]
  );
  const row = rows[0] || null;
  if (!row) return null;

  // Treat stale locks as released
  if (row.status === "locked" && row.locked_at) {
    const ageMs = Date.now() - new Date(row.locked_at).getTime();
    if (ageMs > LOCK_TTL_MINUTES * 60 * 1000) {
      await release(key);
      return null;
    }
  }
  return row;
}

async function lock(key) {
  try {
    const existing = await check(key);
    if (existing?.status === "locked") return false; // already locked
    await pool.query(
      `INSERT INTO idempotency(key, status, locked_at)
         VALUES($1, 'locked', NOW())
       ON CONFLICT(key) DO UPDATE
         SET status='locked', locked_at=NOW(), result=NULL, completed_at=NULL`,
      [key]
    );
    return true;
  } catch {
    return false;
  }
}

async function resolve(key, result) {
  await pool.query(
    "UPDATE idempotency SET status='completed', result=$1, completed_at=NOW() WHERE key=$2",
    [JSON.stringify(result), key]
  );
}

async function release(key) {
  await pool.query("DELETE FROM idempotency WHERE key=$1", [key]);
}

/** Sweep stale locks older than LOCK_TTL_MINUTES (call on server start). */
async function sweepStaleLocks() {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM idempotency WHERE status='locked' AND locked_at < NOW() - INTERVAL '10 minutes'"
    );
    if (rowCount > 0) {
      console.log(`[Idempotency] Swept ${rowCount} stale lock(s).`);
    }
  } catch (err) {
    console.error("[Idempotency] sweepStaleLocks failed:", err.message);
  }
}

module.exports = { check, lock, resolve, release, sweepStaleLocks };
