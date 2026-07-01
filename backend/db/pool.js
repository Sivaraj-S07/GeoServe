"use strict";

const { Pool } = require("pg");

// ── SSL Configuration ─────────────────────────────────────────────────────────
// Neon (and most managed Postgres providers) require SSL.
// We explicitly set sslmode=verify-full in the connection string to silence
// the pg-connection-string deprecation warning about 'require'/'prefer' aliases,
// and we keep rejectUnauthorized: true so the server certificate is always
// verified (prevents MITM attacks on the DB connection).
//
// If DATABASE_URL already contains ?sslmode=..., we leave it untouched.
// Otherwise we append ?sslmode=verify-full so pg never falls back to a weaker mode.
function buildConnectionString() {
  const url = process.env.DATABASE_URL || "";
  if (!url) return url;

  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("sslmode")) {
      parsed.searchParams.set("sslmode", "verify-full");
    }
    return parsed.toString();
  } catch {
    // If URL parsing fails (e.g. non-standard format), return as-is
    return url;
  }
}

const pool = new Pool({
  connectionString: buildConnectionString(),
  ssl: {
    // Verify the server's certificate against the system CA bundle.
    // Set to false ONLY in local development without SSL (never in production).
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
  },
  max:                    parseInt(process.env.DB_POOL_MAX)     || 10,
  idleTimeoutMillis:      parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis:parseInt(process.env.DB_CONN_TIMEOUT) || 10000,
});

pool.on("error", (err) => {
  console.error("[DB Pool] Unexpected client error:", err.message);
});

// Verify connectivity on startup and log clearly
pool.connect()
  .then((client) => {
    client.release();
    console.log("[DB Pool] ✓ PostgreSQL connection established (SSL: verify-full)");
  })
  .catch((err) => {
    console.error("[DB Pool] ✗ Failed to connect to PostgreSQL:", err.message);
    // Don't crash process — pool will retry on next query
  });

module.exports = pool;
