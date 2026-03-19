import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useTranslation } from "react-i18next";

const ROLE_META = {
  worker: { color: "#2563eb", bg: "var(--blue-bg)", border: "var(--blue-border)", label: "Worker", gradient: "linear-gradient(135deg,#2563eb,#60a5fa)" },
  user:   { color: "#059669", bg: "var(--green-bg)", border: "var(--green-border)", label: "User",  gradient: "linear-gradient(135deg,#059669,#34d399)" },
};

export default function Navbar({ onToast, onMenuToggle }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    onToast("Logged out successfully");
    nav("/login");
    setOpen(false);
  };

  const homeLink = user?.role === "worker" ? "/worker" : "/home";
  const rm = user ? (ROLE_META[user.role] || ROLE_META.user) : ROLE_META.user;
  const fb = user ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4f46e5&color=fff&size=80` : "";

  return (
    <nav className={`gs-navbar${scrolled ? " gs-navbar--scrolled" : ""}`}>
      {/* ── Left: hamburger + logo ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {onMenuToggle && (
          <button className="navbar-hamburger" onClick={onMenuToggle} aria-label="Toggle menu">
            <Icon name="menu" size={18} color="var(--text-secondary)" />
          </button>
        )}
        <Link to={homeLink} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div
            style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 12px rgba(79,70,229,.4)", transition: "transform .2s cubic-bezier(.34,1.56,.64,1)", flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1) rotate(-5deg)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <Icon name="globe" size={18} color="white" />
          </div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 20, color: "var(--text)", letterSpacing: -.6 }}>
            Geo<span style={{ color: "var(--primary)" }}>Serve</span>
          </span>
        </Link>
      </div>

      {/* ── Right: toggle + lang + user ── */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {/* 🌙 Theme toggle */}
        <ThemeToggle />

        {user && (user.role === "user" || user.role === "worker") && (
          <LanguageSwitcher />
        )}

        {user ? (
          <div ref={ref} style={{ position: "relative" }}>
            <button
              onClick={() => setOpen(o => !o)}
              className="navbar-user-btn"
              style={{
                display: "flex", alignItems: "center", gap: 9,
                background: "var(--surface)",
                border: "1.5px solid var(--border)",
                borderRadius: 40, padding: "5px 12px 5px 5px",
                cursor: "pointer", transition: "all .2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary-border)"; e.currentTarget.style.background = "var(--primary-bg)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
            >
              <div style={{ position: "relative" }}>
                <img src={user.avatar || fb} onError={e => { e.target.src = fb; }}
                  style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--primary-border)", flexShrink: 0, display: "block" }}
                />
                <div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: "#22c55e", border: "2px solid var(--surface)" }} />
              </div>
              <span className="navbar-user-name" style={{ color: "var(--text)", fontSize: 14, fontWeight: 600 }}>{user.name.split(" ")[0]}</span>
              <span className="navbar-user-role" style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: .5, background: "var(--primary-bg)", color: "var(--primary)", border: "1px solid var(--primary-border)" }}>
                {rm.label}
              </span>
              <Icon name="chevron-down" size={13} color="var(--muted)" />
            </button>

            {open && (
              <div className="navbar-dropdown">
                <div style={{ padding: "16px 18px", background: "var(--surface-raised)", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={user.avatar || fb} onError={e => { e.target.src = fb; }}
                      style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--primary-border)" }}
                    />
                    <div>
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{user.name}</div>
                      <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 1 }}>{user.email}</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "6px" }}>
                  {[
                    { icon: "home", label: t("nav.dashboard"), to: homeLink },
                    { icon: "user", label: t("nav.myProfile"), to: "/profile" },
                  ].map(item => (
                    <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: "var(--radius)", textDecoration: "none", color: "var(--text-secondary)", fontSize: 14, transition: "all .12s", fontWeight: 500 }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "var(--text)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                    >
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface-raised)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name={item.icon} size={14} color="var(--muted)" />
                      </div>
                      {item.label}
                    </Link>
                  ))}
                </div>
                <div style={{ borderTop: "1px solid var(--border)", padding: "6px" }}>
                  <button onClick={handleLogout}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", width: "100%", border: "none", background: "none", cursor: "pointer", fontSize: 14, color: "var(--red)", textAlign: "left", borderRadius: "var(--radius)", fontWeight: 500, transition: "background .12s", fontFamily: "inherit" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--red-bg)"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--red-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="logout" size={14} color="var(--red)" />
                    </div>
                    {t("nav.signOut")}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link to="/login"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: "var(--radius)", border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, textDecoration: "none", transition: "all .2s", fontFamily: "'Outfit', sans-serif" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; e.currentTarget.style.background = "var(--primary-bg)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "var(--surface)"; }}
            >{t("nav.logIn")}</Link>
            <Link to="/signup" className="btn-primary" style={{ padding: "8px 18px", textDecoration: "none", fontSize: 14 }}>{t("nav.getStarted")}</Link>
          </>
        )}
      </div>
    </nav>
  );
}
