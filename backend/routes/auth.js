/**
 * routes/auth.js — PostgreSQL version
 */
const express  = require("express");
const router   = express.Router();
const jwt      = require("jsonwebtoken");
const bcrypt   = require("bcryptjs");
const pool     = require("../db/pool");
const { SECRET, verifyToken } = require("../middleware/auth");
const { addHistoryEntry }     = require("../services/historyService");

const SALT_ROUNDS = 10;

function makeToken(user) {
  // IMPORTANT: pg returns BIGINT columns (id) as strings to avoid precision
  // loss. Force a numeric id into the token so every downstream
  // req.user.id === Number(...) / !== Number(...) comparison works correctly.
  return jwt.sign(
    { id: Number(user.id), name: user.name, email: user.email, role: user.role },
    SECRET, { expiresIn: "7d" }
  );
}

function safeUser(u, workerId=null) {
  const base = {
    id: Number(u.id), name: u.name_en || u.name || "", email: u.email, role: u.role,
    avatar: u.avatar||"", lat: Number(u.lat)||0, lng: Number(u.lng)||0,
    pincode: u.pincode||"", street: u.street||"", phone: u.phone||"",
    // nameEn kept for backwards-compatibility with any consumers that read it
    nameEn: u.name_en || u.name || "",
  };
  if (workerId) base.workerId = Number(workerId);
  if (u.verification_status) base.verification_status = u.verification_status;
  return base;
}

function checkPassword(plain, stored) {
  if (!plain || !stored) return Promise.resolve(false);
  if (stored.startsWith("$2")) return bcrypt.compare(plain, stored);
  return Promise.resolve(plain === stored);
}

