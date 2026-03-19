import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AuthContext";

export default function LoginPage({ onToast }) {
  const { login, admin } = useAdmin();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [show,  setShow]  = useState(false);
  const [err,   setErr]   = useState("");
  const [busy,  setBusy]  = useState(false);

  // ✅ BUG FIX: Redirect if already logged in
  useEffect(() => {
    if (admin) navigate("/", { replace: true });
  }, [admin, navigate]);

  const submit = async () => {
    if (!email || !pass) { setErr("Please fill in both fields"); return; }
    setBusy(true); setErr("");
    try {
      await login(email, pass);
      onToast("Welcome back, Admin! 👋");
      navigate("/", { replace: true }); // ✅ BUG FIX: Navigate after successful login
    } catch (e) {
      setErr(e.response?.data?.error || "Invalid credentials");
    } finally { setBusy(false); }
  };

  return (
    <div style={{
      minHeight:"100vh", display:"flex",
      background:"linear-gradient(135deg, #0a0f1e 0%, #0f172a 40%, #1a1035 100%)",
      position:"relative", overflow:"hidden",
      fontFamily:"'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{ position:"absolute",inset:0,opacity:.045,backgroundImage:"linear-gradient(rgba(99,102,241,.8) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.8) 1px,transparent 1px)",backgroundSize:"56px 56px" }} />
      <div style={{ position:"absolute",top:"5%",left:"5%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(79,70,229,.18),transparent 70%)",filter:"blur(80px)",pointerEvents:"none" }} />
      <div style={{ position:"absolute",bottom:"5%",right:"5%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,58,237,.15),transparent 70%)",filter:"blur(70px)",pointerEvents:"none" }} />

      {/* Left branding panel */}
      <div className="login-left" style={{ flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"60px 72px",position:"relative" }}>
        <div style={{ maxWidth:460 }}>
          <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:56 }}>
            <div style={{ width:54,height:54,borderRadius:16,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,boxShadow:"0 8px 32px rgba(79,70,229,.5)",border:"1px solid rgba(255,255,255,.1)" }}>🗺️</div>
            <div>
              <div style={{ fontSize:24,fontWeight:800,color:"white",letterSpacing:"-.5px",fontFamily:"'Syne',sans-serif" }}>GeoServe</div>
              <div style={{ fontSize:11,fontWeight:700,color:"#818cf8",letterSpacing:".12em",textTransform:"uppercase" }}>Admin Panel</div>
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <span style={{ background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.3)",color:"#a5b4fc",fontSize:12,fontWeight:700,padding:"5px 14px",borderRadius:20 }}>🛡️ Secure Admin Access</span>
          </div>
          <h1 style={{ fontSize:44,fontWeight:800,color:"white",lineHeight:1.12,letterSpacing:"-1px",marginBottom:20,fontFamily:"'Syne',sans-serif" }}>
            Manage your<br />
            <span style={{ background:"linear-gradient(135deg,#818cf8,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>platform</span> with<br />
            confidence
          </h1>
          <p style={{ fontSize:15,color:"#94a3b8",lineHeight:1.75,marginBottom:48 }}>
            Full control over workers, users, bookings, verifications, and platform analytics.
          </p>
          <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
            {[
              { icon:"🛡️",title:"Worker Verification",desc:"Review credentials & approve professionals",color:"rgba(99,102,241,.2)",border:"rgba(99,102,241,.3)" },
              { icon:"📊",title:"Live Analytics",desc:"Real-time platform performance metrics",color:"rgba(16,185,129,.15)",border:"rgba(16,185,129,.25)" },
              { icon:"💳",title:"Payment Management",desc:"Track commissions & payout workflows",color:"rgba(245,158,11,.15)",border:"rgba(245,158,11,.25)" },
            ].map(f => (
              <div key={f.title} style={{ display:"flex",alignItems:"center",gap:14 }}>
                <div style={{ width:44,height:44,borderRadius:12,flexShrink:0,background:f.color,border:`1px solid ${f.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>{f.icon}</div>
                <div>
                  <div style={{ fontWeight:700,color:"white",fontSize:14 }}>{f.title}</div>
                  <div style={{ fontSize:12,color:"#64748b",marginTop:1 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:48,display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ width:6,height:6,borderRadius:"50%",background:"#10b981",display:"inline-block" }} />
            <span style={{ fontSize:12,color:"#475569" }}>GeoServe v3.1 · All systems operational</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ width:500,display:"flex",alignItems:"center",justifyContent:"center",padding:"48px 44px",position:"relative" }}>
        <div style={{ background:"rgba(255,255,255,.97)",borderRadius:28,padding:"48px 44px",width:"100%",boxShadow:"0 40px 100px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.08)",animation:"slideUp .45s cubic-bezier(.22,1,.36,1)" }}>
          <div style={{ marginBottom:36,textAlign:"center" }}>
            <div style={{ width:64,height:64,borderRadius:18,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 20px",boxShadow:"0 8px 24px rgba(79,70,229,.35)" }}>🔐</div>
            <h2 style={{ fontSize:26,fontWeight:800,color:"#0f172a",letterSpacing:"-.5px",marginBottom:6,fontFamily:"'Syne',sans-serif" }}>Admin Sign In</h2>
            <p style={{ fontSize:13.5,color:"#64748b" }}>Enter your administrator credentials to continue</p>
          </div>

          {err && (
            <div style={{ background:"#fef2f2",border:"1.5px solid #fecaca",borderRadius:12,padding:"12px 16px",marginBottom:24,color:"#dc2626",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:10,animation:"shake .4s ease" }}>
              <span style={{ fontSize:16 }}>⚠️</span> {err}
            </div>
          )}

          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:8,letterSpacing:".03em" }}>Email Address</label>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,opacity:.5 }}>📧</span>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="admin@geoserve.com"
                style={{ width:"100%",padding:"13px 14px 13px 42px",border:"2px solid #e5e7eb",borderRadius:12,fontSize:14,fontFamily:"inherit",color:"#0f172a",background:"#f9fafb",outline:"none",transition:"all .2s ease",boxSizing:"border-box" }}
                onFocus={e=>{ e.target.style.borderColor="#4f46e5"; e.target.style.boxShadow="0 0 0 4px rgba(79,70,229,.1)"; e.target.style.background="var(--surface)"; }}
                onBlur={e=>{ e.target.style.borderColor="#e5e7eb"; e.target.style.boxShadow="none"; e.target.style.background="#f9fafb"; }}
              />
            </div>
          </div>

          <div style={{ marginBottom:32 }}>
            <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#374151",marginBottom:8,letterSpacing:".03em" }}>Password</label>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,opacity:.5 }}>🔑</span>
              <input type={show?"text":"password"} value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="••••••••••"
                style={{ width:"100%",padding:"13px 48px 13px 42px",border:"2px solid #e5e7eb",borderRadius:12,fontSize:14,fontFamily:"inherit",color:"#0f172a",background:"#f9fafb",outline:"none",transition:"all .2s ease",boxSizing:"border-box" }}
                onFocus={e=>{ e.target.style.borderColor="#4f46e5"; e.target.style.boxShadow="0 0 0 4px rgba(79,70,229,.1)"; e.target.style.background="var(--surface)"; }}
                onBlur={e=>{ e.target.style.borderColor="#e5e7eb"; e.target.style.boxShadow="none"; e.target.style.background="#f9fafb"; }}
              />
              <button onClick={()=>setShow(s=>!s)} style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#94a3b8",padding:4,lineHeight:1 }}>{show?"🙈":"👁️"}</button>
            </div>
          </div>

          <button onClick={submit} disabled={busy}
            style={{ width:"100%",padding:"15px",background:busy?"#c7d2fe":"linear-gradient(135deg,#4f46e5 0%,#6366f1 50%,#7c3aed 100%)",color:"white",border:"none",borderRadius:14,fontWeight:800,fontSize:15,cursor:busy?"not-allowed":"pointer",fontFamily:"'Syne',inherit",boxShadow:busy?"none":"0 8px 32px rgba(79,70,229,.45),inset 0 1px 0 rgba(255,255,255,.15)",transition:"all .2s ease",letterSpacing:"-.2px",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}
            onMouseEnter={e=>{ if(!busy){ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 14px 40px rgba(79,70,229,.55)"; } }}
            onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=busy?"none":"0 8px 32px rgba(79,70,229,.45),inset 0 1px 0 rgba(255,255,255,.15)"; }}
          >
            {busy ? <><span style={{ width:18,height:18,border:"2.5px solid rgba(255,255,255,.35)",borderTopColor:"white",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block" }} /> Signing in…</> : "Sign In to Admin Panel →"}
          </button>

          <div style={{ textAlign:"center",marginTop:20,fontSize:12,color:"#9ca3af",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
            <span style={{ flex:1,height:1,background:"#f3f4f6",display:"block" }} />
            Protected · Authorized personnel only
            <span style={{ flex:1,height:1,background:"#f3f4f6",display:"block" }} />
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes slideUp { from { opacity:0;transform:translateY(24px); } to { opacity:1;transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
        @media (max-width:900px) { .login-left { display:none !important; } }
      `}</style>
    </div>
  );
}
