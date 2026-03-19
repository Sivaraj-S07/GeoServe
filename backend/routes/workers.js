const express = require("express");
const router  = express.Router();
const fs      = require("fs");
const path    = require("path");
const { verifyToken }  = require("../middleware/auth");
const { requireRole }  = require("../middleware/role");

const FILE  = path.join(__dirname, "../data/workers.json");
const read  = () => JSON.parse(fs.readFileSync(FILE, "utf-8"));
const write = (d) => fs.writeFileSync(FILE, JSON.stringify(d, null, 2));

function haversine(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* GET /api/workers */
router.get("/", (req, res) => {
  // Only show workers who are: approved AND available AND verified (or have no verification_status set = legacy)
  let list = read().filter(w =>
    w.approved &&
    w.availability === true &&
    (w.verification_status === "verified" || w.verification_status === undefined || w.verification_status === null)
  );
  const { category, search, lat, lng, radius, pincode } = req.query;
  if (category) list = list.filter(w => w.categoryId === parseInt(category));
  if (pincode)  list = list.filter(w => w.pincode === pincode);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(w =>
      w.name.toLowerCase().includes(q) || (w.specialization || "").toLowerCase().includes(q)
    );
  }
  if (lat && lng) {
    const uLat = parseFloat(lat), uLng = parseFloat(lng);
    list = list.map(w => ({ ...w, distance: +haversine(uLat, uLng, w.lat, w.lng).toFixed(1) }));
    if (radius) list = list.filter(w => w.distance <= parseFloat(radius));
    list.sort((a, b) => a.distance - b.distance);
  }
  // Strip payoutAccount from public listing for security
  res.json(list.map(w => { const { payoutAccount, ...safe } = w; return safe; }));
});

/* GET /api/workers/all — admin only */
router.get("/all", requireRole("admin"), (_req, res) => {
  const ONLINE_MS = 5 * 60 * 1000;
  const now = Date.now();
  const workers = read().map(w => ({
    ...w,
    isOnline: w.availability === true && w.lastSeenAt
      ? (now - new Date(w.lastSeenAt).getTime() < ONLINE_MS)
      : (w.availability === true),   // fallback: trust availability flag if no heartbeat yet
  }));
  res.json(workers);
});

/* GET /api/workers/my — current worker's own profile (includes payoutAccount) */
router.get("/my", verifyToken, (req, res) => {
  if (req.user.role !== "worker")
    return res.status(403).json({ error: "Workers only" });
  const worker = read().find(w => w.userId === req.user.id);
  if (!worker) return res.status(404).json({ error: "Worker profile not found" });
  res.json(worker);
});

/* GET /api/workers/:id/payment-info — for confirmed bookings (user can see worker payment details) */
router.get("/:id/payment-info", verifyToken, (req, res) => {
  const w = read().find(w => w.id === parseInt(req.params.id));
  if (!w) return res.status(404).json({ error: "Worker not found" });
  // Only expose UPI ID and bank name (not full account number)
  const { payoutAccount } = w;
  res.json({
    name: w.name,
    upiId: payoutAccount?.upiId || null,
    bankName: payoutAccount?.bankName || null,
    accountHolderName: payoutAccount?.accountHolderName || null,
    // Masked account number
    accountNumberMasked: payoutAccount?.accountNumber ? "****" + payoutAccount.accountNumber.slice(-4) : null,
    ifscCode: payoutAccount?.ifscCode || null,
  });
});

/* GET /api/workers/:id — public (no payoutAccount) */
router.get("/:id", (req, res) => {
  const w = read().find(w => w.id === parseInt(req.params.id));
  // Worker must be approved AND active (availability=true) to be publicly accessible
  if (!w || !w.approved || !w.availability) return res.status(404).json({ error: "Worker not found or not currently active" });
  const { payoutAccount, ...safe } = w;
  res.json(safe);
});

/* POST /api/workers */
router.post("/", verifyToken, (req, res) => {
  if (!["admin", "worker"].includes(req.user.role))
    return res.status(403).json({ error: "Admin or worker role required" });

  const { name, categoryId, specialization, phone } = req.body;
  if (!name || !categoryId || !specialization || !phone)
    return res.status(400).json({ error: "name, categoryId, specialization and phone are required" });

  // Validate phone: exactly 10 digits
  const phoneDigits = (phone + "").replace(/\D/g, "");
  if (phoneDigits.length !== 10)
    return res.status(400).json({ error: "Phone number must be exactly 10 digits" });
  if (!req.body.avatar || !req.body.avatar.trim())
    return res.status(400).json({ error: "Work photo is mandatory. Please upload a photo showing you performing your work." });

  const workers = read();
  const newWorker = {
    id:             Date.now(),
    userId:         req.user.id,
    name:           req.body.name.trim(),
    email:          req.body.email || req.user.email || "",
    categoryId:     parseInt(req.body.categoryId),
    specialization: req.body.specialization.trim(),
    bio:            req.body.bio || "",
    experience:     req.body.experience || "",
    yearsOfExp:     parseInt(req.body.yearsOfExp) || 0,
    skills:         req.body.skills || [],
    phone:          req.body.phone.trim(),
    lat:            parseFloat(req.body.lat)  || 40.7128,
    lng:            parseFloat(req.body.lng)  || -74.006,
    pincode:        req.body.pincode || "",
    street:         req.body.street  || "",
    avatar:         req.body.avatar.trim(),
    availability:   true,
    approved:       true,   // Auto-approve all new workers; admin panel manages them
    rating:         0,
    jobsCompleted:  0,
    hourlyRate:     parseFloat(req.body.hourlyRate) || 500,
    // ── Payout account (worker sets this to receive payment) ────────────
    payoutAccount: {
      accountHolderName: "",
      accountNumber:     "",
      ifscCode:          "",
      bankName:          "",
      upiId:             "",
    },
  };
  workers.push(newWorker);
  write(workers);
  res.status(201).json(newWorker);
});

