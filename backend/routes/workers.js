/**
 * routes/workers.js — PostgreSQL version
 */
const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { verifyToken }  = require("../middleware/auth");
const { requireRole }  = require("../middleware/role");
const { getBankByCode, validateBankAccount, validateUpiId } = require("../config/banks");

const ONLINE_MS = 5 * 60 * 1000;

function haversine(lat1,lng1,lat2,lng2) {
  const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function toJS(w, stripPayout=true) {
  const obj = {
    id: Number(w.id), userId: Number(w.user_id),
    // Always expose the English name in the `name` field so all consumers
    // (bookings, admin, search) consistently display English, not Tamil.
    name: w.name_en || w.name || "",
    nameEn: w.name_en || w.name || "",
    categoryId: w.category_id ? Number(w.category_id) : null,
    phone:w.phone, aadhaarNumber:w.aadhaar_number||"", bio:w.bio, specialization:w.specialization,
    experience:w.experience, yearsOfExp:w.years_of_exp,
    skills:w.skills||[], lat:Number(w.lat), lng:Number(w.lng),
    pincode:w.pincode, street:w.street, avatar:w.avatar,
    availability:w.availability, approved:w.approved,
    rating:Number(w.rating), jobsCompleted:w.jobs_completed,
    hourlyRate:Number(w.hourly_rate),
    payoutAccount:w.payout_account||{},
    verification_status:w.verification_status,
    admin_approval_status:w.admin_approval_status,
    verification_submitted_at:w.verification_submitted_at,
    lastSeenAt:w.last_seen_at, createdAt:w.created_at,
  };
  if (stripPayout) delete obj.payoutAccount;
  return obj;
}

/* GET /api/workers — public, approved+available+verified
 * OPTIMIZED: filters pushed to SQL; only matching rows transferred from DB.
 */
router.get("/", async (req, res) => {
  try {
    const { category, search, lat, lng, radius, pincode } = req.query;

    // Build parameterised SQL — avoids full-table scans for category/pincode filters
    let q = `SELECT * FROM workers
             WHERE approved = true AND availability = true
               AND (verification_status = 'verified'
                    OR verification_status IS NULL
                    OR verification_status = '')`;
    const params = [];
    let i = 1;

    if (category) { q += ` AND category_id = $${i++}`; params.push(parseInt(category)); }
    if (pincode)  { q += ` AND pincode = $${i++}`;     params.push(pincode); }

    let { rows } = await pool.query(q, params);

    // Text search: runs on the already-filtered smaller result set
    if (search) {
      const sq = search.toLowerCase();
      let categoryMap = {};
      try {
        const { rows: cats } = await pool.query("SELECT id, name FROM categories");
        cats.forEach(c => { categoryMap[c.id] = (c.name || "").toLowerCase(); });
      } catch {}
      rows = rows.filter(w => {
        const catName = categoryMap[w.category_id] || "";
        const skills  = Array.isArray(w.skills)
          ? w.skills.join(" ").toLowerCase()
          : (typeof w.skills === "string" ? w.skills.toLowerCase() : "");
        return (
          (w.name_en || w.name || "").toLowerCase().includes(sq) ||
          (w.specialization || "").toLowerCase().includes(sq) ||
          (w.bio || "").toLowerCase().includes(sq) ||
          catName.includes(sq) ||
          skills.includes(sq)
        );
      });
    }

    if (lat && lng) {
      const uLat = parseFloat(lat), uLng = parseFloat(lng);
      rows = rows.map(w => ({ ...w, distance: +haversine(uLat, uLng, Number(w.lat), Number(w.lng)).toFixed(1) }));
      if (radius) rows = rows.filter(w => w.distance <= parseFloat(radius));
      rows.sort((a, b) => a.distance - b.distance);
    }

    res.json(rows.map(w => toJS(w, true)));
  } catch (err) {
    console.error("[workers/]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* GET /api/workers/all — admin */
router.get("/all", requireRole("admin"), async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM workers ORDER BY id");
    const now = Date.now();
    res.json(rows.map(w=>({
      ...toJS(w,false),
      isOnline: w.availability && w.last_seen_at
        ? (now-new Date(w.last_seen_at).getTime()<ONLINE_MS)
        : w.availability===true,
    })));
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* GET /api/workers/my */
router.get("/my", verifyToken, async (req, res) => {
  try {
    if (req.user.role!=="worker") return res.status(403).json({ error:"Workers only" });
    const { rows } = await pool.query("SELECT * FROM workers WHERE user_id=$1",[req.user.id]);
    if (!rows.length) return res.status(404).json({ error:"Worker profile not found" });
    res.json(toJS(rows[0],false));
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* GET /api/workers/:id/payment-info — owner or admin only */
router.get("/:id/payment-info", verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM workers WHERE id=$1",[parseInt(req.params.id)]);
    if (!rows.length) return res.status(404).json({ error:"Worker not found" });
    const w=rows[0];
    // Security: only the worker themselves or an admin can view payment info
    if (req.user.role !== "admin" && Number(w.user_id) !== req.user.id) {
      return res.status(403).json({ error:"Not authorized to view payment information" });
    }
    const pa=w.payout_account||{};
    res.json({
      name: w.name_en || w.name,
      upiId:pa.upiId||null, bankName:pa.bankName||null,
      accountHolderName:pa.accountHolderName||null,
      accountNumberMasked:pa.accountNumber?"****"+pa.accountNumber.slice(-4):null,
      ifscCode:pa.ifscCode||null,
    });
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* GET /api/workers/:id — public */
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM workers WHERE id=$1",[parseInt(req.params.id)]);
    if (!rows.length||!rows[0].approved) return res.status(404).json({ error:"Worker not found" });
    res.json(toJS(rows[0],true));
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* POST /api/workers */
router.post("/", verifyToken, async (req, res) => {
  try {
    if (!["admin","worker"].includes(req.user.role))
      return res.status(403).json({ error:"Admin or worker role required" });
    const { name, nameEn, categoryId, specialization, phone } = req.body;
    if (!name||!categoryId||!specialization||!phone)
      return res.status(400).json({ error:"name, categoryId, specialization and phone are required" });
    const phoneDigits=(phone+"").replace(/\D/g,"");
    if (phoneDigits.length!==10) return res.status(400).json({ error:"Phone number must be exactly 10 digits" });
    if (!req.body.avatar||!req.body.avatar.trim())
      return res.status(400).json({ error:"Work photo is mandatory." });

    const { rows:existing } = await pool.query("SELECT id FROM workers WHERE user_id=$1",[req.user.id]);
    if (existing.length) return res.status(409).json({ error:"A worker profile already exists for your account." });

    const parsedRate=parseFloat(req.body.hourlyRate);
    if (req.body.hourlyRate!==undefined&&(isNaN(parsedRate)||parsedRate<0||parsedRate>100000))
      return res.status(400).json({ error:"Hourly rate must be between 0 and 100000" });

    // Name — mirrors the legacy `name` field when nameEn not explicitly provided.
    const resolvedNameEn = (typeof nameEn==="string"&&nameEn.trim()) ? nameEn.trim() : req.body.name.trim();

    const id=Date.now();
    const { rows } = await pool.query(
      `INSERT INTO workers(id,user_id,name,email,category_id,specialization,bio,experience,
         years_of_exp,skills,phone,lat,lng,pincode,street,avatar,availability,approved,
         rating,jobs_completed,hourly_rate,payout_account,created_at,name_en,name_ta)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true,true,0,0,$17,$18,NOW(),$19,$20)
       RETURNING *`,
      [id,req.user.id,req.body.name.trim(),req.body.email||req.user.email||"",
       parseInt(req.body.categoryId),req.body.specialization.trim(),req.body.bio||"",
       req.body.experience||"",parseInt(req.body.yearsOfExp)||0,
       JSON.stringify(req.body.skills||[]),req.body.phone.trim(),
       parseFloat(req.body.lat)||40.7128,parseFloat(req.body.lng)||-74.006,
       req.body.pincode||"",req.body.street||"",req.body.avatar.trim(),
       parsedRate||500,
       JSON.stringify({accountHolderName:"",accountNumber:"",ifscCode:"",bankName:"",upiId:""}),
       resolvedNameEn, ""]
    );
    res.status(201).json(toJS(rows[0],false));
  } catch(err) {
    console.error("[workers/post]",err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* PUT /api/workers/:id */
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const id=parseInt(req.params.id);
    const { rows:existing } = await pool.query("SELECT * FROM workers WHERE id=$1",[id]);
    if (!existing.length) return res.status(404).json({ error:"Worker not found" });
    if (req.user.role!=="admin"&&Number(existing[0].user_id)!==req.user.id)
      return res.status(403).json({ error:"Not authorized to edit this profile" });

    const w=existing[0];
    const inPayout = req.body.payoutAccount;
    const mergedPayout = inPayout ? {...(w.payout_account||{}),...inPayout} : (w.payout_account||{});
    // Name — only overwrite when explicitly provided.
    const resolvedNameEn = (typeof req.body.nameEn==="string"&&req.body.nameEn.trim()) ? req.body.nameEn.trim() : (req.body.name||w.name_en||w.name);

    const { rows:updated } = await pool.query(
      `UPDATE workers SET
         name=$1,email=$2,category_id=$3,specialization=$4,bio=$5,experience=$6,
         years_of_exp=$7,skills=$8,phone=$9,lat=$10,lng=$11,pincode=$12,street=$13,
         avatar=$14,availability=$15,approved=$16,hourly_rate=$17,payout_account=$18,
         name_en=$19,name_ta='',
         updated_at=NOW()
       WHERE id=$20 RETURNING *`,
      [req.body.name||w.name, req.body.email||w.email,
       parseInt(req.body.categoryId)||Number(w.category_id),
       req.body.specialization||w.specialization, req.body.bio||w.bio,
       req.body.experience||w.experience,
       parseInt(req.body.yearsOfExp)||w.years_of_exp,
       JSON.stringify(req.body.skills||w.skills||[]),
       req.body.phone||w.phone,
       parseFloat(req.body.lat)||Number(w.lat),
       parseFloat(req.body.lng)||Number(w.lng),
       req.body.pincode||w.pincode||"", req.body.street||w.street||"",
       req.body.avatar||w.avatar,
       req.body.availability!==undefined?Boolean(req.body.availability):w.availability,
       req.body.approved!==undefined?Boolean(req.body.approved):w.approved,
       parseFloat(req.body.hourlyRate)||Number(w.hourly_rate),
       JSON.stringify(mergedPayout), resolvedNameEn, id]
    );
    res.json(toJS(updated[0],false));
  } catch(err) {
    console.error("[workers/put]",err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* PATCH /api/workers/:id/payout-account */
router.patch("/:id/payout-account", verifyToken, async (req, res) => {
  try {
    const id=parseInt(req.params.id);
    const { rows:existing } = await pool.query("SELECT * FROM workers WHERE id=$1",[id]);
    if (!existing.length) return res.status(404).json({ error:"Worker not found" });
    if (req.user.role!=="admin"&&Number(existing[0].user_id)!==req.user.id)
      return res.status(403).json({ error:"Not authorized" });
    const w=existing[0]; const old=w.payout_account||{};
    const { accountHolderName,accountNumber,ifscCode,bankName,upiId } = req.body;
    const pa = {
      accountHolderName: accountHolderName||old.accountHolderName||"",
      accountNumber:     accountNumber    ||old.accountNumber    ||"",
      ifscCode:          ifscCode         ||old.ifscCode         ||"",
      bankName:          bankName         ||old.bankName         ||"",
      upiId:             upiId            ||old.upiId            ||"",
    };
    const { rows } = await pool.query(
      "UPDATE workers SET payout_account=$1,updated_at=NOW() WHERE id=$2 RETURNING *",
      [JSON.stringify(pa),id]
    );
    res.json(toJS(rows[0],false));
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* ── BANK ACCOUNTS (Payment Method module) ─────────────────────────────
 * Multiple saved bank accounts per worker, stored inside the existing
 * payout_account JSONB column as payout_account.accounts = [ {...} ].
 * The "primary" account also mirrors onto payout_account.bankName /
 * accountNumber / ifscCode / accountHolderName for backward compatibility
 * with the existing QR/payment-info display code.
 * ──────────────────────────────────────────────────────────────────── */

function assertOwnerOrAdmin(req, res, worker) {
  if (req.user.role !== "admin" && Number(worker.user_id) !== req.user.id) {
    res.status(403).json({ error: "Not authorized" });
    return false;
  }
  return true;
}

function syncPrimaryMirror(pa) {
  const primary = (pa.accounts || []).find(a => a.id === pa.primaryAccountId) || (pa.accounts || [])[0] || null;
  if (primary) {
    pa.bankName          = primary.bankName;
    pa.accountHolderName = primary.accountHolderName;
    pa.accountNumber     = primary.accountNumber;
    pa.ifscCode           = primary.ifscCode;
    pa.primaryAccountId  = primary.id;
  } else {
    pa.bankName = pa.accountHolderName = pa.accountNumber = pa.ifscCode = "";
    pa.primaryAccountId = null;
  }
  const primaryUpi = (pa.upiIds || []).find(u => u.id === pa.primaryUpiId) || (pa.upiIds || [])[0] || null;
  if (primaryUpi) {
    pa.upiId = primaryUpi.upiId;
    pa.primaryUpiId = primaryUpi.id;
  } else {
    pa.upiId = "";
    pa.primaryUpiId = null;
  }
  return pa;
}

/* GET /api/workers/:id/bank-accounts — owner or admin */
router.get("/:id/bank-accounts", verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await pool.query("SELECT * FROM workers WHERE id=$1", [id]);
    if (!rows.length) return res.status(404).json({ error: "Worker not found" });
    if (!assertOwnerOrAdmin(req, res, rows[0])) return;
    const pa = rows[0].payout_account || {};
    res.json({ accounts: pa.accounts || [], primaryAccountId: pa.primaryAccountId || null, upiId: pa.upiId || "" });
  } catch (err) {
    console.error("[workers/bank-accounts/get]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* POST /api/workers/:id/bank-accounts — owner or admin: add a new account */
router.post("/:id/bank-accounts", verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { rows: existing } = await pool.query("SELECT * FROM workers WHERE id=$1", [id]);
    if (!existing.length) return res.status(404).json({ error: "Worker not found" });
    const w = existing[0];
    if (!assertOwnerOrAdmin(req, res, w)) return;

    const { bankCode, bankName, accountHolderName, accountNumber, ifscCode } = req.body;
    const err = validateBankAccount({ bankCode, bankName, accountHolderName, accountNumber, ifscCode });
    if (err) return res.status(400).json({ error: err });

    const pa = w.payout_account || {};
    const accounts = Array.isArray(pa.accounts) ? [...pa.accounts] : [];

    if (accounts.length >= 5) {
      return res.status(400).json({ error: "You can save up to 5 bank accounts. Delete one before adding another." });
    }
    // Prevent exact duplicate (same bank + account number)
    const dup = accounts.find(a => a.accountNumber === String(accountNumber).replace(/\D/g, "") && a.bankCode === bankCode);
    if (dup) return res.status(409).json({ error: "This bank account is already saved." });

    const newAccount = {
      id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      bankCode: bankCode || "OTHER",
      bankName: bankName || (getBankByCode(bankCode) || {}).name || "Other Bank",
      accountHolderName: String(accountHolderName).trim(),
      accountNumber: String(accountNumber).replace(/\D/g, ""),
      ifscCode: String(ifscCode).trim().toUpperCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    accounts.push(newAccount);

    const newPa = { ...pa, accounts };
    if (!newPa.primaryAccountId || accounts.length === 1) newPa.primaryAccountId = newAccount.id;
    syncPrimaryMirror(newPa);

    const { rows } = await pool.query(
      "UPDATE workers SET payout_account=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
      [JSON.stringify(newPa), id]
    );
    res.status(201).json({ account: newAccount, profile: toJS(rows[0], false) });
  } catch (err) {
    console.error("[workers/bank-accounts/post]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* PUT /api/workers/:id/bank-accounts/:accountId — owner or admin: edit an account */
router.put("/:id/bank-accounts/:accountId", verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { accountId } = req.params;
    const { rows: existing } = await pool.query("SELECT * FROM workers WHERE id=$1", [id]);
    if (!existing.length) return res.status(404).json({ error: "Worker not found" });
    const w = existing[0];
    if (!assertOwnerOrAdmin(req, res, w)) return;

    const { bankCode, bankName, accountHolderName, accountNumber, ifscCode } = req.body;
    const err = validateBankAccount({ bankCode, bankName, accountHolderName, accountNumber, ifscCode });
    if (err) return res.status(400).json({ error: err });

    const pa = w.payout_account || {};
    const accounts = Array.isArray(pa.accounts) ? [...pa.accounts] : [];
    const idx = accounts.findIndex(a => a.id === accountId);
    if (idx === -1) return res.status(404).json({ error: "Bank account not found" });

    const normalizedAcctNum = String(accountNumber).replace(/\D/g, "");
    const dup = accounts.find(a => a.id !== accountId && a.accountNumber === normalizedAcctNum && a.bankCode === (bankCode || "OTHER"));
    if (dup) return res.status(409).json({ error: "This bank account is already saved." });

    accounts[idx] = {
      ...accounts[idx],
      bankCode: bankCode || "OTHER",
      bankName: bankName || (getBankByCode(bankCode) || {}).name || "Other Bank",
      accountHolderName: String(accountHolderName).trim(),
      accountNumber: String(accountNumber).replace(/\D/g, ""),
      ifscCode: String(ifscCode).trim().toUpperCase(),
      updatedAt: new Date().toISOString(),
    };

    const newPa = { ...pa, accounts };
    syncPrimaryMirror(newPa);

    const { rows } = await pool.query(
      "UPDATE workers SET payout_account=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
      [JSON.stringify(newPa), id]
    );
    res.json({ account: accounts[idx], profile: toJS(rows[0], false) });
  } catch (err) {
    console.error("[workers/bank-accounts/put]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* DELETE /api/workers/:id/bank-accounts/:accountId — owner or admin */
router.delete("/:id/bank-accounts/:accountId", verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { accountId } = req.params;
    const { rows: existing } = await pool.query("SELECT * FROM workers WHERE id=$1", [id]);
    if (!existing.length) return res.status(404).json({ error: "Worker not found" });
    const w = existing[0];
    if (!assertOwnerOrAdmin(req, res, w)) return;

    const pa = w.payout_account || {};
    const accounts = Array.isArray(pa.accounts) ? [...pa.accounts] : [];
    const idx = accounts.findIndex(a => a.id === accountId);
    if (idx === -1) return res.status(404).json({ error: "Bank account not found" });

    accounts.splice(idx, 1);
    const newPa = { ...pa, accounts };
    if (newPa.primaryAccountId === accountId) newPa.primaryAccountId = accounts[0]?.id || null;
    syncPrimaryMirror(newPa);

    const { rows } = await pool.query(
      "UPDATE workers SET payout_account=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
      [JSON.stringify(newPa), id]
    );
    res.json({ message: "Bank account deleted", profile: toJS(rows[0], false) });
  } catch (err) {
    console.error("[workers/bank-accounts/delete]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* PATCH /api/workers/:id/bank-accounts/:accountId/primary — set as the primary/display account */
router.patch("/:id/bank-accounts/:accountId/primary", verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { accountId } = req.params;
    const { rows: existing } = await pool.query("SELECT * FROM workers WHERE id=$1", [id]);
    if (!existing.length) return res.status(404).json({ error: "Worker not found" });
    const w = existing[0];
    if (!assertOwnerOrAdmin(req, res, w)) return;

    const pa = w.payout_account || {};
    const accounts = Array.isArray(pa.accounts) ? [...pa.accounts] : [];
    if (!accounts.find(a => a.id === accountId)) return res.status(404).json({ error: "Bank account not found" });

    const newPa = { ...pa, primaryAccountId: accountId };
    syncPrimaryMirror(newPa);

    const { rows } = await pool.query(
      "UPDATE workers SET payout_account=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
      [JSON.stringify(newPa), id]
    );
    res.json({ profile: toJS(rows[0], false) });
  } catch (err) {
    console.error("[workers/bank-accounts/primary]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── UPI IDs (Payment Method module) ───────────────────────────────────
 * Multiple saved UPI IDs per worker, stored inside payout_account.upiIds.
 * The "primary" UPI ID mirrors onto payout_account.upiId for backward
 * compatibility with the QR-code generator and BookingCard display.
 * ──────────────────────────────────────────────────────────────────── */

/* GET /api/workers/:id/upi-ids — owner or admin */
router.get("/:id/upi-ids", verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await pool.query("SELECT * FROM workers WHERE id=$1", [id]);
    if (!rows.length) return res.status(404).json({ error: "Worker not found" });
    if (!assertOwnerOrAdmin(req, res, rows[0])) return;
    const pa = rows[0].payout_account || {};
    res.json({ upiIds: pa.upiIds || [], primaryUpiId: pa.primaryUpiId || null });
  } catch (err) {
    console.error("[workers/upi-ids/get]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* POST /api/workers/:id/upi-ids — owner or admin: add a new UPI ID */
router.post("/:id/upi-ids", verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { rows: existing } = await pool.query("SELECT * FROM workers WHERE id=$1", [id]);
    if (!existing.length) return res.status(404).json({ error: "Worker not found" });
    const w = existing[0];
    if (!assertOwnerOrAdmin(req, res, w)) return;

    const raw = String(req.body.upiId || "").trim();
    const err = validateUpiId(raw);
    if (err) return res.status(400).json({ error: err });

    const pa = w.payout_account || {};
    const upiIds = Array.isArray(pa.upiIds) ? [...pa.upiIds] : [];

    if (upiIds.length >= 5) {
      return res.status(400).json({ error: "You can save up to 5 UPI IDs. Remove one before adding another." });
    }
    if (upiIds.some(u => u.upiId.toLowerCase() === raw.toLowerCase())) {
      return res.status(409).json({ error: "This UPI ID is already saved." });
    }

    const newUpi = { id: `upi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, upiId: raw, createdAt: new Date().toISOString() };
    upiIds.push(newUpi);

    const newPa = { ...pa, upiIds };
    if (!newPa.primaryUpiId || upiIds.length === 1) newPa.primaryUpiId = newUpi.id;
    syncPrimaryMirror(newPa);

    const { rows } = await pool.query(
      "UPDATE workers SET payout_account=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
      [JSON.stringify(newPa), id]
    );
    res.status(201).json({ upi: newUpi, profile: toJS(rows[0], false) });
  } catch (err) {
    console.error("[workers/upi-ids/post]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* DELETE /api/workers/:id/upi-ids/:upiRecordId — owner or admin */
router.delete("/:id/upi-ids/:upiRecordId", verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { upiRecordId } = req.params;
    const { rows: existing } = await pool.query("SELECT * FROM workers WHERE id=$1", [id]);
    if (!existing.length) return res.status(404).json({ error: "Worker not found" });
    const w = existing[0];
    if (!assertOwnerOrAdmin(req, res, w)) return;

    const pa = w.payout_account || {};
    const upiIds = Array.isArray(pa.upiIds) ? [...pa.upiIds] : [];
    const idx = upiIds.findIndex(u => u.id === upiRecordId);
    if (idx === -1) return res.status(404).json({ error: "UPI ID not found" });

    upiIds.splice(idx, 1);
    const newPa = { ...pa, upiIds };
    if (newPa.primaryUpiId === upiRecordId) newPa.primaryUpiId = upiIds[0]?.id || null;
    syncPrimaryMirror(newPa);

    const { rows } = await pool.query(
      "UPDATE workers SET payout_account=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
      [JSON.stringify(newPa), id]
    );
    res.json({ message: "UPI ID removed", profile: toJS(rows[0], false) });
  } catch (err) {
    console.error("[workers/upi-ids/delete]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* PATCH /api/workers/:id/upi-ids/:upiRecordId/primary — set the active/primary UPI ID */
router.patch("/:id/upi-ids/:upiRecordId/primary", verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { upiRecordId } = req.params;
    const { rows: existing } = await pool.query("SELECT * FROM workers WHERE id=$1", [id]);
    if (!existing.length) return res.status(404).json({ error: "Worker not found" });
    const w = existing[0];
    if (!assertOwnerOrAdmin(req, res, w)) return;

    const pa = w.payout_account || {};
    const upiIds = Array.isArray(pa.upiIds) ? [...pa.upiIds] : [];
    if (!upiIds.find(u => u.id === upiRecordId)) return res.status(404).json({ error: "UPI ID not found" });

    const newPa = { ...pa, primaryUpiId: upiRecordId };
    syncPrimaryMirror(newPa);

    const { rows } = await pool.query(
      "UPDATE workers SET payout_account=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
      [JSON.stringify(newPa), id]
    );
    res.json({ profile: toJS(rows[0], false) });
  } catch (err) {
    console.error("[workers/upi-ids/primary]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* PATCH /api/workers/:id/availability */
router.patch("/:id/availability", verifyToken, async (req, res) => {
  try {
    const id=parseInt(req.params.id);
    const { rows:existing } = await pool.query("SELECT * FROM workers WHERE id=$1",[id]);
    if (!existing.length) return res.status(404).json({ error:"Worker not found" });
    if (req.user.role!=="admin"&&Number(existing[0].user_id)!==req.user.id)
      return res.status(403).json({ error:"Not authorized" });
    const newVal = req.body.availability!==undefined ? Boolean(req.body.availability) : !existing[0].availability;
    const { rows } = await pool.query(
      "UPDATE workers SET availability=$1,updated_at=NOW() WHERE id=$2 RETURNING *",
      [newVal,id]
    );
    res.json(toJS(rows[0],false));
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* PATCH /api/workers/:id/approve */
router.patch("/:id/approve", requireRole("admin"), async (req, res) => {
  try {
    const id=parseInt(req.params.id);
    const { rows } = await pool.query(
      "UPDATE workers SET approved=true,updated_at=NOW() WHERE id=$1 RETURNING *",[id]
    );
    if (!rows.length) return res.status(404).json({ error:"Worker not found" });
    res.json(toJS(rows[0],false));
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* DELETE /api/workers/:id */
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id=parseInt(req.params.id);
    const { rowCount } = await pool.query("DELETE FROM workers WHERE id=$1",[id]);
    if (!rowCount) return res.status(404).json({ error:"Worker not found" });
    res.json({ message:"Deleted" });
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* ── PRICING ENDPOINTS ──────────────────────────────────────────────────── */

/* GET /api/workers/:id/pricing — public, returns worker's pricing config */
router.get("/:id/pricing", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid worker ID" });
    const { rows } = await pool.query(
      "SELECT hourly_rate, pricing FROM workers WHERE id=$1", [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Worker not found" });
    const w = rows[0];
    const pricing = (typeof w.pricing === "object" && w.pricing !== null) ? w.pricing : {};
    res.json({
      baseHourlyRate: Number(w.hourly_rate) || 500,
      customRates:    pricing.customRates   || {},
      notes:          pricing.notes         || "",
      updatedAt:      pricing.updatedAt     || null,
    });
  } catch (err) {
    console.error("[workers/pricing/get]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* PATCH /api/workers/:id/pricing — worker (owner) or admin only */
router.patch("/:id/pricing", verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid worker ID" });

    const { rows: existing } = await pool.query("SELECT * FROM workers WHERE id=$1", [id]);
    if (!existing.length) return res.status(404).json({ error: "Worker not found" });
    if (req.user.role !== "admin" && Number(existing[0].user_id) !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to edit this worker's pricing" });
    }

    const { baseHourlyRate, customRates, notes } = req.body;

    // Validate baseHourlyRate
    if (baseHourlyRate !== undefined) {
      const rate = parseFloat(baseHourlyRate);
      if (isNaN(rate) || rate < 0 || rate > 100000) {
        return res.status(400).json({ error: "Base hourly rate must be between ₹0 and ₹1,00,000" });
      }
    }

    // Validate customRates — must be { "1": price, "2": price, ... }
    if (customRates !== undefined) {
      if (typeof customRates !== "object" || Array.isArray(customRates)) {
        return res.status(400).json({ error: "customRates must be an object mapping hours→price" });
      }
      for (const [hours, price] of Object.entries(customRates)) {
        const h = parseFloat(hours);
        const p = parseFloat(price);
        if (isNaN(h) || h <= 0 || h > 24) {
          return res.status(400).json({ error: `Invalid hours key "${hours}": must be 0 < hours ≤ 24` });
        }
        if (isNaN(p) || p < 0 || p > 1000000) {
          return res.status(400).json({ error: `Invalid price for ${hours}h: must be ₹0–₹10,00,000` });
        }
      }
    }

    const parsedRate = parseFloat(baseHourlyRate);
    const newRate    = (!isNaN(parsedRate) && parsedRate >= 0) ? parsedRate : Number(existing[0].hourly_rate) || 500;

    const newPricing = {
      customRates: customRates !== undefined
        ? Object.fromEntries(
            Object.entries(customRates).map(([h, p]) => [String(parseFloat(h)), Math.round(parseFloat(p))])
          )
        : (existing[0].pricing?.customRates || {}),
      notes:     typeof notes === "string" ? notes.substring(0, 500) : (existing[0].pricing?.notes || ""),
      updatedAt: new Date().toISOString(),
    };

    const { rows } = await pool.query(
      "UPDATE workers SET pricing=$1, hourly_rate=$2, updated_at=NOW() WHERE id=$3 RETURNING *",
      [JSON.stringify(newPricing), newRate, id]
    );

    res.json({
      baseHourlyRate: Number(rows[0].hourly_rate),
      customRates:    newPricing.customRates,
      notes:          newPricing.notes,
      updatedAt:      newPricing.updatedAt,
    });
  } catch (err) {
    console.error("[workers/pricing/patch]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
