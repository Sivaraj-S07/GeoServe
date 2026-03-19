/**
 * UsersPage.jsx — Strictly shows ONLY accounts with role === "user".
 * Workers are NEVER rendered here, even if the API returns them.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../api";

const ONLINE_MS = 5 * 60 * 1000;
function isOnline(u) {
  if (!u.lastSeenAt) return false;
  return Date.now() - new Date(u.lastSeenAt).getTime() < ONLINE_MS;
}
function timeAgo(iso) {
  if (!iso) return "Never";
  const d = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (d < 10) return "Just now";
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StatCard({ label, value, icon, grad, bg, border }) {
  return (
    <div style={{
      background: bg, border: `1.5px solid ${border}`, borderRadius: 16,
      padding: "18px 20px", display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 12, background: grad,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,.12)",
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: "#0f172a" }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

function OnlineBadge({ online }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: online ? "#ecfdf5" : "#f8fafc",
      color: online ? "#059669" : "#94a3b8",
      border: `1px solid ${online ? "#a7f3d0" : "#e2e8f0"}`,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: online ? "#22c55e" : "#d1d5db",
        boxShadow: online ? "0 0 0 2px rgba(34,197,94,.3)" : "none",
      }} />
      {online ? "Online" : "Offline"}
    </span>
  );
}

export default function UsersPage({ onToast }) {
  const [allUsers,   setAllUsers]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [statusF,    setStatusF]    = useState("all");
  const [deleting,   setDeleting]   = useState(null);
  const [lastRefresh, setLR]        = useState(null);
  const [expandedId, setExpanded]   = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getUsers();
      // ✅ CRITICAL: Only role === "user" — workers are NEVER shown here
      const usersOnly = (Array.isArray(data) ? data : []).filter(u => u.role === "user");
      setAllUsers(usersOnly);
      setLR(new Date());
    } catch {
      if (!silent) onToast("Failed to load users", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 30_000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await api.deleteUser(id);
      setAllUsers(prev => prev.filter(u => u.id !== id));
      onToast("User deleted successfully");
    } catch {
      onToast("Delete failed", "error");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = allUsers.filter(u => {
    const q  = search.toLowerCase();
    const mQ = !q ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q);
    const online = isOnline(u);
    const mS = statusF === "all" ||
      (statusF === "online" && online) ||
      (statusF === "offline" && !online);
    return mQ && mS;
  });

  const onlineCount = allUsers.filter(isOnline).length;
  const newThisWeek = allUsers.filter(u => {
    if (!u.createdAt) return false;
    return (Date.now() - new Date(u.createdAt)) / (1000 * 60 * 60 * 24) < 7;
  }).length;

  const card = {
    background: "white", borderRadius: 20, border: "1.5px solid #e2e8f0",
    overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,.04)",
  };
  const tabBtn = (active) => ({
    padding: "7px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700,
    border: "none", cursor: "pointer", transition: "all .15s",
    background: active ? "#4f46e5" : "#f1f5f9",
    color: active ? "white" : "#64748b",
  });

  if (loading) {
    return (
      <div style={{ padding: "32px 28px" }}>
        <div style={{ ...card, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <p style={{ color: "#64748b" }}>Loading users…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 28px" }} className="anim-fade">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-.5px", margin: 0, color: "#0f172a" }}>
            👥 User Management
          </h1>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 5, marginBottom: 0 }}>
            {allUsers.length} registered users · {onlineCount} online now
            {lastRefresh ? ` · Refreshed ${Math.floor((Date.now() - lastRefresh) / 1000)}s ago` : ""}
          </p>
          <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6,
            background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 20,
            padding: "3px 12px", fontSize: 11, fontWeight: 700, color: "#1d4ed8" }}>
            ✅ Users only — workers are excluded from this section
          </div>
        </div>
        <button
          style={{ padding: "9px 18px", borderRadius: 12, border: "1.5px solid #e2e8f0",
            background: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
          onClick={() => load()}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
        gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Users"   value={allUsers.length} icon="👤"
          grad="linear-gradient(135deg,#4f46e5,#7c3aed)" bg="#eef2ff" border="#c7d2fe" />
        <StatCard label="Online Now"    value={onlineCount}     icon="🟢"
          grad="linear-gradient(135deg,#059669,#10b981)" bg="#ecfdf5" border="#a7f3d0" />
        <StatCard label="New This Week" value={newThisWeek}     icon="🆕"
          grad="linear-gradient(135deg,#7c3aed,#a78bfa)" bg="#f5f3ff" border="#ddd6fe" />
        <StatCard label="Showing"       value={filtered.length} icon="🔍"
          grad="linear-gradient(135deg,#0f172a,#334155)"  bg="#f8fafc" border="#e2e8f0" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%",
            transform: "translateY(-50%)", fontSize: 14, color: "#94a3b8" }}>🔍</span>
          <input
            style={{ padding: "9px 12px 9px 36px", borderRadius: 12, border: "1.5px solid #e2e8f0",
              fontSize: 13, outline: "none", background: "white", width: "100%", boxSizing: "border-box" }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone…"
          />
        </div>
        <div style={{ display: "flex", gap: 6, background: "#f1f5f9", padding: 4, borderRadius: 24 }}>
          {["all", "online", "offline"].map(s => (
            <button key={s} style={tabBtn(statusF === s)} onClick={() => setStatusF(s)}>
              {{ all: "🗂 All", online: "🟢 Online", offline: "⚫ Offline" }[s]}
            </button>
          ))}
        </div>
        {(search || statusF !== "all") && (
          <button onClick={() => { setSearch(""); setStatusF("all"); }}
            style={{ padding: "9px 14px", borderRadius: 12, border: "1.5px solid #e2e8f0",
              background: "white", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#64748b" }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ ...card, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>
            No users found
          </h3>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>
            {allUsers.length === 0 ? "No users have registered yet." : "Try adjusting your search or filter."}
          </p>
        </div>
      ) : (
        <div style={card}>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "48px 1fr 190px 120px 140px 80px",
            gap: 12, padding: "12px 20px",
            background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0",
            fontSize: 11, fontWeight: 700, color: "#64748b",
            textTransform: "uppercase", letterSpacing: ".6px",
          }}>
            <div>#</div><div>User</div><div>Email</div>
            <div>Joined</div><div>Status</div>
            <div style={{ textAlign: "right" }}>Del</div>
          </div>

          {filtered.map((user, idx) => {
            const online   = isOnline(user);
            const isExpanded = expandedId === user.id;
            const initials = user.name?.slice(0, 2).toUpperCase() || "??";
            return (
              <div key={user.id}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "48px 1fr 190px 120px 140px 80px",
                    gap: 12, padding: "14px 20px", alignItems: "center",
                    borderBottom: "1px solid #f3f4f6",
                    transition: "background .1s", cursor: "pointer",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f8faff"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  onClick={() => setExpanded(isExpanded ? null : user.id)}
                >
                  <div style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 700, textAlign: "center" }}>
                    {idx + 1}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 800, color: "white",
                    }}>{initials}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {user.name || "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{user.phone || "No phone"}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: "#475569",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user.email || "—"}
                  </div>

                  <div style={{ fontSize: 12, color: "#64748b" }}>{fmtDate(user.createdAt)}</div>

                  <div>
                    <OnlineBadge online={online} />
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>
                      {timeAgo(user.lastSeenAt)}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}
                    onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleDelete(user.id, user.name)}
                      disabled={deleting === user.id}
                      style={{
                        padding: "6px 12px", borderRadius: 8, border: "none",
                        background: deleting === user.id ? "#f1f5f9" : "#fef2f2",
                        color: deleting === user.id ? "#94a3b8" : "#dc2626",
                        fontWeight: 700, fontSize: 12,
                        cursor: deleting === user.id ? "not-allowed" : "pointer",
                      }}
                    >
                      {deleting === user.id ? "…" : "🗑"}
                    </button>
                  </div>
                </div>

                {/* Expanded row */}
                {isExpanded && (
                  <div style={{
                    padding: "16px 20px 16px 80px", background: "#fafafe",
                    borderBottom: "1px solid #e2e8f0",
                    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                    gap: 14,
                  }}>
                    {[
                      { label: "User ID",      val: user.id },
                      { label: "Role",         val: user.role || "user" },
                      { label: "Referral Code",val: user.referralCode || "—" },
                      { label: "Loyalty Pts",  val: user.loyaltyPoints ?? "—" },
                      { label: "Joined",       val: user.createdAt ? new Date(user.createdAt).toLocaleString("en-IN") : "—" },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8",
                          textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", wordBreak: "break-all" }}>
                          {String(val)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{
            padding: "12px 20px", background: "#f8fafc", borderTop: "1.5px solid #e2e8f0",
            fontSize: 12, color: "#64748b", fontWeight: 600,
          }}>
            Showing {filtered.length} of {allUsers.length} users (workers excluded)
          </div>
        </div>
      )}
    </div>
  );
}
