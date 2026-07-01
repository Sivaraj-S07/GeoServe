import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import * as api from "../api";
import Icon, { CategoryLabel } from "../components/Icon";
import PincodeSelector from "../components/PincodeSelector";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ThemeToggle from "../components/ThemeToggle";
import { getLocalizedName } from "../utils/localizedName";

const LOGIN_REDIRECTS = { worker: "/worker", user: "/home" };
const VERIFY_STATUSES = ["unverified", "rejected", undefined, null, ""];

// ── Reusable menu-item for the three-dot dropdown ────────────────────────────
function DotMenuItem({ icon, iconGrad, iconColor, hoverBg, label, sub, onClick, danger, badge }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 11, width: "100%",
        padding: "9px 12px 9px 10px", borderRadius: 11, border: "none",
        background: hov ? hoverBg : "transparent", cursor: "pointer",
        fontFamily: "inherit", textAlign: "left", transition: "background .12s",
        position: "relative",
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: iconGrad, display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0,
        boxShadow: "0 2px 8px rgba(0,0,0,.14)",
      }}>
        <Icon name={icon} size={15} color={iconColor || "#fff"} strokeWidth={2.1} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, letterSpacing: -.2, whiteSpace: "nowrap",
          color: danger ? "#ef4444" : "var(--text)",
          fontFamily: "'Bricolage Grotesque',sans-serif",
        }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1, whiteSpace: "nowrap" }}>{sub}</div>
      </div>
      {badge && (
        <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 10 }}>
          {badge}
        </span>
      )}
    </button>
  );
}

