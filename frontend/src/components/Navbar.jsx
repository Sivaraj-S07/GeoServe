import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useTranslation } from "react-i18next";
import SupportChat from "./SupportChat";
import NotificationPanel from "./NotificationPanel";
import { getLocalizedName } from "../utils/localizedName";

const ROLE_META = {
  worker: { color:"#2563eb", bg:"var(--blue-bg)", border:"var(--blue-border)", label:"Worker", gradient:"linear-gradient(135deg,#2563eb,#3b82f6)" },
  user:   { color:"#2563eb", bg:"var(--primary-bg)", border:"var(--primary-border)", label:"User", gradient:"linear-gradient(135deg,#1d4ed8,#059669)" },
};

function MenuBtn({ icon, label, desc, onClick, danger }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:"flex", alignItems:"center", gap:11, width:"100%",
        padding:"10px 12px", borderRadius:11, background: hovered ? (danger ? "var(--red-bg)" : "var(--primary-bg)") : "none",
        border:"none", cursor:"pointer", fontFamily:"inherit", textAlign:"left",
        transition:"background .13s", color: danger ? "var(--red)" : "var(--text-secondary)",
      }}
    >
      <div style={{
        width:34, height:34, borderRadius:10, flexShrink:0,
        background: hovered ? (danger ? "rgba(239,68,68,.12)" : "var(--primary-soft)") : "var(--surface-hover)",
        border:`1px solid ${hovered ? (danger ? "var(--red-border)" : "var(--primary-border)") : "var(--border)"}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:16, transition:"all .13s",
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize:13.5, fontWeight:700, color: danger ? "var(--red)" : (hovered ? "var(--primary)" : "var(--text)"), lineHeight:1.2, transition:"color .13s", fontFamily:"'Bricolage Grotesque',sans-serif" }}>{label}</div>
        {desc && <div style={{ fontSize:11.5, color:"var(--muted)", marginTop:1 }}>{desc}</div>}
      </div>
    </button>
  );
}

export default function Navbar({ onToast, onMenuToggle, notifState }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const { t, i18n } = useTranslation();

  // ── ALL hooks declared before any early return (Rules of Hooks) ──
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [userOpen,    setUserOpen]    = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [scrolled,    setScrolled]    = useState(false);
  const [guestMenuOpen, setGuestMenuOpen] = useState(false);
  const menuRef     = useRef();
  const userRef     = useRef();
  const mobileMenuRef = useRef();
  const guestMenuRef  = useRef();

  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) setMenuOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
      if (guestMenuRef.current && !guestMenuRef.current.contains(e.target)) setGuestMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hide on auth pages — AFTER all hooks
  const isAuthPage = loc.pathname === "/login" || loc.pathname === "/signup";
  if (isAuthPage) return null;

  const handleLogout = () => { logout(); onToast(t("nav.loggedOut")); nav("/login", { replace: true }); setUserOpen(false); setMenuOpen(false); };
  const homeLink = user?.role === "worker" ? "/worker" : "/home";
  const rm  = user ? (ROLE_META[user.role] || ROLE_META.user) : ROLE_META.user;
  // Bilingual display name — falls back to the legacy name for accounts
  // created before this feature existed (null-safe).
  const displayName = user ? (getLocalizedName(user, i18n.language) || user.name || "") : "";
  const fb  = user ? `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563eb&color=fff&size=80` : "";

  const MENU_ITEMS = [
    { icon:"🏠", label:t("nav.dashboard"),   desc:t("common.yoursDashboard"),  action: () => { nav(homeLink); setMenuOpen(false); } },
    { icon:"👤", label:t("nav.myProfile"),    desc:t("common.manageAccount"),   action: () => { nav("/profile"); setMenuOpen(false); } },
    { icon:"⚙️", label:t("adminSidebar.profile"),     desc:t("adminSidebar.profile"), action: () => { nav("/profile#settings"); setMenuOpen(false); } },
    { icon:"💬", label:t("support.title"),desc:t("support.title"),    action: () => { setMenuOpen(false); setSupportOpen(true); } },
  ];

  return (
    <>
      <nav className={`gs-navbar${scrolled ? " gs-navbar--scrolled" : ""}`}>

        {/* ── Desktop: hamburger + logo on left ── */}
        <div className="navbar-left-desktop" style={{ display:"flex", alignItems:"center", gap:12 }}>
          {/* Hamburger */}
          <div ref={menuRef} style={{ position:"relative" }}>
            <button
              className="navbar-hamburger"
              onClick={() => { setMenuOpen(o => !o); setUserOpen(false); }}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              style={{
                background: menuOpen ? "var(--primary-bg)" : "none",
                borderColor: menuOpen ? "var(--primary-border)" : "var(--border)",
                color: menuOpen ? "var(--primary)" : "var(--muted)",
              }}
            >
              <Icon name="menu" size={18} color="currentColor" />
            </button>

            {menuOpen && (
              <div style={{
                position:"absolute", top:"calc(100% + 10px)", left:0,
                minWidth:254, background:"var(--surface)", border:"1.5px solid var(--border)",
                borderRadius:20, boxShadow:"var(--shadow-xl)", overflow:"hidden",
                animation:"dropIn .18s cubic-bezier(.16,1,.3,1)", zIndex:200,
              }}>
                <div style={{ padding:"12px 14px 10px", borderBottom:"1px solid var(--border)", background:"linear-gradient(135deg,var(--primary-bg),var(--teal-bg))" }}>
                  <div style={{ fontSize:10, fontWeight:800, color:"var(--primary)", letterSpacing:".1em", textTransform:"uppercase", fontFamily:"'Bricolage Grotesque',sans-serif" }}>{t("nav.navigation")}</div>
                </div>
                <div style={{ padding:"6px 6px 8px" }}>
                  {MENU_ITEMS.map(item => (
                    <MenuBtn key={item.label} icon={item.icon} label={item.label} desc={item.desc} onClick={item.action} />
                  ))}
                  <div style={{ height:1, background:"var(--border)", margin:"6px 4px" }} />
                  <MenuBtn icon="🚪" label={t("nav.signOut")} desc={t("common.signOutAccount")} onClick={handleLogout} danger />
                </div>
              </div>
            )}
          </div>

          {/* Logo */}
          <Link to={homeLink} style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none" }}>
            <img
              src="/logo.svg"
              alt="GeoServe Logo"
              width={38}
              height={38}
              style={{ borderRadius:"50%", boxShadow:"0 4px 16px rgba(37,99,235,.42)", transition:"transform .22s cubic-bezier(.34,1.56,.64,1)", flexShrink:0, display:"block" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1) rotate(-5deg)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            />
            <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:800, fontSize:20, color:"var(--text)", letterSpacing:-.5 }}>
              Geo<span style={{ background:"linear-gradient(135deg,#1d4ed8,#059669)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Serve</span>
            </span>
          </Link>
        </div>

        {/* ── Mobile: logo + name on left ── */}
        <div className="navbar-left-mobile" style={{ display:"none", alignItems:"center", gap:8 }}>
          <Link to={homeLink} style={{ display:"flex", alignItems:"center", gap:8, textDecoration:"none" }}>
            <img
              src="/logo.svg"
              alt="GeoServe Logo"
              width={32}
              height={32}
              style={{ borderRadius:"50%", boxShadow:"0 2px 10px rgba(37,99,235,.35)", flexShrink:0, display:"block" }}
            />
            <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:800, fontSize:18, color:"var(--text)", letterSpacing:-.5 }}>
              Geo<span style={{ background:"linear-gradient(135deg,#1d4ed8,#059669)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Serve</span>
            </span>
          </Link>
        </div>

        {/* Right side */}
        <div className="navbar-right" style={{ display:"flex", gap:8, alignItems:"center" }}>
          <ThemeToggle />
          {user && (user.role === "user" || user.role === "worker") && <LanguageSwitcher />}

          {/* Real-time notification bell */}
          {user && notifState && (
            <NotificationPanel
              notifications={notifState.notifications}
              unreadCount={notifState.unreadCount}
              onMarkAllRead={notifState.markAllRead}
              onMarkRead={notifState.markRead}
            />
          )}

          {user && (
            <button
              onClick={() => { setSupportOpen(o => !o); }}
              title="Support / Help"
              className="navbar-support-btn"
              style={{
                display:"flex", alignItems:"center", gap:6, padding:"6px 12px",
                background: supportOpen ? "var(--primary-bg)" : "var(--surface)",
                border:`1.5px solid ${supportOpen ? "var(--primary-border)" : "var(--border)"}`,
                borderRadius:20, cursor:"pointer", fontSize:13, fontWeight:600,
                color: supportOpen ? "var(--primary)" : "var(--muted)",
                transition:"all .15s",
              }}
            >
              <span>💬</span>
              <span className="sidebar-hidden-mobile">{t("support.title")}</span>
            </button>
          )}

          {user ? (
            /* ── Desktop: avatar dropdown ── */
            <div ref={userRef} style={{ position:"relative" }}>
              <button
                className="navbar-avatar-btn"
                onClick={() => { setUserOpen(o => !o); setMenuOpen(false); }}
                style={{ display:"flex", alignItems:"center", gap:9, background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:40, padding:"5px 12px 5px 5px", cursor:"pointer", transition:"all .18s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary-border)"; e.currentTarget.style.background = "var(--primary-bg)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
              >
                <div style={{ position:"relative" }}>
                  <img src={user.avatar || fb} onError={e => { e.target.src = fb; }}
                    style={{ width:30, height:30, borderRadius:"50%", objectFit:"cover", border:"2px solid var(--primary-border)", flexShrink:0, display:"block" }}
                  />
                  <div style={{ position:"absolute", bottom:-1, right:-1, width:10, height:10, borderRadius:"50%", background:"#22c55e", border:"2px solid var(--surface)" }} />
                </div>
                <span className="navbar-user-name">{displayName.split(" ")[0]}</span>
                <span className="navbar-role-badge" style={{ padding:"2px 8px", borderRadius:20, fontSize:10, textTransform:"uppercase", letterSpacing:.6, background:"var(--primary-bg)", color:"var(--primary)", border:"1px solid var(--primary-border)", fontWeight:800, fontFamily:"'Bricolage Grotesque',sans-serif" }}>
                  {rm.label}
                </span>
                <Icon name="chevron-down" size={13} color="var(--muted)" />
              </button>

              {userOpen && (
                <div className="navbar-dropdown">
                  <div style={{ padding:"18px 18px 14px", background:"linear-gradient(135deg,var(--primary-bg),var(--teal-bg))", borderBottom:"1px solid var(--border)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ position:"relative", flexShrink:0 }}>
                        <img src={user.avatar || fb} onError={e => { e.target.src = fb; }}
                          style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover", border:"2.5px solid var(--primary-border)", display:"block" }}
                        />
                        <div style={{ position:"absolute", bottom:1, right:1, width:11, height:11, borderRadius:"50%", background:"#22c55e", border:"2px solid var(--surface-raised)" }} />
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:15, color:"var(--text)" }}>{displayName}</div>
                        <div style={{ color:"var(--muted)", fontSize:12, marginTop:2 }}>{user.email}</div>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:5, padding:"2px 8px", borderRadius:20, fontSize:10, textTransform:"uppercase", letterSpacing:.6, background:"var(--primary-bg)", color:"var(--primary)", border:"1px solid var(--primary-border)", fontWeight:800, fontFamily:"'Bricolage Grotesque',sans-serif" }}>
                          <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--primary)", display:"inline-block" }} />
                          {rm.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding:"8px 8px 6px" }}>
                    {[
                      { icon:"🏠", label:t("nav.dashboard"),   to:homeLink, desc:t("common.yoursDashboard") },
                      { icon:"👤", label:t("nav.viewProfile"), to:"/profile", desc:t("common.manageAccount") },
                      { icon:"💬", label:t("support.title"), action:() => { setUserOpen(false); setSupportOpen(true); }, desc:"Chat with our team" },
                    ].map(item => item.to ? (
                      <Link key={item.label} to={item.to} onClick={() => setUserOpen(false)}
                        style={{ display:"flex", alignItems:"center", gap:11, padding:"10px 12px", borderRadius:11, textDecoration:"none", color:"var(--text-secondary)", transition:"background .13s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--primary-bg)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                      >
                        <div style={{ width:34, height:34, borderRadius:10, background:"var(--surface-hover)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:16 }}>{item.icon}</div>
                        <div>
                          <div style={{ fontSize:13.5, fontWeight:700, color:"var(--text)", lineHeight:1.2, fontFamily:"'Bricolage Grotesque',sans-serif" }}>{item.label}</div>
                          <div style={{ fontSize:11.5, color:"var(--muted)", marginTop:1 }}>{item.desc}</div>
                        </div>
                      </Link>
                    ) : (
                      <MenuBtn key={item.label} icon={item.icon} label={item.label} desc={item.desc} onClick={item.action} />
                    ))}
                    <div style={{ height:"1px", background:"var(--border)", margin:"6px 4px" }} />
                    <MenuBtn icon="🚪" label={t("nav.logout")} desc={t("common.signOutAccount")} onClick={handleLogout} danger />
                  </div>
                  <div style={{ padding:"8px 14px 10px", borderTop:"1px solid var(--border)", textAlign:"center" }}>
                    <span style={{ fontSize:11, color:"var(--muted)" }}>{t("nav.secureSession")}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Desktop: Sign in link */}
              <Link to="/login"
                className="navbar-guest-support-desktop"
                title="Sign in to GeoServe"
                style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 16px", background:"var(--surface)", border:"1.5px solid var(--border)", color:"var(--text-secondary)", borderRadius:20, fontWeight:600, fontSize:13, textDecoration:"none", transition:"all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="var(--primary-border)"; e.currentTarget.style.background="var(--primary-bg)"; e.currentTarget.style.color="var(--primary)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.background="var(--surface)"; e.currentTarget.style.color="var(--text-secondary)"; }}
              >
                <span>💬</span>
                <span className="sidebar-hidden-mobile">{t("support.title")}</span>
              </Link>
              {/* Mobile: Three-dot menu */}
              <div ref={guestMenuRef} className="navbar-guest-threedot-mobile" style={{ position:"relative", display:"none" }}>
                <button
                  onClick={() => setGuestMenuOpen(o => !o)}
                  aria-label="Menu"
                  style={{
                    background: guestMenuOpen ? "var(--primary-bg)" : "var(--surface)",
                    border:`1.5px solid ${guestMenuOpen ? "var(--primary-border)" : "var(--border)"}`,
                    borderRadius:12, width:40, height:40, padding:0,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    cursor:"pointer", color: guestMenuOpen ? "var(--primary)" : "var(--text-secondary)",
                    fontSize:18, fontWeight:900, letterSpacing:0, lineHeight:1,
                    transition:"all .15s",
                  }}
                >⋮</button>
                {guestMenuOpen && (
                  <div style={{
                    position:"absolute", top:"calc(100% + 8px)", right:0,
                    width:220, background:"var(--surface)", border:"1.5px solid var(--border)",
                    borderRadius:16, boxShadow:"0 16px 48px rgba(0,0,0,.18)", zIndex:9999,
                    overflow:"hidden", padding:"8px",
                  }}>
                    <div style={{ padding:"10px 12px 8px", borderBottom:"1px solid var(--border)", marginBottom:6 }}>
                      <div style={{ fontSize:13, fontWeight:800, color:"var(--text)", fontFamily:"'Bricolage Grotesque',sans-serif" }}>GeoServe</div>
                      <div style={{ fontSize:11, color:"var(--muted)", marginTop:1 }}>{t("nav.localServicesPlatform")}</div>
                    </div>
                    <Link to="/login"
                      onClick={() => setGuestMenuOpen(false)}
                      style={{ display:"flex", alignItems:"center", gap:11, padding:"10px 12px", borderRadius:11, textDecoration:"none", color:"var(--text-secondary)", fontSize:13.5, fontWeight:700, fontFamily:"'Manrope',sans-serif" }}
                      onMouseEnter={e => e.currentTarget.style.background="var(--primary-bg)"}
                      onMouseLeave={e => e.currentTarget.style.background="none"}
                    >
                      <div style={{ width:34, height:34, borderRadius:10, background:"var(--primary-bg)", border:"1px solid var(--primary-border)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <Icon name="log-in" size={15} color="var(--primary)" />
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:"var(--text)", lineHeight:1.2 }}>{t("nav.signIn")}</div>
                        <div style={{ fontSize:11, color:"var(--muted)", marginTop:1 }}>{t("nav.accessYourAccount")}</div>
                      </div>
                    </Link>
                    <Link to="/signup"
                      onClick={() => setGuestMenuOpen(false)}
                      style={{ display:"flex", alignItems:"center", gap:11, padding:"10px 12px", borderRadius:11, textDecoration:"none", color:"var(--text-secondary)", fontSize:13.5, fontWeight:700, fontFamily:"'Manrope',sans-serif" }}
                      onMouseEnter={e => e.currentTarget.style.background="var(--primary-bg)"}
                      onMouseLeave={e => e.currentTarget.style.background="none"}
                    >
                      <div style={{ width:34, height:34, borderRadius:10, background:"var(--green-bg)", border:"1px solid var(--green-border)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <Icon name="user-plus" size={15} color="var(--green)" />
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:"var(--text)", lineHeight:1.2 }}>{t("nav.signUp")}</div>
                        <div style={{ fontSize:11, color:"var(--muted)", marginTop:1 }}>{t("nav.createNewAccount")}</div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Mobile menu button (logged-in users) ── */}
          {user && (
            <div ref={mobileMenuRef} className="navbar-threedot-mobile" style={{ position:"relative", display:"none" }}>
              <button
                className="navbar-mobile-menu-btn"
                onClick={() => { setMenuOpen(o => !o); setUserOpen(false); }}
                aria-label="Open navigation menu"
                aria-expanded={menuOpen}
                style={{
                  background: menuOpen ? "var(--primary-bg)" : "var(--surface)",
                  borderColor: menuOpen ? "var(--primary-border)" : "var(--border)",
                  color: menuOpen ? "var(--primary)" : "var(--text-secondary)",
                  border: `1.5px solid ${menuOpen ? "var(--primary-border)" : "var(--border)"}`,
                  borderRadius:12, width:40, height:40, padding:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  cursor:"pointer", transition:"all .15s", flexShrink:0,
                  boxShadow: menuOpen ? "0 0 0 3px var(--primary-soft)" : "none",
                }}
              >
                <Icon name="menu" size={20} color="currentColor" />
              </button>

              {menuOpen && (
                <div className="navbar-mobile-dropdown" style={{
                  position:"absolute", top:"calc(100% + 10px)", right:0,
                  minWidth:260, background:"var(--surface)", border:"1.5px solid var(--border)",
                  borderRadius:20, boxShadow:"var(--shadow-xl)", overflow:"hidden",
                  animation:"dropIn .18s cubic-bezier(.16,1,.3,1)", zIndex:300,
                }}>
                  <div style={{ padding:"16px 16px 13px", borderBottom:"1px solid var(--border)", background:"linear-gradient(135deg,var(--primary-bg),var(--teal-bg))" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:11 }}>
                      <div style={{ position:"relative", flexShrink:0 }}>
                        <img src={user.avatar || fb} onError={e => { e.target.src = fb; }}
                          style={{ width:40, height:40, borderRadius:"50%", objectFit:"cover", border:"2px solid var(--primary-border)", display:"block" }}
                        />
                        <div style={{ position:"absolute", bottom:1, right:1, width:10, height:10, borderRadius:"50%", background:"#22c55e", border:"2px solid var(--surface)" }} />
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:14, color:"var(--text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{displayName}</div>
                        <div style={{ fontSize:11.5, color:"var(--muted)", marginTop:2 }}>{user.email}</div>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:5, padding:"2px 8px", borderRadius:20, fontSize:9.5, textTransform:"uppercase", letterSpacing:.6, background:"var(--primary-bg)", color:"var(--primary)", border:"1px solid var(--primary-border)", fontWeight:800, fontFamily:"'Bricolage Grotesque',sans-serif" }}>
                          <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--primary)", display:"inline-block" }} />
                          {rm.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding:"6px 6px 8px" }}>
                    <MenuBtn icon="🏠" label={t("nav.dashboard")} desc={t("common.yoursDashboard")} onClick={() => { nav(homeLink); setMenuOpen(false); }} />
                    <MenuBtn icon="👤" label={t("nav.myProfile")} desc={t("common.manageAccount")} onClick={() => { nav("/profile"); setMenuOpen(false); }} />
                    <MenuBtn icon="⚙️" label={t("adminSidebar.profile")} desc={t("adminSidebar.profile")} onClick={() => { nav("/profile#settings"); setMenuOpen(false); }} />
                    <MenuBtn icon="💬" label={t("support.title")} desc={t("support.title")} onClick={() => { setMenuOpen(false); setSupportOpen(true); }} />
                    {/* Theme toggle row */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", borderRadius:11, margin:"2px 0" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:11 }}>
                        <div style={{ width:34, height:34, borderRadius:10, background:"var(--surface-hover)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:16 }}>🎨</div>
                        <div>
                          <div style={{ fontSize:13.5, fontWeight:700, color:"var(--text)", lineHeight:1.2, fontFamily:"'Bricolage Grotesque',sans-serif" }}>Dark Mode</div>
                          <div style={{ fontSize:11.5, color:"var(--muted)", marginTop:1 }}>Toggle theme</div>
                        </div>
                      </div>
                      <ThemeToggle />
                    </div>
                    <div style={{ height:1, background:"var(--border)", margin:"6px 4px" }} />
                    <MenuBtn icon="🚪" label={t("nav.signOut")} desc={t("common.signOutAccount")} onClick={handleLogout} danger />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {supportOpen && user && (
        <SupportChat user={user} onClose={() => setSupportOpen(false)} onToast={onToast} />
      )}
    </>
  );
}
