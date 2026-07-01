import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as api from "../api";

function StepIndicator({ current, steps }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 40 }}>
      {steps.map((label, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "initial" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, background: i < current ? "linear-gradient(135deg, var(--primary), #34d399)" : i === current ? "var(--gradient-primary)" : "#e2e8f0", color: i <= current ? "white" : "#94a3b8", transition: "all .3s ease", boxShadow: i === current ? "0 4px 14px rgba(37,99,235,.4)" : "none" }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".04em", color: i === current ? "#2563eb" : i < current ? "var(--primary)" : "#94a3b8", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, margin: "0 4px", marginBottom: 22, background: i < current ? "linear-gradient(90deg, var(--primary), #34d399)" : "#e2e8f0", transition: "background .4s ease" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function MethodCard({ icon, title, description, accepted, selected, onClick }) {
  return (
    <button onClick={onClick} style={{ width: "100%", padding: "24px 20px", background: selected ? "linear-gradient(135deg, #eef2ff, #f5f3ff)" : "white", border: `2px solid ${selected ? "#6366f1" : "#e2e8f0"}`, borderRadius: 16, cursor: "pointer", textAlign: "left", transition: "all .25s cubic-bezier(.34,1.56,.64,1)", boxShadow: selected ? "0 8px 24px rgba(99,102,241,.18)" : "0 2px 8px rgba(0,0,0,.04)", transform: selected ? "scale(1.02)" : "scale(1)", position: "relative", overflow: "hidden" }}>
      {selected && (<div style={{ position: "absolute", top: 12, right: 12, width: 22, height: 22, borderRadius: "50%", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "white", fontWeight: 800 }}>✓</div>)}
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: selected ? "#2563eb" : "#0d1b3e", marginBottom: 6, letterSpacing: "-.3px" }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, marginBottom: 12 }}>{description}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {accepted.map(f => (<span key={f} style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: selected ? "#e0e7ff" : "#f1f5f9", color: selected ? "#2563eb" : "#64748b", textTransform: "uppercase", letterSpacing: ".05em" }}>{f}</span>))}
      </div>
    </button>
  );
}

function DropZone({ accept, maxSize, icon, hint, onChange, file, clearFile, dropLabel, browseLabel, chooseLabel }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const handleDrop = (e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onChange(f); };
  const formatSize = (bytes) => { if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; };

  if (file) return (
    <div style={{ border: "2px solid var(--primary-border)", borderRadius: 16, padding: "24px", background: "linear-gradient(135deg, var(--primary-bg), #f0fdf4)", display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 52, height: 52, borderRadius: 12, background: "linear-gradient(135deg, var(--primary), #34d399)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
        {file.type.startsWith("video") ? "🎬" : file.type === "application/pdf" ? "📄" : "🖼️"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--primary-dark)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
        <div style={{ fontSize: 12, color: "#047857" }}>{formatSize(file.size)}</div>
      </div>
      <button onClick={clearFile} style={{ background: "#fee2e2", border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#dc2626", flexShrink: 0 }}>✕</button>
    </div>
  );

  return (
    <div onClick={() => inputRef.current?.click()} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={handleDrop}
      style={{ border: `2px dashed ${drag ? "#6366f1" : "#c7d2fe"}`, borderRadius: 16, padding: "40px 24px", textAlign: "center", cursor: "pointer", background: drag ? "#eef2ff" : "#fafbff", transition: "all .2s ease" }}>
      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }} onChange={e => e.target.files[0] && onChange(e.target.files[0])} />
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 6 }}>
        {dropLabel} <span style={{ color: "#2563eb" }}>{browseLabel}</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>{hint}</div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 20, background: "var(--gradient-primary)", color: "white", fontSize: 12, fontWeight: 700 }}>
        📂 {chooseLabel}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 12 }}>{maxSize}</div>
    </div>
  );
}

