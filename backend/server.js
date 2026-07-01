require("dotenv").config();

const path         = require("path");
const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const compression  = require("compression");
const rateLimit    = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const pool = require("./db/pool");

const authRoutes         = require("./routes/auth");
const userRoutes         = require("./routes/users");
const categoryRoutes     = require("./routes/categories");
const workerRoutes       = require("./routes/workers");
const bookingRoutes      = require("./routes/bookings");
const commissionRoutes   = require("./routes/commission");
const pincodeRoutes      = require("./routes/pincode");
const messageRoutes      = require("./routes/messages");
const verificationRoutes = require("./routes/verification");
const historyRoutes      = require("./routes/history");
const supportRoutes      = require("./routes/support");
const ratingRoutes       = require("./routes/ratings");
const imageRoutes        = require("./routes/images");

const { isSimulationMode }    = require("./services/paymentService");
const { COMMISSION_RATE }     = require("./services/commissionService");
const { sweepStaleLocks }     = require("./services/idempotencyStore");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── SSE Notification Hub ──────────────────────────────────────────────────────
const sseClients = new Map();

function sseSubscribe(key, res) {
  if (!sseClients.has(key)) sseClients.set(key, new Set());
  sseClients.get(key).add(res);
}
function sseUnsubscribe(key, res) {
  if (sseClients.has(key)) {
    sseClients.get(key).delete(res);
    if (sseClients.get(key).size === 0) sseClients.delete(key);
  }
}
function pushNotification(key, payload) {
  const data    = JSON.stringify(payload);
  const targets = sseClients.get(key);
  if (targets) targets.forEach(res => {
    try { res.write(`data: ${data}\n\n`); } catch { /* ignore closed */ }
  });
}
function pushAdminNotification(payload) { pushNotification("admin", payload); }

app.locals.pushNotification      = pushNotification;
app.locals.pushAdminNotification = pushAdminNotification;

// ── Trust proxy (important for rate limiter behind Vercel/nginx) ──────────────
app.set("trust proxy", 1);

// ── Helmet ────────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc:      ["'self'", "data:", "blob:", "https://ui-avatars.com"],
      connectSrc:  ["'self'"],
      fontSrc:     ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      objectSrc:   ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
}));

app.use(compression());
app.use(cookieParser(process.env.COOKIE_SECRET || process.env.JWT_SECRET));

// ── CORS ──────────────────────────────────────────────────────────────────────
const explicitOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
  : ["http://localhost:5173","http://127.0.0.1:5173","http://localhost:5174","http://127.0.0.1:5174"];

const allowedPatterns = [
  /^https:\/\/geo-serve(-[a-z0-9]+)*-sivaraj-s07s-projects\.vercel\.app$/,
  /^https:\/\/geoserve-admin(-[a-z0-9]+)*-sivaraj-s07s-projects\.vercel\.app$/,
  /^https:\/\/geo-serve\.vercel\.app$/,
  /^https:\/\/geoserve-admin\.vercel\.app$/,
];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (explicitOrigins.includes(origin)) return true;
  return allowedPatterns.some(re => re.test(origin));
}

app.use(cors({
  origin: (origin, cb) => {
    if (isAllowedOrigin(origin)) return cb(null, true);
    console.warn("[CORS] Blocked origin:", origin);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true, exposedHeaders: ["X-Total-Count"],
  allowedHeaders: ["Authorization","Content-Type","X-Requested-With"],
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  optionsSuccessStatus: 204,
}));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// General API limiter: generous limit — 500 requests per 15 min per IP
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: { error: "Too many requests, please try again later." },
  // Use a safe key generator that doesn't crash on missing IPs
  keyGenerator: (req) => {
    return req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
  },
}));

// Auth limiter: only counts FAILED attempts (skipSuccessfulRequests: true)
// 50 attempts per 15 min is very generous — real abuse gets blocked, normal use never does
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,   // only count failures
  message: { error: "Too many failed login attempts. Please wait 15 minutes and try again." },
  keyGenerator: (req) => {
    return req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
  },
});
app.use("/api/auth/login",  authLimiter);
app.use("/api/auth/signup", authLimiter);

// ── Permanent images (stored in PostgreSQL, NOT local disk) ────────────────────
// Mounted before the legacy static handler below so new uploads (which are
// now saved as BYTEA rows in PostgreSQL) are served from the database and
// never disappear after a restart/redeploy.
app.use("/uploads/img", imageRoutes);

