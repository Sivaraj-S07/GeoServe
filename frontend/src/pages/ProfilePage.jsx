import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import Icon from "../components/Icon";
import ThemeToggle from "../components/ThemeToggle";
import LanguageSwitcher from "../components/LanguageSwitcher";
import * as api from "../api";
import { getLocalizedName } from "../utils/localizedName";

const ROLE_META = {
  admin:  { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", gradient: "linear-gradient(135deg,#7c3aed,#a78bfa)" },
  worker: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", gradient: "linear-gradient(135deg,#2563eb,#60a5fa)" },
  user:   { color: "var(--primary)", bg: "#eef2ff", border: "#c7d2fe", gradient: "linear-gradient(135deg,#1d4ed8,#2563eb,#059669)" },
};

export default function ProfilePage({ onToast }) {
  const { user, updateProfile, logout } = useAuth();
  const nav     = useNavigate();
  const loc     = useLocation();
  const { t, i18n } = useTranslation();
  // Detect #settings hash to auto-open settings tab
  const initialTab = loc.hash === "#settings" ? "settings" : "info";
  const [tab,   setTab]   = useState(initialTab);
  const [busy,  setBusy]  = useState(false);
  const fileRef = useRef();

  // Re-check hash if it changes
  useEffect(() => {
    if (loc.hash === "#settings") setTab("settings");
  }, [loc.hash]);

  const [nameEn, setNameEn] = useState(user?.nameEn || user?.name || "");
  const [email,  setEmail]  = useState(user?.email  || "");
  const [phone,  setPhone]  = useState(user?.phone  || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");

  const [curPw,  setCurPw]  = useState("");
  const [newPw,  setNewPw]  = useState("");
  const [confPw, setConfPw] = useState("");
  const [pwErr,  setPwErr]  = useState("");

  if (!user) { nav("/login"); return null; }

  // Displayed in the sidebar / avatar fallback — uses nameEn with safe fallbacks.
  const displayName = getLocalizedName(user, i18n.language) || user.name || "";

  const rm = ROLE_META[user.role] || ROLE_META.user;
  const homeLink = user.role === "admin" ? "/admin" : user.role === "worker" ? "/worker" : "/home";
  const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563eb&color=fff&size=120`;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { onToast("Image must be under 2 MB", "error"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSaveInfo = async () => {
    if (!nameEn.trim()) { onToast(t("profilePage.fillAllFields"), "error"); return; }
    const phoneDigits = (phone || "").replace(/\D/g, "");
    if (phoneDigits && phoneDigits.length !== 10) { onToast(t("profilePage.mobileNumberInvalid"), "error"); return; }
    setBusy(true);
    try {
      await updateProfile({ nameEn, email, phone: phoneDigits, avatar });
      onToast(t("profilePage.profileUpdated"));
    } catch (e) {
      onToast(e.message || t("common.error"), "error");
    } finally { setBusy(false); }
  };

  const handleSavePassword = async () => {
    setPwErr("");
    if (!curPw)           { setPwErr(t("profilePage.enterCurrentPassword")); return; }
    if (!newPw)           { setPwErr(t("profilePage.newPassword")); return; }
    if (newPw !== confPw) { setPwErr(t("profilePage.passwordMismatch")); return; }
    if (newPw.length < 6) { setPwErr(t("profilePage.minSixChars")); return; }
    setBusy(true);
    try {
      await api.changePassword(curPw, newPw);
      onToast(t("profilePage.passwordUpdated"));
      setCurPw(""); setNewPw(""); setConfPw("");
    } catch (e) {
      onToast(e.message || t("profilePage.failedChangePassword"), "error");
    } finally { setBusy(false); }
  };

  const TABS = [
    { id: "info",     label: t("profilePage.profileInfo"), icon: "user" },
    { id: "password", label: t("profilePage.password"),     icon: "lock" },
    { id: "settings", label: t("adminSidebar.profile"),                    icon: "settings" },
  ];

  return (
    <div className="anim-fade" style={{ maxWidth: 800, margin: "0 auto", padding: "24px 12px" }}>
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
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 26, marginBottom: 4, letterSpacing: -.5 }}>
          {t("profilePage.myAccount")}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>{t("profilePage.manageProfile")}</p>
      </div>

      <div className="profile-layout" style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" }}>

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

            <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
              {displayName}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 10 }}>{user.email}</div>
            <span style={{
              background: rm.gradient, color: "white",
              fontSize: 11, fontWeight: 700, padding: "3px 14px",
              borderRadius: 20, fontFamily: "'Manrope',sans-serif",
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
              onClick={() => { logout(); nav("/login"); onToast(t("nav.loggedOut")); }}
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
              <h2 style={{ fontWeight: 800, fontSize: 18, marginBottom: 4, fontFamily: "'Manrope',sans-serif", letterSpacing: -.3 }}>
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
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, fontFamily: "'Manrope',sans-serif" }}>
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
                  <label>{t("profilePage.name", { defaultValue: "Name" })} <span style={{ color: "var(--red)" }}>*</span></label>
                  <input value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder={t("profilePage.namePlaceholder", { defaultValue: "Your full name" })} />
                </div>
                <div>
                  <label>{t("profilePage.emailAddress")}</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="m@example.com" />
                </div>
                <div>
                  <label>{t("profilePage.mobileNumber")}</label>
                  <input
                    type="tel" inputMode="numeric" maxLength={10}
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder={t("profilePage.mobileNumberPlaceholder")}
                  />
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
              <h2 style={{ fontWeight: 800, fontSize: 18, marginBottom: 4, fontFamily: "'Manrope',sans-serif", letterSpacing: -.3 }}>
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

          {/* ── Settings Tab ── */}
          {tab === "settings" && (
            <>
              <h2 style={{ fontWeight: 800, fontSize: 18, marginBottom: 4, fontFamily: "'Manrope',sans-serif", letterSpacing: -.3 }}>
                App Settings
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 24 }}>
                Customize your appearance and language preferences.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Theme */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "var(--surface-raised)", borderRadius: 14, border: "1.5px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--primary-bg)", border: "1px solid var(--primary-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎨</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", fontFamily: "'Bricolage Grotesque',sans-serif" }}>{t("profilePage.darkMode")}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{t("profilePage.darkModeDesc")}</div>
                    </div>
                  </div>
                  <ThemeToggle />
                </div>

                {/* Language */}
                {(user.role === "user" || user.role === "worker") && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "var(--surface-raised)", borderRadius: 14, border: "1.5px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--primary-bg)", border: "1px solid var(--primary-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🌐</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", fontFamily: "'Bricolage Grotesque',sans-serif" }}>{t("profilePage.language")}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{t("profilePage.languageDesc")}</div>
                      </div>
                    </div>
                    <LanguageSwitcher />
                  </div>
                )}

                {/* Divider */}
                <div style={{ height: 1, background: "var(--border)" }} />

                {/* Account actions */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10, fontFamily: "'Manrope',sans-serif" }}>{t("profilePage.accountActions")}</div>
                  <button
                    onClick={() => setTab("password")}
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 18px", background: "var(--surface-raised)", borderRadius: 12, border: "1.5px solid var(--border)", cursor: "pointer", fontFamily: "inherit", transition: "all .15s", marginBottom: 10 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary-border)"; e.currentTarget.style.background = "var(--primary-bg)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface-raised)"; }}
                  >
                    <Icon name="lock" size={16} color="var(--primary)" />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", fontFamily: "'Bricolage Grotesque',sans-serif" }}>{t("profilePage.changePassword")}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{t("profilePage.changePasswordDesc")}</div>
                    </div>
                    <Icon name="chevron-right" size={14} color="var(--muted-light)" style={{ marginLeft: "auto" }} />
                  </button>
                  <button
                    onClick={() => { logout(); nav("/login"); }}
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 18px", background: "var(--red-soft)", borderRadius: 12, border: "1.5px solid var(--red-border)", cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                  >
                    <Icon name="log-out" size={16} color="var(--red)" />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--red)", fontFamily: "'Bricolage Grotesque',sans-serif" }}>{t("profilePage.signOut")}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{t("profilePage.signOutDesc")}</div>
                    </div>
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
