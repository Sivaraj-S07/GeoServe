const express  = require("express");
const router   = express.Router();
const fs       = require("fs");
const path     = require("path");
const multer   = require("multer");
const { verifyToken }  = require("../middleware/auth");
const { requireRole }  = require("../middleware/role");

/* ── File paths ────────────────────────────────────────────────────────────── */
const VERIF_FILE   = path.join(__dirname, "../data/verifications.json");
const WORKERS_FILE = path.join(__dirname, "../data/workers.json");
const UPLOAD_DIR   = path.join(__dirname, "../uploads/verifications");

const readV  = () => JSON.parse(fs.readFileSync(VERIF_FILE,   "utf-8"));
const writeV = (d) => fs.writeFileSync(VERIF_FILE, JSON.stringify(d, null, 2));
const readW  = () => JSON.parse(fs.readFileSync(WORKERS_FILE, "utf-8"));
const writeW = (d) => fs.writeFileSync(WORKERS_FILE, JSON.stringify(d, null, 2));

/* ── Multer storage ────────────────────────────────────────────────────────── */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const safe = Date.now() + "_" + Math.random().toString(36).slice(2, 8) + ext;
    cb(null, safe);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = [
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "application/pdf",
    "video/mp4", "video/webm", "video/quicktime", "video/avi",
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only images, PDFs, and videos are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

/* ── POST /api/verification/submit ─────────────────────────────────────────── */
// Worker submits a certificate (image/PDF) and/or a work video
router.post(
  "/submit",
  verifyToken,
  upload.fields([
    { name: "certificate", maxCount: 1 },
    { name: "work_video",  maxCount: 1 },
  ]),
  (req, res) => {
    if (req.user.role !== "worker")
      return res.status(403).json({ error: "Workers only" });

    const workers = readW();
    const worker  = workers.find(w => w.userId === req.user.id);
    if (!worker) return res.status(404).json({ error: "Worker profile not found" });

    const certFile  = req.files?.certificate?.[0];
    const videoFile = req.files?.work_video?.[0];

    if (!certFile && !videoFile)
      return res.status(400).json({ error: "Please upload a certificate or a work video" });

    const verifs = readV();
    // Remove any previous submission for this worker
    const filtered = verifs.filter(v => v.workerId !== worker.id);

    const record = {
      id:                      Date.now(),
      workerId:                worker.id,
      workerName:              worker.name,
      workerEmail:             worker.email,
      workerPhone:             worker.phone || "",
      categoryId:              worker.categoryId,
      certificate_file:        certFile  ? certFile.filename  : null,
      certificate_mimetype:    certFile  ? certFile.mimetype  : null,
      certificate_originalname:certFile  ? certFile.originalname : null,
      work_video:              videoFile ? videoFile.filename : null,
      video_mimetype:          videoFile ? videoFile.mimetype : null,
      video_originalname:      videoFile ? videoFile.originalname : null,
      verification_status:     "pending",
      admin_approval_status:   "pending",
      verification_submitted_at: new Date().toISOString(),
      admin_notes:             "",
      reviewed_at:             null,
    };

    filtered.push(record);
    writeV(filtered);

    // Update worker's verification_status
    const wIdx = workers.findIndex(w => w.id === worker.id);
    if (wIdx !== -1) {
      workers[wIdx].verification_status      = "pending";
      workers[wIdx].admin_approval_status    = "pending";
      workers[wIdx].verification_submitted_at = record.verification_submitted_at;
      writeW(workers);
    }

    res.status(201).json({ message: "Verification submitted successfully", record });
  }
);

/* ── GET /api/verification/my ──────────────────────────────────────────────── */
router.get("/my", verifyToken, (req, res) => {
  if (req.user.role !== "worker")
    return res.status(403).json({ error: "Workers only" });

  const workers = readW();
  const worker  = workers.find(w => w.userId === req.user.id);
  if (!worker) return res.status(404).json({ error: "Worker profile not found" });

  const verifs = readV();
  const record = verifs.find(v => v.workerId === worker.id);

  res.json({
    verification_status:   worker.verification_status   || "unverified",
    admin_approval_status: worker.admin_approval_status || "none",
    record: record || null,
  });
});

/* ── GET /api/verification/all ─────────────────────────────────────────────── */
router.get("/all", requireRole("admin"), (req, res) => {
  const verifs     = readV();
  const workers    = readW();
  const { status } = req.query;

  let list = verifs.map(v => {
    const worker = workers.find(w => w.id === v.workerId) || {};
    return {
      ...v,
      worker_availability: worker.availability,
      worker_approved:     worker.approved,
      worker_rating:       worker.rating,
    };
  });

  if (status && status !== "all")
    list = list.filter(v => v.verification_status === status);

  list.sort((a, b) => new Date(b.verification_submitted_at) - new Date(a.verification_submitted_at));
  res.json(list);
});

/* ── GET /api/verification/stats ───────────────────────────────────────────── */
// NOTE: Must be defined BEFORE /:workerId/* routes to prevent route shadowing
router.get("/stats", requireRole("admin"), (_req, res) => {
  const verifs = readV();
  res.json({
    total:    verifs.length,
    pending:  verifs.filter(v => v.verification_status === "pending").length,
    verified: verifs.filter(v => v.verification_status === "verified").length,
    rejected: verifs.filter(v => v.verification_status === "rejected").length,
  });
});

/* ── GET /api/verification/file/:filename ──────────────────────────────────── */
// Serve uploaded files (admin and the worker who owns it)
// Supports token via query string for browser media elements (img/video src)
// NOTE: Must be defined BEFORE /:workerId/* routes to prevent route shadowing
const { SECRET } = require("../middleware/auth");
const jwt = require("jsonwebtoken");

router.get("/file/:filename", (req, res, next) => {
  // Check Authorization header first, then query param (for img/video src)
  const authHeader = req.headers["authorization"];
  const queryToken = req.query.token;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : queryToken;
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}, (req, res) => {
  const filename = path.basename(req.params.filename); // prevent path traversal
  const filePath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: "File not found" });

  // Allow admin, or the worker who owns this file
  if (req.user.role !== "admin") {
    const verifs = readV();
    const owned  = verifs.some(
      v => v.workerId &&
           (v.certificate_file === filename || v.work_video === filename) &&
           (() => {
             const workers = readW();
             const w = workers.find(wk => wk.id === v.workerId);
             return w?.userId === req.user.id;
           })()
    );
    if (!owned) return res.status(403).json({ error: "Access denied" });
  }

  res.sendFile(filePath);
});

