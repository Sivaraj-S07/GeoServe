import { useState, useEffect } from "react";
import Icon from "./Icon";

const ICONS = ["wrench","zap","home","car","globe","layers","paw-print","briefcase","stethoscope","phone","star"];

export function CategoryModal({ category, onSave, onClose }) {
  const isEdit = Boolean(category?.id);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("globe");
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");

  useEffect(() => {
    if (category) { setName(category.name||""); setIcon(category.icon||"globe"); }
    else          { setName(""); setIcon("globe"); }
    setErr("");
  }, [category]);

  const handleSave = async () => {
    if (!name.trim()) { setErr("Name is required"); return; }
    setBusy(true);
    try { await onSave({ name, icon }); } finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth:420 }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ fontWeight:800, fontSize:18 }}>{isEdit ? "Edit Category" : "Add Category"}</h2>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={17} /></button>
        </div>
        {err && <div style={{ background:"var(--red-soft)", border:"1px solid var(--red-light)", borderRadius:8, padding:"8px 12px", color:"var(--red)", fontSize:13, marginBottom:14 }}>{err}</div>}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <label>Category Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Plumber" autoFocus />
          </div>
          <div>
            <label>Icon</label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8 }}>
              {ICONS.map(ic => (
                <button key={ic} onClick={() => setIcon(ic)} style={{
                  padding:10, border:`2px solid ${icon===ic ? "var(--green-mid)" : "var(--border)"}`,
                  borderRadius:8, background: icon===ic ? "var(--green-bg)" : "white", cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <Icon name={ic} size={18} color={icon===ic ? "var(--green)" : "var(--muted)"} />
                </button>
              ))}
            </div>
          </div>
          {/* Preview */}
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px",
            background:"var(--green-bg)", borderRadius:10, border:"1px solid var(--green-light)" }}>
            <div style={{ background:"var(--surface)", padding:10, borderRadius:9, border:"1px solid var(--green-light)" }}>
              <Icon name={icon} size={20} color="var(--green)" />
            </div>
            <span style={{ fontWeight:700, fontSize:15, fontFamily:"'Sora',sans-serif" }}>{name || "Category Name"}</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:22, paddingTop:18, borderTop:"1px solid var(--border)" }}>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={busy}>
            <Icon name="check" size={14} color="white" /> {busy ? "Saving…" : isEdit ? "Update" : "Add Category"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ message, onConfirm, onClose, dangerous = true }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth:380, textAlign:"center" }} onClick={e => e.stopPropagation()}>
        <div style={{ width:54, height:54, background: dangerous ? "var(--red-soft)" : "var(--amber-soft)",
          borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
          <Icon name={dangerous ? "trash" : "alert-circle"} size={22} color={dangerous ? "var(--red)" : "var(--amber)"} />
        </div>
        <h3 style={{ fontWeight:800, fontSize:17, marginBottom:8 }}>{dangerous ? "Confirm Delete" : "Confirm Action"}</h3>
        <p style={{ color:"var(--muted)", fontSize:14, lineHeight:1.6, marginBottom:24 }}>{message}</p>
        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button onClick={onConfirm} style={{
            background: dangerous ? "var(--red)" : "var(--amber)", color:"white", border:"none",
            borderRadius:10, padding:"10px 24px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit",
          }}>
            {dangerous ? "Yes, Delete" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
