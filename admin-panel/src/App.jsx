import { lazy, Suspense, useState, useEffect, useRef, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAdmin } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import LanguageSwitcher from "./components/LanguageSwitcher";
import Toast   from "./components/Toast";
import * as api from "./api";

const LoginPage        = lazy(() => import("./pages/LoginPage"));
const Dashboard        = lazy(() => import("./pages/Dashboard"));
const UsersPage        = lazy(() => import("./pages/UsersPage"));
const WorkersPage      = lazy(() => import("./pages/WorkersPage"));
const BookingsPage     = lazy(() => import("./pages/BookingsPage"));
const AnalyticsPage    = lazy(() => import("./pages/AnalyticsPage"));
const VerificationPage = lazy(() => import("./pages/VerificationPage"));
const HistoryPage      = lazy(() => import("./pages/HistoryPage"));
const PaymentPage      = lazy(() => import("./pages/PaymentPage"));
const ProfilePage      = lazy(() => import("./pages/ProfilePage"));
const SupportPage      = lazy(() => import("./pages/SupportPage"));
const CategoriesPage   = lazy(() => import("./pages/CategoriesPage"));

function PageLoader() {
  return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh",flexDirection:"column",gap:14 }}>
      <div style={{ width:44,height:44,borderRadius:"50%",border:"3px solid var(--primary-bg)",borderTopColor:"var(--primary)",animation:"spin .7s linear infinite" }} />
      <p style={{ color:"var(--muted)",fontWeight:600,fontSize:14 }}>Loading…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Guard({ children }) {
  const { admin } = useAdmin();
  return admin ? children : <Navigate to="/login" replace />;
}

/* ── Notification Bell ──────────────────────────────────────────────── */
function NotificationBell({ count, onClick }) {
  const [pulse, setPulse] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > 0 && count !== prevCount.current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1000);
      prevCount.current = count;
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [count]);

  return (
    <button
      onClick={onClick}
      title={count > 0 ? `${count} pending action${count > 1 ? "s" : ""}` : "No new notifications"}
      style={{
        position: "relative", background: count > 0 ? "#fef2f2" : "var(--surface)", border: count > 0 ? "1.5px solid #fecaca" : "1.5px solid var(--border)",
        borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0,
        transition: "all .2s",
        animation: pulse ? "bellShake .5s ease" : "none",
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>🔔</span>
      {count > 0 && (
        <span style={{
          position: "absolute", top: -5, right: -5,
          minWidth: 18, height: 18, borderRadius: 99,
          background: "#dc2626", color: "white",
          fontSize: 10, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 4px", border: "2px solid var(--surface)",
          animation: "badgePop .3s cubic-bezier(.175,.885,.32,1.275)",
          lineHeight: 1,
        }}>
          {count > 99 ? "99+" : count}
        </span>
      )}
      <style>{`
        @keyframes bellShake {
          0%,100%{transform:rotate(0)} 20%{transform:rotate(-12deg)} 40%{transform:rotate(12deg)} 60%{transform:rotate(-8deg)} 80%{transform:rotate(8deg)}
        }
        @keyframes badgePop {
          0%{transform:scale(0)} 80%{transform:scale(1.2)} 100%{transform:scale(1)}
        }
      `}</style>
    </button>
  );
}

/* ── Notification Dropdown ─────────────────────────────────────────── */
const NOTIF_ICON = {
  new_booking:            "📅",
  booking_update:         "🔄",
  verification_submitted: "🪪",
  new_user:               "🧑",
  new_worker:             "🛠️",
  support_message:        "💬",
  default:                "🔔",
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotifDropdown({ data, history, onClose, navigate, onMarkRead, onMarkAllRead }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const items = [
    { label: "Pending Bookings",      count: data.pendingBookings,      icon: "📅", path: "/bookings",     color: "#f59e0b" },
    { label: "Pending Verifications", count: data.pendingVerifications, icon: "🪪", path: "/verification", color: "#2563eb" },
    { label: "Unread Support",        count: data.unreadSupport,        icon: "💬", path: "/support",      color: "#7c3aed" },
  ];

  const unreadHistory = history.filter(n => !n.read).length;

  return (
    <div ref={ref} style={{
      position: "absolute", top: "calc(100% + 10px)", right: 0,
      width: 320, maxWidth: "calc(100vw - 24px)", background: "var(--surface)", border: "1.5px solid var(--border)",
      borderRadius: 16, boxShadow: "0 16px 48px rgba(0,0,0,.18)", zIndex: 9999,
      overflow: "hidden",
    }}>
      <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid var(--border-light)" }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text)" }}>Pending Actions</div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
          {data.total > 0 ? `${data.total} item${data.total > 1 ? "s" : ""} need attention` : "All caught up!"}
        </div>
      </div>
      <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border-light)" }}>
        {items.map(item => (
          <button key={item.label}
            onClick={() => { navigate(item.path); onClose(); }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "10px 16px", background: "none", border: "none",
              cursor: "pointer", textAlign: "left", transition: "background .12s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--primary-bg)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{item.label}</span>
            {item.count > 0 ? (
              <span style={{
                minWidth: 22, height: 22, borderRadius: 99, background: item.color,
                color: "white", fontSize: 11, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px",
              }}>{item.count}</span>
            ) : (
              <span style={{ fontSize: 11, color: "var(--muted)" }}>✓</span>
            )}
          </button>
        ))}
      </div>

      {/* Recent Activity history */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 6px" }}>
        <div style={{ fontWeight: 800, fontSize: 12.5, color: "var(--text)" }}>Recent Activity</div>
        {unreadHistory > 0 && (
          <button
            onClick={onMarkAllRead}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "var(--primary)", fontFamily: "inherit", padding: "2px 4px" }}
          >
            Mark all read
          </button>
        )}
      </div>
      <div style={{ maxHeight: 240, overflowY: "auto" }}>
        {history.length === 0 ? (
          <div style={{ padding: "8px 16px 16px", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
            No recent activity yet
          </div>
        ) : (
          history.slice(0, 20).map(n => (
            <div
              key={n.id}
              onClick={() => { onMarkRead(n.id); if (n.link) { navigate(n.link); onClose(); } }}
              style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                padding: "9px 16px",
                background: n.read ? "transparent" : "var(--primary-bg)",
                cursor: "pointer", transition: "background .12s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : "var(--primary-bg)"}
            >
              <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{NOTIF_ICON[n.type] || NOTIF_ICON.default}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: n.read ? 600 : 800, color: "var(--text)", lineHeight: 1.35 }}>{n.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{n.message}</div>
                <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{timeAgo(n.createdAt)}</div>
              </div>
              {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", flexShrink: 0, marginTop: 4 }} />}
            </div>
          ))
        )}
      </div>

      {data.total === 0 && history.length === 0 && (
        <div style={{ padding: "8px 16px 14px", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
          🎉 Everything is up to date
        </div>
      )}
    </div>
  );
}

function Layout({ children, showToast }) {
  const { admin, logout } = useAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifs, setNotifs] = useState({ total: 0, pendingBookings: 0, pendingVerifications: 0, unreadSupport: 0, unreadHistory: 0 });
  const [notifHistory, setNotifHistory] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getAdminNotifications();
      setNotifs(data);
    } catch {
      // Silently fail — don't block UI
    }
  }, []);

  const fetchNotifHistory = useCallback(async () => {
    try {
      const list = await api.getAdminNotificationsList();
      setNotifHistory(Array.isArray(list) ? list : []);
    } catch {
      // Silently fail — don't block UI
    }
  }, []);

  const handleMarkRead = useCallback(async (id) => {
    setNotifHistory(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try { await api.markAdminNotificationRead(id); fetchNotifications(); } catch { /* ignore */ }
  }, [fetchNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    setNotifHistory(prev => prev.map(n => ({ ...n, read: true })));
    try { await api.markAllAdminNotificationsRead(); fetchNotifications(); } catch { /* ignore */ }
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications(); // initial load
    fetchNotifHistory();

    // Real-time SSE for admin notifications
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    const API_URL = import.meta.env.VITE_API_URL || "/api";
    let retryTimeout;
    let retryCount = 0;
    let active = true;
    let sseConnected = false; // track live connection state for conditional fallback poll

    async function connectSSE() {
      try {
        const ctrl = new AbortController();
        const res = await fetch(`${API_URL}/notifications/stream`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
          signal: ctrl.signal,
        });
        if (!res.ok) { sseConnected = false; scheduleRetry(); return; }
        retryCount = 0;
        sseConnected = true;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (active) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            const dataLine = part.split("\n").find(l => l.startsWith("data: "));
            if (!dataLine) continue;
            try {
              const payload = JSON.parse(dataLine.slice(6));
              if (payload.type === "admin_notification") {
                setNotifHistory(prev => [payload.notification, ...prev].slice(0, 50));
                fetchNotifications();
              } else if (
                payload.type === "new_booking" || payload.type === "booking_update" ||
                payload.type === "verification_submitted" || payload.type === "support_message" ||
                payload.type === "new_user" || payload.type === "new_worker"
              ) {
                fetchNotifications(); // refresh counts on important events
              }
            } catch { /* ignore */ }
          }
        }
        sseConnected = false;
        if (active) scheduleRetry();
      } catch (err) {
        sseConnected = false;
        if (err.name !== "AbortError" && active) scheduleRetry();
      }
    }

    function scheduleRetry() {
      const delay = Math.min(1000 * 2 ** retryCount, 30000);
      retryCount++;
      retryTimeout = setTimeout(connectSSE, delay);
    }

    connectSSE();

    // Fallback polling every 30s — ONLY fires when SSE connection is down.
    // When SSE is live, all updates are pushed in real-time so polling is redundant.
    const interval = setInterval(() => {
      if (!sseConnected) { fetchNotifications(); fetchNotifHistory(); }
    }, 30000);

    return () => {
      active = false;
      clearInterval(interval);
      clearTimeout(retryTimeout);
    };
  }, [fetchNotifications, fetchNotifHistory]);

  const handleLogout = () => {
    logout();
    if (showToast) showToast("Logged out", "info");
  };

  return (
    <div className="admin-shell">
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.5)", zIndex:199, backdropFilter:"blur(4px)" }}
        />
      )}

      <Sidebar onLogout={handleLogout} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} notifCounts={notifs} />

      <div className="admin-main-wrap" style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", marginLeft:"var(--sidebar-w)", minHeight:"100vh" }}>
        {/* Top bar */}
        <div className="admin-topbar">
          <button
            onClick={() => setMobileOpen(o => !o)}
            style={{ display:"none", alignItems:"center", justifyContent:"center", width:36, height:36, borderRadius:9, border:"1.5px solid var(--border)", background:"none", cursor:"pointer", color:"var(--muted)", flexShrink:0 }}
            className="mobile-menu-btn"
            aria-label="Open menu"
          >☰</button>

          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ fontFamily:"'Bricolage Grotesque',serif", fontWeight:700, fontSize:16, color:"var(--text)" }}>
              GeoServe<span style={{ color:"var(--primary)", marginLeft:3 }}>Admin</span>
            </div>
          </div>

          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <div style={{ padding:"5px 13px", borderRadius:20, background:"var(--green-bg)", border:"1px solid var(--green-border)", fontSize:12, fontWeight:700, color:"var(--green)", display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--green)", animation:"livePulse 2s infinite", display:"inline-block" }} />
              Live
            </div>

            {/* 🔔 Notification Bell */}
            <div style={{ position: "relative" }}>
              <NotificationBell
                count={notifs.total > 0 ? notifs.total : (notifs.unreadHistory || 0)}
                onClick={() => setShowNotifDropdown(v => !v)}
              />
              {showNotifDropdown && (
                <NotifDropdown
                  data={notifs}
                  history={notifHistory}
                  onClose={() => setShowNotifDropdown(false)}
                  navigate={navigate}
                  onMarkRead={handleMarkRead}
                  onMarkAllRead={handleMarkAllRead}
                />
              )}
            </div>

            <LanguageSwitcher />
            <div className="admin-topbar-right-label" style={{ fontSize:13, fontWeight:600, color:"var(--muted)" }}>{admin?.name || "Admin"}</div>
          </div>
        </div>

        <main className="admin-main anim-fade" style={{ flex:1, overflowY:"auto" }}>
          {children}
        </main>
      </div>

      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.35)} }
        .admin-shell { display:flex; min-height:100vh; overflow-x:hidden; }
        @media(max-width:900px){
          .mobile-menu-btn{display:flex!important}
          .admin-main-wrap{margin-left:0!important;width:100%!important;max-width:100vw!important;}
          .admin-shell > div:last-child{margin-left:0!important}
        }
        @media(max-width:600px){
          .admin-topbar { padding: 0 10px !important; }
          .admin-topbar-right-label { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function AppInner() {
  const [toast, setToast] = useState(null);
  const { admin } = useAdmin();
  const showToast = (msg, type = "success") => setToast({ msg, type });

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage onToast={showToast} />} />
          <Route path="/"            element={<Guard><Layout showToast={showToast}><Dashboard        key={admin?.id+"-dash"}     onToast={showToast} /></Layout></Guard>}/>
          <Route path="/users"       element={<Guard><Layout showToast={showToast}><UsersPage        key={admin?.id+"-users"}    onToast={showToast} /></Layout></Guard>}/>
          <Route path="/workers"     element={<Guard><Layout showToast={showToast}><WorkersPage      key={admin?.id+"-workers"}  onToast={showToast} /></Layout></Guard>}/>
          <Route path="/bookings"    element={<Guard><Layout showToast={showToast}><BookingsPage     key={admin?.id+"-bookings"} onToast={showToast} /></Layout></Guard>}/>
          <Route path="/analytics"   element={<Guard><Layout showToast={showToast}><AnalyticsPage    key={admin?.id+"-anal"}     onToast={showToast} /></Layout></Guard>}/>
          <Route path="/verification"element={<Guard><Layout showToast={showToast}><VerificationPage key={admin?.id+"-verif"}    onToast={showToast} /></Layout></Guard>}/>
          <Route path="/history"     element={<Guard><Layout showToast={showToast}><HistoryPage      key={admin?.id+"-hist"}     onToast={showToast} /></Layout></Guard>}/>
          <Route path="/payments"    element={<Guard><Layout showToast={showToast}><PaymentPage      key={admin?.id+"-pay"}      onToast={showToast} /></Layout></Guard>}/>
          <Route path="/support"     element={<Guard><Layout showToast={showToast}><SupportPage      key={admin?.id+"-sup"}      onToast={showToast} /></Layout></Guard>}/>
          <Route path="/profile"     element={<Guard><Layout showToast={showToast}><ProfilePage      key={admin?.id+"-profile"}  onToast={showToast} /></Layout></Guard>}/>
          <Route path="/categories"  element={<Guard><Layout showToast={showToast}><CategoriesPage   key={admin?.id+"-cats"}     onToast={showToast} /></Layout></Guard>}/>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