/* PUT /api/workers/:id — admin or owner worker */
router.put("/:id", verifyToken, (req, res) => {
  const id      = parseInt(req.params.id);
  const workers = read();
  const idx     = workers.findIndex(w => w.id === id);
  if (idx === -1) return res.status(404).json({ error: "Worker not found" });

  if (req.user.role !== "admin" && workers[idx].userId !== req.user.id)
    return res.status(403).json({ error: "Not authorized to edit this profile" });

  // Merge payoutAccount carefully
  const incomingPayout = req.body.payoutAccount;
  const existingPayout = workers[idx].payoutAccount || {};
  const mergedPayout   = incomingPayout
    ? { ...existingPayout, ...incomingPayout }
    : existingPayout;

  workers[idx] = {
    ...workers[idx],
    ...req.body,
    id,
    categoryId:    parseInt(req.body.categoryId)  || workers[idx].categoryId,
    lat:           parseFloat(req.body.lat)        || workers[idx].lat,
    lng:           parseFloat(req.body.lng)        || workers[idx].lng,
    hourlyRate:    parseFloat(req.body.hourlyRate) || workers[idx].hourlyRate,
    payoutAccount: mergedPayout,
  };
  write(workers);
  res.json(workers[idx]);
});

/* PATCH /api/workers/:id/payout-account — worker sets their own payout account */
router.patch("/:id/payout-account", verifyToken, (req, res) => {
  const id      = parseInt(req.params.id);
  const workers = read();
  const idx     = workers.findIndex(w => w.id === id);
  if (idx === -1) return res.status(404).json({ error: "Worker not found" });

  if (req.user.role !== "admin" && workers[idx].userId !== req.user.id)
    return res.status(403).json({ error: "Not authorized" });

  const { accountHolderName, accountNumber, ifscCode, bankName, upiId } = req.body;

  workers[idx].payoutAccount = {
    accountHolderName: accountHolderName || workers[idx].payoutAccount?.accountHolderName || "",
    accountNumber:     accountNumber     || workers[idx].payoutAccount?.accountNumber     || "",
    ifscCode:          ifscCode          || workers[idx].payoutAccount?.ifscCode          || "",
    bankName:          bankName          || workers[idx].payoutAccount?.bankName          || "",
    upiId:             upiId             || workers[idx].payoutAccount?.upiId             || "",
  };
  workers[idx].updatedAt = new Date().toISOString();
  write(workers);
  res.json(workers[idx]);
});

/* PATCH /api/workers/:id/availability */
router.patch("/:id/availability", verifyToken, (req, res) => {
  const id      = parseInt(req.params.id);
  const workers = read();
  const idx     = workers.findIndex(w => w.id === id);
  if (idx === -1) return res.status(404).json({ error: "Worker not found" });

  if (req.user.role !== "admin" && workers[idx].userId !== req.user.id)
    return res.status(403).json({ error: "Not authorized" });

  workers[idx].availability = req.body.availability !== undefined
    ? Boolean(req.body.availability)
    : !workers[idx].availability;
  write(workers);
  res.json(workers[idx]);
});

/* PATCH /api/workers/:id/approve — admin only */
router.patch("/:id/approve", requireRole("admin"), (req, res) => {
  const id      = parseInt(req.params.id);
  const workers = read();
  const idx     = workers.findIndex(w => w.id === id);
  if (idx === -1) return res.status(404).json({ error: "Worker not found" });
  workers[idx].approved = true;
  write(workers);
  res.json(workers[idx]);
});

/* DELETE /api/workers/:id — admin only */
router.delete("/:id", requireRole("admin"), (req, res) => {
  const id       = parseInt(req.params.id);
  const workers  = read();
  const filtered = workers.filter(w => w.id !== id);
  if (filtered.length === workers.length) return res.status(404).json({ error: "Worker not found" });
  write(filtered);
  res.json({ message: "Deleted" });
});

module.exports = router;
