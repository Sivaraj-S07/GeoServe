import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as api from "../api";
import Icon from "../components/Icon";
import PincodeSelector from "../components/PincodeSelector";

const ROLE_OPTIONS = [
  {
    id: "user",
    label: "User Account",
    subtitle: "Book workers near you",
    icon: "user",
    color: "#059669",
    lightColor: "#ecfdf5",
    borderColor: "#a7f3d0",
    gradient: "linear-gradient(135deg, #059669, #34d399)",
  },
  {
    id: "worker",
    label: "Worker Account",
    subtitle: "Offer your services",
    icon: "briefcase",
    color: "#2563eb",
    lightColor: "#eff6ff",
    borderColor: "#bfdbfe",
    gradient: "linear-gradient(135deg, #2563eb, #60a5fa)",
  },
];

export default function SignupPage({ onToast }) {
  const { signup } = useAuth();
  const nav = useNavigate();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showPass, setShowPass] = useState(false);
  const [f, setF] = useState({ name: "", email: "", password: "", phone: "", categoryId: "", bio: "", lat: "", lng: "", pincode: "", street: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.getCategories().then(setCategories); }, []);

  const rc = ROLE_OPTIONS.find(r => r.id === role);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const selectRole = (r) => { setRole(r.id); setErr(""); setStep(2); };
  const goBack = () => { setStep(1); setErr(""); };

  const getLocation = () => {
    if (!navigator.geolocation) { setErr("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("lat", pos.coords.latitude.toFixed(6));
        set("lng", pos.coords.longitude.toFixed(6));
      },
      () => setErr("Could not get your location. Please enter manually.")
    );
  };

  const submit = async () => {
    if (!f.name || !f.email || !f.password) { setErr("Please fill all required fields"); return; }
    if (!f.email.toLowerCase().endsWith("@gmail.com")) { setErr("Only Gmail accounts (@gmail.com) are accepted"); return; }
    if (f.password.length < 6) { setErr("Password must be at least 6 characters"); return; }
    if (role === "worker" && (!f.phone || !f.categoryId)) { setErr("Workers need phone and category"); return; }
    if (role === "worker" && f.phone.replace(/\D/g, "").length !== 10) { setErr("Phone number must be exactly 10 digits"); return; }
    setBusy(true); setErr("");
    try {
      const user = await signup({ ...f, role });
      onToast(`Welcome, ${user.name.split(" ")[0]}!`);
      nav(role === "worker" ? "/verify-worker" : "/home");
    } catch (e) {
      setErr(e.response?.data?.error || "Signup failed");
    } finally { setBusy(false); }
  };

  return (
    <div style={{
      minHeight: "calc(100vh - 64px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 24px",
      background: "linear-gradient(135deg, #f5f3ff 0%, #f8fafc 50%, #eff6ff 100%)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -100, left: -100, width: 350, height: 350, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(79,70,229,.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -60, right: -60, width: 280, height: 280, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(5,150,105,.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div className="card anim-up auth-form-card" style={{ width: "100%", maxWidth: 520, padding: "40px 36px", position: "relative" }}>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -.5, marginBottom: 4 }}>
            Join GeoServe
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            {step === 1 ? "Choose the type of account to create" : `Creating a ${rc?.id} account`}
          </p>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="anim-fade">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectRole(r)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "16px 18px",
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
                    width: 48, height: 48, borderRadius: 13,
                    background: r.gradient,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: `0 4px 14px ${r.color}44`,
                  }}>
                    <Icon name={r.icon} size={22} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", fontFamily: "'Outfit',sans-serif", letterSpacing: -.2 }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{r.subtitle}</div>
                  </div>
                  <Icon name="chevron-right" size={16} color="var(--muted-light)" />
                </button>
              ))}
            </div>

            <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 14, marginTop: 20 }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
            </p>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && rc && (
          <div className="anim-fade">
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px",
              background: rc.lightColor, border: `1.5px solid ${rc.borderColor}`,
              borderRadius: 10, marginBottom: 20,
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: rc.color, fontFamily: "'Outfit',sans-serif" }}>{rc.label}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{rc.subtitle}</div>
                </div>
              </div>
              <button onClick={goBack} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--muted)", fontSize: 12, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 4, padding: "4px 8px",
                borderRadius: 6, fontFamily: "inherit",
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
                <label>Full Name *</label>
                <input value={f.name} onChange={e => set("name", e.target.value)} placeholder="Your full name" />
              </div>
              <div>
                <label>Gmail Address *</label>
                <input type="email" value={f.email} onChange={e => set("email", e.target.value)} placeholder="you@gmail.com" />
              </div>
              <div>
                <label>Password *</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPass ? "text" : "password"}
                    value={f.password} onChange={e => set("password", e.target.value)}
                    placeholder="Min 6 characters"
                    style={{ paddingRight: 44 }}
                  />
                  <button onClick={() => setShowPass(s => !s)} style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: 4,
                    borderRadius: 6, display: "flex", alignItems: "center",
                  }}>
                    <Icon name={showPass ? "eye-off" : "eye"} size={16} color="var(--muted)" />
                  </button>
                </div>
              </div>

              {role === "user" && (
                <>
                  <div style={{ height: 1, background: "var(--border)", margin: "2px 0" }} />
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: ".06em", margin: 0, fontFamily: "'Outfit',sans-serif" }}>
                    YOUR LOCATION
                  </p>
                  <PincodeSelector
                    pincode={f.pincode}
                    street={f.street}
                    onPincodeChange={v => set("pincode", v)}
                    onStreetChange={v => set("street", v)}
                    accentColor={rc.color}
                    accentLight={rc.lightColor}
                    accentBorder={rc.borderColor}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label>Latitude (optional)</label>
                      <input value={f.lat} onChange={e => set("lat", e.target.value)} placeholder="Auto-detected" />
                    </div>
                    <div>
                      <label>Longitude (optional)</label>
                      <input value={f.lng} onChange={e => set("lng", e.target.value)} placeholder="Auto-detected" />
                    </div>
                  </div>
                  <button onClick={getLocation} style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "9px 14px",
                    background: rc.lightColor, border: `1px solid ${rc.borderColor}`,
                    borderRadius: 8, cursor: "pointer", fontSize: 13,
                    color: rc.color, fontWeight: 600, fontFamily: "inherit",
                    transition: "all .15s",
                  }}>
                    <Icon name="map-pin" size={14} color={rc.color} /> Detect GPS Location
                  </button>
                </>
              )}

              {role === "worker" && (
                <>
                  <div style={{ height: 1, background: "var(--border)", margin: "2px 0" }} />
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: ".06em", margin: 0, fontFamily: "'Outfit',sans-serif" }}>
                    WORKER DETAILS
                  </p>
                  <div>
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      value={f.phone}
                      onChange={e => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                        set("phone", digits);
                      }}
                      maxLength={10}
                      pattern="[0-9]{10}"
                      inputMode="numeric"
                      placeholder="10-digit mobile number"
                    />
                  </div>
                  <div>
                    <label>Service Category *</label>
                    <select value={f.categoryId} onChange={e => set("categoryId", e.target.value)}>
                      <option value="">Select a category…</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Bio (optional)</label>
                    <textarea
                      value={f.bio} onChange={e => set("bio", e.target.value)}
                      rows={2} style={{ resize: "vertical" }}
                      placeholder="Brief description of your experience…"
                    />
                  </div>

                  <div style={{ height: 1, background: "var(--border)", margin: "2px 0" }} />
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: ".06em", margin: 0, fontFamily: "'Outfit',sans-serif" }}>
                    YOUR LOCATION
                  </p>
                  <PincodeSelector
                    pincode={f.pincode}
                    street={f.street}
                    onPincodeChange={v => set("pincode", v)}
                    onStreetChange={v => set("street", v)}
                    accentColor={rc.color}
                    accentLight={rc.lightColor}
                    accentBorder={rc.borderColor}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label>Latitude (optional)</label>
                      <input value={f.lat} onChange={e => set("lat", e.target.value)} placeholder="Auto-detected" />
                    </div>
                    <div>
                      <label>Longitude (optional)</label>
                      <input value={f.lng} onChange={e => set("lng", e.target.value)} placeholder="Auto-detected" />
                    </div>
                  </div>
                  <button onClick={getLocation} style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "9px 14px",
                    background: rc.lightColor, border: `1px solid ${rc.borderColor}`,
                    borderRadius: 8, cursor: "pointer", fontSize: 13,
                    color: rc.color, fontWeight: 600, fontFamily: "inherit",
                  }}>
                    <Icon name="map-pin" size={14} color={rc.color} /> Detect GPS Location
                  </button>

                  <div style={{
                    background: "var(--amber-bg)", border: "1px solid var(--amber-light)",
                    borderRadius: 9, padding: "10px 14px", fontSize: 12, color: "#92400e",
                    display: "flex", alignItems: "flex-start", gap: 8,
                  }}>
                    <Icon name="alert-circle" size={13} color="#d97706" style={{ marginTop: 1 }} />
                    <span>Your profile will be reviewed and approved by an admin before going live.</span>
                  </div>
                </>
              )}

              <button
                onClick={submit}
                disabled={busy}
                style={{
                  width: "100%", justifyContent: "center", padding: "13px 0", fontSize: 15,
                  background: rc.gradient, color: "white", border: "none",
                  borderRadius: 10, fontWeight: 700,
                  fontFamily: "'Outfit',sans-serif", cursor: busy ? "default" : "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                  transition: "all .2s cubic-bezier(.34,1.56,.64,1)",
                  opacity: busy ? 0.7 : 1,
                  marginTop: 4, boxShadow: `0 4px 20px ${rc.color}44`,
                  letterSpacing: -.2,
                }}
                onMouseEnter={e => { if (!busy) e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {busy ? (
                  <><div className="spinner" /> Creating account…</>
                ) : (
                  <><Icon name="user-plus" size={16} color="white" /> Create {rc.label}</>
                )}
              </button>

              <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
                Already have an account?{" "}
                <Link to="/login" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
