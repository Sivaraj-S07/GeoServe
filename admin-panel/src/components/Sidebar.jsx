import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAdmin } from "../context/AuthContext";
import * as api from "../api";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { path: "/",             label: "Dashboard",    icon: "📊", desc: "Overview & live stats" },
  { path: "/users",        label: "Users",        icon: "👥", desc: "Manage user accounts"  },
  { path: "/workers",      label: "Workers",      icon: "🔧", desc: "Worker management"     },
  { path: "/verification", label: "Verification", icon: "🛡️", desc: "Review credentials", badge: true },
  { path: "/bookings",     label: "Bookings",     icon: "📅", desc: "All platform bookings" },
  { path: "/analytics",    label: "Analytics",    icon: "📈", desc: "Platform insights"     },
  { path: "/history",      label: "History",      icon: "📋", desc: "Activity & login logs"  },
  { path: "/profile",      label: "My Profile",   icon: "👤", desc: "Account settings"      },
];

export default function Sidebar() {
  const { admin, logout } = useAdmin();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [pendingVerif, setPendingVerif] = useState(0);

  useEffect(() => {
    api.getVerificationStats()
      .then(s => setPendingVerif(s.pending || 0))
      .catch(() => {});
    const interval = setInterval(() => {
      api.getVerificationStats()
        .then(s => setPendingVerif(s.pending || 0))
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="admin-sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🗺️</div>
        <div>
          <div className="sidebar-logo-name">GeoServe</div>
          <div className="sidebar-logo-sub">Admin Panel</div>
        </div>
      </div>

      {/* Admin profile chip */}
      {admin && (
        <div
          className="sidebar-profile"
          onClick={() => nav("/profile")}
          title="View your profile"
          style={{ cursor: "pointer", transition: "background .15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = ""}
        >
          <div className="sidebar-avatar">
            {admin.avatar
              ? <img src={admin.avatar} alt={admin.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
              : admin.name?.charAt(0).toUpperCase()
            }
          </div>
          <div className="sidebar-profile-info">
            <div className="sidebar-profile-name">{admin.name}</div>
            <div className="sidebar-profile-role">
              <span className="sidebar-online-dot" /> Administrator
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">Navigation</div>
        {NAV.map(item => {
          const isActive = pathname === item.path;
          const showBadge = item.badge && pendingVerif > 0;
          return (
            <button
              key={item.path}
              className={`nav-item${isActive ? " active" : ""}`}
              onClick={() => nav(item.path)}
              title={item.desc}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span className="nav-item-label">{item.label}</span>
              {showBadge && (
                <span className="nav-badge">{pendingVerif}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="sidebar-footer">
        <div className="sidebar-db-pill">
          <span>🔗</span> Connected to live database
        </div>
        <button className="nav-item nav-item-logout" onClick={() => { logout(); nav("/login", { replace: true }); }}>
          <span className="nav-item-icon">🚪</span>
          <span className="nav-item-label">Sign Out</span>
        </button>
      </div>
      {/* Theme Toggle */}
      <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
        <ThemeToggle />
      </div>
    </aside>
  );
}
