/**
 * routes/history.js — PostgreSQL version (async)
 * Delegates to historyService.js which uses the pg pool.
 */
const express = require("express");
const router  = express.Router();
const { requireRole } = require("../middleware/role");
const { getFilteredHistory, clearHistory, buildCSV, readHistory } = require("../services/historyService");

router.get("/ping", (_req, res) => {
  res.json({ ok: true, endpoint: "/api/history", message: "History route is active ✅" });
});

router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const result = await getFilteredHistory(req.query);
    res.json(result);
  } catch (err) {
    console.error("[History GET]", err.message);
    res.status(500).json({ error: "Failed to read history" });
  }
});

router.get("/download", requireRole("admin"), async (_req, res) => {
  try {
    const history  = await readHistory();
    const csv      = buildCSV(history);
    const filename = `geoserve-history-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-cache");
    res.send(csv);
  } catch (err) {
    console.error("[History DOWNLOAD]", err.message);
    res.status(500).json({ error: "Failed to generate CSV" });
  }
});

router.delete("/", requireRole("admin"), async (_req, res) => {
  try {
    await clearHistory();
    res.json({ ok: true, message: "History cleared successfully" });
  } catch (err) {
    console.error("[History DELETE]", err.message);
    res.status(500).json({ error: "Failed to clear history" });
  }
});

module.exports = router;
