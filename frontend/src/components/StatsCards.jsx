import Icon from "./Icon";

const COLORS = {
  green:  { bg:"var(--green-bg)",   border:"var(--green-border)",   icon:"var(--green)",     text:"var(--green-dark)",  glow:"rgba(37,99,235,.12)", grad:"linear-gradient(135deg,var(--green),#34d399)" },
  blue:   { bg:"var(--blue-bg)",    border:"var(--blue-border)",    icon:"var(--blue)",      text:"var(--blue)",        glow:"rgba(59,130,246,.12)", grad:"linear-gradient(135deg,#3b82f6,#60a5fa)" },
  purple: { bg:"var(--purple-bg)",  border:"var(--purple-border)",  icon:"var(--purple)",    text:"var(--purple)",      glow:"rgba(139,92,246,.12)", grad:"linear-gradient(135deg,#8b5cf6,#a78bfa)" },
  amber:  { bg:"var(--amber-bg)",   border:"var(--amber-border)",   icon:"var(--amber)",     text:"var(--amber)",       glow:"rgba(245,158,11,.12)", grad:"linear-gradient(135deg,#f59e0b,#fbbf24)" },
  red:    { bg:"var(--red-bg)",     border:"var(--red-border)",     icon:"var(--red)",       text:"var(--red)",         glow:"rgba(239,68,68,.12)",  grad:"linear-gradient(135deg,#ef4444,#f87171)" },
  primary:{ bg:"var(--primary-bg)", border:"var(--primary-border)", icon:"var(--primary)",   text:"var(--primary-dark)",glow:"rgba(37,99,235,.14)",  grad:"var(--grad-primary)" },
  teal:   { bg:"var(--teal-bg)",    border:"var(--teal-border)",    icon:"var(--teal)",      text:"var(--teal-dark)",   glow:"rgba(5,150,105,.12)", grad:"linear-gradient(135deg,#059669,#34d399)" },
  cyan:   { bg:"var(--cyan-bg)",    border:"var(--cyan-border)",    icon:"var(--cyan)",      text:"var(--primary-dark)",glow:"rgba(37,99,235,.14)",  grad:"linear-gradient(135deg,#3b82f6,#93c5fd)" },
};

export function StatCard({ icon, label, value, color = "primary", sub, trend }) {
  const c = COLORS[color] || COLORS.primary;
  return (
    <div className="stat-item" style={{ position:"relative", overflow:"hidden" }}>
      {/* Top gradient accent */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:c.grad, borderRadius:"var(--radius-lg) var(--radius-lg) 0 0" }} />
      {/* Corner glow */}
      <div style={{ position:"absolute", top:0, right:0, width:80, height:80, borderRadius:"0 var(--radius-lg) 0 100%", background:c.glow, pointerEvents:"none" }} />

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, fontWeight:800, color:"var(--muted)", textTransform:"uppercase", letterSpacing:.06, marginBottom:8, fontFamily:"'Bricolage Grotesque',sans-serif" }}>
            {label}
          </div>
          <div style={{ fontSize:32, fontWeight:800, fontFamily:"'Bricolage Grotesque',sans-serif", color:"var(--text)", letterSpacing:-1.5, lineHeight:1 }}>
            {value}
          </div>
          {sub && <div style={{ fontSize:12, color:"var(--muted)", marginTop:5, fontWeight:500 }}>{sub}</div>}
        </div>
        <div style={{ width:46, height:46, borderRadius:13, background:c.grad, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 4px 14px ${c.glow}` }}>
          <Icon name={icon} size={20} color="white" />
        </div>
      </div>

      {trend !== undefined && (
        <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:trend >= 0 ? "var(--green)" : "var(--red)", fontWeight:700 }}>
          <Icon name={trend >= 0 ? "trending-up" : "trending-down"} size={13} color={trend >= 0 ? "var(--green)" : "var(--red)"} />
          {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  );
}

export function StatsGrid({ stats }) {
  return (
    <div className="stats-grid">
      {stats.map((s, i) => (
        <div key={i} style={{ animation:`animUp .35s cubic-bezier(.16,1,.3,1) ${i * 55}ms both` }}>
          <StatCard {...s} />
        </div>
      ))}
    </div>
  );
}
