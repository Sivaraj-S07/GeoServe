import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";

const ROLES = [
  {
    id: "user",
    label: "User",
    subtitle: "Browse & book workers",
    icon: "user",
    color: "#059669",
    lightColor: "#ecfdf5",
    borderColor: "#a7f3d0",
    gradient: "linear-gradient(135deg, #059669, #34d399)",
  },
  {
    id: "worker",
    label: "Worker",
    subtitle: "Manage jobs & profile",
    icon: "briefcase",
    color: "#2563eb",
    lightColor: "#eff6ff",
    borderColor: "#bfdbfe",
    gradient: "linear-gradient(135deg, #2563eb, #60a5fa)",
  },
];

const REDIRECTS = { worker: "/worker", user: "/home" };
const VERIFY_STATUSES = ["unverified", "rejected", undefined, null, ""];

export default function LoginPage({ onToast }) {
  const { login } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const rc = ROLES.find(r => r.id === role);

  const selectRole = (r) => {
    setRole(r.id);
    setEmail("");
    setPass("");
    setErr("");
    setStep(2);
  };

  const goBack = () => { setStep(1); setErr(""); };

  const submit = async () => {
    if (!email || !pass) { setErr("Please fill in all fields"); return; }
    setBusy(true);
    setErr("");
    try {
      const user = await login(email, pass, role);
      onToast(`Welcome back, ${user.name.split(" ")[0]}!`);
      // Workers who haven't verified yet go to the verification page
      if (user.role === "worker" && VERIFY_STATUSES.includes(user.verification_status)) {
        nav("/verify-worker");
      } else {
        nav(REDIRECTS[user.role] || "/");
      }
    } catch (e) {
      setErr(e.response?.data?.error || "Invalid email or password");
    } finally { setBusy(false); }
  };

  return (
    <div style={{
      minHeight: "calc(100vh - 64px)",
      display: "flex",
      background: "linear-gradient(135deg, #eef2ff 0%, #f8fafc 50%, #ecfdf5 100%)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background decoration */}
      <div style={{
        position: "absolute", top: -100, right: -100, width: 400, height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(79,70,229,.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -80, left: -80, width: 300, height: 300,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(5,150,105,.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Left branding panel — hidden on small screens */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px 60px 60px 80px",
        position: "relative",
      }}
        className="sidebar-hidden-mobile"
      >
        <div style={{ marginBottom: 48 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            marginBottom: 32,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg,#4f46e5,#818cf8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(79,70,229,.4)",
            }}>
              <Icon name="globe" size={22} color="white" />
            </div>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: -.5 }}>
              Geo<span style={{ color: "var(--primary)" }}>Serve</span>
            </span>
          </div>

          <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 16, color: "var(--text)" }}>
            Connect with<br />
            <span style={{ color: "var(--primary)" }}>skilled workers</span><br />
            near you.
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.7, maxWidth: 400 }}>
            Find trusted local professionals for any job, book instantly, and track progress — all in one place.
          </p>
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { icon: "map-pin", text: "Location-based worker discovery", color: "var(--primary)" },
            { icon: "calendar", text: "Instant booking & scheduling", color: "var(--green)" },
            { icon: "shield", text: "Verified & approved professionals", color: "var(--purple-mid)" },
          ].map((f, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px",
              background: "rgba(255,255,255,.7)",
              backdropFilter: "blur(10px)",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.8)",
              boxShadow: "0 2px 8px rgba(15,23,42,.06)",
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: `${f.color}15`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Icon name={f.icon} size={16} color={f.color} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-panel" style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 40px",
        minWidth: "min(480px, 100vw)",
      }}>
        <div className="card anim-up auth-form-card" style={{ width: "100%", maxWidth: 440, padding: "40px 36px" }}>

          {/* Logo top for mobile */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -.5, marginBottom: 4 }}>
              {step === 1 ? "Sign in to GeoServe" : `Sign in as ${rc?.label}`}
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>
              {step === 1 ? "Choose your account type to continue" : "Enter your credentials below"}
            </p>
          </div>

          {/* STEP 1: Role selection */}
          {step === 1 && (
            <div className="anim-fade">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => selectRole(r)}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "14px 18px",
                      background: "var(--surface)",
                      border: "2px solid var(--border)",
                      borderRadius: 12,
                      cursor: "pointer",
                      transition: "all .2s cubic-bezier(.34,1.56,.64,1)",
                      textAlign: "left",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = r.borderColor;
                      e.currentTarget.style.background = r.lightColor;
                      e.currentTarget.style.transform = "translateX(6px) scale(1.01)";
                      e.currentTarget.style.boxShadow = `0 4px 16px ${r.color}22`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background = "white";
                      e.currentTarget.style.transform = "translateX(0) scale(1)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: r.gradient,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: `0 4px 14px ${r.color}44`,
                    }}>
                      <Icon name={r.icon} size={20} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", fontFamily: "'Outfit',sans-serif", letterSpacing: -.2 }}>
                        {r.label}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{r.subtitle}</div>
                    </div>
                    <Icon name="chevron-right" size={16} color="var(--muted-light)" />
                  </button>
                ))}
              </div>
              <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 14, marginTop: 24 }}>
                Don't have an account?{" "}
                <Link to="/signup" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>
                  Create one
                </Link>
              </p>
            </div>
          )}

          {/* STEP 2: Login form */}
          {step === 2 && rc && (
            <div className="anim-fade">
              {/* Role badge + back */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px",
                background: rc.lightColor,
                border: `1.5px solid ${rc.borderColor}`,
                borderRadius: 10,
                marginBottom: 20,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: rc.gradient,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name={rc.icon} size={15} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: rc.color, fontFamily: "'Outfit',sans-serif" }}>
                      {rc.label} Account
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{rc.subtitle}</div>
                  </div>
                </div>
                <button onClick={goBack} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--muted)", fontSize: 12, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 4, padding: "4px 8px",
                  borderRadius: 6, fontFamily: "inherit", transition: "color .15s",
                }}>
                  <Icon name="arrow-left" size={13} color="var(--muted)" /> Change
                </button>
              </div>

              {err && (
                <div style={{
                  background: "var(--red-soft)", border: "1px solid var(--red-light)",
                  borderRadius: 10, padding: "11px 14px", marginBottom: 16,
                  color: "var(--red)", fontSize: 13,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <Icon name="alert-circle" size={14} color="var(--red)" /> {err}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label>Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    onKeyDown={e => e.key === "Enter" && submit()}
                  />
                </div>
                <div>
                  <label>Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"}
                      value={pass}
                      onChange={e => setPass(e.target.value)}
                      placeholder="Enter your password"
                      onKeyDown={e => e.key === "Enter" && submit()}
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      onClick={() => setShowPass(s => !s)}
                      style={{
                        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer", padding: 4,
                        color: "var(--muted)", borderRadius: 6,
                        display: "flex", alignItems: "center",
                      }}
                    >
                      <Icon name={showPass ? "eye-off" : "eye"} size={16} color="var(--muted)" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={submit}
                  disabled={busy}
                  style={{
                    width: "100%", justifyContent: "center", padding: "13px 0",
                    fontSize: 15, background: rc.gradient, color: "white",
                    border: "none", borderRadius: 10,
                    fontWeight: 700, fontFamily: "'Outfit',sans-serif", cursor: busy ? "default" : "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                    transition: "all .2s cubic-bezier(.34,1.56,.64,1)",
                    opacity: busy ? 0.7 : 1,
                    boxShadow: `0 4px 20px ${rc.color}44`,
                    letterSpacing: -.2,
                  }}
                  onMouseEnter={e => { if (!busy) e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {busy ? (
                    <><div className="spinner" /> Signing in…</>
                  ) : (
                    <><Icon name={rc.icon} size={16} color="white" /> Sign in as {rc.label}</>
                  )}
                </button>
              </div>

              <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 14, marginTop: 18 }}>
                Don't have an account?{" "}
                <Link to="/signup" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>
                  Sign up
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