export default function WorkerVerificationPage({ onToast }) {
  const nav = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [method, setMethod] = useState(null);
  const [certFile, setCertFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const STEPS = [t("verification.step1"), t("verification.step2"), t("verification.step3"), t("verification.step4")];

  useEffect(() => {
    api.getMyVerification().then(data => {
      if (data.verification_status === "pending") { setDone(true); setStep(3); }
      else if (data.verification_status === "verified") { nav("/worker", { replace: true }); }
    }).catch(() => {});
  }, [nav]);

  const selectedFile = method === "certificate" ? certFile : videoFile;
  const canProceedStep1 = !!method;
  const canProceedStep2 = !!selectedFile;

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setSubmitting(true);
    const formData = new FormData();
    formData.append("method", method);
    if (certFile) formData.append("certificate", certFile);
    if (videoFile) formData.append("work_video", videoFile);
    try {
      await api.submitVerification(formData);
      onToast(t("verification.submittedSuccess"));
      setDone(true); setStep(3);
    } catch (e) {
      onToast(e.message || t("verification.submissionFailed"), "error");
    } finally { setSubmitting(false); }
  };

  const btnBase = { border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit", transition: "all .2s ease" };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 40%, #f5f3ff 100%)", padding: "48px 24px 80px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", top: -120, right: -120, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,.07) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, margin: "0 auto 20px", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, boxShadow: "0 12px 32px rgba(37,99,235,.35)" }}>🛡️</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-.6px", color: "var(--text)", marginBottom: 8 }}>{t("verification.title")}</h1>
          <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 460, margin: "0 auto" }}>{t("verification.subtitle")}</p>
        </div>

        <StepIndicator current={step} steps={STEPS} />

        <div style={{ background: "var(--surface)", borderRadius: 24, padding: "36px 32px", boxShadow: "0 20px 60px rgba(15,23,42,.1), 0 4px 16px rgba(15,23,42,.05)", border: "1px solid #e8eaf6" }}>

          {/* Step 0: Choose Method */}
          {step === 0 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 6, letterSpacing: "-.3px" }}>{t("verification.chooseMethod")}</h2>
              <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>{t("verification.chooseMethodDesc")}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <MethodCard icon="📜" title={t("verification.certTitle")} description={t("verification.certDesc")} accepted={["JPG","PNG","PDF","WEBP"]} selected={method === "certificate"} onClick={() => setMethod("certificate")} />
                <MethodCard icon="🎥" title={t("verification.videoTitle")} description={t("verification.videoDesc")} accepted={["MP4","WEBM","MOV","AVI"]} selected={method === "video"} onClick={() => setMethod("video")} />
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "14px 16px", marginTop: 24 }}>
                <span style={{ fontSize: 16 }}>💡</span>
                <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
                  <strong>{t("verification.tip")}</strong> {t("verification.tipText")}
                </div>
              </div>
              <button onClick={() => setStep(1)} disabled={!canProceedStep1}
                style={{ ...btnBase, width: "100%", padding: "14px", marginTop: 28, background: canProceedStep1 ? "var(--gradient-primary)" : "#e2e8f0", color: canProceedStep1 ? "white" : "#94a3b8", cursor: canProceedStep1 ? "pointer" : "not-allowed", boxShadow: canProceedStep1 ? "0 6px 20px rgba(37,99,235,.35)" : "none" }}>
                {t("verification.next")} →
              </button>
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 6, letterSpacing: "-.3px" }}>
                {method === "certificate" ? t("verification.uploadCert") : t("verification.uploadVideo")}
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
                {method === "certificate" ? t("verification.uploadCertHint") : t("verification.uploadVideoHint")}
              </p>
              {method === "certificate" ? (
                <DropZone accept="image/*,.pdf" maxSize={t("verification.maxSizeLabel", { size: "10 MB" })} icon="📄" hint={t("verification.certFormats")} file={certFile} onChange={setCertFile} clearFile={() => setCertFile(null)} dropLabel={t("verification.dropFileHere")} browseLabel={t("verification.orClickBrowse")} chooseLabel="Choose File" />
              ) : (
                <DropZone accept="video/*" maxSize={t("verification.maxSizeLabel", { size: "50 MB" })} icon="🎬" hint={t("verification.videoFormats")} file={videoFile} onChange={setVideoFile} clearFile={() => setVideoFile(null)} dropLabel={t("verification.dropFileHere")} browseLabel={t("verification.orClickBrowse")} chooseLabel="Choose File" />
              )}
              <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
                <button onClick={() => setStep(0)} style={{ ...btnBase, flex: 1, padding: "13px", background: "var(--bg)", border: "1.5px solid var(--border)", color: "var(--muted)", fontWeight: 700, fontSize: 14 }}>← {t("verification.back")}</button>
                <button onClick={() => setStep(2)} disabled={!canProceedStep2}
                  style={{ ...btnBase, flex: 2, padding: "13px", background: canProceedStep2 ? "var(--gradient-primary)" : "#e2e8f0", color: canProceedStep2 ? "white" : "#94a3b8", cursor: canProceedStep2 ? "pointer" : "not-allowed", boxShadow: canProceedStep2 ? "0 6px 20px rgba(37,99,235,.35)" : "none" }}>
                  {t("verification.next")} →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 6, letterSpacing: "-.3px" }}>{t("verification.reviewTitle")}</h2>
              <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 28 }}>{t("verification.reviewDesc")}</p>
              <div style={{ background: "linear-gradient(135deg, #f8fafc, #eef2ff)", border: "1.5px solid #c7d2fe", borderRadius: 16, padding: "20px", marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", letterSpacing: ".08em", marginBottom: 12, textTransform: "uppercase" }}>{t("verification.reviewTitle")}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "var(--muted)" }}>{t("verification.verificationMethod")}:</span>
                    <span style={{ fontWeight: 700, color: "var(--text)" }}>{method === "certificate" ? `📜 ${t("verification.certificate")}` : `🎥 ${t("verification.workVideo")}`}</span>
                  </div>
                  {selectedFile && (<>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)" }}>{t("verification.selectedFile")}:</span>
                      <span style={{ fontWeight: 600, color: "var(--text)", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{selectedFile.name}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)" }}>{t("verification.size")}</span>
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  </>)}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#f0fdf4", border: "1px solid var(--primary-border)", borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
                <span style={{ fontSize: 16 }}>🔒</span>
                <div style={{ fontSize: 12, color: "var(--primary-dark)", lineHeight: 1.6 }}>{t("verification.docsSecureNotice")}</div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setStep(1)} style={{ ...btnBase, flex: 1, padding: "13px", background: "var(--bg)", border: "1.5px solid var(--border)", color: "var(--muted)", fontWeight: 700, fontSize: 14 }}>← {t("verification.back")}</button>
                <button onClick={handleSubmit} disabled={submitting}
                  style={{ ...btnBase, flex: 2, padding: "13px", background: "linear-gradient(135deg, var(--primary), #34d399)", color: "white", cursor: submitting ? "not-allowed" : "pointer", boxShadow: "0 6px 20px rgba(37,99,235,.35)", opacity: submitting ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {submitting ? (<><span style={{ display: "inline-block", width: 18, height: 18, border: "2.5px solid rgba(255,255,255,.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> {t("verification.submitting")}</>) : (<>🚀 {t("verification.submitVerification")}</>)}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: "var(--text)", marginBottom: 10, letterSpacing: "-.4px" }}>
                {done ? t("verification.submittedTitle") : t("verification.alreadySubmitted")}
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 400, margin: "0 auto 28px", lineHeight: 1.7 }}>{t("verification.submittedDesc")}</p>
              <div style={{ background: "linear-gradient(135deg, #fffbeb, #fef3c7)", border: "1px solid #fde68a", borderRadius: 16, padding: "20px", marginBottom: 28, textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#92400e", marginBottom: 10 }}>⏳ {t("verification.whatHappensNext")}</div>
                {t("verification.nextSteps", { returnObjects: true }).map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6, fontSize: 13, color: "#78350f" }}>
                    <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0, color: "white" }}>{i + 1}</span>
                    {s}
                  </div>
                ))}
              </div>
              <button onClick={() => nav("/worker", { replace: true })} style={{ ...btnBase, padding: "13px 32px", background: "var(--gradient-primary)", color: "white", boxShadow: "0 6px 20px rgba(37,99,235,.35)" }}>
                {t("verification.goToDashboard")} →
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
