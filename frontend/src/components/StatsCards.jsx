import Icon from "./Icon";

const COLORS = {
  green:  { bg: "var(--green-bg)",    border: "var(--green-light)",    icon: "var(--green)",       text: "var(--green-dark)",  glow: "rgba(5,150,105,.12)"    },
  blue:   { bg: "var(--blue-bg)",     border: "var(--blue-light)",     icon: "var(--blue-mid)",    text: "var(--blue)",        glow: "rgba(59,130,246,.12)"   },
  purple: { bg: "var(--purple-bg)",   border: "var(--purple-light)",   icon: "var(--purple-mid)",  text: "var(--purple)",      glow: "rgba(139,92,246,.12)"   },
  amber:  { bg: "var(--amber-bg)",    border: "var(--amber-light)",    icon: "var(--amber)",       text: "var(--amber)",       glow: "rgba(217,119,6,.12)"    },
  red:    { bg: "var(--red-bg)",      border: "var(--red-light)",      icon: "var(--red)",         text: "var(--red)",         glow: "rgba(220,38,38,.12)"    },
  primary:{ bg: "var(--primary-bg)",  border: "var(--primary-border)", icon: "var(--primary)",     text: "var(--primary-dark)",glow: "rgba(79,70,229,.12)"    },
};

export function StatCard({ icon, label, value, color = "primary", sub, trend }) {
  const c = COLORS[color] || COLORS.primary;
  return (
    <div className="stat-card" style={{ cursor: "default", overflow: "hidden" }}>
      {/* Accent bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${c.icon}, ${c.bg})`, borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }} />
      {/* Background glow */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 100, height: 100, borderRadius: "0 var(--radius-lg) 0 100%",
        background: c.glow,
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: "var(--muted)",
            textTransform: "uppercase", letterSpacing: .7,
            fontFamily: "'Outfit', sans-serif", marginBottom: 8,
          }}>
            {label}
          </div>
          <div style={{
            fontSize: 34, fontWeight: 800,
            fontFamily: "'Outfit', sans-serif",
            color: "var(--text)", letterSpacing: -1.5,
            lineHeight: 1,
            animation: "slideUp .4s cubic-bezier(.16,1,.3,1)",
          }}>
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 5, fontWeight: 500 }}>
              {sub}
            </div>
          )}
        </div>
        <div style={{
          width: 50, height: 50, borderRadius: 14,
          background: c.bg,
          border: `1.5px solid ${c.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 4px 12px ${c.glow}`,
        }}>
          <Icon name={icon} size={22} color={c.icon} />
        </div>
      </div>

      {trend !== undefined && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 12, color: trend >= 0 ? "var(--green)" : "var(--red)",
          fontWeight: 600,
        }}>
          <Icon name={trend >= 0 ? "trending-up" : "trending-down"} size={13}
            color={trend >= 0 ? "var(--green)" : "var(--red)"} />
          {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  );
}

export function StatsGrid({ stats }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
      gap: 16,
      marginBottom: 28,
    }}>
      {stats.map((s, i) => (
        <div key={i} style={{ animation: `slideUp .35s cubic-bezier(.16,1,.3,1) ${i * 60}ms both` }}>
          <StatCard {...s} />
        </div>
      ))}
    </div>
  );
}
