import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import * as api from "../api";
import Icon, { getCategoryIcon, CategoryChip, isImageIcon, resolveIconUrl } from "../components/Icon";
import PincodeSelector from "../components/PincodeSelector";

// NOTE: This standalone page is not currently wired into App.jsx routing —
// the live "/signup" route renders LoginPage.jsx (tab switch) instead. This
// file is kept in sync with LoginPage's signup form (including the
// mandatory mobile number field) in
// case it's reintroduced as a dedicated route in the future.

const ROLE_OPTIONS = [
  {
    id: "user",
    label: "User Account",
    subtitle: "Book workers near you",
    icon: "user",
    color: "var(--primary)",
    lightColor: "var(--primary-bg)",
    borderColor: "var(--primary-border)",
    gradient: "linear-gradient(135deg,#2563eb,#3b82f6,#059669)",
  },
  {
    id: "worker",
    label: "Worker Account",
    subtitle: "Offer your services",
    icon: "briefcase",
    color: "#059669",
    lightColor: "#ecfdf5",
    borderColor: "#6ee7b7",
    gradient: "linear-gradient(135deg,#059669,#10b981,#34d399)",
  },
];

export default function SignupPage({ onToast }) {
  const { signup } = useAuth();
  const nav = useNavigate();

  const [step, setStep] = useState(1);
  const { t } = useTranslation();
  const [role, setRole] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showPass, setShowPass] = useState(false);
  const [f, setF] = useState({ nameEn:"", email:"", password:"", phone:"", categoryId:"", bio:"", lat:"", lng:"", pincode:"", street:"", aadhaar:"" });
  const [aadhaarError, setAadhaarError] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.getCategories().then(setCategories); }, []);
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

  const rc = ROLE_OPTIONS.find(r => r.id === role);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const selectRole = (r) => { setRole(r.id); setErr(""); setStep(2); };
  const goBack = () => { setStep(1); setErr(""); };

  const getLocation = () => {
    if (!navigator.geolocation) { setErr(t("login.geolocationNotSupported", { defaultValue: "Geolocation not supported" })); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { set("lat", pos.coords.latitude.toFixed(6)); set("lng", pos.coords.longitude.toFixed(6)); },
      () => setErr(t("login.locationError", { defaultValue: "Could not get your location. Please enter manually." }))
    );
  };

  const submit = async () => {
    if (!f.nameEn.trim() || !f.email || !f.password) { setErr(t("login.fillAllFields", { defaultValue: "Please fill all required fields" })); return; }
    if (!f.email.toLowerCase().endsWith("@gmail.com")) { setErr(t("login.gmailOnly", { defaultValue: "Only Gmail accounts are accepted" })); return; }
    if (f.password.length < 6) { setErr(t("login.passwordMinLength", { defaultValue: "Password must be at least 6 characters" })); return; }
    if (!f.phone || f.phone.replace(/\D/g, "").length !== 10) { setErr(t("login.phoneTenDigits", { defaultValue: "Mobile number is required and must be exactly 10 digits" })); return; }
    if (role === "worker" && !f.categoryId) { setErr(t("login.workersNeedCategory", { defaultValue: "Workers need a service category" })); return; }
    if (role === "worker") {
      const aadhaarClean = f.aadhaar.replace(/\D/g, "");
      if (aadhaarClean.length !== 12) { setErr("Aadhaar number must be exactly 12 digits"); return; }
    }
    setBusy(true); setErr("");
    try {
      const user = await signup({ ...f, role });
      onToast(`Welcome, ${(user.nameEn || user.name || "").split(" ")[0]}!`);
      nav(role === "worker" ? "/verify-worker" : "/home", { replace: true });
    } catch (e) {
      setErr(e.message || t("login.signupFailed", { defaultValue: "Signup failed" }));
    } finally { setBusy(false); }
  };

  return (
    <div style={{
      minHeight:"calc(100vh - 66px)", display:"flex", alignItems:"flex-start",
      justifyContent:"center", padding:"40px 24px 80px",
      background:"var(--bg)", position:"relative", overflowX:"hidden", overflowY:"auto",
    }}>
      {/* Background blobs */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-120, left:-120, width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(37,99,235,.07) 0%,transparent 70%)" }} />
        <div style={{ position:"absolute", bottom:-80, right:-80, width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle,rgba(5,150,105,.06) 0%,transparent 70%)" }} />
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:.04 }} xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="dots2" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="#2563eb"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#dots2)"/>
        </svg>
      </div>

      <div style={{ width:"100%", maxWidth:520, position:"relative", zIndex:1 }}>
        <div className="card anim-up" style={{
          width:"100%", padding:0, position:"relative",
          background:"var(--surface)", border:"1.5px solid var(--border)",
          borderRadius:"var(--radius-2xl)", boxShadow:"var(--shadow-xl)",
        }}>
          {/* Top gradient bar */}
          <div style={{ height:3, background:"linear-gradient(90deg,#2563eb,#3b82f6,#059669)", borderRadius:"var(--radius-2xl) var(--radius-2xl) 0 0" }} />
          <div className="signup-card-inner" style={{ padding:"32px 32px 36px" }}>

          {/* Logo + Title */}
          <div style={{ textAlign:"center", marginBottom:26 }}>
            <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:12 }}>
              <img src="/logo.svg" alt="GeoServe" width={36} height={36} style={{ borderRadius:"50%", boxShadow:"0 4px 14px rgba(37,99,235,.40)", display:"block" }} />
              <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:800, fontSize:20, color:"var(--text)", letterSpacing:-.4 }}>
                Geo<span style={{ background:"linear-gradient(135deg,#2563eb,#059669)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Serve</span>
              </span>
            </div>
            <h2 style={{ fontSize:22, fontWeight:800, letterSpacing:-.5, marginBottom:5, fontFamily:"'Bricolage Grotesque',sans-serif" }}>
              {step === 1 ? t("login.createAccount") : t("login.settingUp", { role: rc?.label })}
            </h2>
            <p style={{ color:"var(--muted)", fontSize:13.5 }}>
              {step === 1 ? t("login.chooseTypeToCreate") : t("login.fillDetails")}
            </p>
          </div>

          {/* STEP 1 — Role select */}
          {step === 1 && (
            <div className="anim-fade">
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {ROLE_OPTIONS.map((r) => (
                  <button key={r.id} onClick={() => selectRole(r)}
                    style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 18px", background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:14, cursor:"pointer", transition:"all .22s cubic-bezier(.34,1.56,.64,1)", textAlign:"left", fontFamily:"inherit" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor=r.borderColor; e.currentTarget.style.background=r.lightColor; e.currentTarget.style.transform="translateX(6px) scale(1.01)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.background="var(--surface)"; e.currentTarget.style.transform="none"; }}
                  >
                    <div style={{ width:48, height:48, borderRadius:13, background:r.gradient, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 6px 16px rgba(37,99,235,.30)` }}>
                      <Icon name={r.icon} size={22} color="white" />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:"var(--text)", fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:-.2 }}>{r.label}</div>
                      <div style={{ fontSize:12.5, color:"var(--muted)", marginTop:2 }}>{r.subtitle}</div>
                    </div>
                    <Icon name="chevron-right" size={16} color="var(--muted-light)" />
                  </button>
                ))}
              </div>
              <p style={{ textAlign:"center", color:"var(--muted)", fontSize:13.5, marginTop:22 }}>
                Already have an account?{" "}<Link to="/login" style={{ color:"var(--primary)", fontWeight:700, textDecoration:"none" }}>{t("login.signIn")}</Link>
              </p>
            </div>
          )}

          {/* STEP 2 — Form */}
          {step === 2 && rc && (
            <div className="anim-fade">
              {/* Role pill */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:rc.lightColor, border:`1.5px solid ${rc.borderColor}`, borderRadius:12, marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:rc.gradient, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Icon name={rc.icon} size={15} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:rc.color, fontFamily:"'Bricolage Grotesque',sans-serif" }}>{rc.label}</div>
                    <div style={{ fontSize:11, color:"var(--muted)" }}>{rc.subtitle}</div>
                  </div>
                </div>
                <button onClick={goBack} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:4, padding:"4px 8px", borderRadius:6, fontFamily:"inherit" }}>
                  <Icon name="arrow-left" size={12} color="var(--muted)" /> Change
                </button>
              </div>

              {err && (
                <div style={{ background:"var(--red-soft)", border:"1px solid var(--red-border)", borderRadius:10, padding:"10px 14px", marginBottom:16, color:"var(--red)", fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
                  <Icon name="alert-circle" size={14} color="var(--red)" /> {err}
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div><label>{t("login.fullName", { defaultValue: "Name *" })}</label><input value={f.nameEn} onChange={e => set("nameEn", e.target.value)} placeholder={t("login.fullNamePlaceholder", { defaultValue: "Your full name" })} /></div>
                <div><label>Gmail Address *</label><input type="email" value={f.email} onChange={e => set("email", e.target.value)} placeholder="you@gmail.com" /></div>
                <div>
                  <label>Password *</label>
                  <div style={{ position:"relative" }}>
                    <input type={showPass ? "text" : "password"} value={f.password} onChange={e => set("password", e.target.value)} placeholder="Min 6 characters" style={{ paddingRight:44 }} />
                    <button onClick={() => setShowPass(s => !s)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", padding:4, display:"flex", alignItems:"center" }}>
                      <Icon name={showPass ? "eye-off" : "eye"} size={16} color="var(--muted)" />
                    </button>
                  </div>
                </div>

                {/* User-only location */}
                {role === "user" && (
                  <>
                    <div style={{ height:1, background:"var(--border)", margin:"2px 0" }} />
                    <div>
                      <label>{t("login.mobileNumber", { defaultValue: "Mobile Number *" })}</label>
                      <input type="tel" value={f.phone} onChange={e => { const d=e.target.value.replace(/\D/g,"").slice(0,10); set("phone",d); }} maxLength={10} inputMode="numeric" placeholder={t("login.mobileNumberPlaceholder", { defaultValue: "10-digit mobile number" })} required />
                    </div>
                    <label style={{ marginBottom:0 }}>{t("login.yourLocation", { defaultValue: "YOUR LOCATION" })}</label>
                    <PincodeSelector pincode={f.pincode} street={f.street} onPincodeChange={v => set("pincode",v)} onStreetChange={v => set("street",v)} accentColor={rc.color} accentLight={rc.lightColor} accentBorder={rc.borderColor} />
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      <div><label>{t("login.latitudeOptional", { defaultValue: "Latitude (optional)" })}</label><input value={f.lat} onChange={e => set("lat", e.target.value)} placeholder="Auto-detected" /></div>
                      <div><label>{t("login.longitudeOptional", { defaultValue: "Longitude (optional)" })}</label><input value={f.lng} onChange={e => set("lng", e.target.value)} placeholder="Auto-detected" /></div>
                    </div>
                    <button onClick={getLocation} style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 14px", background:rc.lightColor, border:`1px solid ${rc.borderColor}`, borderRadius:9, cursor:"pointer", fontSize:13, color:rc.color, fontWeight:600, fontFamily:"inherit" }}>
                      <Icon name="map-pin" size={14} color={rc.color} /> {t("login.detectGPSLocation", { defaultValue: "Detect GPS Location" })}
                    </button>
                  </>
                )}

                {/* Worker-only fields */}
                {role === "worker" && (
                  <>
                    <div style={{ height:1, background:"var(--border)", margin:"2px 0" }} />
                    <label style={{ marginBottom:0, color:"#059669", fontWeight:800, letterSpacing:".08em" }}>{t("login.workerDetails", { defaultValue: "WORKER DETAILS" })}</label>
                    <div>
                      <label>{t("login.mobileNumber", { defaultValue: "Mobile Number *" })}</label>
                      <input type="tel" value={f.phone} onChange={e => { const d=e.target.value.replace(/\D/g,"").slice(0,10); set("phone",d); }} maxLength={10} inputMode="numeric" placeholder="10-digit mobile number" required />
                    </div>
                    <div>
                      <label>Aadhaar Number * <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 11 }}>(12 digits)</span></label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", zIndex: 1, display: "flex", alignItems: "center" }}>
                          <Icon name="shield" size={15} color="var(--muted-light)" />
                        </span>
                        <input
                          type="text"
                          value={f.aadhaar}
                          onChange={e => {
                            const d = e.target.value.replace(/\D/g, "").slice(0, 12);
                            set("aadhaar", d);
                            if (aadhaarError) setAadhaarError("");
                          }}
                          maxLength={12}
                          inputMode="numeric"
                          placeholder="12-digit Aadhaar number"
                          style={{ paddingLeft: 33, letterSpacing: f.aadhaar ? 2 : 0 }}
                        />
                      </div>
                      {f.aadhaar && f.aadhaar.length > 0 && f.aadhaar.length < 12 && (
                        <div style={{ fontSize: 11, color: "var(--amber)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                          <Icon name="alert-circle" size={11} color="var(--amber)" />
                          {12 - f.aadhaar.length} more digits needed
                        </div>
                      )}
                      {f.aadhaar && f.aadhaar.length === 12 && (
                        <div style={{ fontSize: 11, color: "var(--green)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                          <Icon name="check-circle" size={11} color="var(--green)" />
                          Aadhaar number looks valid
                        </div>
                      )}
                      {aadhaarError && (
                        <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                          <Icon name="alert-circle" size={11} color="#dc2626" />
                          {aadhaarError}
                        </div>
                      )}
                    </div>
                    <div>
                      <label>{t("login.serviceCategory", { defaultValue: "Service Category *" })}</label>
                      {categories.length > 0 ? (
                        <div className="gs-signup-cat-grid">
                          {categories.map(c => {
                            const sel = String(f.categoryId) === String(c.id);
                            return (
                              <button
                                key={c.id} type="button"
                                onClick={() => set("categoryId", String(c.id))}
                                className={`gs-cat-tile${sel ? " is-selected" : ""}`}
                                style={{ "--cat-accent": rc.color, "--cat-accent-bg": rc.lightColor }}
                                aria-pressed={sel}
                              >
                                {sel && (
                                  <span className="gs-cat-tile-check">
                                    <Icon name="check" size={11} color="white" strokeWidth={3} />
                                  </span>
                                )}
                                <div className="gs-cat-tile-icon">
                                  {isImageIcon(c.icon)
                                    ? <img src={resolveIconUrl(c.icon)} alt="" width={58} height={58} style={{ objectFit: "cover", borderRadius: 14, display: "block" }} />
                                    : <Icon name={getCategoryIcon(c.icon || c.name)} size={28} color={sel ? "white" : "var(--muted)"} strokeWidth={1.8} />}
                                </div>
                                <span className="gs-cat-tile-name">{t(`categoryNames.${c.name}`, { defaultValue: c.name })}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", zIndex: 1, display: "flex", alignItems: "center" }}>
                            <Icon name="layers" size={15} color="var(--muted-light)" />
                          </span>
                          <select value={f.categoryId} onChange={e => set("categoryId", e.target.value)} style={{ paddingLeft: 33 }}>
                            <option value="">Select a category…</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{t(`categoryNames.${c.name}`, { defaultValue: c.name })}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <div>
                      <label>{t("login.bioOptional", { defaultValue: "Bio (optional)" })}</label>
                      <textarea value={f.bio} onChange={e => set("bio", e.target.value)} rows={2} style={{ resize:"vertical" }} placeholder="Brief description of your experience…" />
                    </div>
                    <div style={{ height:1, background:"var(--border)", margin:"2px 0" }} />
                    <label style={{ marginBottom:0 }}>{t("login.yourLocation", { defaultValue: "YOUR LOCATION" })}</label>
                    <PincodeSelector pincode={f.pincode} street={f.street} onPincodeChange={v => set("pincode",v)} onStreetChange={v => set("street",v)} accentColor={rc.color} accentLight={rc.lightColor} accentBorder={rc.borderColor} />
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      <div><label>{t("login.latitudeOptional", { defaultValue: "Latitude (optional)" })}</label><input value={f.lat} onChange={e => set("lat", e.target.value)} placeholder="Auto-detected" /></div>
                      <div><label>{t("login.longitudeOptional", { defaultValue: "Longitude (optional)" })}</label><input value={f.lng} onChange={e => set("lng", e.target.value)} placeholder="Auto-detected" /></div>
                    </div>
                    <button onClick={getLocation} style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 14px", background:rc.lightColor, border:`1px solid ${rc.borderColor}`, borderRadius:9, cursor:"pointer", fontSize:13, color:rc.color, fontWeight:600, fontFamily:"inherit" }}>
                      <Icon name="map-pin" size={14} color={rc.color} /> {t("login.detectGPSLocation", { defaultValue: "Detect GPS Location" })}
                    </button>
                    <div style={{ background:"var(--amber-bg)", border:"1px solid var(--amber-border)", borderRadius:10, padding:"11px 14px", fontSize:12, color:"#92400e", display:"flex", alignItems:"flex-start", gap:8 }}>
                      <Icon name="alert-circle" size={13} color="#d97706" />
                      <span>{t("login.profileReviewNotice", { defaultValue: "Your profile will be reviewed and approved by an admin before going live." })}</span>
                    </div>
                  </>
                )}

                <button onClick={submit} disabled={busy}
                  style={{ width:"100%", justifyContent:"center", padding:"14px 0", fontSize:15, background:rc.gradient, color:"white", border:"none", borderRadius:12, fontWeight:700, fontFamily:"'Bricolage Grotesque',sans-serif", cursor:busy?"default":"pointer", display:"flex", alignItems:"center", gap:8, transition:"all .22s cubic-bezier(.34,1.56,.64,1)", opacity:busy?0.7:1, boxShadow:"0 6px 22px rgba(37,99,235,.35)", letterSpacing:-.2, marginTop:4 }}
                  onMouseEnter={e => { if(!busy) { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 10px 30px rgba(37,99,235,.50)"; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="0 6px 22px rgba(37,99,235,.35)"; }}
                >
                  {busy ? (<><div className="spinner" /> Creating account…</>) : (<><Icon name="user-plus" size={16} color="white" /> Create {rc.label}</>)}
                </button>

                <p style={{ textAlign:"center", color:"var(--muted)", fontSize:13.5 }}>
                  Already have an account?{" "}<Link to="/login" style={{ color:"var(--primary)", fontWeight:700, textDecoration:"none" }}>{t("login.signIn")}</Link>
                </p>
              </div>
            </div>
          )}
          </div>{/* /inner-padding */}
        </div>
      </div>
    </div>
  );
}
