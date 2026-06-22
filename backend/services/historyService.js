/**
 * services/historyService.js — PostgreSQL version
 */
const pool = require("../db/pool");

async function addHistoryEntry(entry) {
  try {
    const id = `${Date.now()}-${Math.floor(Math.random()*9999)}`;
    await pool.query(
      `INSERT INTO history(id,timestamp,type,actor_id,actor_name,actor_email,actor_role,
         booking_id,details,worker_name,category,date,cost,status)
       VALUES($1,NOW(),$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id, entry.type||"", entry.actorId||null,
       entry.actorName||"", entry.actorEmail||"", entry.actorRole||"",
       entry.bookingId||null, entry.details||"",
       entry.workerName||"", entry.category||"",
       entry.date||"", entry.cost||null, entry.status||""]
    );
  } catch(err) {
    console.error("[HistoryService] addHistoryEntry failed:", err.message);
  }
}

async function readHistory() {
  const { rows } = await pool.query("SELECT * FROM history ORDER BY timestamp DESC");
  return rows.map(r => ({
    id: r.id, timestamp: r.timestamp, type: r.type,
    actorId: r.actor_id ? Number(r.actor_id) : null,
    actorName: r.actor_name, actorEmail: r.actor_email, actorRole: r.actor_role,
    bookingId: r.booking_id ? Number(r.booking_id) : null,
    details: r.details, workerName: r.worker_name,
    category: r.category, date: r.date, cost: r.cost, status: r.status,
  }));
}

async function getFilteredHistory({ type, limit } = {}) {
  let q = "SELECT * FROM history";
  const params = [];
  if (type && type !== "all") { q += " WHERE type=$1"; params.push(type); }
  q += " ORDER BY timestamp DESC";
  if (limit && !isNaN(parseInt(limit))) {
    q += ` LIMIT $${params.length+1}`; params.push(parseInt(limit));
  }
  const { rows } = await pool.query(q, params);
  return rows.map(r => ({
    id: r.id, timestamp: r.timestamp, type: r.type,
    actorId: r.actor_id ? Number(r.actor_id) : null,
    actorName: r.actor_name, actorEmail: r.actor_email, actorRole: r.actor_role,
    bookingId: r.booking_id ? Number(r.booking_id) : null,
    details: r.details, workerName: r.worker_name,
    category: r.category, date: r.date, cost: r.cost, status: r.status,
  }));
}

async function clearHistory() {
  await pool.query("DELETE FROM history");
}

function buildCSV(history) {
  const headers = ["ID","Timestamp","Type","Actor Name","Actor Email","Actor Role","Details"];
  const escape = v => {
    const s = String(v??"");
    return s.includes(",")||s.includes('"')||s.includes("\n") ? `"${s.replace(/"/g,'""')}"` : s;
  };
  const rows = history.map(e=>[e.id,e.timestamp,e.type||"",e.actorName||"",
    e.actorEmail||"",e.actorRole||"",e.details||""]);
  return [headers.join(","), ...rows.map(r=>r.map(escape).join(","))].join("\n");
}

module.exports = { addHistoryEntry, readHistory, getFilteredHistory, clearHistory, buildCSV };
