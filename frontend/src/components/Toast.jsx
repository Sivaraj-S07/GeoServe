/**
 * Toast.jsx — GeoServe v5.0
 * FIX: Auto-dismisses after 3.5s (was never closing). Smooth slide animation.
 */
import { useEffect, useState } from "react";

const STYLES = {
  success: { bg: "var(--primary)", icon: "✓" },
  error:   { bg: "#ef4444", icon: "✕" },
  warning: { bg: "#f59e0b", icon: "⚠" },
  info:    { bg: "var(--primary)", icon: "ℹ" },
};

export default function Toast({ message, type = "success", onClose }) {
  const [visible, setVisible] = useState(false);
  const s = STYLES[type] || STYLES.info;

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    const t2 = setTimeout(() => { setVisible(false); setTimeout(onClose, 300); }, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onClose]);

  return (
    <div
      role="alert" aria-live="polite"
      className="gs-toast"
      onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
      style={{
        position:"fixed", bottom:24, right:24, zIndex:9999,
        display:"flex", alignItems:"center", gap:12, padding:"14px 20px",
        borderRadius:12, background:s.bg, color:"white", fontWeight:600,
        fontSize:14, boxShadow:"0 8px 32px rgba(0,0,0,.25)", cursor:"pointer",
        maxWidth:380, userSelect:"none",
        transform: visible ? "translateY(0)" : "translateY(80px)",
        opacity:   visible ? 1 : 0,
        transition:"transform .28s cubic-bezier(.34,1.56,.64,1), opacity .28s ease",
      }}
    >
      <span style={{fontSize:18}}>{s.icon}</span>
      <span style={{flex:1}}>{message}</span>
      <span style={{opacity:.7,fontSize:18}}>×</span>
    </div>
  );
}
