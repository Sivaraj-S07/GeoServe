require("dotenv").config();           // Load .env before anything else
const express = require("express");
const cors    = require("cors");

const authRoutes         = require("./routes/auth");
const userRoutes         = require("./routes/users");
const categoryRoutes     = require("./routes/categories");
const workerRoutes       = require("./routes/workers");
const bookingRoutes      = require("./routes/bookings");
const commissionRoutes   = require("./routes/commission");
const pincodeRoutes      = require("./routes/pincode");
const messageRoutes      = require("./routes/messages");
const verificationRoutes = require("./routes/verification");
const historyRoutes = require("./routes/history");

const { isSimulationMode } = require("./services/paymentService");
const { COMMISSION_RATE }  = require("./services/commissionService");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────────────────────
// Explicit origins from CORS_ORIGIN env var (comma-separated).
const explicitOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
  : [
      "http://localhost:5173", "http://127.0.0.1:5173",
      "http://localhost:5174", "http://127.0.0.1:5174",
    ];

// Wildcard patterns — any Vercel preview/deployment URL for this project
// is automatically allowed, so you never need to update CORS_ORIGIN again.
const allowedPatterns = [
  /^https:\/\/geo-serve(-[a-z0-9]+)*-sivaraj-s07s-projects\.vercel\.app$/,
  /^https:\/\/geoserve-admin(-[a-z0-9]+)*-sivaraj-s07s-projects\.vercel\.app$/,
  /^https:\/\/geo-serve\.vercel\.app$/,
  /^https:\/\/geoserve-admin\.vercel\.app$/,
];

function isAllowedOrigin(origin) {
  if (!origin) return true;                           // server-to-server / curl
  if (explicitOrigins.includes(origin)) return true;  // exact match
  return allowedPatterns.some(re => re.test(origin)); // wildcard match
}

app.use(cors({
  origin: (origin, cb) => {
    if (isAllowedOrigin(origin)) return cb(null, true);
    console.warn("[CORS] Blocked origin:", origin);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json({ limit: "5mb" }));

// ── Serve uploaded verification files ──────────────────────────────────────
app.use("/uploads", express.static(require("path").join(__dirname, "uploads")));

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

app.get("/api/health", (_req, res) => res.json({
  status:         "ok",
  time:           new Date(),
  paymentMode:    isSimulationMode() ? "simulation" : "live",
  commissionRate: `${(COMMISSION_RATE * 100).toFixed(0)}%`,
}));

// ── 404 handler for unknown API routes ───────────────────────────────────────
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[Server Error]", err.message || err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║     GeoServe Shared Backend  ·  Running!                 ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  URL         : http://localhost:${PORT}                      ║`);
  console.log("║  Serves      : User/Worker Portal + Admin Panel          ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  Routes      : /api/auth  /api/users  /api/workers       ║");
  console.log("║                /api/bookings  /api/history  /api/verif   ║");
  console.log("║  CORS: explicit origins + Vercel wildcard patterns       ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
});
