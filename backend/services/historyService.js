/**
 * services/historyService.js
 *
 * Standalone history service — no Express/route dependencies.
 * Import this from any route file to record activity events.
 * Keeping it separate from routes/history.js eliminates any
 * possible circular-require issues between route files.
 */

const fs   = require("fs");
const path = require("path");

const HISTORY_FILE = path.join(__dirname, "../data/history.json");

// ── Ensure the file exists on first use ───────────────────────────────────────
function ensureFile() {
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, "[]", "utf-8");
  }
}

function readHistory() {
  try {
    ensureFile();
    const raw = fs.readFileSync(HISTORY_FILE, "utf-8").trim();
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("[HistoryService] Read error:", err.message);
    return [];
  }
}

function writeHistory(data) {
  try {
    ensureFile();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[HistoryService] Write error:", err.message);
    return false;
  }
}

/**
 * Append one activity entry to the history log (fire-and-forget safe).
 *
 * @param {object} entry
 * @param {string} entry.type        - "user_login" | "worker_login" | "booking"
 * @param {string} entry.actorName   - Display name of the person
 * @param {string} entry.actorEmail  - Email of the person
 * @param {string} entry.actorRole   - "user" | "worker"
 * @param {string} [entry.details]   - Human-readable summary string
 */
function addHistoryEntry(entry) {
  try {
    const history = readHistory();
    history.unshift({
      id:        `${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    });
    // Keep at most 10,000 entries
    if (history.length > 10_000) history.splice(10_000);
    writeHistory(history);
  } catch (err) {
    // Never crash the calling request over a history write
    console.error("[HistoryService] addHistoryEntry failed:", err.message);
  }
}

function clearHistory() {
  return writeHistory([]);
}

function getFilteredHistory({ type, limit } = {}) {
  let history = readHistory();
  if (type && type !== "all") {
    history = history.filter(e => e.type === type);
  }
  if (limit && !isNaN(parseInt(limit))) {
    history = history.slice(0, parseInt(limit));
  }
  return history;
}

function buildCSV(history) {
  const headers = [
    "ID", "Timestamp", "Type", "Actor Name",
    "Actor Email", "Actor Role", "Details",
  ];

  const escape = (val) => {
    const s = String(val ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const rows = history.map(e => [
    e.id,
    e.timestamp,
    e.type        || "",
    e.actorName   || "",
    e.actorEmail  || "",
    e.actorRole   || "",
    e.details     || "",
  ]);

  return [headers.join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
}

module.exports = { addHistoryEntry, clearHistory, getFilteredHistory, buildCSV, readHistory };
