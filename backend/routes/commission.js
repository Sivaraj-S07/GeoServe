/**
 * routes/commission.js
 *
 * Admin-only endpoints for the platform commission wallet.
 *
 * GET  /api/commission/wallet        – current balance + summary stats
 * GET  /api/commission/transactions  – full ledger (paginated)
 * GET  /api/commission/transactions/:id – single commission transaction
 * POST /api/commission/withdraw      – record a wallet withdrawal (manual/sweep)
 * GET  /api/commission/summary       – aggregated stats for admin dashboard
 */

const express = require("express");
const router  = express.Router();
const fs      = require("fs");
const path    = require("path");

const { requireRole }                             = require("../middleware/role");
const { getWallet, getWalletStats, COMMISSION_RATE } = require("../services/commissionService");

const WALLET_FILE   = path.join(__dirname, "../data/adminWallet.json");
const BOOKINGS_FILE = path.join(__dirname, "../data/bookings.json");

const readWallet   = () => JSON.parse(fs.readFileSync(WALLET_FILE,   "utf-8"));
const writeWallet  = (d) => fs.writeFileSync(WALLET_FILE, JSON.stringify(d, null, 2));
const readBookings = () => JSON.parse(fs.readFileSync(BOOKINGS_FILE, "utf-8"));

// ── All routes require admin role ─────────────────────────────────────────────

/**
 * GET /api/commission/wallet
 * Returns current wallet balance and key statistics.
 */
router.get("/wallet", requireRole("admin"), (req, res) => {
  const stats  = getWalletStats();
  const wallet = getWallet();

  res.json({
    balance:           wallet.balance       || 0,
    totalEarned:       wallet.totalEarned   || 0,
    totalBookings:     wallet.totalBookings || 0,
    todayEarnings:     stats.todayEarnings,
    monthEarnings:     stats.monthEarnings,
    averageCommission: stats.averageCommission,
    commissionRate:    COMMISSION_RATE,
    lastUpdated:       wallet.updatedAt || null,
    lastTransaction:   stats.lastTransaction,
  });
});

/**
 * GET /api/commission/transactions?page=1&limit=20&status=credited
 * Paginated ledger of all commission transactions.
 */
router.get("/transactions", requireRole("admin"), (req, res) => {
  const wallet = readWallet();
  let txns = wallet.transactions || [];

  // Optional filter by status
  const { status, bookingId } = req.query;
  if (status)    txns = txns.filter(t => t.status === status);
  if (bookingId) txns = txns.filter(t => String(t.bookingId) === String(bookingId));

  // Pagination
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const total = txns.length;
  const slice = txns.slice((page - 1) * limit, page * limit);

  res.json({
    transactions: slice,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  });
});

/**
 * GET /api/commission/transactions/:id
 * Single commission transaction by ID.
 */
router.get("/transactions/:id", requireRole("admin"), (req, res) => {
  const wallet = readWallet();
  const txn    = (wallet.transactions || []).find(t => t.id === req.params.id);
  if (!txn) return res.status(404).json({ error: "Transaction not found" });

  // Cross-reference the booking for full context
  const bookings = readBookings();
  const booking  = bookings.find(b => b.id === txn.bookingId);

  res.json({ ...txn, booking: booking || null });
});

/**
 * POST /api/commission/withdraw
 * Records a manual withdrawal / sweep from the admin wallet.
 * Body: { amount, note, reference }
 *
 * This does NOT initiate a real bank transfer — it records the withdrawal
 * so the balance reflects what has been swept out. The actual bank transfer
 * is done separately by the admin via Razorpay dashboard or banking app.
 */
router.post("/withdraw", requireRole("admin"), (req, res) => {
  const { amount, note, reference } = req.body;
  const withdrawAmount = Number(amount);

  if (!withdrawAmount || withdrawAmount <= 0)
    return res.status(400).json({ error: "A positive amount is required" });

  const wallet = readWallet();

  if (withdrawAmount > wallet.balance)
    return res.status(400).json({
      error:           "Withdrawal amount exceeds available balance",
      availableBalance: wallet.balance,
      requested:        withdrawAmount,
    });

  const now = new Date().toISOString();
  const txn = {
    id:        `WDR_${Date.now()}_${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    type:      "withdrawal",
    amount:    -withdrawAmount,           // negative — funds leaving wallet
    note:      note || "Manual withdrawal",
    reference: reference || null,
    status:    "completed",
    createdAt: now,
    recordedBy: req.user.id,
  };

  wallet.balance  -= withdrawAmount;
  wallet.updatedAt = now;
  wallet.transactions.unshift(txn);

  writeWallet(wallet);

  res.json({
    message:        "Withdrawal recorded successfully",
    transaction:    txn,
    newBalance:     wallet.balance,
  });
});

/**
 * GET /api/commission/summary
 * Rich aggregate stats for the admin commission dashboard widget.
 */
router.get("/summary", requireRole("admin"), (req, res) => {
  const wallet   = readWallet();
  const bookings = readBookings();
  const txns     = (wallet.transactions || []).filter(t => t.type !== "withdrawal");

  const confirmedBookings = bookings.filter(b => b.status === "confirmed");
  const pendingRetry      = bookings.filter(b => b.commissionStatus === "pending_retry");

  // Monthly breakdown (last 6 months)
  const monthlyMap = {};
  txns.forEach(t => {
    const month = t.createdAt?.slice(0, 7);
    if (month) monthlyMap[month] = (monthlyMap[month] || 0) + (t.amount || 0);
  });
  const monthly = Object.entries(monthlyMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .map(([month, amount]) => ({ month, amount }));

  // Top earning categories
  const categoryMap = {};
  txns.forEach(t => {
    const bk = bookings.find(b => b.id === t.bookingId);
    const cat = bk?.category || "Unknown";
    if (!categoryMap[cat]) categoryMap[cat] = { category: cat, count: 0, total: 0 };
    categoryMap[cat].count += 1;
    categoryMap[cat].total += (t.amount || 0);
  });
  const topCategories = Object.values(categoryMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  res.json({
    wallet: {
      balance:       wallet.balance    || 0,
      totalEarned:   wallet.totalEarned || 0,
      totalBookings: wallet.totalBookings || 0,
    },
    commissionRate:        COMMISSION_RATE,
    confirmedBookingsCount: confirmedBookings.length,
    pendingRetryCount:      pendingRetry.length,
    monthly,
    topCategories,
    recentTransactions:    txns.slice(0, 5),
  });
});

module.exports = router;
