const express    = require("express");
const router     = express.Router();
const fs         = require("fs");
const path       = require("path");
const jwt        = require("jsonwebtoken");
const { SECRET, verifyToken } = require("../middleware/auth");
const { addHistoryEntry } = require("../services/historyService");

const USERS_FILE   = path.join(__dirname, "../data/users.json");
const WORKERS_FILE = path.join(__dirname, "../data/workers.json");

const readUsers   = () => JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
const writeUsers  = (d) => fs.writeFileSync(USERS_FILE, JSON.stringify(d, null, 2));
const readWorkers = () => JSON.parse(fs.readFileSync(WORKERS_FILE, "utf-8"));
const writeWorkers= (d) => fs.writeFileSync(WORKERS_FILE, JSON.stringify(d, null, 2));

function makeToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    SECRET, { expiresIn: "7d" }
  );
}

function safeUser(u, workerId = null) {
  const base = { id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar || "", lat: u.lat || 0, lng: u.lng || 0, pincode: u.pincode || "", street: u.street || "" };
  if (workerId) base.workerId = workerId;
  // Include worker verification status for routing decisions
  if (u.role === "worker") {
    const workers = readWorkers();
    const w = workers.find(wk => wk.userId === u.id);
    if (w) base.verification_status = w.verification_status || "unverified";
  }
  return base;
}

/* POST /api/auth/login - requires role field for role-specific login */
router.post("/login", (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });
  if (!role || !["user", "worker", "admin"].includes(role))
    return res.status(400).json({ error: "A valid role must be specified" });

  const users = readUsers();
  const user  = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  if (user.role !== role) {
    return res.status(403).json({
      error: `This account is registered as '${user.role}'. Please use the '${user.role}' login instead.`
    });
  }

  let workerId = null;
  if (user.role === "worker") {
    const workers = readWorkers();
    const wp = workers.find(w => w.userId === user.id);
    if (wp) workerId = wp.id;
  }

  // ── Record login time as lastSeenAt ──────────────────────────────────────
  const uIdx = users.findIndex(u => u.id === user.id);
  if (uIdx !== -1) {
    users[uIdx].lastSeenAt = new Date().toISOString();
    writeUsers(users);
  }

  // ── Record login to history ───────────────────────────────────────────────
  if (user.role !== "admin") {
    addHistoryEntry({
      type:       user.role === "worker" ? "worker_login" : "user_login",
      actorId:    user.id,
      actorName:  user.name,
      actorEmail: user.email,
      actorRole:  user.role,
      details:    `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} logged in`,
    });
  }

  const token = makeToken(user);
  res.json({ token, user: safeUser(user, workerId) });
});

/* POST /api/auth/signup - admin signup is BLOCKED */
router.post("/signup", (req, res) => {
  const { name, email, password, role = "user", phone, categoryId, bio, lat, lng, pincode, street } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: "Name, email and password are required" });

  // Phone validation for workers
  if (role === "worker" && phone) {
    const phoneDigits = (phone + "").replace(/\D/g, "");
    if (phoneDigits.length !== 10)
      return res.status(400).json({ error: "Phone number must be exactly 10 digits" });
  }

  if (role === "admin")
    return res.status(403).json({ error: "Admin accounts cannot be created via signup. Contact a system administrator." });

  if (!["user", "worker"].includes(role))
    return res.status(400).json({ error: "Role must be user or worker" });

  if (!email.toLowerCase().endsWith("@gmail.com"))
    return res.status(400).json({ error: "Only Gmail accounts (@gmail.com) are accepted" });

  const users = readUsers();
  if (users.find(u => u.email === email))
    return res.status(409).json({ error: "This email is already registered" });

  const newUser = {
    id: Date.now(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    role,
    avatar: "",
    lat: parseFloat(lat) || 20.5937,   // India geographic center
    lng: parseFloat(lng) || 78.9629,   // India geographic center
    pincode: pincode || "",
    street:  street  || "",
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  writeUsers(users);

  let workerId = null;
  if (role === "worker") {
    if (!phone || !categoryId)
      return res.status(400).json({ error: "Workers need phone and category" });

    const workers = readWorkers();
    const newWorker = {
      id: Date.now() + 1,
      userId: newUser.id,
      name: newUser.name,
      email: newUser.email,
      categoryId: parseInt(categoryId),
      phone: phone.trim(),
      bio: bio || "",
      specialization: "",
      lat: newUser.lat, lng: newUser.lng,
      pincode: newUser.pincode,
      street:  newUser.street,
      availability: true,
      approved: false,
      avatar: "",
      rating: 0, jobsCompleted: 0,
    };
    workers.push(newWorker);
    writeWorkers(workers);
    workerId = newWorker.id;
  }

  const token = makeToken(newUser);
  res.status(201).json({ token, user: safeUser(newUser, workerId) });
});

