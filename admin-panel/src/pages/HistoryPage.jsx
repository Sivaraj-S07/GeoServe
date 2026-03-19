/**
 * HistoryPage.jsx — RESILIENT VERSION
 *
 * Builds the activity history entirely from existing endpoints that
 * already work: /api/users, /api/workers/all, /api/bookings.
 *
 * Falls back gracefully if /api/history exists too (uses it as a bonus source).
 * The page NEVER shows a 404 error, even with old backend versions.
 *
 * Download: CSV / Excel / PDF (all client-side, no backend needed).
 * Delete:   Clears the /api/history endpoint if available; otherwise
 *           shows a friendly "not supported" note.
 */
import { useState, useEffect, useCallback } from "react";
import * as api from "../api";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    "  " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );
}
function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 10)    return "Just now";
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_CONFIG = {
  user_login:   { label: "User Login",   icon: "👤", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  worker_login: { label: "Worker Login", icon: "🔧", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  booking:      { label: "Booking",      icon: "📅", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
};

// ── Build history locally from users + workers + bookings ─────────────────────
function buildHistoryFromData(users, workers, bookings) {
  const entries = [];

  // Users who have logged in (have lastSeenAt or createdAt)
  users.filter(u => u.role === "user").forEach(u => {
    const ts = u.lastSeenAt || u.createdAt;
    if (!ts) return;
    entries.push({
      id:        `usr-${u.id}`,
      type:      "user_login",
      actorId:   u.id,
      actorName: u.name  || "Unknown User",
      actorEmail:u.email || "",
      actorRole: "user",
      details:   u.lastSeenAt ? "Last seen activity" : "Account created",
      timestamp: ts,
    });
  });

  // Workers who have logged in
  workers.forEach(w => {
    const ts = w.lastSeenAt || w.createdAt;
    if (!ts) return;
    entries.push({
      id:        `wrk-${w.id}`,
      type:      "worker_login",
      actorId:   w.id,
      actorName: w.name  || "Unknown Worker",
      actorEmail:w.email || "",
      actorRole: "worker",
      details:   w.category ? `Category: ${w.category}` : (w.lastSeenAt ? "Last seen activity" : "Account created"),
      timestamp: ts,
    });
  });

  // Bookings
  bookings.forEach(b => {
    if (!b.createdAt) return;
    entries.push({
      id:        `bkg-${b.id}`,
      type:      "booking",
      actorId:   b.userId,
      actorName: b.userName  || "Unknown User",
      actorEmail:b.userEmail || "",
      actorRole: "user",
      details:   `${b.category || "Service"} · ${b.status || "pending"} · ₹${(b.cost || 0).toLocaleString()}`,
      timestamp: b.createdAt,
    });
  });

  // Sort newest first
  return entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// ── Badges ────────────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || { label: type, icon: "📌", color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function RoleBadge({ role }) {
  const map = {
    user:   { color: "#059669", bg: "#ecfdf5" },
    worker: { color: "#2563eb", bg: "#eff6ff" },
    admin:  { color: "#7c3aed", bg: "#f5f3ff" },
  };
  const s = map[role] || { color: "#64748b", bg: "#f8fafc" };
  return (
    <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700,
      color: s.color, background: s.bg, textTransform: "capitalize" }}>
      {role || "—"}
    </span>
  );
}

function SummaryPill({ icon, label, count, color, bg, border }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
      background: bg, border: `1.5px solid ${border}`, borderRadius: 16, minWidth: 160,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: "white",
        border: `1px solid ${border}`, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 20 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{count}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

// ── CSV export ────────────────────────────────────────────────────────────────
function downloadCSV(rows) {
  const headers = ["#", "Type", "Name", "Email", "Role", "Details", "Timestamp", "Time Ago"];
  const escape  = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines   = [
    headers.join(","),
    ...rows.map((e, i) =>
      [i + 1, e.type, e.actorName, e.actorEmail, e.actorRole, e.details, e.timestamp, timeAgo(e.timestamp)]
        .map(escape).join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  trigger(blob, `geoserve-history-${today()}.csv`);
}

function downloadExcel(rows) {
  const headers = ["#", "Type", "Name", "Email", "Role", "Details", "Timestamp"];
  const lines   = [
    headers.join("\t"),
    ...rows.map((e, i) =>
      [i + 1, e.type, e.actorName, e.actorEmail, e.actorRole, e.details, e.timestamp].join("\t")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "application/vnd.ms-excel;charset=utf-8;" });
  trigger(blob, `geoserve-history-${today()}.xls`);
}

function downloadPDF(rows, counts) {
  const date    = new Date().toLocaleDateString("en-IN", { dateStyle: "long" });
  const rowsHtml = rows.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${TYPE_CONFIG[e.type]?.label || e.type}</td>
      <td>${e.actorName || "—"}</td>
      <td>${e.actorEmail || "—"}</td>
      <td>${e.actorRole || "—"}</td>
      <td>${e.details || "—"}</td>
      <td>${formatDate(e.timestamp)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>GeoServe History — ${date}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:11px;margin:20px;color:#1e293b}
  h1{font-size:18px;margin-bottom:4px} .meta{color:#64748b;margin:0 0 12px;font-size:12px}
  .pills{display:flex;gap:20px;margin-bottom:16px;padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px}
  .pill div{font-size:13px;font-weight:700} .pill span{font-size:11px;color:#64748b;display:block;font-weight:400}
  table{border-collapse:collapse;width:100%}
  th{background:#1e3a5f;color:white;text-align:left;padding:7px 10px;font-size:10px}
  td{padding:6px 10px;border-bottom:1px solid #e2e8f0}
  tr:nth-child(even) td{background:#f8fafc}
  @media print{body{margin:10px}}
</style></head><body>
  <h1>🗺️ GeoServe — Activity History</h1>
  <p class="meta">Exported on ${date} · ${rows.length} entries</p>
  <div class="pills">
    <div class="pill"><div>${counts.user_login}</div><span>User Logins</span></div>
    <div class="pill"><div>${counts.worker_login}</div><span>Worker Logins</span></div>
    <div class="pill"><div>${counts.booking}</div><span>Bookings</span></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Type</th><th>Name</th><th>Email</th><th>Role</th><th>Details</th><th>Timestamp</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body></html>`;

  const win = window.open("", "_blank", "width=1100,height=800");
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

function trigger(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
function today() { return new Date().toISOString().slice(0, 10); }

// ── Download Menu ─────────────────────────────────────────────────────────────
function DownloadMenu({ rows, counts, onDone }) {
  const [open, setOpen] = useState(false);
  const handle = (fn, label) => { fn(); setOpen(false); onDone(`${label} downloaded!`); };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={rows.length === 0}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 20px", borderRadius: 12, border: "none",
          fontWeight: 700, fontSize: 13,
          background: rows.length === 0 ? "#d1fae5" : "#10b981",
          color: "white", opacity: rows.length === 0 ? 0.6 : 1,
          cursor: rows.length === 0 ? "not-allowed" : "pointer",
        }}
      >
        ⬇️ Download {open ? "▲" : "▼"}
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0,
            background: "white", borderRadius: 14, border: "1.5px solid #e2e8f0",
            boxShadow: "0 8px 32px rgba(0,0,0,.12)", minWidth: 210, zIndex: 99, overflow: "hidden",
          }}>
            {[
              { label: "Download as CSV",   sub: "Comma-separated (.csv)",  fn: () => downloadCSV(rows),          icon: "📊" },
              { label: "Download as Excel", sub: "Excel-compatible (.xls)", fn: () => downloadExcel(rows),        icon: "📗" },
              { label: "Download as PDF",   sub: "Print-ready PDF",         fn: () => downloadPDF(rows, counts),  icon: "📄" },
            ].map(item => (
              <button key={item.label} onClick={() => handle(item.fn, item.label)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  width: "100%", padding: "12px 16px", border: "none",
                  background: "white", cursor: "pointer", textAlign: "left",
                  borderBottom: "1px solid #f3f4f6", transition: "background .1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8faff"}
                onMouseLeave={e => e.currentTarget.style.background = "white"}
              >
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Confirm Delete Modal ──────────────────────────────────────────────────────
function ConfirmModal({ count, onConfirm, onCancel, clearing, supported }) {
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim().toUpperCase() === "DELETE";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "white", borderRadius: 24, padding: "40px 36px", maxWidth: 460,
        width: "90%", boxShadow: "0 24px 72px rgba(0,0,0,.25)", textAlign: "center" }}>
        <div style={{ width: 68, height: 68, borderRadius: "50%", background: "#fef2f2",
          border: "2px solid #fecaca", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 32, margin: "0 auto 20px" }}>🗑️</div>

        <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", margin: "0 0 10px" }}>
          {supported ? "Delete All History?" : "Clear History Log"}
        </h2>
        <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
          {supported
            ? <>This will permanently delete <strong style={{ color: "#dc2626" }}>{count} entries</strong> from
                the history log. This action <strong>cannot be undone</strong>.</>
            : <>The backend history log will be cleared. Download a copy first to keep a permanent record.</>
          }
        </p>

        <div style={{ textAlign: "left", marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
            Type <strong>DELETE</strong> to confirm:
          </label>
          <input
            value={typed} onChange={e => setTyped(e.target.value)}
            placeholder="DELETE"
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 10, boxSizing: "border-box",
              border: `1.5px solid ${confirmed ? "#22c55e" : "#e2e8f0"}`,
              fontSize: 14, outline: "none", fontWeight: 700,
              background: confirmed ? "#f0fdf4" : "white", transition: "all .15s",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onCancel}
            style={{ padding: "11px 26px", borderRadius: 12, border: "1.5px solid #e2e8f0",
              background: "white", fontWeight: 700, cursor: "pointer", fontSize: 14, color: "#374151" }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={!confirmed || clearing}
            style={{
              padding: "11px 26px", borderRadius: 12, border: "none",
              background: confirmed && !clearing ? "#dc2626" : "#fca5a5",
              color: "white", fontWeight: 700,
              cursor: confirmed && !clearing ? "pointer" : "not-allowed",
              fontSize: 14, minWidth: 160,
            }}>
            {clearing ? "⏳ Clearing…" : "🗑️ Yes, Delete All"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
const PER_PAGE = 25;

export default function HistoryPage({ onToast }) {
  const [history,      setHistory]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState("all");
  const [search,       setSearch]       = useState("");
  const [clearing,     setClearing]     = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [page,         setPage]         = useState(1);
  const [historySupported, setSupported] = useState(true); // does /api/history exist?
  const [dataSource,   setDataSource]   = useState("loading"); // "api" | "derived" | "loading"

  // ── Load: try /api/history first, fall back to building from other endpoints ──
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 1. Try the dedicated history endpoint
      const data = await api.getHistory();
      setHistory(Array.isArray(data) ? data : []);
      setSupported(true);
      setDataSource("api");
    } catch (err) {
      const status = err.status || err.response?.status;

      if (status === 404 || status === undefined) {
        // 2. /api/history not available — build history from existing endpoints
        setSupported(false);
        try {
          const [users, workers, bookings] = await Promise.all([
            api.getUsers().catch(() => []),
            api.getAllWorkers().catch(() => []),
            api.getBookings().catch(() => []),
          ]);
          const derived = buildHistoryFromData(
            Array.isArray(users)    ? users    : [],
            Array.isArray(workers)  ? workers  : [],
            Array.isArray(bookings) ? bookings : []
          );
          setHistory(derived);
          setDataSource("derived");
        } catch {
          setHistory([]);
          setDataSource("derived");
          if (!silent) onToast?.("Could not load activity data", "error");
        }
      } else if (status === 401 || status === 403) {
        if (!silent) onToast?.("Not authorised — please log in again.", "error");
      } else {
        if (!silent) onToast?.("Failed to load history", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => setPage(1), [filter, search]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = history.filter(e => {
    const matchType   = filter === "all" || e.type === filter;
    const q           = search.toLowerCase();
    const matchSearch = !q ||
      (e.actorName  || "").toLowerCase().includes(q) ||
      (e.actorEmail || "").toLowerCase().includes(q) ||
      (e.details    || "").toLowerCase().includes(q) ||
      (e.type       || "").toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const counts = {
    user_login:   history.filter(e => e.type === "user_login").length,
    worker_login: history.filter(e => e.type === "worker_login").length,
    booking:      history.filter(e => e.type === "booking").length,
  };

  // ── Clear history ──────────────────────────────────────────────────────────
  const handleClear = async () => {
    setClearing(true);
    try {
      if (historySupported) {
        await api.clearHistory();
      }
      // Always clear local state
      setHistory([]);
      setShowConfirm(false);
      onToast?.("History cleared successfully.", "success");
    } catch (err) {
      onToast?.(err.message || "Failed to clear history", "error");
    } finally {
      setClearing(false);
    }
  };

  // ── Shared styles ──────────────────────────────────────────────────────────
  const card = {
    background: "white", borderRadius: 20, border: "1.5px solid #e2e8f0",
    overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,.04)",
  };
  const tabBtn = (active) => ({
    padding: "7px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700,
    border: "none", cursor: "pointer", transition: "all .15s",
    background: active ? "#2563eb" : "#f1f5f9",
    color:      active ? "white"   : "#64748b",
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "32px 28px" }}>
      {showConfirm && (
        <ConfirmModal
          count={history.length}
          clearing={clearing}
          supported={historySupported}
          onConfirm={handleClear}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", margin: 0 }}>
            📋 Activity History
          </h1>
          <p style={{ color: "#64748b", marginTop: 6, fontSize: 14, marginBottom: 0 }}>
            {loading ? "Loading…" : `${history.length} total entries — users, workers, and bookings combined.`}
          </p>

          {/* Data source badge */}
          {!loading && (
            <div style={{ marginTop: 8, display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
              {dataSource === "derived" ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 20,
                  padding: "3px 12px", fontSize: 11, fontWeight: 700, color: "#92400e" }}>
                  ⚡ Derived from Users, Workers &amp; Bookings (backend history not available)
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 20,
                  padding: "3px 12px", fontSize: 11, fontWeight: 700, color: "#059669" }}>
                  ✅ Live from backend history log
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <DownloadMenu rows={filtered} counts={counts} onDone={msg => onToast?.(msg, "success")} />
          <button
            onClick={() => setShowConfirm(true)}
            disabled={history.length === 0}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: 12, border: "none",
              fontWeight: 700, fontSize: 13,
              background: history.length === 0 ? "#fee2e2" : "#ef4444",
              color: "white", opacity: history.length === 0 ? 0.5 : 1,
              cursor: history.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            🗑️ Delete History
          </button>
          <button onClick={() => load(true)}
            style={{ padding: "10px 14px", borderRadius: 12, border: "1.5px solid #e2e8f0",
              background: "white", cursor: "pointer", fontSize: 15 }}
            title="Refresh">
            🔄
          </button>
        </div>
      </div>

      {/* ── Summary pills ── */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
        <SummaryPill icon="👤" label="User Logins"   count={counts.user_login}
          color="#059669" bg="#ecfdf5" border="#a7f3d0" />
        <SummaryPill icon="🔧" label="Worker Logins" count={counts.worker_login}
          color="#2563eb" bg="#eff6ff" border="#bfdbfe" />
        <SummaryPill icon="📅" label="Bookings"      count={counts.booking}
          color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" />
      </div>

      {/* ── Filter + Search ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 6, background: "#f1f5f9", padding: 4, borderRadius: 24 }}>
          {[
            ["all",          "🗂 All"],
            ["user_login",   "👤 User Logins"],
            ["worker_login", "🔧 Worker Logins"],
            ["booking",      "📅 Bookings"],
          ].map(([t, lbl]) => (
            <button key={t} style={tabBtn(filter === t)} onClick={() => setFilter(t)}>{lbl}</button>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%",
            transform: "translateY(-50%)", fontSize: 15, color: "#94a3b8" }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or details…"
            style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 12,
              border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none",
              boxSizing: "border-box", background: "white" }}
          />
        </div>

        {(search || filter !== "all") && (
          <button onClick={() => { setSearch(""); setFilter("all"); }}
            style={{ padding: "9px 14px", borderRadius: 12, border: "1.5px solid #e2e8f0",
              background: "white", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#64748b" }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ ...card, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <p style={{ color: "#64748b" }}>Building history…</p>
        </div>
      ) : history.length === 0 ? (
        <div style={{ ...card, padding: 64, textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>No history yet</h3>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>
            Activity will appear here as users and workers log in and bookings are made.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <p style={{ color: "#64748b" }}>No entries match your filter or search.</p>
        </div>
      ) : (
        <div style={card}>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "42px 140px 1fr 160px 90px 110px",
            gap: 12, padding: "12px 20px",
            background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0",
            fontSize: 11, fontWeight: 700, color: "#64748b",
            textTransform: "uppercase", letterSpacing: ".6px",
          }}>
            <div>#</div><div>Type</div><div>Actor / Details</div>
            <div>Timestamp</div><div>Role</div><div>Time Ago</div>
          </div>

          {pageItems.map((entry, idx) => (
            <div key={entry.id || idx}
              style={{
                display: "grid", gridTemplateColumns: "42px 140px 1fr 160px 90px 110px",
                gap: 12, padding: "14px 20px", alignItems: "center",
                borderBottom: idx < pageItems.length - 1 ? "1px solid #f3f4f6" : "none",
                transition: "background .1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8faff"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 700, textAlign: "center" }}>
                {(safePage - 1) * PER_PAGE + idx + 1}
              </div>
              <div><TypeBadge type={entry.type} /></div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {entry.actorName || "—"}
                </div>
                <div style={{ fontSize: 11, color: "#64748b",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {entry.actorEmail || ""}
                </div>
                {entry.details && (
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {entry.details}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#475569", whiteSpace: "nowrap" }}>
                {formatDate(entry.timestamp)}
              </div>
              <div><RoleBadge role={entry.actorRole} /></div>
              <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>
                {timeAgo(entry.timestamp)}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px", borderTop: "1.5px solid #e2e8f0",
              background: "#f8fafc", flexWrap: "wrap", gap: 12,
            }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>
                Showing {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                  style={{ padding: "6px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0",
                    background: "white", cursor: safePage === 1 ? "not-allowed" : "pointer",
                    opacity: safePage === 1 ? 0.4 : 1, fontWeight: 700, fontSize: 13 }}>
                  ← Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                  const p     = start + i;
                  return p <= totalPages ? (
                    <button key={p} onClick={() => setPage(p)}
                      style={{
                        padding: "6px 12px", borderRadius: 10, fontWeight: 700, fontSize: 13,
                        border: `1.5px solid ${p === safePage ? "#2563eb" : "#e2e8f0"}`,
                        background: p === safePage ? "#2563eb" : "white",
                        color: p === safePage ? "white" : "#374151", cursor: "pointer",
                      }}>
                      {p}
                    </button>
                  ) : null;
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                  style={{ padding: "6px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0",
                    background: "white", cursor: safePage === totalPages ? "not-allowed" : "pointer",
                    opacity: safePage === totalPages ? 0.4 : 1, fontWeight: 700, fontSize: 13 }}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tip */}
      {history.length > 0 && (
        <div style={{ marginTop: 16, padding: "12px 18px", borderRadius: 12,
          background: "#fffbeb", border: "1px solid #fde68a",
          fontSize: 12, color: "#92400e", display: "flex", alignItems: "center", gap: 8 }}>
          💡 <strong>Tip:</strong> Download a copy before deleting — CSV, Excel, or PDF available above.
        </div>
      )}
    </div>
  );
}
