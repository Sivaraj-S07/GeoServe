/**
 * commissionService.js
 *
 * Handles the platform's 5% commission on every confirmed booking.
 *
 * Responsibilities:
 *  1. Calculate worker payout vs. admin commission from a booking's cost fields
 *  2. Credit the admin wallet (JSON ledger) with every commission transaction
 *  3. In live mode, optionally initiate a Razorpay payout to the admin's own
 *     bank account (useful when the platform also wants automatic sweeping)
 *
 * Split formula (using the already-agreed cost breakdown stored at booking time):
 *   workerPayout    = booking.serviceCost        (rate × hours, shown to user)
 *   adminCommission = booking.platformFee        (5% already displayed to user)
 *   total           = booking.cost               (= serviceCost + platformFee)
 *
 * This preserves the exact amounts the user saw at checkout — no surprises.
 */

const fs   = require("fs");
const path = require("path");

const WALLET_FILE = path.join(__dirname, "../data/adminWallet.json");
const COMMISSION_RATE = 0.05;   // 5%  — single source of truth

// ─── Wallet helpers ───────────────────────────────────────────────────────────
function readWallet() {
  if (!fs.existsSync(WALLET_FILE)) {
    return { balance: 0, totalEarned: 0, totalBookings: 0, transactions: [] };
  }
  try { return JSON.parse(fs.readFileSync(WALLET_FILE, "utf-8")); }
  catch { return { balance: 0, totalEarned: 0, totalBookings: 0, transactions: [] }; }
}

function writeWallet(wallet) {
  fs.writeFileSync(WALLET_FILE, JSON.stringify(wallet, null, 2));
}

// ─── Commission Calculator ────────────────────────────────────────────────────
/**
 * calculateSplit(booking)
 *
 * Returns the precise INR amounts for the worker and admin from this booking.
 * Uses the values already stored on the booking object (set at creation time)
 * so the split always matches what the user agreed to pay.
 *
 * Fallback: if serviceCost / platformFee were not stored, re-derives from cost.
 */
function calculateSplit(booking) {
  const total = Number(booking.cost) || 0;

  // Prefer the already-calculated breakdown stored at booking creation
  if (booking.serviceCost && booking.platformFee) {
    return {
      workerPayout:    Math.round(Number(booking.serviceCost)),
      adminCommission: Math.round(Number(booking.platformFee)),
      total,
      rate:            COMMISSION_RATE,
    };
  }

  // Fallback derivation
  const adminCommission = Math.round(total * COMMISSION_RATE);
  return {
    workerPayout:    total - adminCommission,
    adminCommission,
    total,
    rate:            COMMISSION_RATE,
  };
}

// ─── Admin Wallet Credit ──────────────────────────────────────────────────────
/**
 * creditAdminWallet(booking, split, mode)
 *
 * Records the commission in the admin wallet ledger and returns a
 * transaction record. This is the "admin payment" — the platform's cut
 * accumulates here and the admin can withdraw / sweep at any time.
 *
 * @param {Object} booking  – confirmed booking object
 * @param {Object} split    – { workerPayout, adminCommission, total, rate }
 * @param {string} mode     – "simulation" | "live"
 * @returns {Object}        – the commission transaction record
 */
function creditAdminWallet(booking, split, mode) {
  const wallet = readWallet();
  const now    = new Date().toISOString();

  const txn = {
    id:             `COMM_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    bookingId:      booking.id,
    workerId:       booking.workerId,
    workerName:     booking.workerName,
    userName:       booking.userName,
    amount:         split.adminCommission,     // ← what admin earns
    workerPayout:   split.workerPayout,        // ← for cross-reference
    totalCost:      split.total,
    commissionRate: split.rate,
    status:         "credited",
    mode,
    createdAt:      now,
    note:           `Commission from booking #${booking.id} — ${booking.category}`,
  };

  wallet.balance       += split.adminCommission;
  wallet.totalEarned   += split.adminCommission;
  wallet.totalBookings += 1;
  wallet.transactions.unshift(txn);            // newest first
  wallet.updatedAt = now;

  writeWallet(wallet);

  console.log(
    `[CommissionService] Wallet credited ₹${split.adminCommission} ` +
    `(booking #${booking.id}) | Balance: ₹${wallet.balance} | mode: ${mode}`
  );

  return txn;
}

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * processAdminCommission(booking, mode)
 *
 * Full commission processing pipeline:
 *  1. Calculate worker/admin split
 *  2. Credit admin wallet
 *  3. Return the transaction + split breakdown
 *
 * @param {Object} booking  – confirmed booking
 * @param {string} mode     – "simulation" | "live"
 * @returns {Object} {
 *   adminTransactionId, commissionStatus, adminCommission,
 *   workerPayout, commissionRate, split, txn
 * }
 */
function processAdminCommission(booking, mode = "simulation") {
  const split = calculateSplit(booking);

  if (split.adminCommission <= 0) {
    console.warn(`[CommissionService] Booking #${booking.id} has zero commission — skipping wallet credit.`);
    return {
      adminTransactionId: null,
      commissionStatus:   "skipped",
      adminCommission:    0,
      workerPayout:       split.workerPayout,
      commissionRate:     split.rate,
      split,
    };
  }

  const txn = creditAdminWallet(booking, split, mode);

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

/**
 * getWallet()
 * Returns the current admin wallet state (for admin dashboard).
 */
function getWallet() {
  return readWallet();
}

/**
 * getWalletStats()
 * Returns summary statistics for the admin commission dashboard.
 */
function getWalletStats() {
  const wallet = readWallet();
  const txns   = wallet.transactions || [];

  const today     = new Date().toDateString();
  const thisMonth = new Date().toISOString().slice(0, 7);

  return {
    balance:           wallet.balance          || 0,
    totalEarned:       wallet.totalEarned      || 0,
    totalBookings:     wallet.totalBookings    || 0,
    todayEarnings:     txns
      .filter(t => new Date(t.createdAt).toDateString() === today)
      .reduce((s, t) => s + t.amount, 0),
    monthEarnings:     txns
      .filter(t => t.createdAt?.startsWith(thisMonth))
      .reduce((s, t) => s + t.amount, 0),
    averageCommission: txns.length
      ? Math.round(wallet.totalEarned / txns.length)
      : 0,
    lastTransaction:   txns[0] || null,
  };
}

module.exports = {
  processAdminCommission,
  calculateSplit,
  getWallet,
  getWalletStats,
  COMMISSION_RATE,
};
