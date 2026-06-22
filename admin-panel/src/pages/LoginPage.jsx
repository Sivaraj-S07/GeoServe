import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

export default function LoginPage({ onToast }) {
  const { login, admin } = useAdmin();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (admin) navigate("/", { replace: true }); }, [admin, navigate]);

  const submit = async () => {
    if (!email || !pass) { setErr(t("adminLogin.fillBoth")); return; }
    setBusy(true); setErr("");
    try {
      await login(email, pass);
      onToast(t("login.welcomeBack2", { name: "Admin" }));
      navigate("/", { replace: true });
    } catch (e) {
      // Provide more helpful error messages
      let msg = e.message || t("adminLogin.invalidCreds");
      if (e.status === 408 || msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("timed out")) {
        msg = "Cannot reach the backend server. Make sure the backend is running and VITE_API_URL is set correctly in your .env file.";
      } else if (e.status === 403) {
        msg = "Access denied. This account does not have admin privileges.";
      } else if (e.status === 401) {
        msg = "Invalid email or password. Default admin: admin@gmail.com / admin123";
      } else if (!e.status && msg.toLowerCase().includes("network")) {
        msg = "Network error — backend server may be offline. Check VITE_API_URL in admin-panel/.env";
      }
      setErr(msg);
    } finally { setBusy(false); }
  };

  const features = [
    { icon: "⚡", key: "realtime" },
    { icon: "🛡️", key: "verification" },
    { icon: "💰", key: "commission" },
  ];

  return (
    <div className="login-page">
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"10%", left:"5%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(37,99,235,.20),transparent 70%)", filter:"blur(80px)" }} />
        <div style={{ position:"absolute", bottom:"10%", right:"5%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(5,150,105,.18),transparent 70%)", filter:"blur(70px)" }} />
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:.04 }} xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,1)" strokeWidth="1"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
        </svg>
      </div>

      <div className="login-left">
        <div style={{ maxWidth:420 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:52 }}>
            <img src="/logo.svg" alt="GeoServe Logo" width={52} height={52} style={{ borderRadius:"50%", boxShadow:"0 6px 22px rgba(37,99,235,.50)", display:"block" }} />
            <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:800, fontSize:26, color:"white", letterSpacing:-.7 }}>GeoServe</span>
          </div>
          <h1 style={{ fontSize:46, fontWeight:800, letterSpacing:-2, lineHeight:1.05, marginBottom:18, color:"white", fontFamily:"'Bricolage Grotesque',sans-serif" }}>
            Platform<br /><span style={{ opacity:.75 }}>Administration</span><br />Dashboard
          </h1>
          <p style={{ color:"rgba(255,255,255,.65)", fontSize:16, lineHeight:1.8, maxWidth:360 }}>{t("adminLogin.desc")}</p>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:36 }}>
            {[
              { icon:"⚡", text:"Real-time booking oversight" },
              { icon:"🛡️", text:"Worker verification & approval" },
              { icon:"💰", text:"Commission & wallet management" },
            ].map((f, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:"rgba(255,255,255,.08)", backdropFilter:"blur(8px)", borderRadius:12, border:"1px solid rgba(255,255,255,.12)" }}>
                <span style={{ fontSize:18 }}>{f.icon}</span>
                <span style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,.85)" }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card" style={{ animation:"animUp .4s cubic-bezier(.16,1,.3,1) both" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ width:54, height:54, borderRadius:"50%", background:"rgba(255,255,255,.15)", border:"2px solid rgba(255,255,255,.25)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", fontSize:22 }}>🛡️</div>
            <h2 style={{ fontSize:22, fontWeight:800, letterSpacing:-.6, marginBottom:5, fontFamily:"'Bricolage Grotesque',sans-serif", color:"white" }}>{t("adminLogin.signIn")}</h2>
            <p style={{ color:"rgba(255,255,255,.55)", fontSize:13.5 }}>{t("adminLogin.signInDesc")}</p>
          </div>

          {err && (
            <div style={{ background:"rgba(220,38,38,.20)", border:"1px solid rgba(248,113,113,.35)", borderRadius:10, padding:"10px 14px", marginBottom:16, color:"#fca5a5", fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
              ⚠️ {err}
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={{ color:"rgba(255,255,255,.55)", fontSize:11, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", marginBottom:6, display:"block" }}>{t("adminLogin.email")}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@geoserve.com"
                onKeyDown={e => e.key === "Enter" && submit()}
                style={{ background:"rgba(255,255,255,.10)", border:"1.5px solid rgba(255,255,255,.18)", color:"white", borderRadius:10 }}
              />
            </div>
            <div>
              <label style={{ color:"rgba(255,255,255,.55)", fontSize:11, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", marginBottom:6, display:"block" }}>{t("adminLogin.password")}</label>
              <div style={{ position:"relative" }}>
                <input type={show ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)} placeholder="Enter admin password"
                  onKeyDown={e => e.key === "Enter" && submit()}
                  style={{ background:"rgba(255,255,255,.10)", border:"1.5px solid rgba(255,255,255,.18)", color:"white", borderRadius:10, paddingRight:44 }}
                />
                <button onClick={() => setShow(s => !s)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,.5)", display:"flex", alignItems:"center", fontSize:16 }}>
                  {show ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            <button onClick={submit} disabled={busy}
              style={{ width:"100%", padding:"14px 0", fontSize:15, background:"linear-gradient(135deg,#1d4ed8,#2563eb,#059669)", color:"white", border:"none", borderRadius:11, fontWeight:700, fontFamily:"'Manrope',sans-serif", cursor:busy?"default":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .22s", opacity:busy?0.7:1, boxShadow:"0 6px 22px rgba(37,99,235,.40)", marginTop:4 }}
              onMouseEnter={e => { if(!busy) { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 10px 30px rgba(37,99,235,.55)"; } }}
              onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="0 6px 22px rgba(37,99,235,.40)"; }}
            >
              {busy ? (<><div className="spinner" /> {t("adminLogin.signingIn")}</>) : (<>🔐 {t("adminLogin.signInBtn")}</>)}
            </button>
          </div>
          <p style={{ textAlign:"center", color:"rgba(255,255,255,.35)", fontSize:12, marginTop:20 }}>{t("adminLogin.securedNote")}</p>
        </div>
      </div>
      <style>{`@keyframes animUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } } input::placeholder { color: rgba(255,255,255,.35) !important; } input:focus { border-color: rgba(37,99,235,.7) !important; box-shadow: 0 0 0 3px rgba(37,99,235,.20) !important; }`}</style>
    </div>
  );
}
