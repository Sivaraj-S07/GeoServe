import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AuthContext";
import * as api from "../api";

// ─── tiny icon components ────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = "currentColor" }) => {
  const icons = {
    user: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    lock: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
    shield: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    edit: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    ),
    camera: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
      </svg>
    ),
    alert: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    eye: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    eyeOff: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    ),
    arrowLeft: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
      </svg>
    ),
    trash: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>
    ),
  };
  return icons[name] || null;
};

// ─── password strength ──────────────────────────────────────────────────────
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: "Too short",  color: "#ef4444" },
    { label: "Weak",       color: "#f97316" },
    { label: "Fair",       color: "#eab308" },
    { label: "Good",       color: "#22c55e" },
    { label: "Strong",     color: "#16a34a" },
    { label: "Very Strong",color: "#15803d" },
  ];
  return { score, ...levels[Math.min(score, levels.length - 1)] };
}

// ─── PasswordInput ──────────────────────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder, onKeyDown }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        style={{ paddingRight: 44, width: "100%", boxSizing: "border-box" }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer",
          color: "var(--muted)", padding: 4, display: "flex", alignItems: "center",
        }}
        tabIndex={-1}
      >
        <Icon name={show ? "eyeOff" : "eye"} size={16} color="currentColor" />
      </button>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function ProfilePage({ onToast }) {
  const { admin, updateProfile, logout } = useAdmin();
  const nav     = useNavigate();
  const fileRef = useRef();
  const [tab,  setTab]  = useState("info");
  const [busy, setBusy] = useState(false);

  // Profile info state
  const [name,   setName]   = useState(admin?.name   || "");
  const [email,  setEmail]  = useState(admin?.email  || "");
  const [avatar, setAvatar] = useState(admin?.avatar || "");

  // Password state
  const [curPw,  setCurPw]  = useState("");
  const [newPw,  setNewPw]  = useState("");
  const [confPw, setConfPw] = useState("");
  const [pwErr,  setPwErr]  = useState("");

  if (!admin) { nav("/login"); return null; }

  const initials = admin.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "A";
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.name)}&background=4f46e5&color=fff&size=160&bold=true`;

  // ── file pick ────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { onToast?.("Image must be under 2 MB", "error"); return; }
    const reader = new FileReader();
    reader.onload = ev => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── save profile info ────────────────────────────────────────────────────
  const handleSaveInfo = async () => {
    if (!name.trim()) { onToast?.("Name cannot be empty", "error"); return; }
    setBusy(true);
    try {
      await updateProfile({ name: name.trim(), email: email.trim(), avatar });
      onToast?.("Profile updated successfully!", "success");
    } catch (e) {
      onToast?.(e?.response?.data?.error || e?.message || "Failed to update profile", "error");
    } finally { setBusy(false); }
  };

  // ── change password ──────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwErr("");
    if (!curPw)           { setPwErr("Enter your current password"); return; }
    if (!newPw)           { setPwErr("Enter a new password"); return; }
    if (newPw.length < 6) { setPwErr("New password must be at least 6 characters"); return; }
    if (newPw !== confPw) { setPwErr("Passwords do not match"); return; }
    setBusy(true);
    try {
      await api.changeAdminPassword(curPw, newPw);
      onToast?.("Password changed successfully!", "success");
      setCurPw(""); setNewPw(""); setConfPw("");
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Failed to change password";
      setPwErr(msg);
    } finally { setBusy(false); }
  };

  const pwStrength = getPasswordStrength(newPw);

  // ── styles ───────────────────────────────────────────────────────────────
  const TABS = [
    { id: "info",     label: "Profile Info",    icon: "user"   },
    { id: "password", label: "Change Password", icon: "lock"   },
    { id: "security", label: "Security",        icon: "shield" },
  ];

  const sectionTitle = { fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 4, letterSpacing: -0.3, color: "var(--text)" };
  const sectionDesc  = { color: "var(--muted)", fontSize: 13, marginBottom: 24 };

  return (
    <div className="anim-fade" style={{ maxWidth: 880, margin: "0 auto", padding: "28px 24px 48px" }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <button
          onClick={() => nav("/")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "var(--surface-raised)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "7px 14px", cursor: "pointer",
            fontSize: 13, fontWeight: 600, color: "var(--muted)",
            fontFamily: "inherit", transition: "all .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--surface-raised)"; e.currentTarget.style.color = "var(--muted)"; }}
        >
          <Icon name="arrowLeft" size={14} color="currentColor" /> Dashboard
        </button>
        <div>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 24, margin: 0, letterSpacing: -0.5, color: "var(--text)" }}>
            My Account
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Manage your admin profile &amp; security settings</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 20, alignItems: "start" }}>

        {/* ── Left: Avatar card + tab nav ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Avatar card */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Banner gradient */}
            <div style={{ height: 56, background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a78bfa 100%)" }} />

            <div style={{ padding: "0 20px 20px", textAlign: "center" }}>
              {/* Avatar */}
              <div style={{ position: "relative", display: "inline-block", marginTop: -36, marginBottom: 10 }}>
                <img
                  src={avatar || fallbackAvatar}
                  onError={e => { e.target.src = fallbackAvatar; }}
                  style={{
                    width: 72, height: 72, borderRadius: "50%", objectFit: "cover",
                    border: "4px solid var(--surface)", boxShadow: "var(--shadow-md)",
                    display: "block",
                  }}
                  alt={admin.name}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  title="Change photo"
                  style={{
                    position: "absolute", bottom: 0, right: 0,
                    width: 26, height: 26, borderRadius: "50%",
                    background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                    border: "2px solid var(--surface)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.2)",
                    transition: "transform .15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  <Icon name="camera" size={11} color="white" />
                </button>
                <input ref={fileRef} type="file" accept="image/*"
                  style={{ display: "none" }} onChange={handleFileChange} />
              </div>

              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 2, color: "var(--text)" }}>
                {admin.name}
              </div>
              <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 10, wordBreak: "break-word" }}>
                {admin.email}
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                color: "white", fontSize: 11, fontWeight: 700,
                padding: "3px 14px", borderRadius: 20,
                fontFamily: "'Outfit',sans-serif", textTransform: "uppercase", letterSpacing: 0.5,
              }}>
                <Icon name="shield" size={10} color="white" /> Administrator
              </span>
              <p style={{ fontSize: 11, color: "var(--muted-light)", marginTop: 10, lineHeight: 1.5 }}>
                Click the camera icon to change your profile photo
              </p>
            </div>
          </div>

          {/* Tab nav card */}
          <div className="card" style={{ padding: "10px 8px" }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setPwErr(""); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                  transition: "all .15s", textAlign: "left",
                  background: tab === t.id ? "var(--primary-bg)" : "transparent",
                  color: tab === t.id ? "var(--primary)" : "var(--text-secondary)",
                  marginBottom: 2,
                }}
                onMouseEnter={e => { if (tab !== t.id) e.currentTarget.style.background = "var(--surface-hover)"; }}
                onMouseLeave={e => { if (tab !== t.id) e.currentTarget.style.background = "transparent"; }}
              >
                <Icon name={t.icon} size={15} color={tab === t.id ? "var(--primary)" : "#6b7280"} />
                {t.label}
              </button>
            ))}

            <div style={{ height: 1, background: "var(--border)", margin: "8px 6px" }} />

            <button
              onClick={() => { logout(); nav("/login"); onToast?.("Signed out"); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                background: "transparent", color: "var(--red)",
                transition: "all .15s", textAlign: "left",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--red-soft, #fff1f2)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <Icon name="arrowLeft" size={15} color="var(--red)" />
              Sign Out
            </button>
          </div>
        </div>

        {/* ── Right: Tab content ── */}
        <div className="card" style={{ padding: 32, minHeight: 400 }}>

          {/* ────────── Profile Info tab ────────── */}
          {tab === "info" && (
            <>
              <h2 style={sectionTitle}>Profile Information</h2>
              <p style={sectionDesc}>Update your administrator display name, email address, and avatar.</p>

              {/* Avatar quick-change */}
              <div style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: 16, marginBottom: 24,
                background: "var(--primary-bg)", border: "1px solid var(--primary-border)",
                borderRadius: 12,
              }}>
                <img
                  src={avatar || fallbackAvatar}
                  onError={e => { e.target.src = fallbackAvatar; }}
                  style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--primary-border)", flexShrink: 0 }}
                  alt={admin.name}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)", fontFamily: "'Outfit',sans-serif" }}>
                    Profile Photo
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="btn-outline"
                      style={{ fontSize: 12, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}
                      onClick={() => fileRef.current?.click()}
                    >
                      <Icon name="camera" size={13} color="currentColor" /> Upload Photo
                    </button>
                    {avatar && (
                      <button
                        className="btn-outline"
                        style={{ fontSize: 12, padding: "6px 14px", color: "var(--red)", borderColor: "var(--red-light, #fca5a5)", display: "flex", alignItems: "center", gap: 6 }}
                        onClick={() => setAvatar("")}
                      >
                        <Icon name="trash" size={13} color="currentColor" /> Remove
                      </button>
                    )}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Or paste an image URL</label>
                    <input
                      value={avatar}
                      onChange={e => setAvatar(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      style={{ fontSize: 13 }}
                    />
                  </div>
                </div>
              </div>

              {/* Fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="user" size={13} color="var(--muted)" />
                    Full Name <span style={{ color: "var(--red)" }}>*</span>
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    maxLength={80}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>✉️</span> Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                  />
                  <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 5 }}>
                    Changing your email will update your login credentials.
                  </p>
                </div>

                {/* Read-only role row */}
                <div>
                  <label style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="shield" size={13} color="var(--muted)" /> Account Role
                  </label>
                  <div style={{
                    padding: "10px 14px", background: "var(--surface-raised)",
                    border: "1px solid var(--border)", borderRadius: 10,
                    fontSize: 14, color: "var(--text-secondary)",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{ fontWeight: 700, color: "var(--primary)", fontSize: 13 }}>Administrator</span>
                    <span style={{ fontSize: 11, color: "var(--muted)", background: "var(--primary-bg)", padding: "2px 8px", borderRadius: 20 }}>
                      Cannot be changed
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8 }}>
                  <button
                    className="btn-primary"
                    onClick={handleSaveInfo}
                    disabled={busy}
                    style={{ padding: "11px 28px", display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {busy
                      ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving…</>
                      : <><Icon name="check" size={14} color="white" /> Save Changes</>
                    }
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ────────── Change Password tab ────────── */}
          {tab === "password" && (
            <>
              <h2 style={sectionTitle}>Change Password</h2>
              <p style={sectionDesc}>Use a strong password that you don't use on other sites.</p>

              {/* Error banner */}
              {pwErr && (
                <div style={{
                  background: "var(--red-soft, #fff1f2)", border: "1px solid var(--red-light, #fca5a5)",
                  borderRadius: 10, padding: "11px 14px", marginBottom: 20,
                  color: "var(--red)", fontSize: 13,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <Icon name="alert" size={14} color="var(--red)" /> {pwErr}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label style={{ fontWeight: 600 }}>Current Password <span style={{ color: "var(--red)" }}>*</span></label>
                  <PasswordInput
                    value={curPw}
                    onChange={e => { setCurPw(e.target.value); setPwErr(""); }}
                    placeholder="Enter your current password"
                  />
                </div>

                <div style={{ height: 1, background: "var(--border)" }} />

                <div>
                  <label style={{ fontWeight: 600 }}>New Password <span style={{ color: "var(--red)" }}>*</span></label>
                  <PasswordInput
                    value={newPw}
                    onChange={e => { setNewPw(e.target.value); setPwErr(""); }}
                    placeholder="Min. 6 characters"
                  />
                  {/* Strength bar */}
                  {newPw && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                        {[1,2,3,4,5].map(i => (
                          <div key={i} style={{
                            flex: 1, height: 4, borderRadius: 4,
                            background: i <= pwStrength.score ? pwStrength.color : "var(--border)",
                            transition: "background .2s",
                          }} />
                        ))}
                      </div>
                      <p style={{ fontSize: 12, color: pwStrength.color, margin: 0, fontWeight: 600 }}>
                        {pwStrength.label}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontWeight: 600 }}>Confirm New Password <span style={{ color: "var(--red)" }}>*</span></label>
                  <PasswordInput
                    value={confPw}
                    onChange={e => { setConfPw(e.target.value); setPwErr(""); }}
                    placeholder="Repeat your new password"
                    onKeyDown={e => e.key === "Enter" && handleChangePassword()}
                  />
                  {confPw && newPw && (
                    <p style={{ fontSize: 12, marginTop: 5, color: confPw === newPw ? "#22c55e" : "var(--red)", fontWeight: 600 }}>
                      {confPw === newPw ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </p>
                  )}
                </div>

                {/* Password rules */}
                <div style={{
                  padding: 14, background: "var(--surface-raised)",
                  border: "1px solid var(--border)", borderRadius: 10, fontSize: 12,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--text-secondary)" }}>Password requirements</div>
                  {[
                    ["At least 6 characters",                   newPw.length >= 6],
                    ["At least 10 characters (recommended)",    newPw.length >= 10],
                    ["Contains uppercase letter",               /[A-Z]/.test(newPw)],
                    ["Contains a number",                       /[0-9]/.test(newPw)],
                    ["Contains special character",              /[^A-Za-z0-9]/.test(newPw)],
                  ].map(([label, met]) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, color: newPw ? (met ? "#16a34a" : "var(--muted)") : "var(--muted)" }}>
                      <span style={{ fontSize: 14 }}>{newPw ? (met ? "✓" : "○") : "○"}</span> {label}
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
                  <button
                    className="btn-primary"
                    onClick={handleChangePassword}
                    disabled={busy}
                    style={{ padding: "11px 28px", display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {busy
                      ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Updating…</>
                      : <><Icon name="lock" size={14} color="white" /> Update Password</>
                    }
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ────────── Security tab ────────── */}
          {tab === "security" && (
            <>
              <h2 style={sectionTitle}>Security Overview</h2>
              <p style={sectionDesc}>Review your account security and session information.</p>

              {/* Security status cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  {
                    icon: "🔐",
                    label: "Password Authentication",
                    value: "Active",
                    desc: "Your account is protected by a password.",
                    status: "green",
                  },
                  {
                    icon: "🛡️",
                    label: "Admin Role",
                    value: "Administrator",
                    desc: "Full system access. All actions are logged.",
                    status: "blue",
                  },
                  {
                    icon: "⏰",
                    label: "Session Duration",
                    value: "7 days",
                    desc: "Your login token expires after 7 days of inactivity.",
                    status: "yellow",
                  },
                  {
                    icon: "🔒",
                    label: "Password Encryption",
                    value: "Enabled",
                    desc: "Admin signup is blocked — accounts can only be created by a system administrator.",
                    status: "green",
                  },
                ].map(item => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "14px 18px",
                      background: "var(--surface-raised)", border: "1px solid var(--border)",
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.desc}</div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 20,
                      background: item.status === "green" ? "#dcfce7" : item.status === "blue" ? "var(--primary-bg)" : "#fef9c3",
                      color:      item.status === "green" ? "#16a34a" : item.status === "blue" ? "var(--primary)"    : "#a16207",
                      flexShrink: 0,
                    }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Account Info */}
              <div style={{
                marginTop: 24, padding: 18,
                background: "var(--primary-bg)", border: "1px solid var(--primary-border)",
                borderRadius: 12,
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: "var(--primary)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="user" size={14} color="var(--primary)" /> Account Details
                </div>
                {[
                  ["Name",  admin.name  || "—"],
                  ["Email", admin.email || "—"],
                  ["Role",  "Administrator"],
                  ["User ID", String(admin.id || "—")],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--primary-border)" }}>
                    <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>{k}</span>
                    <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 18, lineHeight: 1.6 }}>
                💡 <strong>Tip:</strong> Regularly changing your password and using a unique, strong password keeps the GeoServe platform secure.
                If you suspect unauthorized access, change your password immediately.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
