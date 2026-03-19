/**
 * routes/history.js
 *
 * Admin-only REST endpoints for the activity history log.
 * All data logic lives in services/historyService.js.
 *
 * GET    /api/history             → list entries (admin only)
 * GET    /api/history/download    → download as CSV (admin only)
 * DELETE /api/history             → clear all history (admin only)
 *
 * NOTE: requireRole() already calls verifyToken() internally.
 * Do NOT add verifyToken as a separate middleware — it would run twice.
 */

const express = require("express");
const router  = express.Router();

const { requireRole } = require("../middleware/role");
const {
  getFilteredHistory,
  clearHistory,
  buildCSV,
  readHistory,
} = require("../services/historyService");
// ── GET /api/history/ping ─────────────────────────────────────────────────────
// Public health check — no auth needed. Useful for debugging 404s.
router.get("/ping", (_req, res) => {
  res.json({ ok: true, endpoint: "/api/history", message: "History route is active ✅" });
});



// ── GET /api/history ──────────────────────────────────────────────────────────
router.get("/", requireRole("admin"), (req, res) => {
  try {
    const result = getFilteredHistory(req.query);
    res.json(result);
  } catch (err) {
    console.error("[History GET] Error:", err.message);
    res.status(500).json({ error: "Failed to read history" });
  }
});

// ── GET /api/history/download ─────────────────────────────────────────────────
// Must be defined BEFORE any /:id dynamic routes.
router.get("/download", requireRole("admin"), (req, res) => {
  try {
    const history  = readHistory();
    const csv      = buildCSV(history);
    const filename = `geoserve-history-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-cache");
    res.send(csv);
  } catch (err) {
    console.error("[History DOWNLOAD] Error:", err.message);
    res.status(500).json({ error: "Failed to generate CSV" });
  }
});

// ── DELETE /api/history ───────────────────────────────────────────────────────
router.delete("/", requireRole("admin"), (req, res) => {
  try {
    clearHistory();
    res.json({ ok: true, message: "History cleared successfully" });
  } catch (err) {
    console.error("[History DELETE] Error:", err.message);
    res.status(500).json({ error: "Failed to clear history" });
  }
});

module.exports = router;