// ── Static uploads (legacy/back-compat only — do not write new files here) ─────
app.use("/uploads", express.static(path.join(__dirname, "uploads"), { maxAge: "1d", etag: true }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",         authRoutes);
app.use("/api/users",        userRoutes);
app.use("/api/categories",   categoryRoutes);
app.use("/api/workers",      workerRoutes);
app.use("/api/bookings",     bookingRoutes);
app.use("/api/commission",   commissionRoutes);
app.use("/api/pincode",      pincodeRoutes);
app.use("/api/messages",     messageRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/history",      historyRoutes);
app.use("/api/support",      supportRoutes);
app.use("/api/ratings",      ratingRoutes);

// ── Admin Notifications (PostgreSQL) ─────────────────────────────────────────
const { verifyToken: _vt } = require("./middleware/auth");
const { requireRole: _rr } = require("./middleware/role");

async function addAdminNotification({ type, title, message, link }) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  await pool.query(
    `INSERT INTO admin_notifications(id,type,title,message,link,read,created_at)
     VALUES($1,$2,$3,$4,$5,false,NOW())`,
    [id, type||"info", title||"Notification", message||"", link||null]
  );
  const { rows } = await pool.query("SELECT * FROM admin_notifications WHERE id=$1",[id]);
  const notif = rows[0]
    ? { id:rows[0].id, type:rows[0].type, title:rows[0].title, message:rows[0].message,
        link:rows[0].link, read:rows[0].read, createdAt:rows[0].created_at }
    : { id, type, title, message, link, read:false, createdAt:new Date().toISOString() };
  pushAdminNotification({ type:"admin_notification", notification:notif });
  return notif;
}
app.locals.addAdminNotification = addAdminNotification;

// Admin notifications list
app.get("/api/admin/notifications/list", _vt, _rr("admin"), async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 200");
    res.json(rows.map(n=>({id:n.id,type:n.type,title:n.title,message:n.message,link:n.link,read:n.read,createdAt:n.created_at})));
  } catch(err) { res.status(500).json({ error:"Internal server error" }); }
});

app.patch("/api/admin/notifications/read-all", _vt, _rr("admin"), async (_req, res) => {
  try {
    await pool.query("UPDATE admin_notifications SET read=true");
    res.json({ message:"All notifications marked as read" });
  } catch(err) { res.status(500).json({ error:"Internal server error" }); }
});

app.patch("/api/admin/notifications/:id/read", _vt, _rr("admin"), async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE admin_notifications SET read=true WHERE id=$1 RETURNING *",[req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error:"Notification not found" });
    const n=rows[0];
    res.json({id:n.id,type:n.type,title:n.title,message:n.message,link:n.link,read:n.read,createdAt:n.created_at});
  } catch(err) { res.status(500).json({ error:"Internal server error" }); }
});

app.delete("/api/admin/notifications", _vt, _rr("admin"), async (_req, res) => {
  try {
    await pool.query("DELETE FROM admin_notifications");
    res.json({ message:"Notification history cleared" });
  } catch(err) { res.status(500).json({ error:"Internal server error" }); }
});

app.get("/api/admin/notifications", _vt, _rr("admin"), async (_req, res) => {
  try {
    // OPTIMIZED: all counts done in SQL — no full-table fetches into Node memory
    const [pendingBRes, pendingVRes, unreadSupportRes, unreadHistRes] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM bookings WHERE status='pending'"),
      pool.query("SELECT COUNT(*) FROM verifications WHERE verification_status='pending'"),
      // Count distinct users who have at least one unread-by-admin user message
      pool.query(
        `SELECT COUNT(DISTINCT user_id) FROM support_messages
         WHERE sender_role='user' AND read_by_admin=false`
      ),
      pool.query("SELECT COUNT(*) FROM admin_notifications WHERE read=false"),
    ]);

    const pendingBookings      = parseInt(pendingBRes.rows[0].count)       || 0;
    const pendingVerifications = parseInt(pendingVRes.rows[0].count)        || 0;
    const unreadSupport        = parseInt(unreadSupportRes.rows[0].count)   || 0;
    const unreadHistory        = parseInt(unreadHistRes.rows[0].count)      || 0;
    const total = pendingBookings + pendingVerifications + unreadSupport;

    res.json({ total, pendingBookings, pendingVerifications, unreadSupport, unreadHistory });
  } catch (err) {
    console.error("[admin/notifications]", err.message);
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

// ── SSE stream ────────────────────────────────────────────────────────────────
app.get("/api/notifications/stream", _vt, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const role = req.user.role;
  const key  = role==="admin" ? "admin" : `${role}:${req.user.id}`;
  sseSubscribe(key, res);
  res.write(`data: ${JSON.stringify({ type:"connected", role })}\n\n`);

  const hb = setInterval(()=>{ try { res.write(": heartbeat\n\n"); } catch { clearInterval(hb); } }, 25000);
  req.on("close", ()=>{ clearInterval(hb); sseUnsubscribe(key, res); });
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok", time: new Date(), db: "postgresql",
      paymentMode: isSimulationMode() ? "simulation" : "live",
      commissionRate: `${(COMMISSION_RATE*100).toFixed(0)}%`, version: "3.1.0-pg",
    });
  } catch(err) {
    res.status(503).json({ status:"error", db:"disconnected", error:err.message });
  }
});

