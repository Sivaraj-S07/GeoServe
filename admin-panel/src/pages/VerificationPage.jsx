import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../api";

const API_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
const API_URL = import.meta.env.VITE_API_URL || "/api";

// Helper to build authenticated file URL with token in query string for media
function getFileUrl(filename) {
  const token = localStorage.getItem("admin_token") || "";
  const base = API_BASE || "";
  // Use the authenticated file endpoint
  return `${base}/api/verification/file/${filename}?token=${encodeURIComponent(token)}`;
}

const STATUS_CFG = {
  pending:  { label: "Pending",  color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: "⏳" },
  verified: { label: "Verified", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", icon: "✅" },
  rejected: { label: "Rejected", color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: "❌" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function FilePreviewModal({ record, onClose }) {
  const [activeTab, setActiveTab] = useState(record.certificate_file ? "cert" : "video");
  const certUrl  = record.certificate_file ? getFileUrl(record.certificate_file) : null;
  const videoUrl = record.work_video       ? getFileUrl(record.work_video)       : null;

  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(15,23,42,.75)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--surface)", borderRadius: 20, width: "100%", maxWidth: 780,
        maxHeight: "90vh", overflow: "hidden",
        boxShadow: "0 32px 80px rgba(15,23,42,.25)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #e2e8f0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(135deg, #f8fafc, #eef2ff)",
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", letterSpacing: "-.3px" }}>
              🔍 Verification Documents
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
              {record.workerName} · {record.workerEmail}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 10, background: "var(--bg-alt)",
            border: "none", cursor: "pointer", fontSize: 18, color: "var(--muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Tab bar */}
        {certUrl && videoUrl && (
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e2e8f0", padding: "0 24px" }}>
            {[
              { id: "cert",  label: "📜 Certificate" },
              { id: "video", label: "🎬 Work Video"  },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: "12px 20px", background: "none", border: "none",
                borderBottom: activeTab === t.id ? "3px solid #4f46e5" : "3px solid transparent",
                color: activeTab === t.id ? "#4f46e5" : "#64748b",
                fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                transition: "all .15s",
              }}>{t.label}</button>
            ))}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: 24, background: "var(--bg)", minHeight: 300 }}>
          {activeTab === "cert" && certUrl && (
            <div>
              {record.certificate_mimetype === "application/pdf" ? (
                <iframe
                  src={`${certUrl}#toolbar=1`}
                  title="Certificate"
                  style={{ width: "100%", height: 480, border: "none", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,.1)" }}
                />
              ) : (
                <div style={{ textAlign: "center" }}>
                  <img
                    src={certUrl}
                    alt="Certificate"
                    style={{
                      maxWidth: "100%", maxHeight: 520, borderRadius: 14,
                      boxShadow: "0 12px 40px rgba(0,0,0,.15)",
                      border: "1.5px solid var(--border)",
                      display: "block", margin: "0 auto",
                    }}
                    onError={e => {
                      e.target.style.display = "none";
                      e.target.nextSibling && (e.target.nextSibling.style.display = "flex");
                    }}
                  />
                  <div style={{ display:"none",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,color:"#94a3b8" }}>
                    <div style={{ fontSize:48,marginBottom:12 }}>🖼️</div>
                    <div style={{ fontWeight:700,color:"#64748b" }}>Image could not be loaded</div>
                    <div style={{ fontSize:12,marginTop:6 }}>The file may have been moved or deleted</div>
                    <a href={certUrl} target="_blank" rel="noreferrer" style={{ marginTop:14,color:"#4f46e5",fontWeight:700,fontSize:13 }}>Try opening directly ↗</a>
                  </div>
                </div>
              )}
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
                Original file: {record.certificate_originalname}
              </div>
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <a href={certUrl} target="_blank" rel="noreferrer" style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", background: "#4f46e5", color: "white",
                  borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none",
                }}>⬇ Download Original</a>
              </div>
            </div>
          )}
          {activeTab === "video" && videoUrl && (
            <div>
              <video
                controls
                style={{ width: "100%", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,.12)", maxHeight: 460 }}
                src={videoUrl}
              >
                Your browser does not support video playback.
              </video>
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
                Original file: {record.video_originalname}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionModal({ record, action, onConfirm, onClose }) {
  const [notes, setNotes] = useState("");
  const isApprove = action === "approve";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9100,
      background: "rgba(15,23,42,.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        background: "var(--surface)", borderRadius: 20, width: "100%", maxWidth: 440,
        boxShadow: "0 24px 80px rgba(15,23,42,.2)", overflow: "hidden",
      }}>
        <div style={{
          padding: "24px 24px 20px",
          background: isApprove ? "linear-gradient(135deg, #ecfdf5, #f0fdf4)" : "linear-gradient(135deg, #fef2f2, #fee2e2)",
          borderBottom: `1px solid ${isApprove ? "#a7f3d0" : "#fecaca"}`,
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>{isApprove ? "✅" : "❌"}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
            {isApprove ? "Approve Verification" : "Reject Verification"}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
            Worker: <strong>{record.workerName}</strong>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
            {isApprove ? "Approval Notes (optional)" : "Rejection Reason *"}
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder={isApprove
              ? "e.g. Certificate verified — licensed electrician"
              : "e.g. Certificate is unreadable / not relevant to the job category"
            }
            style={{
              width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)",
              borderRadius: 10, fontFamily: "inherit", fontSize: 13,
              resize: "vertical", outline: "none",
              transition: "border-color .15s",
            }}
            onFocus={e => e.target.style.borderColor = "#4f46e5"}
            onBlur={e => e.target.style.borderColor = "#e2e8f0"}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "12px", background: "var(--bg)",
              border: "1.5px solid var(--border)", borderRadius: 10, fontWeight: 700,
              fontSize: 14, cursor: "pointer", color: "var(--muted)", fontFamily: "inherit",
            }}>Cancel</button>
            <button
              onClick={() => onConfirm(notes)}
              disabled={!isApprove && !notes.trim()}
              style={{
                flex: 2, padding: "12px",
                background: isApprove
                  ? "linear-gradient(135deg, #059669, #34d399)"
                  : "linear-gradient(135deg, #dc2626, #ef4444)",
                color: "white", border: "none", borderRadius: 10,
                fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                opacity: (!isApprove && !notes.trim()) ? 0.5 : 1,
                boxShadow: isApprove ? "0 4px 16px rgba(5,150,105,.3)" : "0 4px 16px rgba(220,38,38,.3)",
              }}
            >
              {isApprove ? "✅ Approve Worker" : "❌ Reject Worker"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerifCard({ record, categories, onApprove, onReject, onPreview, busy }) {
  const cat = categories.find(c => c.id === record.categoryId);
  const cfg = STATUS_CFG[record.verification_status] || STATUS_CFG.pending;
  const submittedAt = record.verification_submitted_at
    ? new Date(record.verification_submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div style={{
      background: "var(--surface)", border: `1px solid ${record.verification_status === "pending" ? "#c7d2fe" : "#e2e8f0"}`,
      borderRadius: 16, overflow: "hidden",
      boxShadow: record.verification_status === "pending" ? "0 4px 20px rgba(99,102,241,.1)" : "0 2px 8px rgba(0,0,0,.04)",
      transition: "all .2s ease",
    }}>
      {/* Card top strip */}
      <div style={{
        height: 4,
        background: record.verification_status === "pending"
          ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
          : record.verification_status === "verified"
            ? "linear-gradient(90deg, #059669, #34d399)"
            : "linear-gradient(90deg, #dc2626, #ef4444)",
      }} />

      <div style={{ padding: "20px 22px" }}>
        {/* Worker info */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 900, fontSize: 18,
          }}>
            {record.workerName?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text)", letterSpacing: "-.2px" }}>{record.workerName}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{record.workerEmail}</div>
            {record.workerPhone && <div style={{ fontSize: 12, color: "var(--muted)" }}>📞 {record.workerPhone}</div>}
          </div>
          <StatusBadge status={record.verification_status} />
        </div>

        {/* Meta */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <div style={{ background: "var(--bg)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 3 }}>Category</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{cat?.name || "Unknown"}</div>
          </div>
          <div style={{ background: "var(--bg)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 3 }}>Submitted</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{submittedAt}</div>
          </div>
        </div>

        {/* Documents */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Uploaded Documents</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {record.certificate_file && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 20,
                background: "#eff6ff", border: "1px solid #bfdbfe",
                fontSize: 12, fontWeight: 600, color: "#2563eb",
              }}>
                📜 Certificate
                <span style={{ fontSize: 10, color: "#93c5fd" }}>
                  ({record.certificate_mimetype?.includes("pdf") ? "PDF" : "Image"})
                </span>
              </span>
            )}
            {record.work_video && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 20,
                background: "#f5f3ff", border: "1px solid #ddd6fe",
                fontSize: 12, fontWeight: 600, color: "#7c3aed",
              }}>
                🎬 Work Video
              </span>
            )}
          </div>
        </div>

        {/* Admin notes if reviewed */}
        {record.admin_notes && (
          <div style={{
            background: "var(--bg)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "10px 12px", marginBottom: 16, fontSize: 12, color: "var(--text-secondary)",
          }}>
            <span style={{ fontWeight: 700 }}>Admin notes: </span>{record.admin_notes}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onPreview(record)}
            style={{
              flex: 1, padding: "10px 8px",
              background: "linear-gradient(135deg, #f8fafc, #eef2ff)",
              border: "1.5px solid #c7d2fe", borderRadius: 10,
              fontWeight: 700, fontSize: 13, cursor: "pointer",
              color: "#4f46e5", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "all .15s",
            }}
          >
            🔍 Preview
          </button>
          {record.verification_status === "pending" && (
            <>
              <button
                onClick={() => onApprove(record)}
                disabled={busy}
                style={{
                  flex: 1.5, padding: "10px 8px",
                  background: "linear-gradient(135deg, #059669, #34d399)",
                  border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13,
                  cursor: busy ? "not-allowed" : "pointer", color: "white", fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  boxShadow: "0 4px 12px rgba(5,150,105,.3)",
                  opacity: busy ? 0.7 : 1,
                }}
              >✅ Approve</button>
              <button
                onClick={() => onReject(record)}
                disabled={busy}
                style={{
                  flex: 1, padding: "10px 8px",
                  background: "linear-gradient(135deg, #fef2f2, #fee2e2)",
                  border: "1.5px solid #fecaca", borderRadius: 10, fontWeight: 700, fontSize: 13,
                  cursor: busy ? "not-allowed" : "pointer", color: "#dc2626", fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  opacity: busy ? 0.7 : 1,
                }}
              >❌ Reject</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerificationPage({ onToast }) {
  const [records,    setRecords]   = useState([]);
  const [categories, setCats]      = useState([]);
  const [stats,      setStats]     = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [filter,     setFilter]    = useState("all");
  const [preview,    setPreview]   = useState(null);
  const [actionModal, setActionModal] = useState(null); // {record, action}
  const [busy,       setBusy]      = useState(false);
  const pollRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [recs, cats, st] = await Promise.all([
        api.getVerificationRequests(filter),
        api.getCategories(),
        api.getVerificationStats(),
      ]);
      setRecords(recs);
      setCats(cats);
      setStats(st);
    } catch { if (!silent) onToast("Failed to load verification data", "error"); }
    finally { if (!silent) setLoading(false); }
  }, [filter, onToast]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 30_000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  const handleConfirmAction = async (notes) => {
    const { record, action } = actionModal;
    setBusy(true);
    try {
      if (action === "approve") {
        await api.approveVerification(record.workerId, notes);
        onToast(`✅ ${record.workerName} has been verified and approved!`);
      } else {
        await api.rejectVerification(record.workerId, notes);
        onToast(`❌ ${record.workerName}'s verification was rejected.`, "error");
      }
      setActionModal(null);
      load(true);
    } catch (e) {
      onToast(e.response?.data?.error || "Action failed", "error");
    } finally { setBusy(false); }
  };

  const pendingCount = stats?.pending || 0;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-.5px", color: "var(--text)", marginBottom: 4 }}>
              🛡️ Worker Verification
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>
              Review uploaded certificates and work videos to verify worker credentials
            </p>
          </div>
          <button onClick={() => load()} className="btn btn-ghost btn-sm">↻ Refresh</button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Total Requests", value: stats.total,    bg: "#eef2ff", border: "#c7d2fe", color: "#4f46e5", icon: "📋" },
            { label: "Pending Review", value: stats.pending,  bg: "#fffbeb", border: "#fde68a", color: "#d97706", icon: "⏳" },
            { label: "Verified",       value: stats.verified, bg: "#ecfdf5", border: "#a7f3d0", color: "#059669", icon: "✅" },
            { label: "Rejected",       value: stats.rejected, bg: "#fef2f2", border: "#fecaca", color: "#dc2626", icon: "❌" },
          ].map(s => (
            <div key={s.label} style={{
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
              padding: "16px 18px", display: "flex", alignItems: "center", gap: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,.04)",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                background: s.bg, border: `1px solid ${s.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, fontWeight: 600 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending alert banner */}
      {pendingCount > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
          border: "1px solid #fde68a", borderRadius: 14,
          padding: "14px 20px", marginBottom: 24,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 24 }}>⏳</span>
          <div>
            <div style={{ fontWeight: 800, color: "#92400e", fontSize: 14 }}>
              {pendingCount} worker{pendingCount > 1 ? "s" : ""} waiting for verification
            </div>
            <div style={{ fontSize: 12, color: "#78350f", marginTop: 2 }}>
              Review their documents and approve or reject to allow them to start working.
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {["all", "pending", "verified", "rejected"].map(f => {
          const cfg = f === "all" ? { label: "All", color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" } : STATUS_CFG[f];
          const isActive = filter === f;
          const count = f === "all" ? stats?.total : f === "pending" ? stats?.pending : f === "verified" ? stats?.verified : stats?.rejected;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "8px 18px", borderRadius: 22, fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
              background: isActive ? (f === "all" ? "linear-gradient(135deg, #4f46e5, #7c3aed)" : f === "pending" ? "linear-gradient(135deg, #d97706, #f59e0b)" : f === "verified" ? "linear-gradient(135deg, #059669, #34d399)" : "linear-gradient(135deg, #dc2626, #ef4444)") : "white",
              color: isActive ? "white" : "#64748b",
              border: isActive ? "none" : "1.5px solid #e2e8f0",
              boxShadow: isActive ? "0 4px 12px rgba(0,0,0,.15)" : "none",
              transition: "all .2s ease",
            }}>
              {f === "all" ? "📋" : STATUS_CFG[f]?.icon} {cfg?.label || f.charAt(0).toUpperCase() + f.slice(1)}
              {count !== undefined && <span style={{ marginLeft: 6, opacity: 0.8 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔄</div>
          <div style={{ color: "var(--muted)", fontWeight: 600 }}>Loading verification requests…</div>
        </div>
      ) : records.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 24px",
          background: "var(--surface)", borderRadius: 20, border: "1px dashed #e2e8f0",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "var(--text)", marginBottom: 8 }}>
            {filter === "pending" ? "No pending requests!" : "No records found"}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 14 }}>
            {filter === "pending" ? "All verification requests have been reviewed." : "Try a different filter."}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 18 }}>
          {records.map(r => (
            <VerifCard
              key={r.id}
              record={r}
              categories={categories}
              onApprove={(rec) => setActionModal({ record: rec, action: "approve" })}
              onReject={(rec)  => setActionModal({ record: rec, action: "reject"  })}
              onPreview={setPreview}
              busy={busy}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {preview && <FilePreviewModal record={preview} onClose={() => setPreview(null)} />}
      {actionModal && (
        <ActionModal
          record={actionModal.record}
          action={actionModal.action}
          onConfirm={handleConfirmAction}
          onClose={() => setActionModal(null)}
        />
      )}
    </div>
  );
}