/* POST /api/auth/change-password — admin-only: verifies current password then sets new one */
router.post("/change-password", verifyToken, (req, res) => {
  // Only admin accounts may use this endpoint
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied: admin only" });
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: "Current password and new password are required" });
  if (typeof newPassword !== "string" || newPassword.length < 6)
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  if (newPassword === currentPassword)
    return res.status(400).json({ error: "New password must be different from the current password" });

  const users = readUsers();
  const idx   = users.findIndex(u => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: "Admin account not found" });

  if (users[idx].password !== currentPassword)
    return res.status(401).json({ error: "Current password is incorrect" });

  users[idx].password  = newPassword;
  users[idx].updatedAt = new Date().toISOString();
  writeUsers(users);

  // Log to history (non-fatal)
  try {
    addHistoryEntry({
      type:       "admin_password_change",
      actorId:    req.user.id,
      actorName:  req.user.name,
      actorEmail: req.user.email,
      actorRole:  "admin",
      details:    "Admin changed their account password",
    });
  } catch (_) {}

  res.json({ ok: true, message: "Password changed successfully" });
});

/* POST /api/auth/heartbeat — lightweight presence ping (no body needed) */
router.post("/heartbeat", verifyToken, (req, res) => {
  // verifyToken already updated lastSeenAt via touchLastSeen()
  res.json({ ok: true, ts: new Date().toISOString() });
});

/* GET /api/auth/me */
router.get("/me", verifyToken, (req, res) => {
  const users = readUsers();
  const user  = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  let workerId = null;
  if (user.role === "worker") {
    const wp = readWorkers().find(w => w.userId === user.id);
    if (wp) workerId = wp.id;
  }
  res.json(safeUser(user, workerId));
});

/* PUT /api/auth/profile */
router.put("/profile", verifyToken, (req, res) => {
  const users = readUsers();
  const idx   = users.findIndex(u => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: "User not found" });

  const { name, email, password, avatar, lat, lng, pincode, street } = req.body;

  if (email && email !== users[idx].email) {
    if (users.find(u => u.email === email && u.id !== req.user.id))
      return res.status(409).json({ error: "Email already in use" });
  }

  if (name)              users[idx].name   = name.trim();
  if (email)             users[idx].email  = email.trim();
  if (password?.trim())  users[idx].password = password.trim();
  if (avatar !== undefined) users[idx].avatar = avatar;
  if (lat)               users[idx].lat    = parseFloat(lat);
  if (lng)               users[idx].lng    = parseFloat(lng);
  if (pincode !== undefined) users[idx].pincode = pincode;
  if (street  !== undefined) users[idx].street  = street;

  writeUsers(users);

  if (users[idx].role === "worker") {
    const workers = readWorkers();
    const wi = workers.findIndex(w => w.userId === req.user.id);
    if (wi !== -1) {
      if (name)               workers[wi].name    = users[idx].name;
      if (email)              workers[wi].email   = users[idx].email;
      if (avatar !== undefined) workers[wi].avatar = avatar;
      if (lat)                workers[wi].lat     = parseFloat(lat);
      if (lng)                workers[wi].lng     = parseFloat(lng);
      if (pincode !== undefined) workers[wi].pincode = pincode;
      if (street  !== undefined) workers[wi].street  = street;
      writeWorkers(workers);
    }
  }

  const token = makeToken(users[idx]);
  let workerId = null;
  if (users[idx].role === "worker") {
    const wp = readWorkers().find(w => w.userId === req.user.id);
    if (wp) workerId = wp.id;
  }
  res.json({ token, user: safeUser(users[idx], workerId) });
});

module.exports = router;