/* POST /api/auth/login */
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error:"Email and password are required" });
    if (typeof email!=="string"||email.length>254||typeof password!=="string"||password.length>128)
      return res.status(400).json({ error:"Invalid credentials format" });
    if (!role||!["user","worker","admin"].includes(role))
      return res.status(400).json({ error:"A valid role must be specified" });

    const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [email.trim().toLowerCase()]);
    const user = rows[0];
    if (!user || !await checkPassword(password, user.password))
      return res.status(401).json({ error:"Invalid email or password" });
    if (user.role !== role)
      return res.status(403).json({ error:`This account is registered as '${user.role}'. Please use the '${user.role}' login.` });

    // Auto-upgrade legacy plaintext password
    let pwd = user.password;
    if (!pwd.startsWith("$2")) {
      pwd = await bcrypt.hash(password, SALT_ROUNDS);
      await pool.query("UPDATE users SET password=$1,last_seen_at=NOW() WHERE id=$2", [pwd, user.id]);
    } else {
      await pool.query("UPDATE users SET last_seen_at=NOW() WHERE id=$1", [user.id]);
    }

    let workerId = null;
    let verStatus = null;
    if (user.role === "worker") {
      const { rows: wr } = await pool.query("SELECT id,verification_status FROM workers WHERE user_id=$1", [user.id]);
      if (wr[0]) { workerId = wr[0].id; verStatus = wr[0].verification_status; }
    }

    if (user.role !== "admin") {
      await addHistoryEntry({
        type: user.role==="worker"?"worker_login":"user_login",
        actorId:Number(user.id), actorName:user.name,
        actorEmail:user.email, actorRole:user.role,
        details:`${user.role.charAt(0).toUpperCase()+user.role.slice(1)} logged in`,
      });
    }

    const safe = safeUser(user, workerId);
    if (verStatus) safe.verification_status = verStatus;
    res.json({ token: makeToken(user), user: safe });
  } catch(err) {
    console.error("[auth/login]", err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* POST /api/auth/signup */
router.post("/signup", async (req, res) => {
  try {
    const { name, nameEn, email, password, role="user", phone, categoryId, customCategory,
            bio, lat, lng, pincode, street, aadhaar } = req.body;

    // ── Name resolution ──
    // nameEn is the canonical name (kept in both `name` and `name_en` columns
    // so every existing query keeps working unchanged).
    const finalNameEn = (typeof nameEn === "string" && nameEn.trim()) ? nameEn.trim() : (typeof name === "string" ? name.trim() : "");
    const legacyName  = finalNameEn;

    if (!legacyName||!email||!password) return res.status(400).json({ error:"Name, email and password are required" });
    if (legacyName.length>100) return res.status(400).json({ error:"Name must be 1-100 characters" });
    if (typeof email!=="string"||email.length>254) return res.status(400).json({ error:"Invalid email address" });
    if (typeof password!=="string"||password.length<6||password.length>128) return res.status(400).json({ error:"Password must be 6-128 characters" });
    if (role==="admin") return res.status(403).json({ error:"Admin accounts cannot be created via signup" });
    if (!["user","worker"].includes(role)) return res.status(400).json({ error:"Role must be user or worker" });

    // ── Mobile number ──
    // Required for both users and workers. Must be a valid 10-digit Indian mobile
    // number; we store digits-only so display/formatting stays consistent everywhere.
    const phoneDigits = (phone||"").toString().replace(/\D/g,"");
    if (!phoneDigits || phoneDigits.length !== 10) return res.status(400).json({ error:"Mobile number is required and must be exactly 10 digits" });

    const { rows: existing } = await pool.query("SELECT id FROM users WHERE email=$1", [email.trim().toLowerCase()]);
    if (existing.length) return res.status(409).json({ error:"Email already registered" });

    const newId = Date.now();
    await pool.query(
      `INSERT INTO users(id,name,email,password,role,avatar,lat,lng,pincode,street,phone,name_en,name_ta,created_at)
       VALUES($1,$2,$3,$4,$5,'',$6,$7,$8,$9,$10,$11,'',NOW())`,
      [newId, legacyName, email.trim().toLowerCase(),
       await bcrypt.hash(password, SALT_ROUNDS), role,
       parseFloat(lat)||20.5937, parseFloat(lng)||78.9629,
       pincode||"", street||"", phoneDigits, finalNameEn]
    );
    const { rows: newRows } = await pool.query("SELECT * FROM users WHERE id=$1", [newId]);
    const newUser = newRows[0];

    let workerId = null;
    let verStatus = "unverified";
    if (role === "worker") {
      if (!categoryId) return res.status(400).json({ error:"Workers require a category" });
      const aadhaarDigits = (aadhaar||"").replace(/\D/g,"");
      if (aadhaarDigits.length !== 12) return res.status(400).json({ error:"Aadhaar number must be exactly 12 digits" });

      let resolvedCategoryId = parseInt(categoryId);
      if (String(categoryId)==="others") {
        if (!customCategory||!customCategory.trim()) return res.status(400).json({ error:"Please enter your profession/category name" });
        const { rows: catRows } = await pool.query(
          "SELECT id FROM categories WHERE LOWER(name)=$1", [customCategory.trim().toLowerCase()]
        );
        if (catRows.length) {
          resolvedCategoryId = Number(catRows[0].id);
        } else {
          const newCatId = Date.now()+2;
          await pool.query(
            "INSERT INTO categories(id,name,icon,icon_type,enabled,custom) VALUES($1,$2,'cat-default','preset',true,true)",
            [newCatId, customCategory.trim()]
          );
          resolvedCategoryId = newCatId;
        }
      }

      const workId = Date.now()+1;
      await pool.query(
        `INSERT INTO workers(id,user_id,name,email,category_id,phone,aadhaar_number,bio,lat,lng,pincode,street,
           availability,approved,rating,jobs_completed,hourly_rate,payout_account,
           verification_status,admin_approval_status,created_at,name_en,name_ta)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,false,0,0,500,'{}','unverified','none',NOW(),$13,'')`,
        [workId, newUser.id, newUser.name, newUser.email, resolvedCategoryId,
         phoneDigits, aadhaarDigits, bio||"", newUser.lat, newUser.lng, newUser.pincode||"", newUser.street||"",
         newUser.name_en||""]
      );
      workerId = workId;
    }

    if (req.app.locals.addAdminNotification) {
      req.app.locals.addAdminNotification({
        type: role==="worker"?"new_worker":"new_user",
        title: role==="worker"?"New Worker Registration":"New User Registration",
        message:`${newUser.name} signed up as a ${role}.`,
        link: role==="worker"?"/workers":"/users",
      });
    }

    const safe = safeUser(newUser, workerId);
    if (verStatus) safe.verification_status = verStatus;
    res.status(201).json({ token:makeToken(newUser), user:safe });
  } catch(err) {
    console.error("[auth/signup]", err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* POST /api/auth/change-password */
router.post("/change-password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword||!newPassword) return res.status(400).json({ error:"Both passwords required" });
    if (newPassword.length<6) return res.status(400).json({ error:"New password must be at least 6 characters" });

    const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [req.user.id]);
    if (!rows.length) return res.status(404).json({ error:"User not found" });
    if (!await checkPassword(currentPassword, rows[0].password))
      return res.status(401).json({ error:"Current password is incorrect" });

    await pool.query("UPDATE users SET password=$1,updated_at=NOW() WHERE id=$2",
      [await bcrypt.hash(newPassword, SALT_ROUNDS), req.user.id]);
    res.json({ ok:true, message:"Password changed successfully" });
  } catch(err) {
    console.error("[auth/change-password]", err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* POST /api/auth/heartbeat */
router.post("/heartbeat", verifyToken, (_req, res) => {
  res.json({ ok:true, ts:new Date().toISOString() });
});

/* GET /api/auth/me */
router.get("/me", verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [req.user.id]);
    if (!rows.length) return res.status(404).json({ error:"User not found" });
    const user = rows[0];
    let workerId=null, verStatus=null;
    if (user.role==="worker") {
      const { rows:wr } = await pool.query("SELECT id,verification_status FROM workers WHERE user_id=$1",[user.id]);
      if (wr[0]) { workerId=wr[0].id; verStatus=wr[0].verification_status; }
    }
    const safe = safeUser(user, workerId);
    if (verStatus) safe.verification_status = verStatus;
    res.json(safe);
  } catch(err) {
    console.error("[auth/me]", err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* PUT /api/auth/profile */
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const { name, nameEn, email, password, avatar, lat, lng, pincode, street, phone } = req.body;
    const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [req.user.id]);
    if (!rows.length) return res.status(404).json({ error:"User not found" });
    const user = rows[0];

    if (email && email !== user.email) {
      const { rows:dup } = await pool.query("SELECT id FROM users WHERE email=$1 AND id!=$2",[email,req.user.id]);
      if (dup.length) return res.status(409).json({ error:"Email already in use" });
    }

    // ── Name resolution ──
    // nameEn is the canonical name kept in sync with the legacy `name` column.
    let resolvedNameEn, resolvedLegacyName;
    if (typeof nameEn === "string" && nameEn.trim()) {
      if (nameEn.trim().length>100) return res.status(400).json({ error:"Name must be 1-100 characters" });
      resolvedNameEn     = nameEn.trim();
      resolvedLegacyName = resolvedNameEn;
    } else if (typeof name === "string" && name.trim()) {
      // Legacy client only sending `name` — keep nameEn in sync too.
      resolvedLegacyName = name.trim();
      resolvedNameEn     = name.trim();
    }

    // ── Mobile number ──
    let resolvedPhone;
    if (phone !== undefined) {
      const phoneDigits = (phone||"").toString().replace(/\D/g,"");
      if (phoneDigits && phoneDigits.length!==10) return res.status(400).json({ error:"Mobile number must be exactly 10 digits" });
      resolvedPhone = phoneDigits;
    }

    const updates = [];
    const vals    = [];
    let i = 1;
    const set = (col, val) => { updates.push(`${col}=$${i++}`); vals.push(val); };
    if (resolvedLegacyName!==undefined) set("name",    resolvedLegacyName);
    if (resolvedNameEn!==undefined)     set("name_en", resolvedNameEn);
    if (email)               set("email", email.trim().toLowerCase());
    // Security: password changes are not allowed via profile update.
    // Use POST /api/auth/change-password which requires the current password.
    if (password?.trim()) {
      return res.status(400).json({
        error: "Password cannot be changed via profile update. Use the dedicated change-password endpoint.",
      });
    }
    if (avatar!==undefined) set("avatar", avatar);
    if (lat)                set("lat",    parseFloat(lat));
    if (lng)                set("lng",    parseFloat(lng));
    if (pincode!==undefined) set("pincode", pincode);
    if (street!==undefined)  set("street",  street);
    if (resolvedPhone!==undefined) set("phone", resolvedPhone);
    set("updated_at","NOW()");
    vals.push(req.user.id);
    await pool.query(`UPDATE users SET ${updates.join(",")} WHERE id=$${i}`, vals);

    if (user.role==="worker") {
      const wu=[]; const wv=[]; let wi=1;
      const ws=(col,val)=>{ wu.push(`${col}=$${wi++}`); wv.push(val); };
      if (resolvedLegacyName!==undefined) ws("name",    resolvedLegacyName);
      if (resolvedNameEn!==undefined)     ws("name_en", resolvedNameEn);
      if (email)              ws("email", email.trim().toLowerCase());
      if (avatar!==undefined) ws("avatar",avatar);
      if (lat)                ws("lat",   parseFloat(lat));
      if (lng)                ws("lng",   parseFloat(lng));
      if (pincode!==undefined) ws("pincode",pincode);
      if (street!==undefined)  ws("street", street);
      if (resolvedPhone!==undefined) ws("phone", resolvedPhone);
      if (wu.length) {
        wv.push(req.user.id);
        await pool.query(`UPDATE workers SET ${wu.join(",")} WHERE user_id=$${wi}`, wv);
      }
    }

    const { rows:updated } = await pool.query("SELECT * FROM users WHERE id=$1",[req.user.id]);
    const updUser = updated[0];
    let workerId=null, verStatus=null;
    if (updUser.role==="worker") {
      const { rows:wr } = await pool.query("SELECT id,verification_status FROM workers WHERE user_id=$1",[updUser.id]);
      if (wr[0]) { workerId=wr[0].id; verStatus=wr[0].verification_status; }
    }
    const safe = safeUser(updUser, workerId);
    if (verStatus) safe.verification_status = verStatus;
    res.json({ token:makeToken(updUser), user:safe });
  } catch(err) {
    console.error("[auth/profile]", err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

module.exports = router;