/* ── PATCH /api/verification/:workerId/approve ─────────────────────────────── */
router.patch("/:workerId/approve", requireRole("admin"), (req, res) => {
  const workerId = parseInt(req.params.workerId);
  const { notes = "" } = req.body;

  const verifs = readV();
  const idx    = verifs.findIndex(v => v.workerId === workerId);
  if (idx === -1) return res.status(404).json({ error: "Verification record not found" });

  verifs[idx].verification_status   = "verified";
  verifs[idx].admin_approval_status = "approved";
  verifs[idx].admin_notes           = notes;
  verifs[idx].reviewed_at           = new Date().toISOString();
  writeV(verifs);

  // Mark worker as verified and approved
  const workers = readW();
  const wIdx    = workers.findIndex(w => w.id === workerId);
  if (wIdx !== -1) {
    workers[wIdx].verification_status   = "verified";
    workers[wIdx].admin_approval_status = "approved";
    workers[wIdx].approved              = true;
    writeW(workers);
  }

  res.json({ message: "Worker verified and approved", record: verifs[idx] });
});

/* ── PATCH /api/verification/:workerId/reject ──────────────────────────────── */
router.patch("/:workerId/reject", requireRole("admin"), (req, res) => {
  const workerId = parseInt(req.params.workerId);
  const { notes = "" } = req.body;

  const verifs = readV();
  const idx    = verifs.findIndex(v => v.workerId === workerId);
  if (idx === -1) return res.status(404).json({ error: "Verification record not found" });

  verifs[idx].verification_status   = "rejected";
  verifs[idx].admin_approval_status = "rejected";
  verifs[idx].admin_notes           = notes;
  verifs[idx].reviewed_at           = new Date().toISOString();
  writeV(verifs);

  const workers = readW();
  const wIdx    = workers.findIndex(w => w.id === workerId);
  if (wIdx !== -1) {
    workers[wIdx].verification_status   = "rejected";
    workers[wIdx].admin_approval_status = "rejected";
    workers[wIdx].approved              = false;
    writeW(workers);
  }

  res.json({ message: "Worker verification rejected", record: verifs[idx] });
});

module.exports = router;
