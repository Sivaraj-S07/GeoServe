import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../api";

function timeAgo(iso) {
  if (!iso) return "Never";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 10)   return "Just now";
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  return `${Math.floor(diff/3600)}h ago`;
}

const STATUS_COLORS = {
  pending:"badge-amber", accepted:"badge-blue", in_progress:"badge-purple",
  completed:"badge-green", confirmed:"badge-green", rejected:"badge-red",
};

function StatCard({ icon, label, value, gradient, bgColor, borderColor, delta }) {
  return (
    <div style={{ background:"white", borderRadius:20, border:`1.5px solid ${borderColor}`, padding:"22px 24px", position:"relative", overflow:"hidden", transition:"all .22s ease", cursor:"default" }}
      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow=`0 12px 36px ${borderColor}66`; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}
    >
      <div style={{ height:4, background:gradient, position:"absolute", top:0, left:0, right:0, borderRadius:"20px 20px 0 0" }} />
      <div style={{ paddingTop:8 }}>
        <div style={{ width:48, height:48, borderRadius:14, marginBottom:14, background:bgColor, border:`1px solid ${borderColor}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{icon}</div>
        <div style={{ fontSize:32, fontWeight:900, letterSpacing:-2, lineHeight:1, color:"#0f172a" }}>{value}</div>
        <div style={{ fontSize:12, fontWeight:600, color:"#64748b", marginTop:5 }}>{label}</div>
        {delta !== undefined && (
          <div style={{ marginTop:8, display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:20, background:bgColor, border:`1px solid ${borderColor}`, fontSize:11, fontWeight:700, color:delta>=0?"#059669":"#dc2626" }}>
            {delta>=0?"↑":"↓"} {Math.abs(delta)}%
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveRow({ person }) {
  const isWorker = person.role === "worker";
  const initials = person.name?.charAt(0).toUpperCase() || "?";
  const grad = isWorker ? "linear-gradient(135deg,#2563eb,#60a5fa)" : "linear-gradient(135deg,#059669,#34d399)";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 18px", borderBottom:"1px solid #f3f4f6", transition:"background .12s" }}
      onMouseEnter={e=>e.currentTarget.style.background="#f8faff"}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
    >
      <div style={{ width:36,height:36,borderRadius:"50%",flexShrink:0,background:grad,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,fontSize:14,position:"relative",boxShadow:`0 3px 10px ${isWorker?"rgba(37,99,235,.3)":"rgba(5,150,105,.3)"}` }}>
        {initials}
        <span style={{ position:"absolute",bottom:0,right:0,width:10,height:10,borderRadius:"50%",background:"#10b981",border:"2px solid white" }} />
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontWeight:700,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{person.name}</div>
        <div style={{ fontSize:11,color:"#64748b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{person.email}</div>
      </div>
      <div style={{ textAlign:"right",flexShrink:0 }}>
        <span className={`badge ${isWorker?"badge-blue":"badge-green"}`} style={{ marginBottom:3,display:"block",textAlign:"center",fontSize:10 }}>{isWorker?"🔧 Worker":"👤 User"}</span>
        <div style={{ fontSize:10,color:"#94a3b8" }}>{timeAgo(person.lastSeenAt)}</div>
      </div>
    </div>
  );
}

export default function Dashboard({ onToast }) {
  const nav = useNavigate();
  const [stats,    setStats]    = useState(null);
  const [workers,  setWorkers]  = useState([]);
  const [bookings, setBookings] = useState([]);
  const [wallet,   setWallet]   = useState(null);
  const [activity, setActivity] = useState([]);
  const [recentLogins, setRecentLogins] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [lastRefresh, setLR]    = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async (silent=false) => {
    if (!silent) setLoading(true);
    try {
      const [s,w,b,wl,act,hist] = await Promise.all([
        api.getUserStats(), api.getAllWorkers(), api.getBookings(),
        api.getCommissionWallet().catch(()=>null),
        api.getOnlineActivity().catch(()=>[]),
        api.getHistory().catch(()=>[]),
      ]);
      setStats(s); setWorkers(w); setBookings(b); setWallet(wl); setActivity(act);
      // Show last 6 login events from history
      setRecentLogins(
        (Array.isArray(hist) ? hist : [])
          .filter(e => e.type === "user_login" || e.type === "worker_login")
          .slice(0, 6)
      );
      setLR(new Date());
    } catch { if (!silent) onToast("Failed to load dashboard","error"); }
    finally { if (!silent) setLoading(false); }
  },[onToast]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(()=>load(true), 30_000);
    return () => clearInterval(pollRef.current);
  },[load]);

  const pending       = workers.filter(w=>!w.approved).length;
  const activeWorkers = workers.filter(w=>w.approved && w.isOnline).length;
  const onlineUsers   = activity.filter(p=>p.role==="user").length;
  const onlineWorkers = activity.filter(p=>p.role==="worker").length;
  const pendingBks    = bookings.filter(b=>b.status==="pending").length;
  const inProgressBks = bookings.filter(b=>b.status==="in_progress").length;
  const completedBks  = bookings.filter(b=>["completed","confirmed"].includes(b.status)).length;
  const revenue       = bookings.filter(b=>b.paymentStatus==="paid").reduce((s,b)=>s+(b.cost||0),0);
  const recentBookings = [...bookings].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,8);

  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh",flexDirection:"column",gap:16 }}>
      <div style={{ width:48,height:48,borderRadius:"50%",border:"3px solid #eef2ff",borderTopColor:"#4f46e5",animation:"spin .7s linear infinite" }} />
      <p style={{ color:"#64748b",fontWeight:600 }}>Loading dashboard…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="anim-fade">
      {/* ── Hero Header ─────────────────────────────────────── */}
      <div style={{ background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 45%,#4338ca 100%)", borderRadius:22, padding:"28px 32px", marginBottom:28, color:"white", position:"relative", overflow:"hidden", boxShadow:"0 12px 40px rgba(67,56,202,.35)" }}>
        <div style={{ position:"absolute",top:-60,right:-60,width:260,height:260,borderRadius:"50%",background:"rgba(255,255,255,.04)",pointerEvents:"none" }} />
        <div style={{ position:"absolute",bottom:-40,left:"45%",width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,.03)",pointerEvents:"none" }} />
        <div style={{ position:"relative",display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:16 }}>
          <div>
            <div style={{ fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#a5b4fc",marginBottom:7 }}>Admin Control Center</div>
            <h1 style={{ fontSize:28,fontWeight:900,letterSpacing:-.7,margin:0,color:"white" }}>GeoServe Dashboard</h1>
            <p style={{ color:"#c7d2fe",fontSize:13.5,marginTop:6,marginBottom:0 }}>
              Platform overview · {lastRefresh ? `Updated ${timeAgo(lastRefresh)}` : "Loading…"}
            </p>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
            {(onlineUsers+onlineWorkers)>0 && (
              <div style={{ background:"rgba(16,185,129,.2)",border:"1px solid rgba(16,185,129,.4)",borderRadius:24,padding:"7px 16px",display:"flex",alignItems:"center",gap:7 }}>
                <span style={{ width:7,height:7,borderRadius:"50%",background:"#10b981",display:"inline-block",animation:"livePulse 1.8s infinite" }} />
                <span style={{ fontSize:13,fontWeight:700,color:"#6ee7b7" }}>{onlineUsers+onlineWorkers} online now</span>
              </div>
            )}
            <button onClick={()=>load()} style={{ background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.2)",borderRadius:11,padding:"9px 18px",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.22)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.12)"}
            >↻ Refresh</button>
          </div>
        </div>
      </div>

      {/* ── Pending alert ─────────────────────────────────── */}
      {pending>0 && (
        <div style={{ background:"linear-gradient(135deg,#fffbeb,#fef3c7)",border:"1.5px solid #fde68a",borderRadius:16,padding:"16px 22px",marginBottom:22,display:"flex",alignItems:"center",gap:16,boxShadow:"0 4px 16px rgba(217,119,6,.12)" }}>
          <div style={{ width:46,height:46,borderRadius:13,flexShrink:0,background:"rgba(217,119,6,.12)",border:"1px solid #fde68a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>⚠️</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800,color:"#92400e",fontSize:14 }}>{pending} worker{pending>1?"s":""} awaiting approval</div>
            <div style={{ fontSize:12,color:"#78350f",marginTop:2 }}>Review pending registrations in Workers → Pending tab.</div>
          </div>
          <span style={{ background:"rgba(217,119,6,.15)",border:"1px solid #fcd34d",borderRadius:22,padding:"5px 14px",fontSize:11,fontWeight:800,color:"#92400e",animation:"livePulse 3s infinite",whiteSpace:"nowrap" }}>{pending} PENDING</span>
        </div>
      )}

      {/* ── Section Overview ──────────────────────────────── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:11,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".08em",marginBottom:14 }}>
          ADMIN SECTIONS
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14 }}>
          {[
            { icon:"👥",label:"Users",desc:"Manage registered users",path:"/users",
              grad:"linear-gradient(135deg,#4f46e5,#7c3aed)",bg:"#eef2ff",border:"#c7d2fe",
              count:stats?.users||0,unit:"users",note:"Users only — workers excluded" },
            { icon:"🔧",label:"Workers",desc:"Worker management",path:"/workers",
              grad:"linear-gradient(135deg,#2563eb,#3b82f6)",bg:"#eff6ff",border:"#bfdbfe",
              count:workers.length,unit:"workers",note:"Workers only — users excluded" },
            { icon:"📅",label:"Bookings",desc:"All service bookings",path:"/bookings",
              grad:"linear-gradient(135deg,#7c3aed,#a78bfa)",bg:"#f5f3ff",border:"#ddd6fe",
              count:bookings.length,unit:"bookings",note:"Independent booking records" },
            { icon:"📋",label:"History",desc:"Activity & login logs",path:"/history",
              grad:"linear-gradient(135deg,#0f172a,#334155)",bg:"#f8fafc",border:"#e2e8f0",
              count:0,unit:"logs",note:"Users + Workers + Bookings logs" },
          ].map(s=>(
            <div key={s.path}
              style={{ background:"white",border:`1.5px solid ${s.border}`,borderRadius:18,
                overflow:"hidden",cursor:"pointer",transition:"all .18s",position:"relative" }}
              onClick={()=>nav(s.path)}
              onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow=`0 12px 32px ${s.border}99`; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}
            >
              <div style={{ height:4,background:s.grad }} />
              <div style={{ padding:"18px 20px" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                  <div style={{ width:42,height:42,borderRadius:12,background:s.bg,border:`1px solid ${s.border}`,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>{s.icon}</div>
                  {s.count>0 && (
                    <span style={{ fontSize:18,fontWeight:900,color:"#0f172a" }}>{s.count.toLocaleString()}</span>
                  )}
                </div>
                <div style={{ fontWeight:800,fontSize:15,color:"#0f172a",marginBottom:3 }}>{s.label}</div>
                <div style={{ fontSize:12,color:"#64748b",marginBottom:8 }}>{s.desc}</div>
                <div style={{ fontSize:10,fontWeight:700,color:"#94a3b8",paddingTop:8,
                  borderTop:`1px solid ${s.border}`,display:"flex",alignItems:"center",gap:5 }}>
                  ✅ {s.note}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats Grid ────────────────────────────────────── */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:16,marginBottom:28 }}>
        <StatCard icon="👥" label="Total Users"      value={stats?.users||0}    gradient="linear-gradient(135deg,#4f46e5,#7c3aed)" bgColor="#eef2ff" borderColor="#c7d2fe" />
        <StatCard icon="🟢" label="Online Users"     value={onlineUsers}         gradient="linear-gradient(135deg,#059669,#10b981)" bgColor="#ecfdf5" borderColor="#a7f3d0" />
        <StatCard icon="🔧" label="Total Workers"    value={workers.length}      gradient="linear-gradient(135deg,#2563eb,#3b82f6)" bgColor="#eff6ff" borderColor="#bfdbfe" />
        <StatCard icon="⚡" label="Active Workers"   value={activeWorkers}       gradient="linear-gradient(135deg,#059669,#34d399)" bgColor="#ecfdf5" borderColor="#a7f3d0" />
        <StatCard icon="📅" label="Total Bookings"   value={bookings.length}     gradient="linear-gradient(135deg,#7c3aed,#a78bfa)" bgColor="#f5f3ff" borderColor="#ddd6fe" />
        <StatCard icon="⏳" label="Pending"           value={pendingBks}          gradient="linear-gradient(135deg,#d97706,#f59e0b)" bgColor="#fffbeb" borderColor="#fde68a" />
        <StatCard icon="⚙️" label="In Progress"      value={inProgressBks}       gradient="linear-gradient(135deg,#7c3aed,#a78bfa)" bgColor="#f5f3ff" borderColor="#ddd6fe" />
        <StatCard icon="✅" label="Completed"         value={completedBks}        gradient="linear-gradient(135deg,#059669,#10b981)" bgColor="#ecfdf5" borderColor="#a7f3d0" />
        {wallet && <StatCard icon="💰" label="Commission"  value={`₹${(wallet.balance||0).toLocaleString()}`} gradient="linear-gradient(135deg,#d97706,#f59e0b)" bgColor="#fffbeb" borderColor="#fde68a" />}
        <StatCard icon="💵" label="Total Revenue"    value={`₹${revenue.toLocaleString()}`} gradient="linear-gradient(135deg,#059669,#10b981)" bgColor="#ecfdf5" borderColor="#a7f3d0" />
      </div>

      {/* ── Two-column section ──────────────────────────── */}
      <div style={{ display:"grid",gridTemplateColumns:"300px 1fr",gap:20,marginBottom:24,alignItems:"start" }}>
        {/* Active Now */}
        <div style={{ background:"white",border:"1.5px solid #e2e8f0",borderRadius:20,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,.05)" }}>
          <div style={{ padding:"14px 18px",borderBottom:"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(135deg,#f8fafc,#f1f5f9)" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <span style={{ width:8,height:8,borderRadius:"50%",background:"#10b981",animation:"livePulse 2s infinite",display:"inline-block",boxShadow:"0 0 0 3px rgba(16,185,129,.2)" }} />
              <h2 style={{ fontSize:15,fontWeight:800,margin:0 }}>Active Now</h2>
            </div>
            <span style={{ fontSize:11,fontWeight:800,color:"#059669",background:"#ecfdf5",border:"1px solid #a7f3d0",padding:"3px 10px",borderRadius:20 }}>{activity.length} online</span>
          </div>
          {activity.length===0 ? (
            <div style={{ textAlign:"center",padding:"36px 20px",color:"#94a3b8" }}>
              <div style={{ fontSize:36,marginBottom:10 }}>😴</div>
              <div style={{ fontWeight:700,marginBottom:4,fontSize:13,color:"#64748b" }}>No one active right now</div>
              <div style={{ fontSize:11 }}>Users & workers appear when they log in</div>
            </div>
          ) : (
            <div style={{ maxHeight:360,overflowY:"auto" }}>
              {activity.map(p=><ActiveRow key={p.id} person={p} />)}
            </div>
          )}
          <div style={{ padding:"9px 18px",borderTop:"1px solid #f3f4f6",fontSize:10,color:"#94a3b8",display:"flex",alignItems:"center",gap:5,background:"#fafafa" }}>
            <span style={{ width:5,height:5,borderRadius:"50%",background:"#10b981",display:"inline-block" }} />
            Active = seen within last 5 min
          </div>
        </div>

        {/* Recent Bookings */}
        <div style={{ background:"white",border:"1.5px solid #e2e8f0",borderRadius:20,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,.05)" }}>
          <div style={{ padding:"16px 22px",borderBottom:"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(135deg,#f8fafc,#f1f5f9)" }}>
            <div>
              <h2 style={{ fontSize:15,fontWeight:800,margin:0 }}>Recent Bookings</h2>
              <p style={{ fontSize:11,color:"#94a3b8",margin:"3px 0 0" }}>Latest {recentBookings.length} requests</p>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              {[["pending",pendingBks,"#d97706","#fffbeb"],["in_progress",inProgressBks,"#7c3aed","#f5f3ff"],["completed",completedBks,"#059669","#ecfdf5"]].map(([s,v,c,bg])=>
                v>0 && <div key={s} style={{ textAlign:"center",padding:"4px 10px",borderRadius:10,background:bg,border:`1px solid ${c}30` }}>
                  <div style={{ fontSize:14,fontWeight:800,color:c }}>{v}</div>
                  <div style={{ fontSize:9,fontWeight:700,color:c,textTransform:"uppercase",letterSpacing:".04em" }}>{s.replace("_"," ")}</div>
                </div>
              )}
            </div>
          </div>
          {recentBookings.length===0 ? (
            <div style={{ textAlign:"center",padding:"48px 24px",color:"#94a3b8" }}>
              <div style={{ fontSize:32,marginBottom:8 }}>📋</div>
              <div style={{ fontWeight:600,fontSize:13 }}>No bookings yet</div>
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table className="data-table">
                <thead><tr><th>Customer</th><th>Worker</th><th>Date</th><th>Amount</th><th>Payment</th><th>Status</th></tr></thead>
                <tbody>
                  {recentBookings.map(b=>(
                    <tr key={b.id}>
                      <td><div style={{ fontWeight:700,fontSize:13 }}>{b.userName}</div></td>
                      <td><div style={{ color:"#475569",fontSize:13 }}>{b.workerName}</div></td>
                      <td><div style={{ color:"#94a3b8",fontSize:12 }}>{new Date(b.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</div></td>
                      <td><div style={{ fontWeight:800,color:"#059669" }}>₹{(b.cost||0).toLocaleString()}</div></td>
                      <td><span className={`badge ${b.paymentStatus==="paid"?"badge-green":"badge-gray"}`}>{b.paymentStatus||"unpaid"}</span></td>
                      <td><span className={`badge ${STATUS_COLORS[b.status]||"badge-gray"}`}>{b.status?.replace("_"," ")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Worker Status Overview ──────────────────────── */}
      {workers.filter(w=>w.approved).length>0 && (
        <div style={{ background:"white",border:"1.5px solid #e2e8f0",borderRadius:20,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,.05)",marginBottom:24 }}>
          <div style={{ padding:"16px 22px",borderBottom:"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(135deg,#f8fafc,#f1f5f9)" }}>
            <div>
              <h2 style={{ fontSize:15,fontWeight:800,margin:0 }}>Worker Status Overview</h2>
              <p style={{ fontSize:11,color:"#94a3b8",margin:"3px 0 0" }}>{activeWorkers} of {workers.filter(w=>w.approved).length} currently online</p>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <div style={{ width:10,height:10,borderRadius:"50%",background:"#10b981" }} /><span style={{ fontSize:11,fontWeight:600,color:"#64748b" }}>Online</span>
              <div style={{ width:10,height:10,borderRadius:"50%",background:"#e2e8f0",marginLeft:8 }} /><span style={{ fontSize:11,fontWeight:600,color:"#64748b" }}>Offline</span>
            </div>
          </div>
          <div style={{ padding:"16px 22px",display:"flex",flexWrap:"wrap",gap:8 }}>
            {workers.filter(w=>w.approved).slice(0,28).map(w=>(
              <div key={w.id} style={{ display:"flex",alignItems:"center",gap:7,background:w.isOnline?"#ecfdf5":"#f8fafc",border:`1.5px solid ${w.isOnline?"#a7f3d0":"#e2e8f0"}`,borderRadius:24,padding:"6px 14px 6px 10px",fontSize:12,transition:"all .15s" }}
                onMouseEnter={e=>{ e.currentTarget.style.transform="scale(1.05)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform=""; }}
              >
                <span style={{ width:8,height:8,borderRadius:"50%",background:w.isOnline?"#10b981":"#d1d5db",flexShrink:0,...(w.isOnline?{animation:"livePulse 2s infinite"}:{}) }} />
                <span style={{ fontWeight:700,color:w.isOnline?"#059669":"#94a3b8" }}>{w.name}</span>
              </div>
            ))}
            {workers.filter(w=>w.approved).length>28 && <div style={{ fontSize:12,color:"#94a3b8",display:"flex",alignItems:"center",padding:"0 8px" }}>+{workers.filter(w=>w.approved).length-28} more</div>}
          </div>
        </div>
      )}

      {/* Recent Login History */}
      {recentLogins.length > 0 && (
        <div style={{ background:"white",border:"1.5px solid #e2e8f0",borderRadius:20,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,.05)",marginBottom:24 }}>
          <div style={{ padding:"16px 22px",borderBottom:"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(135deg,#f8fafc,#f1f5f9)" }}>
            <div>
              <h2 style={{ fontSize:15,fontWeight:800,margin:0 }}>📋 Recent Login Activity</h2>
              <p style={{ fontSize:11,color:"#94a3b8",margin:"3px 0 0" }}>Latest user & worker logins from history</p>
            </div>
            <button onClick={() => nav("/history")}
              style={{ fontSize:12,color:"#2563eb",fontWeight:700,cursor:"pointer",padding:"5px 12px",borderRadius:8,border:"1px solid #bfdbfe",background:"#eff6ff" }}>
              View All →
            </button>
          </div>
          <div>
            {recentLogins.map((entry,i) => {
              const isWorker = entry.type === "worker_login";
              const grad = isWorker ? "linear-gradient(135deg,#2563eb,#60a5fa)" : "linear-gradient(135deg,#059669,#34d399)";
              return (
                <div key={entry.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 18px",borderBottom:i<recentLogins.length-1?"1px solid #f3f4f6":"none" }}>
                  <div style={{ width:34,height:34,borderRadius:"50%",flexShrink:0,background:grad,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,fontSize:13 }}>
                    {(entry.actorName||"?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:700,fontSize:13 }}>{entry.actorName||"—"}</div>
                    <div style={{ fontSize:11,color:"#64748b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{entry.actorEmail||""}</div>
                  </div>
                  <div style={{ textAlign:"right",flexShrink:0 }}>
                    <span style={{ display:"inline-block",padding:"2px 8px",borderRadius:12,fontSize:10,fontWeight:700,
                      color:isWorker?"#2563eb":"#059669",background:isWorker?"#eff6ff":"#ecfdf5",marginBottom:2 }}>
                      {isWorker?"🔧 Worker":"👤 User"}
                    </span>
                    <div style={{ fontSize:10,color:"#94a3b8" }}>{timeAgo(entry.timestamp)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.35)} }
      `}</style>
    </div>
  );
}
