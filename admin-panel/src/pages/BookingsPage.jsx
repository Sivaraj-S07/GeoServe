/**
 * BookingsPage.jsx
 *
 * Standalone bookings section — independent of Users and Workers lists.
 * Adds: CSV / Excel / PDF export, improved stats, filter bar, expand-detail row.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import * as api from "../api";

// ── Status meta ────────────────────────────────────────────────────────────────
const STATUS_META = {
  pending:     { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "Pending",     dot: "#f59e0b" },
  accepted:    { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", label: "Accepted",    dot: "#3b82f6" },
  in_progress: { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", label: "In Progress", dot: "#a78bfa" },
  completed:   { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", label: "Completed",   dot: "#10b981" },
  confirmed:   { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", label: "Confirmed",   dot: "#22c55e" },
  rejected:    { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Rejected",    dot: "#ef4444" },
  cancelled:   { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", label: "Cancelled",   dot: "#94a3b8" },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", label: status, dot: "#94a3b8" };
  return (
    <span style={{
      background: m.bg, border: `1px solid ${m.border}`, color: m.color,
      fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
      display: "inline-flex", alignItems: "center", gap: 5,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot }} />
      {m.label}
    </span>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (d) => {
  try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }); }
  catch { return d; }
};
const fmtFull = (d) => {
  try { return new Date(d).toLocaleString("en-IN"); }
  catch { return d; }
};

// ── CSV download ───────────────────────────────────────────────────────────────
function downloadCSV(rows) {
  const headers = ["#", "Customer", "Worker", "Category", "Date", "Duration(h)", "Cost(₹)", "Payment", "Status", "Commission(₹)", "Created"];
  const escape  = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines   = [
    headers.join(","),
    ...rows.map((b, i) =>
      [i + 1, b.userName, b.workerName, b.category, b.date, b.duration, b.cost, b.paymentStatus, b.status, b.adminCommission, b.createdAt]
        .map(escape).join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `geoserve-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Excel (TSV) ────────────────────────────────────────────────────────────────
function downloadExcel(rows) {
  const headers = ["#", "Customer", "Worker", "Category", "Date", "Duration", "Cost", "Payment", "Status", "Commission", "Created"];
  const lines   = [
    headers.join("\t"),
    ...rows.map((b, i) =>
      [i + 1, b.userName, b.workerName, b.category, b.date, b.duration, b.cost, b.paymentStatus, b.status, b.adminCommission, b.createdAt].join("\t")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `geoserve-bookings-${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── PDF (print HTML) ───────────────────────────────────────────────────────────
function downloadPDF(rows) {
  const date = new Date().toLocaleDateString("en-IN", { dateStyle: "long" });
  const totalRevenue    = rows.reduce((s, b) => s + (b.paymentStatus === "paid" ? (b.cost || 0) : 0), 0);
  const totalCommission = rows.reduce((s, b) => s + (b.adminCommission || 0), 0);

  const rowsHtml = rows.map((b, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${b.userName || "—"}</td>
      <td>${b.workerName || "—"}</td>
      <td>${b.category || "—"}</td>
      <td>${fmt(b.date)}</td>
      <td>${b.duration || 1}h</td>
      <td>₹${(b.cost || 0).toLocaleString()}</td>
      <td>${b.paymentStatus === "paid" ? "✅ Paid" : "⏳ Unpaid"}</td>
      <td>${STATUS_META[b.status]?.label || b.status || "—"}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>GeoServe Bookings — ${date}</title>
  <style>
    body  { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #1e293b; }
    h1    { font-size: 18px; margin-bottom: 4px; }
    .meta { color: #64748b; margin: 0 0 6px; font-size: 12px; }
    .summary { display: flex; gap: 24px; margin-bottom: 16px; padding: 12px 16px;
               background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
    .summary div { font-size: 13px; font-weight: 700; }
    .summary span { font-size: 11px; color: #64748b; display: block; font-weight: 400; }
    table { border-collapse: collapse; width: 100%; }
    th    { background: #1e3a5f; color: white; text-align: left; padding: 7px 10px; font-size: 10px; }
    td    { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
    tr:nth-child(even) td { background: #f8fafc; }
    @media print { body { margin: 10px; } }
  </style>
</head>
<body>
  <h1>🗺️ GeoServe — Booking Report</h1>
  <p class="meta">Exported on ${date} · ${rows.length} bookings</p>
  <div class="summary">
    <div>₹${totalRevenue.toLocaleString()} <span>Total Revenue</span></div>
    <div>₹${totalCommission.toLocaleString()} <span>Platform Commission</span></div>
    <div>${rows.filter(b => b.paymentStatus === "paid").length} <span>Paid Bookings</span></div>
    <div>${rows.filter(b => ["completed", "confirmed"].includes(b.status)).length} <span>Completed</span></div>
  </div>
  <table>
    <thead>
      <tr><th>#</th><th>Customer</th><th>Worker</th><th>Category</th><th>Date</th><th>Duration</th><th>Amount</th><th>Payment</th><th>Status</th></tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;

  const win = window.open("", "_blank", "width=1200,height=800");
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

// ── Download Menu ──────────────────────────────────────────────────────────────
function DownloadMenu({ rows, onDone }) {
  const [open, setOpen] = useState(false);

  const handle = (fn, label) => {
    fn(rows);
    setOpen(false);
    onDone(`${label} downloaded successfully!`);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={rows.length === 0}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "9px 18px", borderRadius: 12, border: "none",
          fontWeight: 700, fontSize: 13,
          background: rows.length === 0 ? "#bbf7d0" : "#10b981",
          color: "white", opacity: rows.length === 0 ? 0.6 : 1,
          cursor: rows.length === 0 ? "not-allowed" : "pointer",
        }}
      >
        ⬇️ Export {open ? "▲" : "▼"}
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0,
            background: "white", borderRadius: 14, border: "1.5px solid #e2e8f0",
            boxShadow: "0 8px 32px rgba(0,0,0,.12)", minWidth: 220, zIndex: 99, overflow: "hidden",
          }}>
            {[
              { label: "Export as CSV",   sub: "Comma-separated (.csv)",  fn: downloadCSV,   icon: "📊" },
              { label: "Export as Excel", sub: "Excel-compatible (.xls)", fn: downloadExcel, icon: "📗" },
              { label: "Export as PDF",   sub: "Print-ready report",      fn: downloadPDF,   icon: "📄" },
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

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, grad, bg, border }) {
  return (
    <div
      style={{
        background: "white", borderRadius: 16, border: `1.5px solid ${border}`,
        padding: "16px 18px", position: "relative", overflow: "hidden",
        transition: "all .2s", cursor: "default",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${border}`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{ height: 3, background: grad, position: "absolute", top: 0, left: 0, right: 0, borderRadius: "16px 16px 0 0" }} />
      <div style={{ paddingTop: 4 }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -1, color: "#0f172a" }}>{value}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".04em", marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function BookingsPage({ onToast }) {
  const [bookings,    setBookings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [statusF,     setStatusF]     = useState("");
  const [payF,        setPayF]        = useState("");
  const [deleting,    setDeleting]    = useState(null);
  const [expanded,    setExpanded]    = useState(null);
  const [lastRefresh, setLR]          = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getBookings();
      setBookings([...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setLR(new Date());
    } catch {
      if (!silent) onToast("Failed to load bookings", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 30_000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this booking? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await api.deleteBooking(id);
      setBookings(p => p.filter(b => b.id !== id));
      onToast("Booking deleted");
    } catch {
      onToast("Delete failed", "error");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = bookings.filter(b => {
    const q  = search.toLowerCase();
    const mQ = !q ||
      b.userName?.toLowerCase().includes(q) ||
      b.workerName?.toLowerCase().includes(q) ||
      b.category?.toLowerCase().includes(q) ||
      String(b.id).toLowerCase().includes(q);
    const mS = !statusF || b.status === statusF;
    const mP = !payF || (payF === "paid" ? b.paymentStatus === "paid" : b.paymentStatus !== "paid");
    return mQ && mS && mP;
  });

  const stats = {
    total:      bookings.length,
    pending:    bookings.filter(b => b.status === "pending").length,
    active:     bookings.filter(b => ["accepted", "in_progress"].includes(b.status)).length,
    done:       bookings.filter(b => ["completed", "confirmed"].includes(b.status)).length,
    revenue:    bookings.filter(b => b.paymentStatus === "paid").reduce((s, b) => s + (b.cost || 0), 0),
    commission: bookings.reduce((s, b) => s + (b.adminCommission || 0), 0),
  };

  const card = {
    background: "white", borderRadius: 20, border: "1.5px solid #e2e8f0",
    overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,.04)",
  };

  return (
    <div className="anim-fade" style={{ padding: "32px 28px" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-.5px", margin: 0, color: "#0f172a" }}>
            📅 Booking Management
          </h1>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 5, marginBottom: 0 }}>
            Monitor all service requests · {bookings.length} total
            {lastRefresh ? ` · Updated ${Math.floor((Date.now() - lastRefresh) / 1000)}s ago` : ""}
          </p>
          <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6,
            background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 20,
            padding: "3px 12px", fontSize: 11, fontWeight: 700, color: "#7c3aed" }}>
            📅 Bookings section — independent of Users &amp; Workers lists
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <DownloadMenu rows={filtered} onDone={(msg) => onToast(msg, "success")} />
          <button
            onClick={() => load()}
            style={{ padding: "9px 14px", borderRadius: 12, border: "1.5px solid #e2e8f0",
              background: "white", cursor: "pointer", fontSize: 15, fontWeight: 700 }}
          >
            ↻
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total"       value={stats.total}                            grad="linear-gradient(135deg,#4f46e5,#7c3aed)"  bg="#eef2ff"  border="#c7d2fe" />
        <StatCard label="Pending"     value={stats.pending}                          grad="linear-gradient(135deg,#d97706,#f59e0b)"  bg="#fffbeb"  border="#fde68a" />
        <StatCard label="Active"      value={stats.active}                           grad="linear-gradient(135deg,#7c3aed,#a78bfa)"  bg="#f5f3ff"  border="#ddd6fe" />
        <StatCard label="Completed"   value={stats.done}                             grad="linear-gradient(135deg,#059669,#10b981)"  bg="#ecfdf5"  border="#a7f3d0" />
        <StatCard label="Revenue"     value={`₹${stats.revenue.toLocaleString()}`}   grad="linear-gradient(135deg,#2563eb,#3b82f6)"  bg="#eff6ff"  border="#bfdbfe" />
        <StatCard label="Commission"  value={`₹${stats.commission.toLocaleString()}`} grad="linear-gradient(135deg,#d97706,#f59e0b)" bg="#fffbeb"  border="#fde68a" />
      </div>

      {/* ── Filter bar ── */}
      <div style={{ ...card, padding: "14px 18px", marginBottom: 20, borderRadius: 16,
        display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, opacity: .4 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customer, worker, category, ID…"
            style={{
              paddingLeft: 34, background: "#f8fafc", border: "1.5px solid #e2e8f0",
              borderRadius: 10, height: 38, fontSize: 13, outline: "none",
              width: "100%", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Status select */}
        <select
          value={statusF}
          onChange={e => setStatusF(e.target.value)}
          style={{ minWidth: 150, height: 38, borderRadius: 10, border: "1.5px solid #e2e8f0",
            background: "#f8fafc", fontSize: 13, padding: "0 12px", outline: "none" }}
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Payment select */}
        <select
          value={payF}
          onChange={e => setPayF(e.target.value)}
          style={{ minWidth: 140, height: 38, borderRadius: 10, border: "1.5px solid #e2e8f0",
            background: "#f8fafc", fontSize: 13, padding: "0 12px", outline: "none" }}
        >
          <option value="">All Payments</option>
          <option value="paid">Paid Only</option>
          <option value="unpaid">Unpaid Only</option>
        </select>

        {(search || statusF || payF) && (
          <button
            onClick={() => { setSearch(""); setStatusF(""); setPayF(""); }}
            style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0",
              background: "white", cursor: "pointer", fontWeight: 700, fontSize: 12, color: "#64748b" }}
          >
            ✕ Clear
          </button>
        )}

        <div style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
          Showing {filtered.length} of {bookings.length}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={card}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64, gap: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #eef2ff",
              borderTopColor: "#4f46e5", animation: "spin .7s linear infinite" }} />
            <span style={{ color: "#64748b", fontWeight: 600 }}>Loading bookings…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: .6 }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 6 }}>No bookings found</div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>
              {bookings.length === 0 ? "No bookings exist yet." : "Try adjusting your search or filters."}
            </div>
          </div>
        ) : (
          <table className="data-table" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr style={{ background: "linear-gradient(135deg,#f8fafc,#f1f5f9)" }}>
                <th style={{ width: "16%" }}>Customer</th>
                <th style={{ width: "14%" }}>Worker</th>
                <th style={{ width: "10%" }}>Category</th>
                <th style={{ width: "9%"  }}>Date</th>
                <th style={{ width: "7%"  }}>Dur.</th>
                <th style={{ width: "10%" }}>Amount</th>
                <th style={{ width: "10%" }}>Payment</th>
                <th style={{ width: "12%" }}>Status</th>
                <th style={{ width: "12%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <>
                  <tr
                    key={b.id}
                    style={{ cursor: "pointer", transition: "background .12s" }}
                    onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                    onMouseEnter={e => [...e.currentTarget.querySelectorAll("td")].forEach(td => td.style.background = "#f8faff")}
                    onMouseLeave={e => [...e.currentTarget.querySelectorAll("td")].forEach(td => td.style.background = "")}
                  >
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {b.userName || "—"}
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>#{String(b.id).slice(-6)}</div>
                    </td>
                    <td>
                      <div style={{ color: "#475569", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {b.workerName || "—"}
                      </div>
                    </td>
                    <td>
                      {b.category && (
                        <span style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8",
                          fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>
                          {b.category}
                        </span>
                      )}
                    </td>
                    <td><div style={{ fontSize: 12, color: "#64748b" }}>{fmt(b.date)}</div></td>
                    <td><div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{b.duration || 1}h</div></td>
                    <td><div style={{ fontWeight: 800, color: "#059669", fontSize: 14 }}>₹{(b.cost || 0).toLocaleString()}</div></td>
                    <td>
                      <span style={{
                        background: b.paymentStatus === "paid" ? "#ecfdf5" : "#f8fafc",
                        border: `1px solid ${b.paymentStatus === "paid" ? "#a7f3d0" : "#e2e8f0"}`,
                        color: b.paymentStatus === "paid" ? "#059669" : "#94a3b8",
                        fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
                        display: "inline-flex", alignItems: "center", gap: 4,
                      }}>
                        {b.paymentStatus === "paid" ? "✅ Paid" : "⏳ Unpaid"}
                      </span>
                    </td>
                    <td><StatusBadge status={b.status} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button
                          onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                          style={{
                            padding: "5px 10px", borderRadius: 7,
                            border: "1.5px solid #e2e8f0",
                            background: expanded === b.id ? "#eef2ff" : "white",
                            color: expanded === b.id ? "#4f46e5" : "#64748b",
                            fontSize: 11, fontWeight: 700, cursor: "pointer",
                          }}
                        >
                          {expanded === b.id ? "▲" : "▼"}
                        </button>
                        <button
                          disabled={deleting === b.id}
                          onClick={() => handleDelete(b.id)}
                          style={{
                            padding: "5px 10px", borderRadius: 7, border: "none",
                            background: deleting === b.id ? "#f1f5f9" : "#fef2f2",
                            color: deleting === b.id ? "#94a3b8" : "#dc2626",
                            fontSize: 12, fontWeight: 700, cursor: deleting === b.id ? "not-allowed" : "pointer",
                          }}
                        >
                          {deleting === b.id ? "…" : "🗑"}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {expanded === b.id && (
                    <tr key={`${b.id}-detail`}>
                      <td colSpan={9} style={{
                        background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
                        padding: "20px 28px", borderBottom: "2px solid #e2e8f0",
                      }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "14px 24px" }}>
                          {[
                            ["Booking ID",    `#${b.id}`],
                            ["Hourly Rate",   `₹${b.hourlyRate || 0}/h`],
                            ["Service Cost",  `₹${b.serviceCost || 0}`],
                            ["Platform Fee",  `₹${b.platformFee || 0}`],
                            ["Worker Payout", `₹${b.workerPayout || 0}`],
                            ["Commission",    b.commissionStatus || "—"],
                            ["Transaction",   b.transactionId || "—"],
                            ["Pay Method",    b.paymentMethod || "—"],
                            ["Work Started",  b.workStartedAt ? new Date(b.workStartedAt).toLocaleTimeString("en-IN") : "—"],
                            ["Notes",         b.notes || "—"],
                            ["Created",       fmtFull(b.createdAt)],
                            ["Address",       b.userAddress || "—"],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8",
                                textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>
                                {label}
                              </div>
                              <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 500, wordBreak: "break-all" }}>
                                {String(value)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {b.statusHistory?.length > 0 && (
                          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8",
                              textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
                              Status History
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {b.statusHistory.map((h, i) => (
                                <div key={i} style={{ background: "white", border: "1px solid #e2e8f0",
                                  borderRadius: 8, padding: "6px 12px", fontSize: 11 }}>
                                  <span style={{ fontWeight: 700 }}>{h.status}</span>
                                  <span style={{ color: "#94a3b8", marginLeft: 6 }}>
                                    {new Date(h.changedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div style={{
            padding: "12px 20px", background: "#f8fafc", borderTop: "1.5px solid #e2e8f0",
            fontSize: 12, color: "#64748b", fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>{filtered.length} booking{filtered.length !== 1 ? "s" : ""} shown</span>
            <span style={{ color: "#059669", fontWeight: 700 }}>
              ₹{filtered.filter(b => b.paymentStatus === "paid").reduce((s, b) => s + (b.cost || 0), 0).toLocaleString()} total revenue (filtered)
            </span>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
