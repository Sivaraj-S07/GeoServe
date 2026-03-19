import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../api";

const STEPS = ["Choose Method", "Upload File", "Review & Submit", "Done"];

function StepIndicator({ current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 40 }}>
      {STEPS.map((label, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "initial" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 13,
              background: i < current
                ? "linear-gradient(135deg, #059669, #34d399)"
                : i === current
                  ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                  : "#e2e8f0",
              color: i <= current ? "white" : "#94a3b8",
              transition: "all .3s ease",
              boxShadow: i === current ? "0 4px 14px rgba(79,70,229,.4)" : "none",
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: ".04em",
              color: i === current ? "#4f46e5" : i < current ? "#059669" : "#94a3b8",
              textTransform: "uppercase", whiteSpace: "nowrap",
            }}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              flex: 1, height: 2, margin: "0 4px", marginBottom: 22,
              background: i < current
                ? "linear-gradient(90deg, #059669, #34d399)"
                : "#e2e8f0",
              transition: "background .4s ease",
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

function MethodCard({ icon, title, description, accepted, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "24px 20px",
      background: selected
        ? "linear-gradient(135deg, #eef2ff, #f5f3ff)"
        : "white",
      border: `2px solid ${selected ? "#6366f1" : "#e2e8f0"}`,
      borderRadius: 16, cursor: "pointer", textAlign: "left",
      transition: "all .25s cubic-bezier(.34,1.56,.64,1)",
      boxShadow: selected ? "0 8px 24px rgba(99,102,241,.18)" : "0 2px 8px rgba(0,0,0,.04)",
      transform: selected ? "scale(1.02)" : "scale(1)",
      position: "relative", overflow: "hidden",
    }}>
      {selected && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          width: 22, height: 22, borderRadius: "50%",
          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, color: "white", fontWeight: 800,
        }}>✓</div>
      )}
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: selected ? "#4f46e5" : "#0f172a", marginBottom: 6, letterSpacing: "-.3px" }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, marginBottom: 12 }}>{description}</div>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 6,
      }}>
        {accepted.map(f => (
          <span key={f} style={{
            fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
            background: selected ? "#e0e7ff" : "#f1f5f9",
            color: selected ? "#4f46e5" : "#64748b",
            textTransform: "uppercase", letterSpacing: ".05em",
          }}>{f}</span>
        ))}
      </div>
    </button>
  );
}

