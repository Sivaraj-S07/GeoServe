import { useState, useEffect, useCallback } from "react";
import * as api from "../api";
import { validateUpiId } from "../config/banks";

function Spinner({ light }) {
  return (
    <span style={{
      width: 13, height: 13, borderRadius: "50%",
      border: `2px solid ${light ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.4)"}`,
      borderTopColor: "#fff", display: "inline-block", animation: "umSpin .7s linear infinite",
    }}>
      <style>{`@keyframes umSpin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

/* ── Delete Confirm Modal ────────────────────────────────────────────── */
function ConfirmDeleteUpiModal({ upi, onCancel, onConfirm, deleting }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 210, padding: 16, animation: "umOverlayIn .15s ease" }}>
      <div onClick={e => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 380, padding: 24, textAlign: "center", animation: "umModalIn .18s ease" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 24 }}>🗑️</div>
        <h3 style={{ fontWeight: 800, fontSize: 16, margin: "0 0 8px" }}>Remove this UPI ID?</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 20px", lineHeight: 1.6 }}>
          <strong>{upi?.upiId}</strong> will be permanently removed. This cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} disabled={deleting} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--surface)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={onConfirm} disabled={deleting} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: deleting ? "#fca5a5" : "#ef4444", color: "#fff", fontWeight: 800, fontSize: 13, cursor: deleting ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {deleting ? (<><Spinner light /> Removing…</>) : "Yes, Remove"}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes umOverlayIn { from{opacity:0} to{opacity:1} }
        @keyframes umModalIn { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>
    </div>
  );
}

/* ── UPI Row ──────────────────────────────────────────────────────────── */
function UpiRow({ upi, isPrimary, onDelete, onSetPrimary, settingPrimary }) {
  return (
    <div
      className="card"
      style={{
        padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        border: isPrimary ? "1.5px solid #86efac" : "1.5px solid var(--border)",
        background: isPrimary ? "linear-gradient(135deg,#f0fdf4,var(--surface) 60%)" : "var(--surface)",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--primary-bg,#eff6ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>📱</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{upi.upiId}</div>
          {isPrimary && <div style={{ fontSize: 10.5, fontWeight: 800, color: "#16a34a", marginTop: 2 }}>✓ ACTIVE / PRIMARY</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {!isPrimary && (
          <button onClick={onSetPrimary} disabled={settingPrimary} style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid #86efac", background: "#f0fdf4", color: "#16a34a", fontWeight: 700, fontSize: 11.5, cursor: settingPrimary ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            {settingPrimary ? "Setting…" : "Set Primary"}
          </button>
        )}
        <button onClick={onDelete} style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid #fecaca", background: "#fef2f2", color: "#ef4444", fontWeight: 700, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>
          🗑️ Remove
        </button>
      </div>
    </div>
  );
}

/* ── Main: UpiManager ────────────────────────────────────────────────── */
export default function UpiManager({ workerId, onToast, onProfileUpdate }) {
  const [upiIds, setUpiIds]     = useState([]);
  const [primaryId, setPrimaryId] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [newUpi, setNewUpi]     = useState("");
  const [touched, setTouched]   = useState(false);
  const [adding, setAdding]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [settingPrimaryId, setSettingPrimaryId] = useState(null);

  const load = useCallback(() => {
    if (!workerId) return;
    setLoading(true);
    api.getUpiIds(workerId)
      .then(d => { setUpiIds(d.upiIds || []); setPrimaryId(d.primaryUpiId || null); })
      .catch(() => onToast("Failed to load saved UPI IDs", "error"))
      .finally(() => setLoading(false));
  }, [workerId, onToast]);

  useEffect(() => { load(); }, [load]);

  const formatError = touched ? validateUpiId(newUpi) : "";
  const isDuplicate = newUpi.trim() && upiIds.some(u => u.upiId.toLowerCase() === newUpi.trim().toLowerCase());

  const handleAdd = async (e) => {
    e.preventDefault();
    setTouched(true);
    const err = validateUpiId(newUpi);
    if (err) return;
    if (isDuplicate) { onToast("This UPI ID is already saved.", "error"); return; }
    if (upiIds.length >= 5) { onToast("You can save up to 5 UPI IDs.", "error"); return; }

    setAdding(true);
    try {
      const res = await api.addUpiId(workerId, newUpi.trim());
      setUpiIds(prev => [...prev, res.upi]);
      if (upiIds.length === 0) setPrimaryId(res.upi.id);
      onProfileUpdate?.(res.profile);
      onToast("UPI ID added successfully ✅");
      setNewUpi("");
      setTouched(false);
    } catch (e) {
      onToast(e?.response?.data?.error || e.message || "Failed to add UPI ID", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.deleteUpiId(workerId, deleteTarget.id);
      setUpiIds(prev => prev.filter(u => u.id !== deleteTarget.id));
      if (primaryId === deleteTarget.id) {
        const remaining = upiIds.filter(u => u.id !== deleteTarget.id);
        setPrimaryId(remaining[0]?.id || null);
      }
      onProfileUpdate?.(res.profile);
      onToast("UPI ID removed");
      setDeleteTarget(null);
    } catch (e) {
      onToast(e?.response?.data?.error || e.message || "Failed to delete UPI ID", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleSetPrimary = async (upi) => {
    setSettingPrimaryId(upi.id);
    try {
      const res = await api.setPrimaryUpiId(workerId, upi.id);
      setPrimaryId(upi.id);
      onProfileUpdate?.(res.profile);
      onToast(`${upi.upiId} set as active UPI ID`);
    } catch (e) {
      onToast(e?.response?.data?.error || e.message || "Failed to set active UPI ID", "error");
    } finally {
      setSettingPrimaryId(null);
    }
  };

  return (
    <div className="card" style={{ padding: 24, marginBottom: 28 }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>UPI IDs</h3>
        <p style={{ color: "var(--muted)", fontSize: 12, margin: "4px 0 0" }}>Add multiple UPI IDs and choose which one is active for customer payments.</p>
      </div>

      <form onSubmit={handleAdd} style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 220px" }}>
          <input
            type="text"
            value={newUpi}
            placeholder="e.g. name@upi or 9876543210@okhdfcbank"
            onChange={e => { setNewUpi(e.target.value); }}
            onBlur={() => setTouched(true)}
            style={{
              width: "100%", padding: "11px 14px", borderRadius: 10,
              border: `1.5px solid ${touched && (formatError || isDuplicate) ? "#ef4444" : "var(--border)"}`,
              fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
            }}
          />
          {touched && (formatError || (isDuplicate && "This UPI ID is already saved.")) && (
            <div style={{ color: "#ef4444", fontSize: 11, fontWeight: 600, marginTop: 5 }}>{formatError || "This UPI ID is already saved."}</div>
          )}
        </div>
        <button
          type="submit"
          disabled={adding || upiIds.length >= 5}
          style={{
            padding: "11px 18px", borderRadius: 10, border: "none",
            background: (adding || upiIds.length >= 5) ? "#a5b4fc" : "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff",
            fontWeight: 800, fontSize: 13, cursor: (adding || upiIds.length >= 5) ? "not-allowed" : "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
            boxShadow: (adding || upiIds.length >= 5) ? "none" : "0 4px 14px rgba(37,99,235,.3)",
          }}
        >
          {adding ? (<><Spinner /> Adding…</>) : "➕ Add UPI ID"}
        </button>
      </form>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1].map(i => (
            <div key={i} style={{ height: 56, borderRadius: 12, background: "#eef2f7", animation: "umPulse 1.3s ease-in-out infinite" }} />
          ))}
          <style>{`@keyframes umPulse { 0%,100%{opacity:.55} 50%{opacity:1} }`}</style>
        </div>
      ) : upiIds.length === 0 ? (
        <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13, border: "1.5px dashed var(--border)", borderRadius: 12 }}>
          No UPI IDs added yet. Add one above so customers can pay you instantly.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {upiIds.map(u => (
            <UpiRow
              key={u.id}
              upi={u}
              isPrimary={u.id === primaryId}
              onDelete={() => setDeleteTarget(u)}
              onSetPrimary={() => handleSetPrimary(u)}
              settingPrimary={settingPrimaryId === u.id}
            />
          ))}
        </div>
      )}

      {upiIds.length >= 5 && (
        <p style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 10 }}>You've reached the maximum of 5 saved UPI IDs. Remove one to add a new one.</p>
      )}

      {deleteTarget && (
        <ConfirmDeleteUpiModal
          upi={deleteTarget}
          deleting={deleting}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
