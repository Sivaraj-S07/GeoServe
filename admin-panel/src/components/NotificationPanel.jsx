/**
 * NotificationPanel — Real-time notification bell + dropdown
 * Drop-in for Navbar / sidebar in User & Worker dashboards.
 */
import { useState, useRef, useEffect } from "react";
import Icon from "./Icon";

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_META = {
  new_booking:     { icon: "📋", color: "#2563eb", bg: "#eff6ff", label: "New Booking"  },
  booking_update:  { icon: "🔄", color: "#d97706", bg: "#fffbeb", label: "Booking Updated" },
  message:         { icon: "💬", color: "#059669", bg: "#ecfdf5", label: "New Message"  },
  default:         { icon: "🔔", color: "#6366f1", bg: "#eef2ff", label: "Notification" },
};

export default function NotificationPanel({ notifications = [], unreadCount = 0, onMarkAllRead, onMarkRead }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleOpen = () => {
    setOpen(o => !o);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        title="Notifications"
        style={{
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 38, height: 38,
          background: open ? "var(--primary-bg)" : "var(--surface)",
          border: `1.5px solid ${open ? "var(--primary-border)" : "var(--border)"}`,
          borderRadius: "50%",
          cursor: "pointer",
          transition: "all .15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary-border)"; e.currentTarget.style.background = "var(--primary-bg)"; }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; } }}
      >
        <Icon name="bell" size={16} color={open ? "var(--primary)" : "var(--muted)"} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            minWidth: 18, height: 18, borderRadius: 9,
            background: "#ef4444", color: "#fff",
            fontSize: 10, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid var(--surface)",
            animation: "notif-pop .3s cubic-bezier(.34,1.56,.64,1)",
            paddingInline: 3,
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0,
          width: 340, maxWidth: "calc(100vw - 24px)",
          background: "var(--surface)",
          border: "1.5px solid var(--border)",
          borderRadius: 16,
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
          animation: "dropIn .18s cubic-bezier(.16,1,.3,1)",
          zIndex: 300,
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px",
            background: "linear-gradient(135deg,var(--primary-bg),var(--teal-bg))",
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🔔</span>
              <span style={{ fontWeight: 800, fontSize: 14, color: "var(--text)", fontFamily: "'Bricolage Grotesque',sans-serif" }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span style={{ padding: "2px 8px", borderRadius: 20, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 800 }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => { onMarkAllRead?.(); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: 700, color: "var(--primary)",
                  fontFamily: "inherit", padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 360, overflowY: "auto", overflowX: "hidden" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, fontWeight: 500 }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const meta = TYPE_META[n.type] || TYPE_META.default;
                return (
                  <div
                    key={n.id}
                    onClick={() => { onMarkRead?.(n.id); }}
                    style={{
                      display: "flex", gap: 12, alignItems: "flex-start",
                      padding: "12px 16px",
                      background: n.read ? "transparent" : "var(--primary-bg)",
                      borderBottom: "1px solid var(--border-light)",
                      cursor: "pointer",
                      transition: "background .12s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : "var(--primary-bg)"}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, border: `1px solid ${meta.color}22`,
                    }}>
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: n.read ? 500 : 700, color: "var(--text)", lineHeight: 1.4 }}>
                          {n.message}
                        </p>
                        {!n.read && (
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", flexShrink: 0, marginTop: 4 }} />
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>{timeAgo(n.timestamp)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