function DropZone({ accept, maxSize, icon, hint, onChange, file, clearFile }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onChange(f);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (file) return (
    <div style={{
      border: "2px solid #a7f3d0", borderRadius: 16, padding: "24px",
      background: "linear-gradient(135deg, #ecfdf5, #f0fdf4)",
      display: "flex", alignItems: "center", gap: 16,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 12,
        background: "linear-gradient(135deg, #059669, #34d399)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, flexShrink: 0,
      }}>
        {file.type.startsWith("video") ? "🎬" : file.type === "application/pdf" ? "📄" : "🖼️"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#065f46", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {file.name}
        </div>
        <div style={{ fontSize: 12, color: "#047857" }}>{formatSize(file.size)}</div>
      </div>
      <button onClick={clearFile} style={{
        background: "#fee2e2", border: "none", cursor: "pointer",
        width: 32, height: 32, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, color: "#dc2626", transition: "all .15s",
        flexShrink: 0,
      }}>✕</button>
    </div>
  );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${drag ? "#6366f1" : "#c7d2fe"}`,
        borderRadius: 16, padding: "40px 24px",
        textAlign: "center", cursor: "pointer",
        background: drag ? "#eef2ff" : "#fafbff",
        transition: "all .2s ease",
      }}
    >
      <input
        ref={inputRef} type="file" accept={accept}
        style={{ display: "none" }}
        onChange={e => e.target.files[0] && onChange(e.target.files[0])}
      />
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 6 }}>
        Drop your file here, or <span style={{ color: "#4f46e5" }}>browse</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>{hint}</div>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 16px", borderRadius: 20,
        background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
        color: "white", fontSize: 12, fontWeight: 700,
      }}>
        📂 Choose File
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 12 }}>Max size: {maxSize}</div>
    </div>
  );
}

export default function WorkerVerificationPage({ onToast }) {
  const nav = useNavigate();
  const [step, setStep]         = useState(0);
  const [method, setMethod]     = useState(null); // 'certificate' | 'video'
  const [certFile, setCertFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]         = useState(false);

  // Check if already submitted
  useEffect(() => {
    api.getMyVerification().then(data => {
      if (data.verification_status === "pending") {
        setDone(true); setStep(3);
      } else if (data.verification_status === "verified") {
        nav("/worker");
      }
    }).catch(() => {});
  }, [nav]);

  const selectedFile = method === "certificate" ? certFile : videoFile;

  const canProceedStep1 = !!method;
  const canProceedStep2 = !!selectedFile;

  const handleSubmit = async () => {
    const formData = new FormData();
    if (certFile)  formData.append("certificate", certFile);
    if (videoFile) formData.append("work_video",  videoFile);

    setSubmitting(true);
    try {
      await api.submitVerification(formData);
      onToast("Verification submitted! Admin will review shortly.");
      setDone(true); setStep(3);
    } catch (e) {
      onToast(e.response?.data?.error || "Submission failed. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 40%, #f5f3ff 100%)",
      padding: "48px 24px 80px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Decorative blobs */}
      <div style={{
        position: "fixed", top: -120, right: -120, width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,.08) 0%, transparent 70%)", pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", bottom: -80, left: -80, width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124,58,237,.07) 0%, transparent 70%)", pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: "0 auto 20px",
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, boxShadow: "0 12px 32px rgba(79,70,229,.35)",
          }}>🛡️</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-.6px", color: "var(--text)", marginBottom: 8 }}>
            Worker Verification
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 460, margin: "0 auto" }}>
            To protect our users, all workers must verify their professional credentials before accepting jobs.
          </p>
        </div>

        <StepIndicator current={step} />

        <div style={{
          background: "var(--surface)", borderRadius: 24, padding: "36px 32px",
          boxShadow: "0 20px 60px rgba(15,23,42,.1), 0 4px 16px rgba(15,23,42,.05)",
          border: "1px solid #e8eaf6",
        }}>

          {/* Step 0: Choose Method */}
          {step === 0 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 6, letterSpacing: "-.3px" }}>
                How would you like to verify?
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
                Choose the option that best suits you. You can always resubmit if rejected.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <MethodCard
                  icon="📜"
                  title="Upload Certificate"
                  description="Upload a professional certificate, license, or any document proving your skills and qualifications."
                  accepted={["JPG", "PNG", "PDF", "WEBP"]}
                  selected={method === "certificate"}
                  onClick={() => setMethod("certificate")}
                />
                <MethodCard
                  icon="🎥"
                  title="Upload Work Video"
                  description="Don't have a certificate? Upload a short video (30–120 seconds) showing you performing your trade."
                  accepted={["MP4", "WEBM", "MOV", "AVI"]}
                  selected={method === "video"}
                  onClick={() => setMethod("video")}
                />
              </div>

              <div style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                background: "#fffbeb", border: "1px solid #fde68a",
                borderRadius: 12, padding: "14px 16px", marginTop: 24,
              }}>
                <span style={{ fontSize: 16 }}>💡</span>
                <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
                  <strong>Tip:</strong> Workers with certificates are typically approved within 24 hours. Videos may take up to 48 hours for review. You can use the platform once approved.
                </div>
              </div>

              <button
                onClick={() => setStep(1)}
                disabled={!canProceedStep1}
                style={{
                  width: "100%", padding: "14px", marginTop: 28,
                  background: canProceedStep1
                    ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                    : "#e2e8f0",
                  color: canProceedStep1 ? "white" : "#94a3b8",
                  border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15,
                  cursor: canProceedStep1 ? "pointer" : "not-allowed",
                  transition: "all .2s ease",
                  boxShadow: canProceedStep1 ? "0 6px 20px rgba(79,70,229,.35)" : "none",
                  fontFamily: "inherit",
                }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step 1: Upload File */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 6, letterSpacing: "-.3px" }}>
                {method === "certificate" ? "Upload Your Certificate" : "Upload Your Work Video"}
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
                {method === "certificate"
                  ? "Upload a clear, legible scan or photo of your professional certificate."
                  : "Upload a video (30–120 seconds) clearly showing you performing your trade."}
              </p>

              {method === "certificate" ? (
                <DropZone
                  accept="image/*,.pdf"
                  maxSize="10 MB"
                  icon="📄"
                  hint="Supports JPG, PNG, WEBP, and PDF formats"
                  file={certFile}
                  onChange={setCertFile}
                  clearFile={() => setCertFile(null)}
                />
              ) : (
                <DropZone
                  accept="video/*"
                  maxSize="50 MB"
                  icon="🎬"
                  hint="Supports MP4, WEBM, MOV, and AVI formats"
                  file={videoFile}
                  onChange={setVideoFile}
                  clearFile={() => setVideoFile(null)}
                />
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
                <button onClick={() => setStep(0)} style={{
                  flex: 1, padding: "13px", background: "var(--bg)",
                  border: "1.5px solid var(--border)", borderRadius: 12,
                  fontWeight: 700, fontSize: 14, cursor: "pointer",
                  color: "var(--muted)", fontFamily: "inherit",
                }}>← Back</button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep2}
                  style={{
                    flex: 2, padding: "13px",
                    background: canProceedStep2
                      ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                      : "#e2e8f0",
                    color: canProceedStep2 ? "white" : "#94a3b8",
                    border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15,
                    cursor: canProceedStep2 ? "pointer" : "not-allowed",
                    boxShadow: canProceedStep2 ? "0 6px 20px rgba(79,70,229,.35)" : "none",
                    fontFamily: "inherit", transition: "all .2s ease",
                  }}
                >
                  Review →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 6, letterSpacing: "-.3px" }}>
                Review & Submit
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 28 }}>
                Please confirm your submission details before sending to admin review.
              </p>

              <div style={{
                background: "linear-gradient(135deg, #f8fafc, #eef2ff)",
                border: "1.5px solid #c7d2fe", borderRadius: 16, padding: "20px",
                marginBottom: 20,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", letterSpacing: ".08em", marginBottom: 12, textTransform: "uppercase" }}>
                  Submission Summary
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "var(--muted)" }}>Verification type:</span>
                    <span style={{ fontWeight: 700, color: "var(--text)" }}>
                      {method === "certificate" ? "📜 Certificate" : "🎥 Work Video"}
                    </span>
                  </div>
                  {selectedFile && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "var(--muted)" }}>File name:</span>
                        <span style={{ fontWeight: 600, color: "var(--text)", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
                          {selectedFile.name}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "var(--muted)" }}>File size:</span>
                        <span style={{ fontWeight: 600, color: "var(--text)" }}>
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "var(--muted)" }}>File type:</span>
                        <span style={{ fontWeight: 600, color: "var(--text)" }}>{selectedFile.type}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                background: "#f0fdf4", border: "1px solid #a7f3d0",
                borderRadius: 12, padding: "14px 16px", marginBottom: 24,
              }}>
                <span style={{ fontSize: 16 }}>🔒</span>
                <div style={{ fontSize: 12, color: "#065f46", lineHeight: 1.6 }}>
                  Your documents are stored securely. Only admins can access them for verification purposes.
                  Your personal information will never be shared with third parties.
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setStep(1)} style={{
                  flex: 1, padding: "13px", background: "var(--bg)",
                  border: "1.5px solid var(--border)", borderRadius: 12,
                  fontWeight: 700, fontSize: 14, cursor: "pointer",
                  color: "var(--muted)", fontFamily: "inherit",
                }}>← Back</button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    flex: 2, padding: "13px",
                    background: "linear-gradient(135deg, #059669, #34d399)",
                    color: "white", border: "none", borderRadius: 12,
                    fontWeight: 800, fontSize: 15, cursor: submitting ? "not-allowed" : "pointer",
                    fontFamily: "inherit", transition: "all .2s ease",
                    boxShadow: "0 6px 20px rgba(5,150,105,.35)",
                    opacity: submitting ? 0.7 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  {submitting ? (
                    <><span style={{ display: "inline-block", width: 18, height: 18, border: "2.5px solid rgba(255,255,255,.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> Submitting…</>
                  ) : (
                    <> 🚀 Submit for Review</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Done / Pending */}
          {step === 3 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 72, marginBottom: 20, animation: "bounce 1s ease" }}>🎉</div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: "var(--text)", marginBottom: 10, letterSpacing: "-.4px" }}>
                {done ? "Verification Submitted!" : "Already Submitted!"}
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 400, margin: "0 auto 28px", lineHeight: 1.7 }}>
                Your verification is being reviewed by our admin team. You'll be able to start accepting jobs once approved.
              </p>

              <div style={{
                background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
                border: "1px solid #fde68a", borderRadius: 16, padding: "20px",
                marginBottom: 28, textAlign: "left",
              }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#92400e", marginBottom: 10 }}>⏳ What happens next?</div>
                {["Admin reviews your submitted documents", "Verification takes 24–48 hours", "You'll see your status on the Worker Dashboard", "Once approved, you can go online and accept jobs!"].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6, fontSize: 13, color: "#78350f" }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: "50%", background: "#fbbf24",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 800, flexShrink: 0, color: "white",
                    }}>{i + 1}</span>
                    {s}
                  </div>
                ))}
              </div>

              <button onClick={() => nav("/worker")} style={{
                padding: "13px 32px",
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                color: "white", border: "none", borderRadius: 12,
                fontWeight: 800, fontSize: 15, cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 6px 20px rgba(79,70,229,.35)",
              }}>
                Go to Dashboard →
              </button>
            </div>
          )}

        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>
    </div>
  );
}
