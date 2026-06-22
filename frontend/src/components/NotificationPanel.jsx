/**
 * NotificationPanel — Enhanced Real-time notification bell + dropdown
 * Features: unread/read states, grouped by type, swipe-to-dismiss, improved UX
 */
import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "./Icon";
import { useTranslation } from "react-i18next";

// timeAgo moved to component

const TYPE_META = {
  new_booking:    { icon: "📋", color: "#2563eb", bg: "#eff6ff", darkBg: "rgba(37,99,235,.15)", labelKey: "notifications.newBooking",     border: "rgba(37,99,235,.2)" },
  booking_update: { icon: "🔄", color: "#d97706", bg: "#fffbeb", darkBg: "rgba(217,119,6,.15)",  labelKey: "notifications.bookingUpdated", border: "rgba(217,119,6,.2)" },
  message:        { icon: "💬", color: "#059669", bg: "#ecfdf5", darkBg: "rgba(5,150,105,.15)",  labelKey: "notifications.newMessage",     border: "rgba(5,150,105,.2)" },
  default:        { icon: "🔔", color: "#6366f1", bg: "#eef2ff", darkBg: "rgba(99,102,241,.15)", labelKey: "notifications.notification",   border: "rgba(99,102,241,.2)" },
};

function NotifItem({ n, onMarkRead, onDismiss }) {
  const { t } = useTranslation();
  const meta = TYPE_META[n.type] || TYPE_META.default;
  const [hovered, setHovered] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const handleDismiss = (e) => {
    e.stopPropagation();
    setDismissing(true);
    setTimeout(() => onDismiss?.(n.id), 220);
  };

  return (
    <div
      onClick={() => onMarkRead?.(n.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", gap: 11, alignItems: "flex-start",
        padding: "11px 14px",
        background: dismissing ? "transparent" : (hovered ? "var(--surface-hover)" : (n.read ? "transparent" : "var(--primary-bg)")),
        borderBottom: "1px solid var(--border-light)",
        cursor: "pointer",
        transition: "all .2s ease",
        opacity: dismissing ? 0 : 1,
        transform: dismissing ? "translateX(20px)" : "none",
        position: "relative",
      }}
    >
      {/* Unread indicator stripe */}
      {!n.read && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: meta.color, borderRadius: "0 2px 2px 0",
        }} />
      )}

      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 17, border: `1.5px solid ${meta.border}`,
        transition: "transform .15s",
        transform: hovered ? "scale(1.08)" : "scale(1)",
      }}>
        {meta.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
          <p style={{
            margin: "0 0 3px", fontSize: 12.5,
            fontWeight: n.read ? 500 : 700,
            color: "var(--text)", lineHeight: 1.4,
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {n.message}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            {!n.read && (
              <div style={{
                width: 7, height: 7, borderRadius: "50%", background: "#ef4444",
                flexShrink: 0, animation: "notif-pulse 2s infinite",
              }} />
            )}
            {hovered && (
              <button
                onClick={handleDismiss}
                title={t("notifications.dismiss")}
                style={{
                  background: "var(--surface-hover)", border: "1px solid var(--border)",
                  borderRadius: 6, width: 20, height: 20, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: "var(--muted)", padding: 0, flexShrink: 0,
                }}
              >✕</button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            display: "inline-block", padding: "1px 7px", borderRadius: 20,
            fontSize: 10, fontWeight: 700, color: meta.color,
            background: meta.bg, border: `1px solid ${meta.border}`,
          }}>
            {meta.labelKey ? t(meta.labelKey) : meta.label}
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{timeAgo(n.timestamp, t)}</span>
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso, t) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return t("common.justNow");
  if (m < 60) return t("common.minutesAgo", { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("common.hoursAgo", { count: h });
  return t("common.daysAgo", { count: Math.floor(h / 24) });
}

export default function NotificationPanel({ notifications = [], unreadCount = 0, onMarkAllRead, onMarkRead }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [localNotifs, setLocalNotifs] = useState(notifications);
  const [filter, setFilter] = useState("all"); // all | unread
  const [prevUnread, setPrevUnread] = useState(0);
  const [shake, setShake] = useState(false);
  const ref = useRef();
  const panelRef = useRef();

  // Sync local with props
  useEffect(() => {
    setLocalNotifs(notifications);
  }, [notifications]);

  // Shake bell when new notification arrives
  useEffect(() => {
    if (unreadCount > prevUnread && prevUnread >= 0) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
    setPrevUnread(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleDismiss = useCallback((id) => {
    setLocalNotifs(prev => prev.filter(n => n.id !== id));
    onMarkRead?.(id);
  }, [onMarkRead]);

  const handleMarkRead = useCallback((id) => {
    onMarkRead?.(id);
  }, [onMarkRead]);

  const displayed = filter === "unread"
    ? localNotifs.filter(n => !n.read)
    : localNotifs;

  const unreadLocal = localNotifs.filter(n => !n.read).length;

  return (
    <div ref={ref} style={{ position: "relative" }} className="notif-panel-wrapper">
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        title={t("notifications.title")}
        className="notif-bell-btn"
        style={{
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 38, height: 38,
          background: open ? "var(--primary-bg)" : "var(--surface)",
          border: `1.5px solid ${open ? "var(--primary-border)" : "var(--border)"}`,
          borderRadius: "50%",
          cursor: "pointer",
          transition: "all .15s",
          animation: shake ? "bell-shake .6s ease" : "none",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary-border)"; e.currentTarget.style.background = "var(--primary-bg)"; }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; } }}
      >
        <Icon name="bell" size={16} color={open ? "var(--primary)" : (unreadCount > 0 ? "var(--primary)" : "var(--muted)")} />
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
        <div
          ref={panelRef}
          className="notif-dropdown-panel"
          style={{
            position: "absolute", top: "calc(100% + 10px)", right: 0,
            width: 360, maxWidth: "calc(100vw - 24px)",
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: 18,
            boxShadow: "var(--shadow-xl)",
            overflow: "hidden",
            animation: "dropIn .18s cubic-bezier(.16,1,.3,1)",
            zIndex: 300,
          }}
        >
          {/* Header */}
          <div style={{
            padding: "14px 16px 12px",
            background: "linear-gradient(135deg,var(--primary-bg),var(--teal-bg))",
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 17 }}>🔔</span>
                <span style={{ fontWeight: 800, fontSize: 14.5, color: "var(--text)", fontFamily: "'Bricolage Grotesque',sans-serif" }}>
                  {t("notifications.title")}
                </span>
                {unreadLocal > 0 && (
                  <span style={{
                    padding: "2px 8px", borderRadius: 20,
                    background: "#ef4444", color: "#fff",
                    fontSize: 10, fontWeight: 800,
                    animation: "notif-pop .3s cubic-bezier(.34,1.56,.64,1)",
                  }}>
                    {unreadLocal} new
                  </span>
                )}
              </div>
              {unreadLocal > 0 && (
                <button
                  onClick={() => { onMarkAllRead?.(); }}
                  style={{
                    background: "var(--primary-bg)", border: "1px solid var(--primary-border)",
                    cursor: "pointer", fontSize: 11, fontWeight: 700, color: "var(--primary)",
                    fontFamily: "inherit", padding: "4px 10px", borderRadius: 8,
                    transition: "all .13s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--primary-bg)"; e.currentTarget.style.color = "var(--primary)"; }}
                >
                  ✓ {t("notifications.markAllRead")}
                </button>
              )}
            </div>

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 6 }}>
              {["all", "unread"].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "4px 12px", borderRadius: 20, border: "1.5px solid",
                    borderColor: filter === f ? "var(--primary-border)" : "var(--border)",
                    background: filter === f ? "var(--primary-bg)" : "transparent",
                    color: filter === f ? "var(--primary)" : "var(--muted)",
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                    transition: "all .13s", fontFamily: "inherit",
                    textTransform: "capitalize",
                  }}
                >
                  {f === "all" ? `${t("common.all")} (${localNotifs.length})` : `${t("common.all") === "All" ? "Unread" : t("notifications.noNotifications").split(" ")[0]} (${unreadLocal})`}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: "auto", overflowX: "hidden" }}>
            {displayed.length === 0 ? (
              <div style={{ padding: "36px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>{filter === "unread" ? "✅" : "🔕"}</div>
                <p style={{ margin: "0 0 4px", color: "var(--text)", fontSize: 14, fontWeight: 700 }}>
                  {filter === "unread" ? t("notifications.noNotificationsDesc") : t("notifications.noNotifications")}
                </p>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
                  {filter === "unread" ? t("notifications.noNotifications") : t("notifications.noNotificationsDesc")}
                </p>
              </div>
            ) : (
              displayed.map(n => (
                <NotifItem
                  key={n.id}
                  n={n}
                  onMarkRead={handleMarkRead}
                  onDismiss={handleDismiss}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {localNotifs.length > 0 && (
            <div style={{
              padding: "10px 14px",
              borderTop: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "var(--surface)",
            }}>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
{localNotifs.length} {t("notifications.title").toLowerCase()}
              </span>
              {localNotifs.length > 0 && (
                <button
                  onClick={() => { setLocalNotifs([]); onMarkAllRead?.(); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 11, fontWeight: 600, color: "var(--muted)",
                    fontFamily: "inherit", padding: "2px 6px",
                    transition: "color .13s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "var(--red)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--muted)"; }}
                >
                  {t("common.close")} {t("common.all").toLowerCase()}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