export default function LoginPage({ onToast }) {
  const { login, signup, user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const { t, i18n } = useTranslation();

  const LOGIN_ROLES = [
    {
      id: "user", label: t("login.userRole"), subtitle: t("login.userSubtitle"),
      icon: "user",
      gradient: "linear-gradient(135deg,#1d4ed8,#2563eb)",
      lightColor: "#eff6ff", borderColor: "#bfdbfe", color: "#2563eb",
      glowColor: "rgba(37,99,235,.28)",
    },
    {
      id: "worker", label: t("login.workerRole"), subtitle: t("login.workerSubtitle"),
      icon: "briefcase",
      gradient: "linear-gradient(135deg,#047857,#059669)",
      lightColor: "#ecfdf5", borderColor: "#a7f3d0", color: "#059669",
      glowColor: "rgba(5,150,105,.28)",
    },
  ];

  const SIGNUP_ROLES = [
    {
      id: "user", label: t("login.userAccount"), subtitle: t("login.userAccountSub"),
      icon: "user", color: "var(--primary)", lightColor: "var(--primary-bg)",
      borderColor: "var(--primary-border)",
      gradient: "linear-gradient(135deg,#2563eb,#3b82f6,#059669)",
    },
    {
      id: "worker", label: t("login.workerAccount"), subtitle: t("login.workerAccountSub"),
      icon: "briefcase", color: "var(--blue-dark)", lightColor: "var(--blue-bg)",
      borderColor: "var(--blue-border)",
      gradient: "linear-gradient(135deg,#2563eb,#3b82f6)",
    },
  ];

  const [tab, setTab] = useState(loc.pathname === "/signup" ? "signup" : "signin");
  const [animDir, setAnimDir] = useState(null);
  const [dotMenuOpen, setDotMenuOpen] = useState(false);
  const dotMenuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dotMenuRef.current && !dotMenuRef.current.contains(e.target)) {
        setDotMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [siStep, setSiStep] = useState(1);
  const [siRole, setSiRole] = useState(null);
  const [siEmail, setSiEmail] = useState("");
  const [siPass, setSiPass] = useState("");
  const [siShowPass, setSiShowPass] = useState(false);
  const [siErr, setSiErr] = useState("");
  const [siBusy, setSiBusy] = useState(false);

  const [suStep, setSuStep] = useState(1);
  const [suRole, setSuRole] = useState(null);
  const [categories, setCategories] = useState([]);
  const [suShowPass, setSuShowPass] = useState(false);
  const [suF, setSuF] = useState({ nameEn:"", email:"", password:"", phone:"", categoryId:"", customCategory:"", bio:"", lat:"", lng:"", pincode:"", street:"", aadhaar:"" });
  const [suErr, setSuErr] = useState("");
  const [suBusy, setSuBusy] = useState(false);
  const [aadhaarErr, setAadhaarErr] = useState("");

  useEffect(() => { api.getCategories().then(setCategories).catch(() => {}); }, []);
  useEffect(() => {
    const refresh = () => { api.getCategories().then(setCategories).catch(() => {}); };
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    const target = tab === "signup" ? "/signup" : "/login";
    if (loc.pathname !== target) nav(target, { replace: true });
  }, [tab]);

  const switchTab = (next) => {
    if (next === tab) return;
    setAnimDir(next === "signup" ? "left" : "right");
    setTab(next);
  };

  const siRc = LOGIN_ROLES.find(r => r.id === siRole);
  const siSelectRole = (r) => { setSiRole(r.id); setSiEmail(""); setSiPass(""); setSiErr(""); setSiStep(2); };
  const siGoBack = () => { setSiStep(1); setSiErr(""); };
  const siSubmit = async () => {
    if (!siEmail || !siPass) { setSiErr(t("login.fillAllFields")); return; }
    setSiBusy(true); setSiErr("");
    try {
      const loggedUser = await login(siEmail, siPass, siRole);
      onToast(t("login.welcomeBack2", { name: (getLocalizedName(loggedUser, i18n.language) || loggedUser.name).split(" ")[0] }));
      if (loggedUser.role === "worker" && VERIFY_STATUSES.includes(loggedUser.verification_status)) {
        nav("/verify-worker", { replace: true });
      } else {
        nav(LOGIN_REDIRECTS[loggedUser.role] || "/", { replace: true });
      }
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("429") || msg.toLowerCase().includes("too many") || msg.toLowerCase().includes("rate")) {
        setSiErr("Too many login attempts. Please wait a moment and try again.");
      } else {
        setSiErr(msg || t("login.invalidCredentials"));
      }
    } finally { setSiBusy(false); }
  };

  const suRc = SIGNUP_ROLES.find(r => r.id === suRole);
  const suSet = (k, v) => setSuF(p => ({ ...p, [k]: v }));
  const suSelectRole = (r) => { setSuRole(r.id); setSuErr(""); setSuStep(2); };
  const suGoBack = () => { setSuStep(1); setSuErr(""); };
  const suGetLocation = () => {
    if (!navigator.geolocation) { setSuErr(t("login.geoNotSupported")); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { suSet("lat", pos.coords.latitude.toFixed(6)); suSet("lng", pos.coords.longitude.toFixed(6)); },
      () => setSuErr(t("login.locationError"))
    );
  };
  const suSubmit = async () => {
    if (!suF.nameEn.trim() || !suF.email || !suF.password) { setSuErr(t("login.fillRequired")); return; }
    if (!suF.email.toLowerCase().endsWith("@gmail.com")) { setSuErr(t("login.onlyGmail")); return; }
    if (suF.password.length < 6) { setSuErr(t("login.passwordMin6")); return; }
    if (!suF.phone || suF.phone.replace(/\D/g, "").length !== 10) { setSuErr(t("login.phoneMust10", { defaultValue: "Mobile number is required and must be exactly 10 digits" })); return; }
    if (suRole === "worker" && !suF.categoryId) { setSuErr(t("login.workerNeedsCategory", { defaultValue: "Please select a service category" })); return; }
    if (suRole === "worker" && suF.categoryId === "others" && !suF.customCategory?.trim()) { setSuErr(t("login.enterCustomCategory")); return; }
    if (suRole === "worker") {
      const aadhaarClean = (suF.aadhaar || "").replace(/\D/g, "");
      if (aadhaarClean.length !== 12) { setSuErr(t("login.aadhaarMust12", { defaultValue: "Aadhaar number must be exactly 12 digits" })); return; }
    }
    setSuBusy(true); setSuErr("");
    try {
      const newUser = await signup({ ...suF, role: suRole });
      onToast(t("login.welcome", { name: (newUser.nameEn || newUser.name || "").split(" ")[0] }));
      nav(suRole === "worker" ? "/verify-worker" : "/home", { replace: true });
    } catch (e) {
      setSuErr(e.message || t("login.signupFailed"));
    } finally { setSuBusy(false); }
  };

  const features = [
    { icon: "map-pin",  text: t("login.features.location"), color: "var(--primary)", bg: "var(--primary-bg)", border: "var(--primary-border)" },
    { icon: "calendar", text: t("login.features.booking"),  color: "var(--green)",   bg: "var(--green-bg)",   border: "var(--green-border)" },
    { icon: "shield",   text: t("login.features.verified"), color: "var(--primary)", bg: "var(--primary-bg)", border: "var(--primary-border)" },
  ];

  // Sign out handler
  const handleSignOut = () => {
    setDotMenuOpen(false);
    localStorage.removeItem("gs_token");
    localStorage.removeItem("gs_user");
    window.location.href = "/login";
  };

  return (
    <div className="auth-split-layout" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", position: "relative", overflowX: "hidden" }}>

      {/* ── Top Navigation Bar ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 24px", height: 64,
        background: "var(--surface)", borderBottom: "1.5px solid var(--border)",
        boxShadow: "0 1px 8px rgba(15,23,42,.06)", flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.svg" alt="GeoServe" width={34} height={34}
            style={{ borderRadius: "50%", boxShadow: "0 3px 10px rgba(37,99,235,.35)", display: "block" }} />
          <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 19, letterSpacing: -.5, color: "var(--text)" }}>
            Geo<span style={{ background: "var(--grad-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Serve</span>
          </span>
        </div>

        {/* Centre tagline — hidden on narrow screens */}
        <div className="auth-nav-tagline">
          {t("login.navTagline")}
        </div>

        {/* Right controls */}
        <div className="auth-nav-right" style={{ display: "flex", alignItems: "center", gap: 6 }}>

          {/* Theme Toggle — always visible */}
          <ThemeToggle />

          {/* Language Switcher — always visible, fully responsive */}
          <div className="auth-nav-lang">
            <LanguageSwitcher />
          </div>

          {/* ── Premium Three-Dot Menu ── */}
          <div ref={dotMenuRef} style={{ position: "relative" }}>

            {/* Trigger button */}
            <button
              onClick={() => setDotMenuOpen(o => !o)}
              aria-label="More options"
              aria-expanded={dotMenuOpen}
              style={{
                width: 40, height: 40, borderRadius: 12,
                border: "1.5px solid",
                borderColor: dotMenuOpen ? "var(--primary-border)" : "var(--border)",
                background: dotMenuOpen
                  ? "linear-gradient(135deg,var(--primary-bg),rgba(37,99,235,.05))"
                  : "var(--surface)",
                color: dotMenuOpen ? "var(--primary)" : "var(--text-secondary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all .18s cubic-bezier(.4,0,.2,1)",
                boxShadow: dotMenuOpen ? "0 0 0 3px rgba(37,99,235,.12)" : "none",
              }}
              onMouseEnter={e => {
                if (!dotMenuOpen) {
                  e.currentTarget.style.borderColor = "var(--primary-border)";
                  e.currentTarget.style.background = "var(--primary-bg)";
                  e.currentTarget.style.color = "var(--primary)";
                }
              }}
              onMouseLeave={e => {
                if (!dotMenuOpen) {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--surface)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              <Icon name="more-vertical" size={17} color="currentColor" strokeWidth={2.4} />
            </button>

            {/* Dropdown panel */}
            {dotMenuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 10px)", right: 0,
                width: 272,
                background: "var(--surface)",
                border: "1.5px solid var(--border)",
                borderRadius: 20,
                boxShadow: "0 24px 64px rgba(0,0,0,.18), 0 4px 16px rgba(0,0,0,.07)",
                zIndex: 999, overflow: "hidden",
                animation: "dotMenuSlideIn .17s cubic-bezier(.34,1.56,.64,1)",
              }}>

                {/* ── Gradient header ── */}
                <div style={{
                  padding: "15px 16px 13px",
                  background: "linear-gradient(135deg,var(--primary-bg),rgba(5,150,105,.06))",
                  borderBottom: "1.5px solid var(--border)",
                  display: "flex", alignItems: "center", gap: 11,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                    background: "linear-gradient(135deg,#2563eb,#059669)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 14px rgba(37,99,235,.35)",
                  }}>
                    <img src="/logo.svg" alt="" width={24} height={24}
                      style={{ borderRadius: "50%", display: "block", filter: "brightness(0) invert(1)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", fontFamily: "'Bricolage Grotesque',sans-serif", letterSpacing: -.3 }}>
                      GeoServe
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {user ? `Signed in as ${(getLocalizedName(user, i18n.language) || user.name || "").split(" ")[0]}` : t("login.localServicesPlatform", { defaultValue: "Local Services Platform" })}
                    </div>
                  </div>
                  {user && (
                    <div style={{
                      padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 800,
                      textTransform: "capitalize", flexShrink: 0,
                      background: user.role === "worker" ? "rgba(5,150,105,.12)" : "rgba(37,99,235,.1)",
                      border: "1px solid",
                      borderColor: user.role === "worker" ? "rgba(5,150,105,.3)" : "rgba(37,99,235,.28)",
                      color: user.role === "worker" ? "#059669" : "var(--primary)",
                    }}>{user.role}</div>
                  )}
                </div>

                {/* ── Navigation section ── */}
                <div style={{ padding: "8px 8px 4px" }}>
                  <div style={{ padding: "3px 12px 6px", fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>
                    Navigation
                  </div>

                  {/* Dashboard — authenticated only */}
                  {user && (
                    <DotMenuItem
                      icon="layout-grid"
                      iconGrad="linear-gradient(135deg,#2563eb,#3b82f6)"
                      hoverBg="rgba(37,99,235,.07)"
                      label="Dashboard"
                      sub={user.role === "worker" ? "Worker portal" : "Your bookings & services"}
                      onClick={() => { setDotMenuOpen(false); nav(user.role === "worker" ? "/worker" : "/home"); }}
                    />
                  )}

                  {/* Profile — authenticated */}
                  {user && (
                    <DotMenuItem
                      icon="user"
                      iconGrad="linear-gradient(135deg,#0891b2,#06b6d4)"
                      hoverBg="rgba(8,145,178,.07)"
                      label="My Profile"
                      sub="Edit personal information"
                      onClick={() => { setDotMenuOpen(false); nav("/profile"); }}
                    />
                  )}

                  {/* Worker Pricing — worker only */}
                  {user?.role === "worker" && (
                    <DotMenuItem
                      icon="tag"
                      iconGrad="linear-gradient(135deg,#7c3aed,#8b5cf6)"
                      hoverBg="rgba(124,58,237,.07)"
                      label="My Pricing"
                      sub="Set & manage service rates"
                      onClick={() => { setDotMenuOpen(false); nav("/worker"); }}
                    />
                  )}

                  {/* Sign In — unauthenticated */}
                  {!user && (
                    <DotMenuItem
                      icon="user"
                      iconGrad="linear-gradient(135deg,#2563eb,#3b82f6)"
                      hoverBg="rgba(37,99,235,.07)"
                      label={t("login.signIn")}
                      sub="Access your account"
                      onClick={() => { setDotMenuOpen(false); switchTab("signin"); }}
                    />
                  )}

                  {/* Sign Up — unauthenticated */}
                  {!user && (
                    <DotMenuItem
                      icon="user-plus"
                      iconGrad="linear-gradient(135deg,#059669,#10b981)"
                      hoverBg="rgba(5,150,105,.07)"
                      label={t("login.signUp")}
                      sub="Create a free account"
                      onClick={() => { setDotMenuOpen(false); switchTab("signup"); }}
                    />
                  )}

                  {/* Support — always */}
                  <DotMenuItem
                    icon="help-circle"
                    iconGrad="linear-gradient(135deg,#d97706,#f59e0b)"
                    hoverBg="rgba(217,119,6,.07)"
                    label="Support Center"
                    sub="Get help & contact us"
                    onClick={() => { setDotMenuOpen(false); nav("/support"); }}
                  />
                </div>

                {/* ── Divider ── */}
                <div style={{ height: "1.5px", background: "var(--border)", margin: "0 10px" }} />

                {/* ── Preferences section ── */}
                <div style={{ padding: "4px 8px 6px" }}>
                  <div style={{ padding: "5px 12px 6px", fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>
                    Preferences
                  </div>

                  {/* Dark mode */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px 8px 10px", borderRadius: 11 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(0,0,0,.14)",
                      }}>
                        <Icon name="moon" size={15} color="#fff" strokeWidth={2.1} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", fontFamily: "'Bricolage Grotesque',sans-serif", letterSpacing: -.2 }}>
                          {t("profilePage.darkMode")}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>Light / Dark theme</div>
                      </div>
                    </div>
                    <ThemeToggle />
                  </div>
                </div>

                {/* ── Sign out (authenticated only) ── */}
                {user && (
                  <>
                    <div style={{ height: "1.5px", background: "var(--border)", margin: "0 10px" }} />
                    <div style={{ padding: "6px 8px 8px" }}>
                      <DotMenuItem
                        icon="log-out"
                        iconGrad="linear-gradient(135deg,#ef4444,#f87171)"
                        hoverBg="rgba(239,68,68,.07)"
                        label="Sign Out"
                        sub="Log out of your account"
                        danger
                        onClick={handleSignOut}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Animation & responsive styles */}
      <style>{`
        .auth-nav-tagline { font-size:13px; font-weight:600; color:var(--muted); letter-spacing:.01em; }
        .auth-nav-lang { display:flex; }
        @media(max-width:900px){ .auth-nav-tagline{display:none!important;} }
        @media(max-width:640px){ nav[style*="sticky"]{padding:0 12px!important;} }
        @keyframes dotMenuSlideIn {
          from { opacity:0; transform:translateY(-10px) scale(.96); }
          to   { opacity:1; transform:translateY(0)     scale(1);   }
        }
      `}</style>

      <div style={{ display: "flex", flex: 1, position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -180, right: -180, width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle,rgba(37,99,235,.07) 0%,transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: -120, left: -120, width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle,rgba(5,150,105,.06) 0%,transparent 70%)" }} />
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .035 }} xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="grid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="#2563eb" strokeWidth="1"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>

        {/* Left branding panel */}
        <div className="sidebar-hidden-mobile" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 64px", position: "relative" }}>
          <div style={{ marginBottom: 52 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 13, marginBottom: 44 }}>
              <img src="/logo.svg" alt="GeoServe" width={52} height={52}
                style={{ borderRadius: "50%", boxShadow: "0 6px 22px rgba(37,99,235,.40)", display: "block" }} />
              <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: -.7, color: "var(--text)" }}>
                Geo<span style={{ background: "var(--grad-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Serve</span>
              </span>
            </div>
            <h1 style={{ fontSize: 50, fontWeight: 800, letterSpacing: -2.5, lineHeight: 1.05, marginBottom: 18, color: "var(--text)", fontFamily: "'Bricolage Grotesque',sans-serif" }}>
              Connect with<br />
              <span style={{ background: "var(--grad-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>skilled workers</span><br />
              near you.
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.8, maxWidth: 380 }}>
              Find trusted local professionals for any job, book instantly, and track progress — all in one seamless platform.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "var(--surface)", borderRadius: 14, border: `1.5px solid ${f.border}`, boxShadow: "var(--shadow-sm)" }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={f.icon} size={17} color={f.color} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right form panel */}
        <div className="auth-form-panel" style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 40px 60px", minWidth: "min(500px,100vw)", overflowY: "auto" }}>
          <div className="auth-form-card anim-up" style={{ width: "100%", maxWidth: 460, background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-xl)" }}>

            <div style={{ height: 3, background: "var(--grad-primary)", borderRadius: "var(--radius-2xl) var(--radius-2xl) 0 0" }} />

            <div style={{ padding: "20px 28px 0" }}>
              <div className="auth-mobile-logo" style={{ display: "none", alignItems: "center", justifyContent: "center", gap: 9, marginBottom: 18 }}>
                <img src="/logo.svg" alt="GeoServe" width={30} height={30} style={{ borderRadius: "50%", boxShadow: "0 3px 10px rgba(37,99,235,.35)" }} />
                <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: -.4, color: "var(--text)" }}>
                  Geo<span style={{ background: "var(--grad-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Serve</span>
                </span>
              </div>

              <div style={{ display: "flex", background: "var(--bg)", borderRadius: 14, padding: 4, border: "1.5px solid var(--border)", gap: 4, marginBottom: 24 }}>
                {[
                  { key: "signin", label: t("login.signIn"), icon: "user" },
                  { key: "signup", label: t("login.signUp"), icon: "user-plus" },
                ].map(({ key, label, icon }) => {
                  const active = tab === key;
                  return (
                    <button key={key} onClick={() => switchTab(key)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 0", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: -.2, transition: "all .22s cubic-bezier(.34,1.56,.64,1)", background: active ? "var(--surface)" : "transparent", color: active ? "var(--primary)" : "var(--muted)", boxShadow: active ? "0 2px 10px rgba(37,99,235,.13), 0 1px 3px rgba(0,0,0,.06)" : "none", transform: active ? "translateY(-1px)" : "none" }}>
                      <Icon name={icon} size={15} color={active ? "var(--primary)" : "var(--muted-light)"} />
                      {label}
                      {active && (<span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "var(--primary)", marginLeft: 1, boxShadow: "0 0 6px rgba(37,99,235,.5)" }} />)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: "0 28px 32px" }}>

              {/* SIGN IN TAB */}
              {tab === "signin" && (
                <div className="auth-tab-pane anim-fade">
                  <div style={{ textAlign: "center", marginBottom: 22 }}>
                    <h2 style={{ fontSize: 21, fontWeight: 800, letterSpacing: -.5, marginBottom: 4, fontFamily: "'Bricolage Grotesque',sans-serif" }}>
                      {siStep === 1 ? t("login.welcomeBack") : t("login.signInAs", { role: siRc?.label })}
                    </h2>
                    <p style={{ color: "var(--muted)", fontSize: 13 }}>
                      {siStep === 1 ? t("login.chooseAccountType") : t("login.enterCredentials")}
                    </p>
                  </div>

                  {siStep === 1 && (
                    <div className="anim-fade">
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {LOGIN_ROLES.map((r) => (
                          <button key={r.id} onClick={() => siSelectRole(r)}
                            style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 17px", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14, cursor: "pointer", transition: "all .22s cubic-bezier(.34,1.56,.64,1)", textAlign: "left", fontFamily: "inherit" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = r.borderColor; e.currentTarget.style.background = r.lightColor; e.currentTarget.style.transform = "translateX(5px) scale(1.01)"; e.currentTarget.style.boxShadow = `0 6px 20px ${r.glowColor}`; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                          >
                            <div style={{ width: 46, height: 46, borderRadius: 13, background: r.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 6px 16px ${r.glowColor}` }}>
                              <Icon name={r.icon} size={21} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", fontFamily: "'Bricolage Grotesque',sans-serif", letterSpacing: -.3 }}>{r.label}</div>
                              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{r.subtitle}</div>
                            </div>
                            <Icon name="chevron-right" size={14} color="var(--muted-light)" />
                          </button>
                        ))}
                      </div>
                      <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, marginTop: 20 }}>
                        {t("login.noAccount")}{" "}
                        <button onClick={() => switchTab("signup")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontWeight: 700, fontSize: 13, padding: 0, fontFamily: "inherit" }}>{t("login.createOne")}</button>
                      </p>
                    </div>
                  )}

                  {siStep === 2 && siRc && (
                    <div className="anim-fade">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 13px", background: siRc.lightColor, border: `1.5px solid ${siRc.borderColor}`, borderRadius: 11, marginBottom: 18 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 9, background: siRc.gradient, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Icon name={siRc.icon} size={14} color="white" />
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: siRc.color, fontFamily: "'Bricolage Grotesque',sans-serif" }}>{siRc.label}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{siRc.subtitle}</div>
                          </div>
                        </div>
                        <button onClick={siGoBack} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, fontFamily: "inherit" }}>
                          <Icon name="arrow-left" size={11} color="var(--muted)" /> {t("common.change")}
                        </button>
                      </div>

                      {siErr && (
                        <div style={{ background: "var(--red-soft)", border: "1px solid var(--red-border)", borderRadius: 10, padding: "10px 13px", marginBottom: 14, color: "var(--red)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                          <Icon name="alert-circle" size={14} color="var(--red)" /> {siErr}
                        </div>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                        <div>
                          <label>{t("login.emailAddress")}</label>
                          <input type="email" value={siEmail} onChange={e => setSiEmail(e.target.value)} placeholder={t("login.emailPlaceholder")} onKeyDown={e => e.key === "Enter" && siSubmit()} />
                        </div>
                        <div>
                          <label>{t("login.password")}</label>
                          <div style={{ position: "relative" }}>
                            <input type={siShowPass ? "text" : "password"} value={siPass} onChange={e => setSiPass(e.target.value)} placeholder={t("login.passwordPlaceholder")} onKeyDown={e => e.key === "Enter" && siSubmit()} style={{ paddingRight: 44 }} />
                            <button onClick={() => setSiShowPass(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted)", display: "flex", alignItems: "center" }}>
                              <Icon name={siShowPass ? "eye-off" : "eye"} size={15} color="var(--muted)" />
                            </button>
                          </div>
                        </div>
                        <button onClick={siSubmit} disabled={siBusy}
                          style={{ width: "100%", justifyContent: "center", padding: "13px 0", fontSize: 14, background: siRc.gradient, color: "white", border: "none", borderRadius: 12, fontWeight: 700, fontFamily: "'Manrope',sans-serif", cursor: siBusy ? "default" : "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all .22s cubic-bezier(.34,1.56,.64,1)", opacity: siBusy ? 0.7 : 1, boxShadow: `0 6px 22px ${siRc.glowColor}`, letterSpacing: -.2, marginTop: 2 }}
                          onMouseEnter={e => { if (!siBusy) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 10px 30px ${siRc.glowColor}`; } }}
                          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 6px 22px ${siRc.glowColor}`; }}
                        >
                          {siBusy ? (<><div className="spinner" /> {t("login.signingIn")}</>) : (<><Icon name={siRc.icon} size={15} color="white" /> {t("login.signInAsRole", { role: siRc.label })}</>)}
                        </button>
                      </div>
                      <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, marginTop: 16 }}>
                        {t("login.noAccountQ")}{" "}
                        <button onClick={() => switchTab("signup")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontWeight: 700, fontSize: 13, padding: 0, fontFamily: "inherit" }}>{t("login.signUp")}</button>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* SIGN UP TAB */}
              {tab === "signup" && (
                <div className="auth-tab-pane anim-fade">
                  <div style={{ textAlign: "center", marginBottom: 22 }}>
                    <h2 style={{ fontSize: 21, fontWeight: 800, letterSpacing: -.5, marginBottom: 4, fontFamily: "'Bricolage Grotesque',sans-serif" }}>
                      {suStep === 1 ? t("login.createAccount") : t("login.settingUp", { role: suRc?.label })}
                    </h2>
                    <p style={{ color: "var(--muted)", fontSize: 13 }}>
                      {suStep === 1 ? t("login.chooseTypeToCreate") : t("login.fillDetails")}
                    </p>
                  </div>

                  {suStep === 1 && (
                    <div className="anim-fade">
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {SIGNUP_ROLES.map((r) => (
                          <button key={r.id} onClick={() => suSelectRole(r)}
                            style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 17px", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14, cursor: "pointer", transition: "all .22s cubic-bezier(.34,1.56,.64,1)", textAlign: "left", fontFamily: "inherit" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = r.borderColor; e.currentTarget.style.background = r.lightColor; e.currentTarget.style.transform = "translateX(6px) scale(1.01)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.transform = "none"; }}
                          >
                            <div style={{ width: 46, height: 46, borderRadius: 13, background: r.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 6px 16px rgba(37,99,235,.28)" }}>
                              <Icon name={r.icon} size={21} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", fontFamily: "'Bricolage Grotesque',sans-serif", letterSpacing: -.2 }}>{r.label}</div>
                              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{r.subtitle}</div>
                            </div>
                            <Icon name="chevron-right" size={14} color="var(--muted-light)" />
                          </button>
                        ))}
                      </div>
                      <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, marginTop: 20 }}>
                        {t("login.alreadyHaveAccount")}{" "}
                        <button onClick={() => switchTab("signin")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontWeight: 700, fontSize: 13, padding: 0, fontFamily: "inherit" }}>{t("login.signIn")}</button>
                      </p>
                    </div>
                  )}

                  {suStep === 2 && suRc && (
                    <div className="anim-fade">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 13px", background: suRc.lightColor, border: `1.5px solid ${suRc.borderColor}`, borderRadius: 11, marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 9, background: suRc.gradient, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Icon name={suRc.icon} size={14} color="white" />
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: suRc.color, fontFamily: "'Bricolage Grotesque',sans-serif" }}>{suRc.label}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{suRc.subtitle}</div>
                          </div>
                        </div>
                        <button onClick={suGoBack} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, fontFamily: "inherit" }}>
                          <Icon name="arrow-left" size={11} color="var(--muted)" /> {t("common.change")}
                        </button>
                      </div>

                      {suErr && (
                        <div style={{ background: "var(--red-soft)", border: "1px solid var(--red-border)", borderRadius: 10, padding: "10px 13px", marginBottom: 14, color: "var(--red)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                          <Icon name="alert-circle" size={14} color="var(--red)" /> {suErr}
                        </div>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                        <div><label>{t("login.fullName", { defaultValue: "Name *" })}</label><input value={suF.nameEn} onChange={e => suSet("nameEn", e.target.value)} placeholder={t("login.fullNamePlaceholder", { defaultValue: "Your full name" })} /></div>
                        <div><label>{t("login.gmailAddress")}</label><input type="email" value={suF.email} onChange={e => suSet("email", e.target.value)} placeholder={t("login.gmailPlaceholder")} /></div>
                        <div>
                          <label>{t("login.passwordField")}</label>
                          <div style={{ position: "relative" }}>
                            <input type={suShowPass ? "text" : "password"} value={suF.password} onChange={e => suSet("password", e.target.value)} placeholder={t("login.minPassword")} style={{ paddingRight: 44 }} />
                            <button onClick={() => setSuShowPass(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}>
                              <Icon name={suShowPass ? "eye-off" : "eye"} size={15} color="var(--muted)" />
                            </button>
                          </div>
                        </div>

                        {suRole === "user" && (
                          <>
                            <div style={{ height: 1, background: "var(--border)", margin: "1px 0" }} />
                            <div>
                              <label>{t("login.mobileNumber", { defaultValue: "Mobile Number *" })}</label>
                              <input type="tel" value={suF.phone} onChange={e => { const d = e.target.value.replace(/\D/g, "").slice(0, 10); suSet("phone", d); }} maxLength={10} inputMode="numeric" placeholder={t("login.mobileNumberPlaceholder", { defaultValue: "10-digit mobile number" })} required />
                            </div>
                            <label style={{ marginBottom: 0 }}>{t("login.yourLocation")}</label>
                            <PincodeSelector pincode={suF.pincode} street={suF.street} onPincodeChange={v => suSet("pincode", v)} onStreetChange={v => suSet("street", v)} accentColor={suRc.color} accentLight={suRc.lightColor} accentBorder={suRc.borderColor} />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                              <div><label>{t("login.latitude")}</label><input value={suF.lat} onChange={e => suSet("lat", e.target.value)} placeholder={t("login.latPlaceholder")} /></div>
                              <div><label>{t("login.longitude")}</label><input value={suF.lng} onChange={e => suSet("lng", e.target.value)} placeholder={t("login.lngPlaceholder")} /></div>
                            </div>
                            <button onClick={suGetLocation} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", background: suRc.lightColor, border: `1px solid ${suRc.borderColor}`, borderRadius: 9, cursor: "pointer", fontSize: 13, color: suRc.color, fontWeight: 600, fontFamily: "inherit" }}>
                              <Icon name="map-pin" size={14} color={suRc.color} /> {t("login.detectGPS")}
                            </button>
                          </>
                        )}

                        {suRole === "worker" && (
                          <>
                            <div style={{ height: 1, background: "var(--border)", margin: "1px 0" }} />
                            <label style={{ marginBottom: 0 }}>{t("login.workerDetails")}</label>
                            <div>
                              <label>{t("login.mobileNumber", { defaultValue: "Mobile Number *" })}</label>
                              <input type="tel" value={suF.phone} onChange={e => { const d = e.target.value.replace(/\D/g, "").slice(0, 10); suSet("phone", d); }} maxLength={10} inputMode="numeric" placeholder={t("login.phonePlaceholder", { defaultValue: "10-digit mobile number" })} required />
                            </div>
                            <div>
                              <label>
                                {t("login.aadhaarNumber", { defaultValue: "Aadhaar Number *" })}{" "}
                                <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 11 }}>(12 digits)</span>
                              </label>
                              <div style={{ position: "relative" }}>
                                <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", zIndex: 1, display: "flex", alignItems: "center" }}>
                                  <Icon name="shield" size={15} color="var(--muted-light)" />
                                </span>
                                <input
                                  type="text"
                                  value={suF.aadhaar}
                                  onChange={e => { const d = e.target.value.replace(/\D/g, "").slice(0, 12); suSet("aadhaar", d); if (aadhaarErr) setAadhaarErr(""); }}
                                  maxLength={12}
                                  inputMode="numeric"
                                  placeholder={t("login.aadhaarPlaceholder", { defaultValue: "12-digit Aadhaar number" })}
                                  style={{ paddingLeft: 33, letterSpacing: suF.aadhaar ? 2 : 0 }}
                                />
                              </div>
                              {suF.aadhaar && suF.aadhaar.length > 0 && suF.aadhaar.length < 12 && (
                                <div style={{ fontSize: 11, color: "var(--amber)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                                  <Icon name="alert-circle" size={11} color="var(--amber)" />
                                  {t("login.aadhaarDigitsRemaining", { count: 12 - suF.aadhaar.length, defaultValue: `${12 - suF.aadhaar.length} more digits needed` })}
                                </div>
                              )}
                              {suF.aadhaar && suF.aadhaar.length === 12 && (
                                <div style={{ fontSize: 11, color: "var(--green)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                                  <Icon name="check-circle" size={11} color="var(--green)" />
                                  {t("login.aadhaarValid", { defaultValue: "Aadhaar number looks valid" })}
                                </div>
                              )}
                              {aadhaarErr && (
                                <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                                  <Icon name="alert-circle" size={11} color="#dc2626" />
                                  {aadhaarErr}
                                </div>
                              )}
                            </div>
                            <div>
                              <label>{t("login.serviceCategory")}</label>
                              <div className="gs-signup-cat-grid">
                                {categories.map(c => {
                                  const sel = String(suF.categoryId) === String(c.id);
                                  return (
                                    <button key={c.id} type="button" onClick={() => { suSet("categoryId", String(c.id)); suSet("customCategory", ""); }}
                                      className={`gs-cat-tile${sel ? " is-selected" : ""}`}
                                      style={{ "--cat-accent": suRc.color, "--cat-accent-bg": suRc.lightColor }}
                                      aria-pressed={sel}
                                    >
                                      {sel && (<span className="gs-cat-tile-check"><Icon name="check" size={11} color="white" strokeWidth={3} /></span>)}
                                      <div className="gs-cat-tile-icon">
                                        <CategoryLabel name="" icon={c.icon} size={19} color={sel ? "white" : "var(--muted)"} showName={false} />
                                      </div>
                                      <span className="gs-cat-tile-name">{t(`categoryNames.${c.name}`, { defaultValue: c.name })}</span>
                                    </button>
                                  );
                                })}
                                <button type="button" onClick={() => suSet("categoryId", "others")}
                                  className={`gs-cat-tile${suF.categoryId === "others" ? " is-selected" : ""}`}
                                  style={{ "--cat-accent": suRc.color, "--cat-accent-bg": suRc.lightColor }}
                                  aria-pressed={suF.categoryId === "others"}
                                >
                                  {suF.categoryId === "others" && (<span className="gs-cat-tile-check"><Icon name="check" size={11} color="white" strokeWidth={3} /></span>)}
                                  <div className="gs-cat-tile-icon">
                                    <Icon name="layers" size={19} color={suF.categoryId === "others" ? "white" : "var(--muted)"} strokeWidth={1.8} />
                                  </div>
                                  <span className="gs-cat-tile-name">{t("login.others")}</span>
                                </button>
                              </div>
                              {suF.categoryId === "others" && (
                                <div style={{ marginTop: 10 }}>
                                  <input value={suF.customCategory || ""} onChange={e => suSet("customCategory", e.target.value)}
                                    placeholder={t("login.customCategoryPlaceholder")} maxLength={60}
                                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--primary-border)", background: "var(--primary-bg)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                                    autoFocus
                                  />
                                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 5, paddingLeft: 2 }}>
                                    {t("login.customCategoryHint")}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div>
                              <label>{t("login.bio")}</label>
                              <textarea value={suF.bio} onChange={e => suSet("bio", e.target.value)} rows={2} style={{ resize: "vertical" }} placeholder={t("login.bioPlaceholder")} />
                            </div>
                            <div style={{ height: 1, background: "var(--border)", margin: "1px 0" }} />
                            <label style={{ marginBottom: 0 }}>{t("login.yourLocation")}</label>
                            <PincodeSelector pincode={suF.pincode} street={suF.street} onPincodeChange={v => suSet("pincode", v)} onStreetChange={v => suSet("street", v)} accentColor={suRc.color} accentLight={suRc.lightColor} accentBorder={suRc.borderColor} />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                              <div><label>{t("login.latitude")}</label><input value={suF.lat} onChange={e => suSet("lat", e.target.value)} placeholder={t("login.latPlaceholder")} /></div>
                              <div><label>{t("login.longitude")}</label><input value={suF.lng} onChange={e => suSet("lng", e.target.value)} placeholder={t("login.lngPlaceholder")} /></div>
                            </div>
                            <button onClick={suGetLocation} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", background: suRc.lightColor, border: `1px solid ${suRc.borderColor}`, borderRadius: 9, cursor: "pointer", fontSize: 13, color: suRc.color, fontWeight: 600, fontFamily: "inherit" }}>
                              <Icon name="map-pin" size={14} color={suRc.color} /> {t("login.detectGPS")}
                            </button>
                            <div style={{ background: "var(--amber-bg)", border: "1px solid var(--amber-border)", borderRadius: 10, padding: "11px 13px", fontSize: 12, color: "#92400e", display: "flex", alignItems: "flex-start", gap: 8 }}>
                              <Icon name="alert-circle" size={13} color="#d97706" />
                              <span>{t("login.adminReview")}</span>
                            </div>
                          </>
                        )}

                        <button onClick={suSubmit} disabled={suBusy}
                          style={{ width: "100%", justifyContent: "center", padding: "13px 0", fontSize: 14, background: suRc.gradient, color: "white", border: "none", borderRadius: 12, fontWeight: 700, fontFamily: "'Manrope',sans-serif", cursor: suBusy ? "default" : "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all .22s cubic-bezier(.34,1.56,.64,1)", opacity: suBusy ? 0.7 : 1, boxShadow: "0 6px 22px rgba(37,99,235,.35)", letterSpacing: -.2, marginTop: 2 }}
                          onMouseEnter={e => { if (!suBusy) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 30px rgba(37,99,235,.50)"; } }}
                          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 6px 22px rgba(37,99,235,.35)"; }}
                        >
                          {suBusy ? (<><div className="spinner" /> {t("login.creatingAccount")}</>) : (<><Icon name="user-plus" size={15} color="white" /> {t("login.createRole", { role: suRc.label })}</>)}
                        </button>

                        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                          {t("login.alreadyHaveAccount")}{" "}
                          <button onClick={() => switchTab("signin")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontWeight: 700, fontSize: 13, padding: 0, fontFamily: "inherit" }}>{t("login.signIn")}</button>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
