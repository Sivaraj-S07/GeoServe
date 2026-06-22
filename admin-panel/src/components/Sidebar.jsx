import { useNavigate, useLocation } from "react-router-dom";
import { useAdmin } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEM_IDS = [
  { id: "dashboard",    labelKey: "adminSidebar.dashboard",    icon: "◈",  path: "/",             section: "main"  },
  { id: "users",        labelKey: "adminSidebar.users",        icon: "⊞",  path: "/users",        section: "main"  },
  { id: "workers",      labelKey: "adminSidebar.workers",      icon: "⊙",  path: "/workers",      section: "main"  },
  { id: "bookings",     labelKey: "adminSidebar.bookings",     icon: "⊟",  path: "/bookings",     section: "main", notifKey: "bookings"  },
  { id: "verification", labelKey: "adminSidebar.verification", icon: "⊕",  path: "/verification", section: "main", notifKey: "verification"  },
  { id: "categories",   labelKey: "adminSidebar.categories",   icon: "⊗",  path: "/categories",   section: "main"  },
  { id: "analytics",    labelKey: "adminSidebar.analytics",    icon: "⊘",  path: "/analytics",    section: "data"  },
  { id: "history",      labelKey: "adminSidebar.history",      icon: "⊚",  path: "/history",      section: "data"  },
  { id: "payments",     labelKey: "adminSidebar.payments",     icon: "⊛",  path: "/payments",     section: "data"  },
  { id: "support",      labelKey: "adminSidebar.support",      icon: "⊜",  path: "/support",      section: "tools", notifKey: "support" },
];

const EMOJI_MAP = {
  "◈": "📊", "⊞": "👥", "⊙": "⚙️", "⊟": "📅", "⊕": "✅",
  "⊗": "🗂️", "⊘": "📈", "⊚": "🕐", "⊛": "💳", "⊜": "💬",
};

export default function Sidebar({ onLogout, mobileOpen, onClose, notifCounts = {} }) {
  const nav = useNavigate();
  const loc = useLocation();
  const { admin } = useAdmin();
  const { t } = useTranslation();

  const SECTIONS = {
    main:  { label: t("common.all") === "All" ? "Main" : "முக்கியம்",    items: NAV_ITEM_IDS.filter(i => i.section === "main")  },
    data:  { label: t("adminAnalytics.overview") === "Platform Overview" ? "Reports" : "அறிக்கைகள்", items: NAV_ITEM_IDS.filter(i => i.section === "data")  },
    tools: { label: t("adminSupport.title") === "Support Tickets" ? "Tools" : "கருவிகள்",   items: NAV_ITEM_IDS.filter(i => i.section === "tools") },
  };

  const isActive = (path) => path === "/" ? loc.pathname === "/" : loc.pathname.startsWith(path);
  const handleNav = (path) => { nav(path); if (onClose) onClose(); };

  return (
    <aside className={`admin-sidebar${mobileOpen ? " open" : ""}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#1d4ed8,#2563eb,#059669)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(37,99,235,.45)", overflow: "hidden" }}>
            <img src="/logo.svg" alt="GeoServe" width={38} height={38} style={{ display: "block" }} />
          </div>
          <div style={{ position: "absolute", inset: -2, borderRadius: "50%", border: "1.5px solid rgba(37,99,235,.22)", pointerEvents: "none" }} />
        </div>
        <div>
          <div className="sidebar-logo-text">
            Geo<span style={{ background: "linear-gradient(135deg,#2563eb,#059669)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Serve</span>
          </div>
          <div className="sidebar-logo-badge">{t("adminLogin.signIn").includes("Admin") ? "Admin Panel" : "நிர்வாக பலகை"}</div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {Object.entries(SECTIONS).map(([key, { label, items }]) => (
          <div key={key} className="sidebar-section">
            <div className="sidebar-section-label">{label}</div>
            {items.map(item => {
              const active = isActive(item.path);
              const badgeCount = item.notifKey === "bookings" ? notifCounts.pendingBookings
                : item.notifKey === "verification" ? notifCounts.pendingVerifications
                : item.notifKey === "support" ? notifCounts.unreadSupport
                : 0;
              return (
                <button key={item.id} className={`sidebar-item${active ? " active" : ""}`} onClick={() => handleNav(item.path)}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{EMOJI_MAP[item.icon]}</span>
                  <span style={{ flex: 1 }}>{t(item.labelKey)}</span>
                  {badgeCount > 0 && (
                    <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: "#ef4444", color: "white", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", flexShrink: 0 }}>
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                  {active && !badgeCount && (<span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--primary)", flexShrink: 0 }} />)}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 14px 16px", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "10px 12px", borderRadius: 14, background: "linear-gradient(135deg,var(--primary-bg),var(--teal-bg))", border: "1px solid var(--primary-border)" }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#1d4ed8,#3b82f6,#059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 14, fontWeight: 800, flexShrink: 0, boxShadow: "0 3px 10px rgba(37,99,235,.40)", fontFamily: "'Bricolage Grotesque',sans-serif" }}>
            {admin?.name?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Bricolage Grotesque',sans-serif" }}>
              {admin?.name || "Admin"}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{t("adminProfile.title")}</div>
          </div>
          <ThemeToggle />
        </div>

        <button onClick={onLogout}
          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", borderRadius: 11, background: "var(--red-bg)", border: "1px solid var(--red-border)", color: "var(--red)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--red)"; e.currentTarget.style.color = "white"; e.currentTarget.style.borderColor = "var(--red)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--red-bg)"; e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.borderColor = "var(--red-border)"; }}
        >
          <span>🚪</span> {t("adminSidebar.logout")}
        </button>
      </div>
    </aside>
  );
}
