import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../api";
import { getLocalizedName } from "../utils/localizedName";

/* ─── Helpers ─────────────────────────────────────────────── */
function timeAgo(iso) {
  if (!iso) return "Never";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 10)   return "Just now";
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

const STATUS_COLORS = {
  pending: "badge-amber", accepted: "badge-blue", in_progress: "badge-purple",
  completed: "badge-green", confirmed: "badge-green", rejected: "badge-red",
};

/* ─── Sparkline SVG ───────────────────────────────────────── */
function Sparkline({ data = [], color = "#2563eb", height = 36, width = 80 }) {
  if (!data.length || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const area = `0,${height} ${pts} ${width},${height}`;
  const uid = color.replace(/[^a-z0-9]/gi, "");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${uid})`} />
      <polyline points={pts} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Donut Chart ─────────────────────────────────────────── */
function DonutChart({ segments, size = 110 }) {
  const r = 40, cx = 50, cy = 50, circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let cumulative = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const gap  = circ - dash;
        const off  = -(cumulative / total) * circ - circ / 4;
        cumulative += seg.value;
        return (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={seg.color} strokeWidth="14"
            strokeDasharray={`${dash} ${gap}`} strokeDashoffset={off}
            style={{ transition: "stroke-dasharray .6s ease" }}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={30} fill="var(--surface)" />
    </svg>
  );
}

/* ─── Stat Card ───────────────────────────────────────────── */
function StatCard({ icon, label, value, gradient, bgColor, borderColor, sparkData, sparkColor, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background: "var(--surface)", borderRadius: 20, border: `1.5px solid ${borderColor}`, padding: "20px 22px", position: "relative", overflow: "hidden", transition: "all .22s ease", cursor: onClick ? "pointer" : "default", display: "flex", flexDirection: "column", gap: 4 }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 16px 40px ${borderColor}80`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{ height: 3, background: gradient, position: "absolute", top: 0, left: 0, right: 0, borderRadius: "20px 20px 0 0" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingTop: 6 }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: bgColor, border: `1.5px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{icon}</div>
        {sparkData?.length > 1 && <Sparkline data={sparkData} color={sparkColor || "#2563eb"} />}
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1, color: "var(--text)", fontFamily: "'Bricolage Grotesque',sans-serif" }}>{value}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── Mini Progress Bar ───────────────────────────────────── */
function MiniBar({ label, value, max, color }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", marginLeft: 8 }}>{value}</span>
      </div>
      <div style={{ height: 6, background: "var(--bg-alt)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width .7s cubic-bezier(.16,1,.3,1)" }} />
      </div>
    </div>
  );
}

/* ─── Section Nav Card ────────────────────────────────────── */
function SectionNav({ icon, label, desc, count, unit, gradient, bg, border, onClick }) {
  return (
    <div style={{ background: "var(--surface)", border: `1.5px solid ${border}`, borderRadius: 18, overflow: "hidden", cursor: "pointer", transition: "all .2s", position: "relative" }}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 14px 36px ${border}99`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{ height: 3, background: gradient }} />
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: bg, border: `1.5px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{icon}</div>
          {count > 0 && <span style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", fontFamily: "'Bricolage Grotesque',sans-serif" }}>{count.toLocaleString()}</span>}
        </div>
        <div style={{ fontWeight: 800, fontSize: 14.5, color: "var(--text)", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 10 }}>{desc}</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", paddingTop: 8, borderTop: `1px solid ${border}55`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{unit}</span>
          <span style={{ color: "var(--primary)", fontSize: 12 }}>→</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Active Person Row ───────────────────────────────────── */
function ActiveRow({ person }) {
  const { i18n } = useTranslation();
  const isWorker = person.role === "worker";
  // Bilingual display name — falls back to the legacy name for accounts
  // created before this feature existed (null-safe).
  const displayName = getLocalizedName(person, i18n.language) || person.name || "";
  const initials = displayName?.charAt(0).toUpperCase() || "?";
  const grad = isWorker ? "linear-gradient(135deg,#2563eb,#3b82f6)" : "linear-gradient(135deg,#7c3aed,#a78bfa)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 18px", borderBottom: "1px solid var(--border-light)", transition: "background .12s" }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--primary-bg)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: grad, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 13, position: "relative" }}>
        {initials}
        <span style={{ position: "absolute", bottom: 0, right: 0, width: 9, height: 9, borderRadius: "50%", background: "var(--green)", border: "2px solid var(--surface)" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
        <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{person.email}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <span className={`badge ${isWorker ? "badge-blue" : "badge-purple"}`} style={{ marginBottom: 2, display: "block", textAlign: "center", fontSize: 10 }}>{isWorker ? "⚙️ Worker" : "👤 User"}</span>
        <div style={{ fontSize: 10, color: "#94a3b8" }}>{timeAgo(person.lastSeenAt)}</div>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ──────────────────────────────────────── */
export default function Dashboard({ onToast }) {
  const { t, i18n } = useTranslation();
  const nav      = useNavigate();
  const [stats,        setStats]        = useState(null);
  const [workers,      setWorkers]      = useState([]);
  const [bookings,     setBookings]     = useState([]);
  const [wallet,       setWallet]       = useState(null);
  const [activity,     setActivity]     = useState([]);
  const [recentLogins, setRecentLogins] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [lastRefresh,  setLR]           = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [s, w, b, wl, act, hist] = await Promise.all([
        api.getUserStats(), api.getAllWorkers(), api.getBookings(),
        api.getCommissionWallet().catch(() => null),
        api.getOnlineActivity().catch(() => []),
        api.getHistory().catch(() => []),
      ]);
      setStats(s); setWorkers(w); setBookings(b); setWallet(wl); setActivity(act);
      setRecentLogins(
        (Array.isArray(hist) ? hist : [])
          .filter(e => e.type === "user_login" || e.type === "worker_login")
          .slice(0, 6)
      );
      setLR(new Date());
    } catch { if (!silent) onToast("Failed to load dashboard", "error"); }
    finally { if (!silent) setLoading(false); }
  }, [onToast]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 30_000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  /* ── Derived values ──────────────────────────────────────── */
  const pending       = workers.filter(w => !w.approved).length;
  const approvedW     = workers.filter(w => w.approved);
  const activeWorkers = approvedW.filter(w => w.isOnline).length;
  const onlineUsers   = activity.filter(p => p.role === "user").length;
  const onlineWorkers = activity.filter(p => p.role === "worker").length;
  const pendingBks    = bookings.filter(b => b.status === "pending").length;
  const inProgressBks = bookings.filter(b => b.status === "in_progress").length;
  const completedBks  = bookings.filter(b => ["completed", "confirmed"].includes(b.status)).length;
  const rejectedBks   = bookings.filter(b => b.status === "rejected").length;
  const revenue       = bookings.filter(b => b.paymentStatus === "paid").reduce((s, b) => s + (b.cost || 0), 0);
  const recentBookings = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

  const donutSegments = [
    { value: completedBks,  color: "#059669" },
    { value: inProgressBks, color: "#7c3aed" },
    { value: pendingBks,    color: "#d97706" },
    { value: rejectedBks,   color: "#dc2626" },
  ].filter(s => s.value > 0);

  const categoryCount = {};
  workers.forEach(w => { if (w.category) categoryCount[w.category] = (categoryCount[w.category] || 0) + 1; });
  const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const bookingsByDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toDateString();
    return bookings.filter(b => new Date(b.createdAt).toDateString() === ds).length;
  });

  /* ── Loading state ───────────────────────────────────────── */
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh", flexDirection: "column", gap: 16 }}>
      <div style={{ position: "relative", width: 60, height: 60 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid var(--primary-bg)", borderTopColor: "var(--primary)", animation: "dashSpin .7s linear infinite" }} />
        <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "2px solid var(--green-soft)", borderTopColor: "var(--green)", animation: "dashSpin 1.1s linear infinite reverse" }} />
      </div>
      <p style={{ color: "var(--muted)", fontWeight: 700, fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase" }}>Loading dashboard…</p>
      <style>{`@keyframes dashSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="anim-fade" style={{ padding: "28px 32px", maxWidth: 1600 }}>

      {/* ══════════════════════════════════════════════════════
          HERO BANNER
          ══════════════════════════════════════════════════════ */}
      <div style={{
        background: "linear-gradient(135deg,#060e24 0%,#0d2467 38%,#064e3b 100%)",
        borderRadius: 24, padding: "32px 36px", marginBottom: 28, color: "white",
        position: "relative", overflow: "hidden",
        boxShadow: "0 16px 56px rgba(6,14,36,.55)",
      }}>
        {/* Decorative orbs */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: "50%", background: "rgba(37,99,235,.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -50, left: "35%", width: 200, height: 200, borderRadius: "50%", background: "rgba(5,150,105,.06)", pointerEvents: "none" }} />
        {/* Dot-grid overlay */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,.04) 1px,transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />

        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 13px", borderRadius: 99, background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.22)", marginBottom: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", animation: "livePulse 2s infinite", display: "inline-block" }} />
              <span style={{ fontSize: 10.5, fontWeight: 800, color: "#34d399", textTransform: "uppercase", letterSpacing: ".1em" }}>Admin Control Center</span>
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: -1, margin: 0, color: "white", fontFamily: "'Bricolage Grotesque',sans-serif" }}>GeoServe Dashboard</h1>
            <p style={{ color: "rgba(255,255,255,.48)", fontSize: 13.5, marginTop: 6, marginBottom: 0 }}>
              Platform overview · {lastRefresh ? `Updated ${timeAgo(lastRefresh)}` : "Loading…"}
            </p>
          </div>

          {/* KPI chips */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { label: "Online Now",    value: onlineUsers + onlineWorkers, color: "#34d399",  bg: "rgba(52,211,153,.12)", border: "rgba(52,211,153,.25)" },
              { label: "Total Revenue", value: `₹${revenue.toLocaleString()}`, color: "#60a5fa", bg: "rgba(96,165,250,.12)", border: "rgba(96,165,250,.25)" },
              { label: "pending",       value: pending, color: "#fbbf24", bg: "rgba(251,191,36,.12)", border: "rgba(251,191,36,.25)" },
            ].map(chip => (
              <div key={chip.label} style={{ background: chip.bg, border: `1px solid ${chip.border}`, borderRadius: 16, padding: "10px 18px", textAlign: "center", minWidth: 108 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: chip.color, lineHeight: 1, fontFamily: "'Bricolage Grotesque',sans-serif" }}>{chip.value}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.5)", marginTop: 3, textTransform: "uppercase", letterSpacing: ".06em" }}>{chip.label}</div>
              </div>
            ))}
            <button onClick={() => load()}
              style={{ background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.18)", borderRadius: 12, padding: "10px 20px", color: "white", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .15s", display: "flex", alignItems: "center", gap: 7 }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.2)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}
            >↻ Refresh</button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          PENDING ALERT
          ══════════════════════════════════════════════════════ */}
      {pending > 0 && (
        <div style={{ background: "linear-gradient(135deg,#fffbeb,#fef9ee)", border: "1.5px solid #fde68a", borderRadius: 18, padding: "16px 22px", marginBottom: 24, display: "flex", alignItems: "center", gap: 16, boxShadow: "0 4px 20px rgba(217,119,6,.12)" }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: "rgba(217,119,6,.1)", border: "1.5px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>⚠️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "#92400e", fontSize: 14 }}>{pending} worker{pending > 1 ? "s" : ""} awaiting verification</div>
            <div style={{ fontSize: 12, color: "#78350f", marginTop: 2 }}>Review pending registrations in Workers → Pending tab.</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
            <span style={{ background: "rgba(217,119,6,.15)", border: "1px solid #fcd34d", borderRadius: 22, padding: "4px 12px", fontSize: 11, fontWeight: 800, color: "#92400e", animation: "livePulse 3s infinite" }}>{pending} PENDING</span>
            <button onClick={() => nav("/verification")}
              style={{ background: "#d97706", border: "none", borderRadius: 10, padding: "8px 16px", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#b45309"}
              onMouseLeave={e => e.currentTarget.style.background = "#d97706"}
            >Review →</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION NAVIGATION CARDS
          ══════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 14 }}>Admin Sections</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
          <SectionNav icon="👥" label={t("adminSidebar.users")}        desc="Manage registered users"  count={stats?.users || 0}            unit="Users only · workers excluded"
            gradient="linear-gradient(135deg,#2563eb,#6366f1)" bg="var(--primary-bg)" border="var(--primary-border)" onClick={() => nav("/users")} />
          <SectionNav icon="⚙️" label={t("adminSidebar.workers")}      desc="Worker management"         count={workers.length}               unit="Workers only · users excluded"
            gradient="linear-gradient(135deg,#2563eb,#3b82f6)" bg="var(--blue-bg)"    border="var(--blue-border)"    onClick={() => nav("/workers")} />
          <SectionNav icon="📅" label={t("adminSidebar.bookings")}     desc="All service bookings"      count={bookings.length}              unit="Independent booking records"
            gradient="linear-gradient(135deg,#7c3aed,#a78bfa)" bg="var(--purple-bg)"  border="var(--purple-border)"  onClick={() => nav("/bookings")} />
          <SectionNav icon="✅" label={t("adminSidebar.verification")} desc="Worker approvals"          count={pending}                      unit={pending > 0 ? "Requires attention" : "All verified"}
            gradient="linear-gradient(135deg,#d97706,#f59e0b)" bg="var(--amber-bg)"   border="var(--amber-border)"   onClick={() => nav("/verification")} />
          <SectionNav icon="📈" label={t("adminSidebar.analytics")}    desc="Platform insights"         count={0}                            unit="Charts & data trends"
            gradient="linear-gradient(135deg,#059669,#10b981)" bg="var(--green-bg)"   border="var(--green-border)"   onClick={() => nav("/analytics")} />
          <SectionNav icon="💳" label={t("adminSidebar.payments")}     desc="Commission & revenue"      count={wallet ? Math.round(wallet.balance) : 0} unit="Commission wallet balance"
            gradient="linear-gradient(135deg,#f59e0b,#fbbf24)" bg="var(--amber-bg)"   border="var(--amber-border)"   onClick={() => nav("/payments")} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          KPI STAT CARDS
          ══════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 14 }}>Key Metrics</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))", gap: 14 }}>
          <StatCard icon="👥" label="Total Users"     value={(stats?.users || 0).toLocaleString()}    gradient="linear-gradient(135deg,#2563eb,#8b5cf6)" bgColor="var(--primary-bg)" borderColor="var(--primary-border)" sparkData={[4,5,6,5,8,7,stats?.users||0]} sparkColor="#2563eb" onClick={() => nav("/users")} />
          <StatCard icon="🟢" label="Online Users"    value={onlineUsers}                              gradient="linear-gradient(135deg,#059669,#10b981)" bgColor="var(--green-bg)"   borderColor="var(--green-border)"   sparkData={[1,3,2,4,3,onlineUsers]}       sparkColor="#059669" />
          <StatCard icon="⚙️" label="Total Workers"  value={workers.length.toLocaleString()}          gradient="linear-gradient(135deg,#2563eb,#60a5fa)" bgColor="var(--blue-bg)"    borderColor="var(--blue-border)"    sparkData={[2,3,4,5,workers.length]}       sparkColor="#3b82f6" onClick={() => nav("/workers")} />
          <StatCard icon="⚡" label="Active Workers"  value={activeWorkers}                            gradient="linear-gradient(135deg,#059669,#34d399)" bgColor="var(--green-bg)"   borderColor="var(--green-border)"   sparkData={[1,2,3,2,activeWorkers]}        sparkColor="#059669" />
          <StatCard icon="📅" label="Total Bookings"  value={bookings.length.toLocaleString()}         gradient="linear-gradient(135deg,#7c3aed,#c084fc)" bgColor="var(--purple-bg)"  borderColor="var(--purple-border)"  sparkData={bookingsByDay}                  sparkColor="#7c3aed" onClick={() => nav("/bookings")} />
          <StatCard icon="⏳" label="pending"          value={pendingBks}                               gradient="linear-gradient(135deg,#d97706,#fbbf24)" bgColor="var(--amber-bg)"   borderColor="var(--amber-border)"   sparkData={[2,1,3,2,pendingBks]}           sparkColor="#d97706" />
          <StatCard icon="🔄" label="in_progress"     value={inProgressBks}                            gradient="linear-gradient(135deg,#7c3aed,#a78bfa)" bgColor="var(--purple-bg)"  borderColor="var(--purple-border)"  sparkData={[1,2,3,inProgressBks]}          sparkColor="#7c3aed" />
          <StatCard icon="✅" label="completed"        value={completedBks}                             gradient="linear-gradient(135deg,#059669,#10b981)" bgColor="var(--green-bg)"   borderColor="var(--green-border)"   sparkData={[5,7,6,9,completedBks]}         sparkColor="#059669" />
          {wallet && <StatCard icon="💰" label="Commission" value={`₹${(wallet.balance||0).toLocaleString()}`} gradient="linear-gradient(135deg,#f59e0b,#fbbf24)" bgColor="var(--amber-bg)" borderColor="var(--amber-border)" sparkData={[10,12,15,14,wallet.balance||0]} sparkColor="#d97706" onClick={() => nav("/payments")} />}
          <StatCard icon="💵" label="Total Revenue"   value={`₹${revenue.toLocaleString()}`}            gradient="linear-gradient(135deg,#059669,#10b981)" bgColor="var(--green-bg)"   borderColor="var(--green-border)"   sparkData={[20,30,25,40,revenue]}           sparkColor="#059669" />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          CHARTS ROW: Donut + Worker Categories + Active Now
          ══════════════════════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 300px", gap: 20, marginBottom: 24 }}>

        {/* Booking Status Donut */}
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 22, padding: "22px 24px", boxShadow: "var(--shadow-sm)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 4px" }}>Booking Breakdown</h2>
          <p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 20 }}>Status distribution of all bookings</p>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ flexShrink: 0 }}>
              {donutSegments.length > 0
                ? <DonutChart segments={donutSegments} size={110} />
                : <div style={{ width: 110, height: 110, borderRadius: "50%", background: "var(--bg-alt)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>📊</div>
              }
            </div>
            <div style={{ flex: 1 }}>
              {[
                { label: "completed",   value: completedBks,  color: "#059669" },
                { label: "in_progress", value: inProgressBks, color: "#7c3aed" },
                { label: "pending",     value: pendingBks,    color: "#d97706" },
                { label: "Rejected",    value: rejectedBks,   color: "#dc2626" },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: row.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", flex: 1 }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{row.value}</span>
                  <span style={{ fontSize: 10.5, color: "var(--muted)", minWidth: 36, textAlign: "right" }}>
                    {bookings.length ? `${((row.value / bookings.length) * 100).toFixed(0)}%` : "0%"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Worker Category Bars */}
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 22, padding: "22px 24px", boxShadow: "var(--shadow-sm)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 4px" }}>Worker Categories</h2>
          <p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 20 }}>Top service categories by worker count</p>
          {topCategories.length > 0 ? topCategories.map(([cat, count], i) => (
            <MiniBar key={cat} label={cat} value={count} max={topCategories[0][1]}
              color={["#2563eb", "#059669", "#7c3aed", "#d97706", "#3b82f6"][i % 5]} />
          )) : (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚙️</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>No categories yet</div>
            </div>
          )}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)" }}>Approved workers</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--green)" }}>{approvedW.length}</span>
          </div>
        </div>

        {/* Active Now */}
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 22, overflow: "hidden", boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-raised)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", animation: "livePulse 2s infinite", display: "inline-block", boxShadow: "0 0 0 3px rgba(5,150,105,.15)" }} />
              <h2 style={{ fontSize: 14.5, fontWeight: 800, margin: 0 }}>Active Now</h2>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--primary)", background: "var(--primary-bg)", border: "1px solid var(--primary-border)", padding: "3px 10px", borderRadius: 20 }}>{activity.length} online</span>
          </div>
          {activity.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 20px", color: "var(--muted)", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>😴</div>
              <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>No one active right now</div>
              <div style={{ fontSize: 11, color: "var(--muted-light)" }}>Users & workers appear when logged in</div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", maxHeight: 320 }}>
              {activity.map(p => <ActiveRow key={p.id} person={p} />)}
            </div>
          )}
          <div style={{ padding: "9px 18px", borderTop: "1px solid var(--border-light)", fontSize: 10, color: "#94a3b8", display: "flex", alignItems: "center", gap: 5, background: "var(--surface-raised)", flexShrink: 0 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
            Active = seen within last 5 min
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          WORKER STATUS CHIPS
          ══════════════════════════════════════════════════════ */}
      {approvedW.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 22, overflow: "hidden", boxShadow: "var(--shadow-sm)", marginBottom: 24 }}>
          <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-raised)" }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Worker Status Overview</h2>
              <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "3px 0 0" }}>{activeWorkers} of {approvedW.length} currently online</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--green)" }} /><span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>Online</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--border)" }} /><span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>Offline</span></div>
            </div>
          </div>
          <div style={{ padding: "16px 22px", display: "flex", flexWrap: "wrap", gap: 8 }}>
            {approvedW.slice(0, 30).map(w => (
              <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 7, background: w.isOnline ? "var(--primary-bg)" : "var(--bg-alt)", border: `1.5px solid ${w.isOnline ? "var(--primary-border)" : "var(--border)"}`, borderRadius: 24, padding: "5px 12px 5px 8px", fontSize: 12, transition: "all .15s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
                onMouseLeave={e => e.currentTarget.style.transform = ""}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: w.isOnline ? "var(--green)" : "#d1d5db", flexShrink: 0, ...(w.isOnline ? { animation: "livePulse 2s infinite" } : {}) }} />
                <span style={{ fontWeight: 700, color: w.isOnline ? "var(--primary)" : "#94a3b8" }}>{getLocalizedName(w, i18n.language) || w.name}</span>
              </div>
            ))}
            {approvedW.length > 30 && <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", padding: "0 10px" }}>+{approvedW.length - 30} more</div>}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          RECENT BOOKINGS TABLE
          ══════════════════════════════════════════════════════ */}
      <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 22, overflow: "hidden", boxShadow: "var(--shadow-sm)", marginBottom: 24 }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-raised)", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Recent Bookings</h2>
            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "3px 0 0" }}>Latest {recentBookings.length} requests</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {[[pendingBks,"#d97706","#fffbeb","pending"],[inProgressBks,"#7c3aed","#f5f3ff","in_progress"],[completedBks,"#059669","#ecfdf5","completed"]].map(([v,c,bg,lbl]) =>
              v > 0 && (
                <div key={lbl} style={{ textAlign: "center", padding: "5px 12px", borderRadius: 11, background: bg, border: `1px solid ${c}30` }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: c, fontFamily: "'Bricolage Grotesque',sans-serif" }}>{v}</div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: ".04em" }}>{lbl}</div>
                </div>
              )
            )}
            <button onClick={() => nav("/bookings")}
              style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 9, border: "1.5px solid var(--primary-border)", background: "var(--primary-bg)", fontFamily: "inherit", transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--primary-bg)"; e.currentTarget.style.color = "var(--primary)"; }}
            >View All →</button>
          </div>
        </div>

        {recentBookings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "52px 24px", color: "var(--muted)" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>No bookings yet</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr>
                  {["Customer","Worker","Category","Date","Amount","Payment","Status"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "11px 16px", fontSize: 10.5, fontWeight: 800, color: "var(--muted)", letterSpacing: ".08em", textTransform: "uppercase", background: "var(--bg-subtle)", borderBottom: "1.5px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b, i) => (
                  <tr key={b.id}
                    style={{ borderBottom: i < recentBookings.length - 1 ? "1px solid var(--border-light)" : "none", cursor: "default" }}
                    onMouseEnter={e => Array.from(e.currentTarget.cells).forEach(td => td.style.background = "var(--primary-bg)")}
                    onMouseLeave={e => Array.from(e.currentTarget.cells).forEach(td => td.style.background = "")}
                  >
                    <td style={{ padding: "13px 16px" }}><div style={{ fontWeight: 700, fontSize: 13 }}>{b.userName}</div></td>
                    <td style={{ padding: "13px 16px" }}><div style={{ color: "var(--text-secondary)", fontSize: 13 }}>{b.workerName || "—"}</div></td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--blue-dark)", background: "var(--blue-bg)", border: "1px solid var(--blue-border)", borderRadius: 99, padding: "2px 9px" }}>{b.category || "—"}</span>
                    </td>
                    <td style={{ padding: "13px 16px" }}><div style={{ color: "var(--muted)", fontSize: 12 }}>{b.date ? new Date(b.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "—"}</div></td>
                    <td style={{ padding: "13px 16px" }}><div style={{ fontWeight: 800, color: "var(--primary)", fontSize: 13.5, fontFamily: "'Bricolage Grotesque',sans-serif" }}>₹{(b.cost||0).toLocaleString()}</div></td>
                    <td style={{ padding: "13px 16px" }}><span className={`badge ${b.paymentStatus==="paid"?"badge-green":"badge-gray"}`}>{b.paymentStatus||"unpaid"}</span></td>
                    <td style={{ padding: "13px 16px" }}><span className={`badge ${STATUS_COLORS[b.status]||"badge-gray"}`}>{b.status?.replace("_"," ")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          RECENT LOGIN ACTIVITY
          ══════════════════════════════════════════════════════ */}
      {recentLogins.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 22, overflow: "hidden", boxShadow: "var(--shadow-sm)", marginBottom: 24 }}>
          <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-raised)" }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Recent Login Activity</h2>
              <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "3px 0 0" }}>Latest user & worker logins from history</p>
            </div>
            <button onClick={() => nav("/history")}
              style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 9, border: "1.5px solid var(--primary-border)", background: "var(--primary-bg)", fontFamily: "inherit", transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--primary-bg)"; e.currentTarget.style.color = "var(--primary)"; }}
            >View All →</button>
          </div>
          {recentLogins.map((entry, i) => {
            const isWorker = entry.type === "worker_login";
            const grad = isWorker ? "linear-gradient(135deg,#2563eb,#3b82f6)" : "linear-gradient(135deg,#7c3aed,#a78bfa)";
            return (
              <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 22px", borderBottom: i < recentLogins.length - 1 ? "1px solid var(--border-light)" : "none", transition: "background .12s" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--primary-bg)"}
                onMouseLeave={e => e.currentTarget.style.background = ""}
              >
                <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: grad, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 14, boxShadow: "0 3px 10px rgba(37,99,235,.25)" }}>
                  {(entry.actorName || "?").charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{entry.actorName || "—"}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.actorEmail || ""}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 12, fontSize: 10, fontWeight: 700, color: isWorker ? "var(--blue-dark)" : "var(--purple-dark)", background: isWorker ? "var(--blue-bg)" : "var(--purple-bg)", border: `1px solid ${isWorker ? "var(--blue-border)" : "var(--purple-border)"}`, marginBottom: 2 }}>
                    {isWorker ? "⚙️ Worker" : "👤 User"}
                  </span>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>{timeAgo(entry.timestamp)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.35)} }
        @keyframes dashSpin  { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .dash-charts-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
