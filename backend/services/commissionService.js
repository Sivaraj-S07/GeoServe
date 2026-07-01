/**
 * services/commissionService.js — PostgreSQL version
 *
 * Handles admin wallet credits, split calculation, and payout account management.
 */

"use strict";

const crypto = require("crypto");
const pool   = require("../db/pool");

const COMMISSION_RATE = 0.05; // 5%

// ── Wallet helpers ────────────────────────────────────────────────────────────
async function getWallet() {
  const { rows } = await pool.query("SELECT * FROM admin_wallet WHERE id=1");
  return rows[0] || { balance: 0, total_earned: 0, total_bookings: 0, total_withdrawn: 0, payout_account: null };
}

async function getWalletStats() {
  const wallet = await getWallet();

  // Use SQL aggregates instead of fetching all rows into memory
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [todayRes, monthRes, countRes, lastRes] = await Promise.all([
    pool.query(
      "SELECT COALESCE(SUM(amount),0) AS total FROM wallet_transactions WHERE type!='withdrawal' AND created_at >= $1",
      [today.toISOString()]
    ),
    pool.query(
      "SELECT COALESCE(SUM(amount),0) AS total FROM wallet_transactions WHERE type!='withdrawal' AND created_at >= $1",
      [monthStart.toISOString()]
    ),
    pool.query("SELECT COUNT(*) FROM wallet_transactions WHERE type!='withdrawal'"),
    pool.query("SELECT * FROM wallet_transactions WHERE type!='withdrawal' ORDER BY created_at DESC LIMIT 1"),
  ]);

  const totalCount = parseInt(countRes.rows[0].count) || 0;
  const averageCommission = totalCount
    ? Math.round(Number(wallet.total_earned || 0) / totalCount)
    : 0;

  return {
    todayEarnings:     Number(todayRes.rows[0].total) || 0,
    monthEarnings:     Number(monthRes.rows[0].total) || 0,
    averageCommission,
    lastTransaction:   lastRes.rows[0] || null,
  };
}

async function getPayoutAccount() {
  const w = await getWallet();
  return w.payout_account || null;
}

async function setPayoutAccount(account) {
  // Sanitize inputs
  const pa = {
    name:          String(account.name          || "").trim().substring(0, 100),
    accountNumber: String(account.accountNumber || "").trim().replace(/\s/g, ""),
    ifscCode:      String(account.ifscCode      || "").trim().toUpperCase(),
    bankName:      String(account.bankName      || "").trim().substring(0, 100),
    upiId:         String(account.upiId         || "").trim().toLowerCase(),
    phone:         String(account.phone         || "").trim().replace(/[^\d+]/g, ""),
    updatedAt:     new Date().toISOString(),
  };
  await pool.query(
    "UPDATE admin_wallet SET payout_account=$1, updated_at=NOW() WHERE id=1",
    [JSON.stringify(pa)]
  );
  return pa;
}

// ── Split calculation ─────────────────────────────────────────────────────────
function calculateSplit(booking) {
  const serviceCost  = Math.max(0, Number(booking.serviceCost  || booking.service_cost)  || 0);
  const distanceCost = Math.max(0, Number(booking.distanceCost || booking.distance_cost) || 0);
  const platformFee  = Math.max(0, Number(booking.platformFee  || booking.platform_fee)  || 0);
  const total        = Math.max(0, Number(booking.cost) || (serviceCost + distanceCost + platformFee));

  // If split details already computed (preferred path)
  if (booking.serviceCost !== undefined || booking.service_cost !== undefined) {
    return {
      workerPayout:    Math.round(serviceCost + distanceCost),
      adminCommission: Math.round(platformFee),
      distanceCost:    Math.round(distanceCost),
      serviceCost:     Math.round(serviceCost),
      total:           Math.round(total),
      rate:            COMMISSION_RATE,
    };
  }

  // Fallback: derive from total
  const adminCommission = Math.round(total * COMMISSION_RATE);
  return {
    workerPayout:    Math.round(total - adminCommission),
    adminCommission: Math.round(adminCommission),
    distanceCost:    0,
    serviceCost:     Math.round(total - adminCommission),
    total:           Math.round(total),
    rate:            COMMISSION_RATE,
  };
}

// ── Credit admin wallet ───────────────────────────────────────────────────────
async function creditAdminWallet(booking, split, mode) {
  const wallet = await getWallet();
  const now    = new Date().toISOString();
  const txnId  = `COMM_${Date.now()}_${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const pa     = wallet.payout_account || null;

  await pool.query(
    `INSERT INTO wallet_transactions(
       id, type, booking_id, worker_id, worker_name, user_name,
       category, amount, worker_payout, service_cost, distance_cost, total_cost,
       commission_rate, status, mode, credited_to, note, created_at
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [
      txnId, "commission",
      booking.id, booking.workerId || booking.worker_id,
      (booking.workerName || booking.worker_name || "").substring(0, 100),
      (booking.userName   || booking.user_name   || "").substring(0, 100),
      (booking.category   || "").substring(0, 100),
      split.adminCommission, split.workerPayout,
      split.serviceCost || 0, split.distanceCost || 0, split.total,
      split.rate, "credited", mode,
      pa ? JSON.stringify(pa) : null,
      `${Math.round(split.rate * 100)}% commission — booking #${booking.id} (${booking.category || "service"})`,
      now,
    ]
  );

  const newBalance  = Math.max(0, Number(wallet.balance  || 0) + split.adminCommission);
  const newEarned   = Number(wallet.total_earned  || 0) + split.adminCommission;
  const newBookings = Number(wallet.total_bookings || 0) + 1;

  await pool.query(
    "UPDATE admin_wallet SET balance=$1, total_earned=$2, total_bookings=$3, updated_at=NOW() WHERE id=1",
    [newBalance, newEarned, newBookings]
  );

  return { id: txnId };
}

// ── Process admin commission ──────────────────────────────────────────────────
async function processAdminCommission(booking, mode = "simulation") {
  const split = calculateSplit(booking);

  if (split.adminCommission <= 0) {
    return {
      adminTransactionId: null,
      commissionStatus:   "skipped",
      adminCommission:    0,
      workerPayout:       split.workerPayout,
      commissionRate:     split.rate,
      split,
    };
  }

  const txn = await creditAdminWallet(booking, split, mode);
  return {
    adminTransactionId: txn.id,
    commissionStatus:   "credited",
    adminCommission:    split.adminCommission,
    workerPayout:       split.workerPayout,
    commissionRate:     split.rate,
    split,
    txn,
  };
}

module.exports = {
  processAdminCommission, calculateSplit,
  getWallet, getWalletStats, getPayoutAccount, setPayoutAccount,
  COMMISSION_RATE,
};