app.use("/api", (_req, res) => res.status(404).json({ error:"API route not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[Server Error]", err.message||err);
  const isProd = process.env.NODE_ENV==="production";
  res.status(err.status||500).json({
    error: isProd ? "Internal server error" : (err.message||"Internal server error"),
  });
});

// ── Auto-migration: add new columns + performance indexes to existing DB ──────
async function runAutoMigrations() {
  try {
    await pool.query(`
      ALTER TABLE workers
      ADD COLUMN IF NOT EXISTS aadhaar_number TEXT NOT NULL DEFAULT ''
    `);
    console.log("[AutoMigrate] ✓ workers.aadhaar_number ensured");
  } catch (err) {
    console.warn("[AutoMigrate] Warning:", err.message);
  }

  // ── Ratings system migrations ─────────────────────────────────────────────
  try {
    // ratings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id          BIGINT PRIMARY KEY,
        booking_id  BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        worker_id   BIGINT NOT NULL REFERENCES workers(id)  ON DELETE CASCADE,
        user_id     BIGINT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
        stars       SMALLINT NOT NULL CHECK (stars >= 1 AND stars <= 5),
        review      TEXT NOT NULL DEFAULT '',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (booking_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS ratings_worker_id_idx ON ratings(worker_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS ratings_user_id_idx   ON ratings(user_id)`);
    // New columns on existing tables
    await pool.query(`ALTER TABLE workers  ADD COLUMN IF NOT EXISTS total_ratings INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_rated BOOLEAN NOT NULL DEFAULT FALSE`);
    console.log("[AutoMigrate] ✓ Ratings system tables and columns ensured");
  } catch (err) {
    console.warn("[AutoMigrate] Ratings migration warning:", err.message);
  }

  // ── Bilingual (English/Tamil) name support ────────────────────────────────
  try {
    await pool.query(`ALTER TABLE users   ADD COLUMN IF NOT EXISTS name_en TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE users   ADD COLUMN IF NOT EXISTS name_ta TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS name_en TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS name_ta TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_name_en   TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_name_ta   TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS worker_name_en TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS worker_name_ta TEXT NOT NULL DEFAULT ''`);
    // Backfill: existing rows get their legacy single-language name copied
    // into the English column so the bilingual fallback chain never sees a
    // blank value for accounts/bookings created before this migration.
    await pool.query(`UPDATE users    SET name_en = name        WHERE name_en = ''`);
    await pool.query(`UPDATE workers  SET name_en = name        WHERE name_en = ''`);
    await pool.query(`UPDATE bookings SET user_name_en   = user_name   WHERE user_name_en   = ''`);
    await pool.query(`UPDATE bookings SET worker_name_en = worker_name WHERE worker_name_en = ''`);
    console.log("[AutoMigrate] ✓ Bilingual name (name_en/name_ta) columns ensured + backfilled");
  } catch (err) {
    console.warn("[AutoMigrate] Bilingual name migration warning:", err.message);
  }

  // ── Name field correctness: ensure name_en is always populated ───────────
  // Workers/users who registered when Tamil was the UI language may have
  // Tamil text in the legacy `name` column and an empty `name_en`.
  // This migration backfills name_en from `name` for any row where it's blank,
  // and also ensures the `name` column (used as legacy display) is the English
  // value going forward so all consumers get consistent English names.
  try {
    // For users: if name_en is empty, copy name into it
    await pool.query(`UPDATE users SET name_en = name WHERE name_en = '' OR name_en IS NULL`);
    // For workers: if name_en is empty, copy name into it
    await pool.query(`UPDATE workers SET name_en = name WHERE name_en = '' OR name_en IS NULL`);
    // Also sync name → name_en for bookings snapshots
    await pool.query(`UPDATE bookings SET user_name_en   = user_name   WHERE (user_name_en   = '' OR user_name_en   IS NULL) AND user_name   IS NOT NULL`);
    await pool.query(`UPDATE bookings SET worker_name_en = worker_name WHERE (worker_name_en = '' OR worker_name_en IS NULL) AND worker_name IS NOT NULL`);
    console.log("[AutoMigrate] ✓ name_en backfill completed for workers/users/bookings");
  } catch (err) {
    console.warn("[AutoMigrate] name_en backfill warning:", err.message);
  }

  // ── Performance indexes (idempotent, IF NOT EXISTS) ─────────────────────────
  try {
    const indexStatements = [
      "CREATE INDEX IF NOT EXISTS users_role_idx             ON users(role)",
      "CREATE INDEX IF NOT EXISTS users_last_seen_idx        ON users(last_seen_at DESC NULLS LAST)",
      "CREATE INDEX IF NOT EXISTS workers_user_id_idx        ON workers(user_id)",
      "CREATE INDEX IF NOT EXISTS workers_category_id_idx    ON workers(category_id)",
      "CREATE INDEX IF NOT EXISTS workers_pincode_idx        ON workers(pincode)",
      "CREATE INDEX IF NOT EXISTS workers_verification_idx   ON workers(verification_status)",
      "CREATE INDEX IF NOT EXISTS workers_approval_status_idx ON workers(admin_approval_status)",
      "CREATE INDEX IF NOT EXISTS workers_approved_avail_idx ON workers(approved, availability) WHERE approved = true AND availability = true",
      "CREATE INDEX IF NOT EXISTS bookings_user_id_idx          ON bookings(user_id)",
      "CREATE INDEX IF NOT EXISTS bookings_worker_id_idx        ON bookings(worker_id)",
      "CREATE INDEX IF NOT EXISTS bookings_worker_user_id_idx   ON bookings(worker_user_id)",
      "CREATE INDEX IF NOT EXISTS bookings_status_idx           ON bookings(status)",
      "CREATE INDEX IF NOT EXISTS bookings_created_at_idx       ON bookings(created_at DESC)",
      "CREATE INDEX IF NOT EXISTS bookings_commission_status_idx ON bookings(commission_status)",
      "CREATE INDEX IF NOT EXISTS messages_booking_id_idx       ON messages(booking_id, created_at ASC)",
      "CREATE INDEX IF NOT EXISTS messages_unread_idx           ON messages(booking_id, sender_id, read) WHERE read = false",
      "CREATE INDEX IF NOT EXISTS verifications_worker_id_idx   ON verifications(worker_id)",
      "CREATE INDEX IF NOT EXISTS verifications_status_idx      ON verifications(verification_status)",
      "CREATE INDEX IF NOT EXISTS support_user_id_idx           ON support_messages(user_id, created_at ASC)",
      "CREATE INDEX IF NOT EXISTS wallet_type_idx               ON wallet_transactions(type)",
      "CREATE INDEX IF NOT EXISTS wallet_status_idx             ON wallet_transactions(status)",
      "CREATE INDEX IF NOT EXISTS wallet_booking_id_idx         ON wallet_transactions(booking_id)",
      "CREATE INDEX IF NOT EXISTS wallet_created_at_idx         ON wallet_transactions(created_at DESC)",
      "CREATE INDEX IF NOT EXISTS wallet_type_created_idx       ON wallet_transactions(type, created_at DESC)",
      "CREATE INDEX IF NOT EXISTS history_timestamp_idx         ON history(timestamp DESC)",
      "CREATE INDEX IF NOT EXISTS history_type_idx              ON history(type)",
      "CREATE INDEX IF NOT EXISTS history_actor_id_idx          ON history(actor_id)",
      "CREATE INDEX IF NOT EXISTS history_booking_id_idx        ON history(booking_id)",
      "CREATE INDEX IF NOT EXISTS admin_notif_read_idx          ON admin_notifications(read, created_at DESC)",
    ];
    for (const sql of indexStatements) {
      await pool.query(sql);
    }
    console.log("[AutoMigrate] ✓ Performance indexes ensured");
  } catch (err) {
    console.warn("[AutoMigrate] Index migration warning:", err.message);
  }
}
runAutoMigrations();

// Sweep idempotency locks that got stuck (e.g. from a crashed process)
sweepStaleLocks().catch(err => console.warn("[Startup] sweepStaleLocks:", err.message));

app.listen(PORT, () => {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║     GeoServe Backend v3.1-PG  ·  Running!               ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  URL         : http://localhost:${PORT}                      ║`);
  console.log("║  Database    : PostgreSQL (Neon)                         ║");
  console.log("║  Security    : Helmet · Rate Limit · CORS · Compression  ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  Routes      : /api/auth  /api/users  /api/workers       ║");
  console.log("║                /api/bookings  /api/history  /api/verif   ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
});
