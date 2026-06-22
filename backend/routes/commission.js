/**
 * routes/commission.js — PostgreSQL version
 */
const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { requireRole } = require("../middleware/role");
const { getWallet, getWalletStats, getPayoutAccount, setPayoutAccount, COMMISSION_RATE } = require("../services/commissionService");
const idempotency = require("../services/idempotencyStore");

/* GET /api/commission/wallet */
router.get("/wallet", requireRole("admin"), async (_req, res) => {
  try {
    const wallet=await getWallet();
    const stats=await getWalletStats();
    res.json({
      balance:          Number(wallet.balance)||0,
      totalEarned:      Number(wallet.total_earned)||0,
      totalBookings:    Number(wallet.total_bookings)||0,
      totalWithdrawn:   Number(wallet.total_withdrawn)||0,
      todayEarnings:    stats.todayEarnings,
      monthEarnings:    stats.monthEarnings,
      averageCommission:stats.averageCommission,
      commissionRate:   COMMISSION_RATE,
      lastUpdated:      wallet.updated_at||null,
      lastTransaction:  stats.lastTransaction,
      payoutAccount:    wallet.payout_account||null,
    });
  } catch(err) {
    console.error("[commission/wallet]",err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* GET /api/commission/payout-account */
router.get("/payout-account", requireRole("admin"), async (_req, res) => {
  try {
    res.json({ payoutAccount: await getPayoutAccount() });
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* PUT /api/commission/payout-account */
router.put("/payout-account", requireRole("admin"), async (req, res) => {
  try {
    const { name,accountNumber,ifscCode,bankName,upiId,phone } = req.body;
    if (!accountNumber&&!upiId&&!phone)
      return res.status(400).json({ error:"Provide at least one of: accountNumber, upiId, or phone" });
    if (accountNumber&&ifscCode&&!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase()))
      return res.status(400).json({ error:"Invalid IFSC code format (e.g. SBIN0001234)" });
    const saved=await setPayoutAccount({name,accountNumber,ifscCode,bankName,upiId,phone});
    console.log(`[Commission] Payout account updated by admin ${req.user.email}`);
    res.json({ ok:true, message:"Commission payout account updated successfully", payoutAccount:saved });
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* GET /api/commission/transactions
 * OPTIMIZED: pagination done in SQL (LIMIT/OFFSET) — no full-table fetch.
 */
router.get("/transactions", requireRole("admin"), async (req, res) => {
  try {
    const { status, type, bookingId } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    // Build filter clause
    const where = ["1=1"];
    const params = [];
    let i = 1;
    if (status)    { where.push(`status=$${i++}`);     params.push(status); }
    if (type)      { where.push(`type=$${i++}`);       params.push(type); }
    if (bookingId) { where.push(`booking_id=$${i++}`); params.push(parseInt(bookingId)); }

    const whereClause = where.join(" AND ");

    // COUNT and data in parallel
    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM wallet_transactions WHERE ${whereClause}`, params),
      pool.query(
        `SELECT * FROM wallet_transactions WHERE ${whereClause}
         ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`,
        [...params, limit, offset]
      ),
    ]);

    const total = parseInt(countRes.rows[0].count) || 0;
    const txns  = dataRes.rows.map(t => ({
      id: t.id, type: t.type, bookingId: t.booking_id ? Number(t.booking_id) : null,
      workerId: t.worker_id ? Number(t.worker_id) : null,
      workerName: t.worker_name, userName: t.user_name, category: t.category,
      amount: Number(t.amount), workerPayout: Number(t.worker_payout),
      serviceCost: Number(t.service_cost), distanceCost: Number(t.distance_cost),
      totalCost: Number(t.total_cost), commissionRate: Number(t.commission_rate),
      status: t.status, mode: t.mode, creditedTo: t.credited_to,
      note: t.note, createdAt: t.created_at,
    }));

    res.json({
      transactions: txns,
      pagination: { page, limit, total, pages: Math.ceil(total / limit), hasMore: page * limit < total },
    });
  } catch (err) {
    console.error("[commission/transactions]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* GET /api/commission/transactions/:id */
router.get("/transactions/:id", requireRole("admin"), async (req, res) => {
  try {
    const { rows:txnRows } = await pool.query("SELECT * FROM wallet_transactions WHERE id=$1",[req.params.id]);
    if (!txnRows.length) return res.status(404).json({ error:"Transaction not found" });
    const t=txnRows[0];
    let booking=null;
    if (t.booking_id) {
      const { rows:br } = await pool.query("SELECT * FROM bookings WHERE id=$1",[t.booking_id]);
      if (br.length) booking=br[0];
    }
    res.json({
      id:t.id,type:t.type,bookingId:t.booking_id?Number(t.booking_id):null,
      workerId:t.worker_id?Number(t.worker_id):null,
      workerName:t.worker_name,userName:t.user_name,category:t.category,
      amount:Number(t.amount),workerPayout:Number(t.worker_payout),
      totalCost:Number(t.total_cost),commissionRate:Number(t.commission_rate),
      status:t.status,mode:t.mode,creditedTo:t.credited_to,
      note:t.note,createdAt:t.created_at,booking,
    });
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* POST /api/commission/withdraw */
router.post("/withdraw", requireRole("admin"), async (req, res) => {
  try {
    const { amount, note, reference } = req.body;
    const withdrawAmount=Number(amount);
    if (!withdrawAmount||withdrawAmount<=0) return res.status(400).json({ error:"A positive amount is required" });
    const wallet=await getWallet();
    if (withdrawAmount>Number(wallet.balance||0))
      return res.status(400).json({ error:"Withdrawal exceeds available balance",available:Number(wallet.balance||0) });

    // Idempotency: prevent double-withdrawal from rapid clicks or retries.
    // Key is scoped to admin + amount + note to allow intentional repeat withdrawals.
    const crypto = require("crypto");
    const idemKey = `withdraw_${req.user.id}_${withdrawAmount}_${(note||"").substring(0,20).replace(/\s/g,"_")}`;
    const existing = await idempotency.check(idemKey);
    if (existing?.status === "locked") {
      return res.status(409).json({ error:"Withdrawal already in progress. Please wait and try again." });
    }
    if (existing?.status === "completed" && existing.result) {
      return res.json({ ...existing.result, idempotent: true });
    }
    await idempotency.lock(idemKey);

    const now=new Date().toISOString();
    const txnId=`WDR_${Date.now()}_${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    await pool.query(
      `INSERT INTO wallet_transactions(id,type,amount,note,reference,status,sent_to,created_at,recorded_by)
       VALUES($1,'withdrawal',$2,$3,$4,'completed',$5,$6,$7)`,
      [txnId,-withdrawAmount,note||"Manual withdrawal",reference||null,
       wallet.payout_account?JSON.stringify(wallet.payout_account):null,now,req.user.id]
    );
    const newBalance=Number(wallet.balance||0)-withdrawAmount;
    const newWithdrawn=Number(wallet.total_withdrawn||0)+withdrawAmount;
    await pool.query("UPDATE admin_wallet SET balance=$1,total_withdrawn=$2,updated_at=NOW() WHERE id=1",[newBalance,newWithdrawn]);
    const withdrawResult = { message:"Withdrawal recorded",transaction:{id:txnId,type:"withdrawal",amount:-withdrawAmount,note:note||"",reference:reference||null,status:"completed",createdAt:now},newBalance };
    await idempotency.resolve(idemKey, withdrawResult);
    res.json(withdrawResult);
  } catch(err) {
    console.error("[commission/withdraw]",err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* GET /api/commission/summary
 * OPTIMIZED: SQL aggregates for monthly/category totals; O(1) Map for booking lookup;
 * booking counts done in SQL, not JS array filter.
 */
router.get("/summary", requireRole("admin"), async (_req, res) => {
  try {
    // Run all queries in parallel
    const [wallet, txnRes, monthlyRes, catRes, confirmedRes, pendingRes, recentRes] = await Promise.all([
      getWallet(),
      // recent 5 transactions for display
      pool.query(`SELECT id,type,amount,category,created_at
                  FROM wallet_transactions WHERE type != 'withdrawal'
                  ORDER BY created_at DESC LIMIT 5`),
      // monthly totals via SQL GROUP BY — eliminates JS aggregation loop
      pool.query(`SELECT to_char(created_at,'YYYY-MM') AS month, SUM(amount) AS total
                  FROM wallet_transactions WHERE type != 'withdrawal'
                  GROUP BY 1 ORDER BY 1 DESC LIMIT 6`),
      // per-category totals via SQL GROUP BY — eliminates O(n×m) JS nested loop
      pool.query(`SELECT COALESCE(NULLIF(category,''),'Other') AS category,
                         COUNT(*) AS count, SUM(amount) AS total
                  FROM wallet_transactions WHERE type != 'withdrawal'
                  GROUP BY 1 ORDER BY total DESC LIMIT 5`),
      // booking status counts via SQL
      pool.query("SELECT COUNT(*) FROM bookings WHERE status='confirmed'"),
      pool.query("SELECT COUNT(*) FROM bookings WHERE commission_status='pending_retry'"),
      // recent txns for SSE / display
      pool.query(`SELECT id,type,amount,category,created_at
                  FROM wallet_transactions WHERE type != 'withdrawal'
                  ORDER BY created_at DESC LIMIT 5`),
    ]);

    res.json({
      wallet: {
        balance:         Number(wallet.balance       || 0),
        totalEarned:     Number(wallet.total_earned  || 0),
        totalBookings:   Number(wallet.total_bookings|| 0),
        totalWithdrawn:  Number(wallet.total_withdrawn|| 0),
      },
      commissionRate: COMMISSION_RATE,
      payoutAccount:  wallet.payout_account || null,
      confirmedBookingsCount: parseInt(confirmedRes.rows[0].count) || 0,
      pendingRetryCount:      parseInt(pendingRes.rows[0].count)   || 0,
      monthly:         monthlyRes.rows.map(r => ({ month: r.month, amount: Number(r.total) })),
      topCategories:   catRes.rows.map(r => ({ category: r.category, count: Number(r.count), total: Number(r.total) })),
      recentTransactions: recentRes.rows.map(t => ({
        id: t.id, type: t.type, amount: Number(t.amount), category: t.category, createdAt: t.created_at,
      })),
    });
  } catch (err) {
    console.error("[commission/summary]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
