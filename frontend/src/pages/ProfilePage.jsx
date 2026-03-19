import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import Icon from "../components/Icon";

const ROLE_META = {
  admin:  { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", gradient: "linear-gradient(135deg,#7c3aed,#a78bfa)" },
  worker: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", gradient: "linear-gradient(135deg,#2563eb,#60a5fa)" },
  user:   { color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe", gradient: "linear-gradient(135deg,#4f46e5,#818cf8)" },
};

export default function ProfilePage({ onToast }) {
  const { user, updateProfile, logout } = useAuth();
  const nav     = useNavigate();
  const { t } = useTranslation();
  const [tab,   setTab]   = useState("info");
  const [busy,  setBusy]  = useState(false);
  const fileRef = useRef();

  const [name,   setName]   = useState(user?.name   || "");
  const [email,  setEmail]  = useState(user?.email  || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");

  const [curPw,  setCurPw]  = useState("");
  const [newPw,  setNewPw]  = useState("");
  const [confPw, setConfPw] = useState("");
  const [pwErr,  setPwErr]  = useState("");

  if (!user) { nav("/login"); return null; }

  const rm = ROLE_META[user.role] || ROLE_META.user;
  const homeLink = user.role === "admin" ? "/admin" : user.role === "worker" ? "/worker" : "/home";
  const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4f46e5&color=fff&size=120`;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { onToast("Image must be under 2 MB", "error"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSaveInfo = async () => {
    if (!name.trim()) { onToast("Name cannot be empty", "error"); return; }
    setBusy(true);
    try {
      await updateProfile({ name, email, avatar });
      onToast("Profile updated successfully!");
    } catch (e) {
      onToast(e.response?.data?.error || "Failed to update profile", "error");
    } finally { setBusy(false); }
  };

  const handleSavePassword = async () => {
    setPwErr("");
    if (!curPw)           { setPwErr("Enter your current password"); return; }
    if (!newPw)           { setPwErr("Enter a new password"); return; }
    if (newPw !== confPw) { setPwErr("Passwords do not match"); return; }
    if (newPw.length < 6) { setPwErr("Minimum 6 characters required"); return; }
    setBusy(true);
    try {
      await updateProfile({ password: newPw });
      onToast("Password changed successfully!");
      setCurPw(""); setNewPw(""); setConfPw("");
    } catch (e) {
      onToast(e.response?.data?.error || "Failed to change password", "error");
    } finally { setBusy(false); }
  };

  const TABS = [
    { id: "info",     label: t("profilePage.profileInfo"), icon: "user" },
    { id: "password", label: t("profilePage.password"),     icon: "lock" },
  ];

  return (
    <div className="anim-fade" style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
      {/* Back */}
      <button onClick={() => nav(homeLink)} style={{
        background: "none", border: "none", color: "var(--muted)", cursor: "pointer",
        fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
        fontFamily: "inherit", marginBottom: 20, padding: "6px 10px 6px 0",
        borderRadius: 8, transition: "color .15s",
      }}
        onMouseEnter={e => e.currentTarget.style.color = "var(--primary)"}
        onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
      >
        <Icon name="arrow-left" size={14} color="currentColor" /> {t("profilePage.backToDashboard")}
      </button>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 26, marginBottom: 4, letterSpacing: -.5 }}>
          {t("profilePage.myAccount")}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>{t("profilePage.manageProfile")}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" }}>

        {/* Left panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Avatar card */}
          <div className="card" style={{ padding: 24, textAlign: "center", overflow: "hidden" }}>
            {/* Background gradient */}
            <div style={{
              height: 50, margin: "-24px -24px 0",
              background: rm.gradient,
              marginBottom: 8,
            }} />

            <div style={{ position: "relative", display: "inline-block", marginBottom: 12, marginTop: -28 }}>
              <img
                src={avatar || fb}
                onError={e => { e.target.src = fb; }}
                style={{
                  width: 80, height: 80, borderRadius: "50%", objectFit: "cover",
                  border: "4px solid white",
                  boxShadow: "0 4px 16px rgba(15,23,42,.15)",
                  display: "block",
                }}
              />
              <button
                onClick={() => fileRef.current.click()}
                style={{
                  position: "absolute", bottom: 0, right: 0,
                  width: 28, height: 28, borderRadius: "50%",
                  background: rm.gradient, border: "2px solid var(--surface)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.2)",
                  transition: "transform .2s",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                <Icon name="edit" size={12} color="white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*"
                style={{ display: "none" }} onChange={handleFileChange} />
            </div>

            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
              {user.name}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 10 }}>{user.email}</div>
            <span style={{
              background: rm.gradient, color: "white",
              fontSize: 11, fontWeight: 700, padding: "3px 14px",
              borderRadius: 20, fontFamily: "'Outfit',sans-serif",
              textTransform: "uppercase", letterSpacing: .5,
            }}>
              {user.role}
            </span>
            <p style={{ fontSize: 11, color: "var(--muted-light)", marginTop: 12, lineHeight: 1.5 }}>
              {t("profilePage.clickPencilToChange")}
            </p>
          </div>

          {/* Nav */}
          <div className="card" style={{ padding: "10px 8px" }}>
            {TABS.map(t => (
              <button
                key={t.id}
                className={`sidebar-tab${tab === t.id ? " active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <Icon name={t.icon} size={15} color={tab === t.id ? "var(--primary)" : "#6b7280"} />
                {t.label}
              </button>
            ))}
            <div style={{ height: 1, background: "var(--border)", margin: "8px 6px" }} />
            <button
              className="sidebar-tab"
              onClick={() => { logout(); nav("/login"); onToast("Logged out"); }}
              style={{ color: "var(--red)" }}
            >
              <Icon name="logout" size={15} color="var(--red)" /> {t("profilePage.signOut")}
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div className="card" style={{ padding: 32 }}>

          {tab === "info" && (
            <>
              <h2 style={{ fontWeight: 800, fontSize: 18, marginBottom: 4, fontFamily: "'Outfit',sans-serif", letterSpacing: -.3 }}>
                {t("profilePage.profileInformation")}
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 24 }}>
                {t("profilePage.updateProfileDesc")}
              </p>

              <div style={{
                marginBottom: 20, padding: 16,
                background: "var(--primary-bg)", border: "1px solid var(--primary-border)",
                borderRadius: 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <img
                    src={avatar || fb}
                    onError={e => { e.target.src = fb; }}
                    style={{
                      width: 56, height: 56, borderRadius: "50%", objectFit: "cover",
                      border: "2px solid var(--primary-border)", flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, fontFamily: "'Outfit',sans-serif" }}>
                      {t("profilePage.profilePhoto")}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn-outline" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => fileRef.current.click()}>
                        <Icon name="edit" size={12} /> {t("profilePage.uploadPhoto")}
                      </button>
                      {avatar && (
                        <button
                          className="btn-outline"
                          style={{ fontSize: 12, padding: "6px 12px", color: "var(--red)", borderColor: "var(--red-light)" }}
                          onClick={() => setAvatar("")}
                        >
                          {t("profilePage.remove")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label>{t("profilePage.orPasteImageUrl")}</label>
                  <input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="https://example.com/photo.jpg" />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label>{t("profilePage.fullName")} <span style={{ color: "var(--red)" }}>*</span></label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                </div>
                <div>
                  <label>{t("profilePage.emailAddress")}</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="m@example.com" />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8 }}>
                  <button className="btn-primary" onClick={handleSaveInfo} disabled={busy} style={{ padding: "11px 28px" }}>
                    {busy ? <><div className="spinner" /> {t("profilePage.saving")}</> : <><Icon name="check" size={14} color="white" /> {t("profilePage.saveChanges")}</>}
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === "password" && (
            <>
              <h2 style={{ fontWeight: 800, fontSize: 18, marginBottom: 4, fontFamily: "'Outfit',sans-serif", letterSpacing: -.3 }}>
                {t("profilePage.changePassword")}
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 24 }}>
                {t("profilePage.strongPassword")}
              </p>

              {pwErr && (
                <div style={{
                  background: "var(--red-soft)", border: "1px solid var(--red-light)",
                  borderRadius: 10, padding: "11px 14px", marginBottom: 18,
                  color: "var(--red)", fontSize: 13,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <Icon name="alert-circle" size={14} color="var(--red)" /> {pwErr}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label>{t("profilePage.currentPassword")}</label>
                  <input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} placeholder={t("profilePage.enterCurrentPassword")} />
                </div>
                <div>
                  <label>{t("profilePage.newPassword")}</label>
                  <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder={t("profilePage.minSixChars")} />
                </div>
                <div>
                  <label>{t("profilePage.confirmNewPassword")}</label>
                  <input
                    type="password"
                    value={confPw}
                    onChange={e => setConfPw(e.target.value)}
                    placeholder={t("profilePage.repeatNewPassword")}
                    onKeyDown={e => e.key === "Enter" && handleSavePassword()}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8 }}>
                  <button className="btn-primary" onClick={handleSavePassword} disabled={busy} style={{ padding: "11px 28px" }}>
                    {busy ? <><div className="spinner" /> {t("profilePage.updating")}</> : <><Icon name="check" size={14} color="white" /> {t("profilePage.updatePassword")}</>}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
