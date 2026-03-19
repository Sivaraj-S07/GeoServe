import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import * as api from "../api";
import BookingCard from "../components/BookingCard";
import WorkerModal from "../components/WorkerModal";
import { StatsGrid } from "../components/StatsCards";
import Icon from "../components/Icon";
import NavigationModal from "../components/NavigationModal";
import ChatModal from "../components/ChatModal";

const TABS = (t) => [
  { id:"overview",  label:"Overview",      icon:"trending-up" },
  { id:"bookings",  label:"My Bookings",   icon:"calendar"    },
  { id:"profile",   label:"My Profile",    icon:"user"        },
  { id:"payout",    label:"Payout",        icon:"credit-card" },
];

const STATUS_COLORS = {
  pending:"badge-amber", accepted:"badge-blue", in_progress:"badge-purple",
  completed:"badge-green", confirmed:"badge-green", rejected:"badge-red",
};

export default function WorkerDashboard({ onToast, sidebarOpen, onCloseSidebar }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const nav = useNavigate();
  const [verifStatus, setVerifStatus] = useState(null);
  const [tab,          setTab]        = useState("overview");
  const [myProfile,    setMyProfile]  = useState(null);
  const [bookings,     setBookings]   = useState([]);
  const [categories,   setCats]       = useState([]);
  const [loading,      setLoading]    = useState(true);
  const [editModal,    setEdit]       = useState(false);
  const [toggling,     setToggling]   = useState(false);
  const [navBooking,   setNavBooking] = useState(null);
  const [chatBooking,  setChatBooking]= useState(null);
  const [bookingFilter,setFilter]     = useState("all");
  const [payoutForm,   setPayoutForm] = useState({ accountHolderName:"", accountNumber:"", ifscCode:"", bankName:"", upiId:"" });
  const [savingPayout, setSavingPayout] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const cats = await api.getCategories();
      setCats(cats);
      try { const vs = await api.getMyVerification(); setVerifStatus(vs.verification_status); } catch {}
      try {
        const profile = await api.getMyWorkerProfile();
        setMyProfile(profile);
        if (profile) {
          const bks = await api.getBookings({ workerId: profile.id });
          setBookings(bks);
        }
      } catch (profileErr) {
        if (profileErr.response?.status !== 404) onToast("Failed to load worker profile","error");
      }
    } catch { onToast("Failed to load data","error"); }
    finally { setLoading(false); }
  };

  const handleToggleAvailability = async () => {
    if (!myProfile) return;
    setToggling(true);
    try {
      const updated = await api.toggleAvailability(myProfile.id, !myProfile.availability);
      setMyProfile(updated);
      onToast(`You are now ${updated.availability ? "available" : "unavailable"}`);
    } catch { onToast("Failed to update availability","error"); }
    finally { setToggling(false); }
  };

  const handleBookingStatus = async (id, status, note) => {
    try {
      const updated = await api.updateBookingStatus(id, status, note);
      setBookings(p => p.map(b => b.id === updated.id ? updated : b));
      onToast(`Booking ${status.replace("_"," ")}`);
      if (status === "accepted") setNavBooking(updated);
    } catch { onToast("Failed to update booking","error"); }
  };

  const handleUpdateProfile = async (data) => {
    try {
      const updated = await api.updateWorker(myProfile.id, data);
      setMyProfile(updated);
      onToast("Profile updated!");
      setEdit(false);
    } catch (e) { onToast(e.response?.data?.error || "Failed","error"); }
  };

  const pendingCount    = bookings.filter(b => b.status==="pending").length;
  const acceptedCount   = bookings.filter(b => b.status==="accepted").length;
  const inProgressCount = bookings.filter(b => b.status==="in_progress").length;
  const completedCount  = bookings.filter(b => ["completed","confirmed"].includes(b.status)).length;
  const earnings        = bookings.filter(b => ["completed","confirmed"].includes(b.status)).reduce((s,b) => s + (b.serviceCost || b.cost || 0), 0);

  const getCat = id => categories.find(c => c.id === id);
  const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563eb&color=fff&size=80`;

  const filteredBookings = bookingFilter === "all" ? bookings : bookings.filter(b => b.status === bookingFilter);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"calc(100vh - 64px)", flexDirection:"column", gap:16 }}>
      <div style={{ width:48,height:48,borderRadius:"50%",border:"3px solid #eef2ff",borderTopColor:"#4f46e5",animation:"spin .7s linear infinite" }} />
      <p style={{ color:"var(--muted)",fontWeight:600 }}>Loading your dashboard…</p>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display:"flex", minHeight:"calc(100vh - 64px)", flexDirection:"column" }}>
      {/* Verification Banner */}
      {verifStatus === "pending" && (
        <div style={{ background:"linear-gradient(135deg,#fffbeb,#fef3c7)", borderBottom:"2px solid #fde68a", padding:"14px 24px", display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:24 }}>⏳</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800,color:"#92400e",fontSize:14 }}>Verification Pending Review</div>
            <div style={{ fontSize:12,color:"#78350f",marginTop:2 }}>Your documents are under review. Typically 24–48 hours.</div>
          </div>
        </div>
      )}
      {verifStatus === "rejected" && (
        <div style={{ background:"linear-gradient(135deg,#fef2f2,#fee2e2)", borderBottom:"2px solid #fecaca", padding:"14px 24px", display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:24 }}>❌</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800,color:"#991b1b",fontSize:14 }}>Verification Rejected</div>
            <div style={{ fontSize:12,color:"#7f1d1d",marginTop:2 }}>Please resubmit with valid documents.</div>
          </div>
          <button onClick={() => nav("/verify-worker")} style={{ padding:"8px 16px",background:"#dc2626",color:"white",border:"none",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",flexShrink:0 }}>Resubmit →</button>
        </div>
      )}
      {(!verifStatus || verifStatus === "unverified") && (
        <div style={{ background:"linear-gradient(135deg,#eef2ff,#f5f3ff)", borderBottom:"2px solid #c7d2fe", padding:"14px 24px", display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:24 }}>🛡️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800,color:"#3730a3",fontSize:14 }}>Complete Your Verification</div>
            <div style={{ fontSize:12,color:"#4338ca",marginTop:2 }}>Upload your certificate or work video to get verified and start accepting jobs.</div>
          </div>
          <button onClick={() => nav("/verify-worker")} style={{ padding:"8px 16px",background:"linear-gradient(135deg,#4f46e5,#7c3aed)",color:"white",border:"none",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",flexShrink:0,boxShadow:"0 4px 12px rgba(79,70,229,.4)" }}>Verify Now →</button>
        </div>
      )}

      <div style={{ display:"flex", flex:1 }}>
        {sidebarOpen && <div className="mobile-overlay" onClick={onCloseSidebar} />}

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside className={`dashboard-sidebar${sidebarOpen ? " mobile-open" : ""}`} style={{
          width:252, background:"var(--surface)", borderRight:"1px solid var(--border)",
          padding:"24px 14px", flexShrink:0, display:"flex", flexDirection:"column",
          boxShadow:"2px 0 12px rgba(0,0,0,.04)",
        }}>
          {/* Profile section */}
          <div style={{ padding:"4px 8px 20px", borderBottom:"1px solid var(--border)", marginBottom:16, textAlign:"center" }}>
            <div style={{ position:"relative", display:"inline-block", marginBottom:10 }}>
              <img src={myProfile?.avatar || user.avatar || fb}
                onError={e => { e.target.src=fb; }}
                style={{ width:76,height:76,borderRadius:"50%",objectFit:"cover",border:"3px solid var(--blue-light)",boxShadow:"0 4px 16px rgba(37,99,235,.2)" }} />
              <div style={{ position:"absolute",bottom:2,right:2,width:16,height:16,borderRadius:"50%",background:myProfile?.availability?"#22c55e":"#94a3b8",border:"3px solid white",boxShadow:"0 0 0 2px "+(myProfile?.availability?"rgba(34,197,94,.3)":"rgba(148,163,184,.2)") }} />
            </div>
            <div style={{ fontWeight:800,fontSize:15,marginBottom:2 }}>{user.name}</div>
            <div style={{ color:"var(--muted)",fontSize:12,marginBottom:10 }}>{user.email}</div>

            {/* Earnings mini-badge */}
            {earnings > 0 && (
              <div style={{ background:"linear-gradient(135deg,#f0fdf4,#dcfce7)", border:"1.5px solid #86efac", borderRadius:10, padding:"8px 12px", marginBottom:12 }}>
                <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:2 }}>Total Earnings</div>
                <div style={{ fontWeight:900,fontSize:22,color:"#059669" }}>₹{earnings.toLocaleString()}</div>
              </div>
            )}

            {/* Availability toggle */}
            <div>
              {myProfile?.availability ? (
                <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                  <div style={{ width:"100%",padding:"9px 0",borderRadius:10,background:"linear-gradient(135deg,#16a34a,#22c55e)",color:"white",fontSize:13,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxShadow:"0 0 0 3px rgba(34,197,94,.25)",animation:"pulseGreen 2s infinite",border:"none" }}>
                    <span>▶</span> Active & Available
                  </div>
                  <button disabled={toggling} onClick={handleToggleAvailability}
                    style={{ width:"100%",padding:"8px 0",borderRadius:10,border:"none",background:toggling?"#fee2e2":"linear-gradient(135deg,#ef4444,#f87171)",color:"white",fontSize:12,fontWeight:700,cursor:toggling?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:toggling?"none":"0 2px 8px rgba(239,68,68,.3)",transition:"all .15s",opacity:toggling?.7:1 }}>
                    <span>⏹</span> {toggling ? "Updating…" : "Go Offline"}
                  </button>
                </div>
              ) : (
                <button disabled={toggling} onClick={handleToggleAvailability}
                  style={{ width:"100%",padding:"10px 0",borderRadius:10,border:"none",background:toggling?"#dcfce7":"linear-gradient(135deg,#16a34a,#22c55e)",color:"white",fontSize:13,fontWeight:800,cursor:toggling?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxShadow:toggling?"none":"0 3px 12px rgba(22,163,74,.35)",transition:"all .15s",opacity:toggling?.7:1 }}>
                  <span>▶</span> {toggling ? "Updating…" : "Go Active"}
                </button>
              )}
              <div style={{ marginTop:6,textAlign:"center",fontSize:11,fontWeight:700,color:myProfile?.availability?"#16a34a":"#94a3b8",display:"flex",alignItems:"center",justifyContent:"center",gap:4 }}>
                <div style={{ width:7,height:7,borderRadius:"50%",background:myProfile?.availability?"#22c55e":"#94a3b8" }} />
                {myProfile?.availability ? "Accepting bookings" : "Not available"}
              </div>
            </div>
          </div>

          {/* Nav tabs */}
          <div style={{ flex:1 }}>
            {TABS(t).map(item => (
              <button key={item.id}
                className={`sidebar-tab blue${tab===item.id ? " active" : ""}`}
                onClick={() => { setTab(item.id); onCloseSidebar?.(); }}
              >
                <Icon name={item.icon} size={15} color={tab===item.id?"var(--blue-mid)":"#6b7280"} />
                {item.label}
                {item.id==="bookings" && pendingCount > 0 && (
                  <span style={{ marginLeft:"auto",background:"#ef4444",color:"white",fontSize:10,fontWeight:800,padding:"1px 7px",borderRadius:20 }}>{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* Rating badge */}
          {myProfile?.rating > 0 && (
            <div style={{ marginTop:"auto",padding:"14px 12px",background:"var(--blue-bg)",borderRadius:10,border:"1px solid var(--blue-light)" }}>
              <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:2 }}>
                <Icon name="star" size={14} color="#f59e0b" />
                <span style={{ fontWeight:900,fontSize:22,color:"var(--text)" }}>{myProfile.rating}</span>
              </div>
              <div style={{ fontSize:12,color:"var(--muted)" }}>{myProfile.jobsCompleted} jobs completed</div>
            </div>
          )}
        </aside>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <main className="anim-fade dashboard-main" style={{ flex:1,padding:"28px 32px",overflowY:"auto",background:"var(--bg)" }}>

          {/* ── OVERVIEW TAB ─────────────────────────── */}
          {tab === "overview" && (
            <>
              {/* Hero */}
              <div style={{ background:"linear-gradient(135deg,#1e3a8a,#2563eb,#3b82f6)",borderRadius:20,padding:"28px 32px",marginBottom:24,position:"relative",overflow:"hidden",boxShadow:"0 8px 32px rgba(37,99,235,.3)" }}>
                <div style={{ position:"absolute",top:-40,right:-40,width:180,height:180,borderRadius:"50%",background:"rgba(255,255,255,.06)",pointerEvents:"none" }} />
                <div style={{ position:"absolute",bottom:-30,left:"60%",width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,.04)",pointerEvents:"none" }} />
                <div style={{ position:"relative",zIndex:1,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16 }}>
                  <div>
                    <div style={{ fontSize:11,fontWeight:700,color:"rgba(255,255,255,.6)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:6 }}>Worker Dashboard</div>
                    <h1 style={{ color:"white",fontWeight:800,fontSize:26,marginBottom:6,letterSpacing:"-.5px" }}>
                      Welcome back, {user.name.split(" ")[0]}! 👋
                    </h1>
                    <p style={{ color:"rgba(255,255,255,.75)",fontSize:14,margin:0 }}>Here's your job activity summary</p>
                  </div>
                  <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                    {inProgressCount > 0 && (
                      <div style={{ background:"rgba(124,58,237,.3)",border:"1px solid rgba(167,139,250,.4)",borderRadius:12,padding:"10px 16px",backdropFilter:"blur(8px)" }}>
                        <div style={{ fontSize:11,color:"#c4b5fd",fontWeight:700 }}>⚡ In Progress</div>
                        <div style={{ fontSize:20,fontWeight:900,color:"white" }}>{inProgressCount}</div>
                      </div>
                    )}
                    {pendingCount > 0 && (
                      <div style={{ background:"rgba(217,119,6,.3)",border:"1px solid rgba(251,191,36,.4)",borderRadius:12,padding:"10px 16px",backdropFilter:"blur(8px)" }}>
                        <div style={{ fontSize:11,color:"#fcd34d",fontWeight:700 }}>⏳ Pending</div>
                        <div style={{ fontSize:20,fontWeight:900,color:"white" }}>{pendingCount}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24 }}>
                {[
                  { icon:"📅",label:"Total Bookings",value:bookings.length,grad:"linear-gradient(135deg,#4f46e5,#7c3aed)",bg:"#eef2ff",border:"#c7d2fe" },
                  { icon:"⏳",label:"Pending",value:pendingCount,grad:"linear-gradient(135deg,#d97706,#f59e0b)",bg:"#fffbeb",border:"#fde68a" },
                  { icon:"⚡",label:"In Progress",value:inProgressCount,grad:"linear-gradient(135deg,#7c3aed,#a78bfa)",bg:"#f5f3ff",border:"#ddd6fe" },
                  { icon:"✅",label:"Completed",value:completedCount,grad:"linear-gradient(135deg,#059669,#10b981)",bg:"#ecfdf5",border:"#a7f3d0" },
                ].map(s => (
                  <div key={s.label} style={{ background:"var(--surface)",borderRadius:14,border:`1.5px solid ${s.border}`,padding:"18px 20px",position:"relative",overflow:"hidden",transition:"transform .15s,box-shadow .15s",cursor:"default" }}
                    onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}
                  >
                    <div style={{ height:3,background:s.grad,position:"absolute",top:0,left:0,right:0,borderRadius:"14px 14px 0 0" }} />
                    <div style={{ width:40,height:40,borderRadius:10,background:s.bg,border:`1px solid ${s.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:10 }}>{s.icon}</div>
                    <div style={{ fontSize:28,fontWeight:900,color:"var(--text)",letterSpacing:"-1px",lineHeight:1 }}>{s.value}</div>
                    <div style={{ fontSize:12,fontWeight:600,color:"var(--muted)",marginTop:4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Pending requests */}
              {pendingCount > 0 && (
                <div style={{ marginBottom:24 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16 }}>
                    <div style={{ width:8,height:8,borderRadius:"50%",background:"#f59e0b",animation:"timerPulse 1.5s infinite" }} />
                    <h3 style={{ fontWeight:800,fontSize:17,margin:0 }}>
                      {pendingCount} Pending Request{pendingCount>1?"s":""}
                    </h3>
                    <span style={{ background:"#fffbeb",border:"1px solid #fde68a",color:"#d97706",fontSize:11,fontWeight:700,padding:"2px 10px",borderRadius:20 }}>Action Required</span>
                  </div>
                  {bookings.filter(b => b.status==="pending").map(b => (
                    <BookingCard key={b.id} booking={b} role="worker" onStatusChange={handleBookingStatus} onDelete={() => {}} onChat={setChatBooking} onNavigate={setNavBooking} workerProfile={myProfile} />
                  ))}
                </div>
              )}

              {/* Profile summary */}
              {myProfile && (
                <div className="card" style={{ padding:24 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
                    <h3 style={{ fontWeight:800,fontSize:16,margin:0 }}>Your Profile Summary</h3>
                    <button onClick={() => setTab("profile")} style={{ background:"none",border:"1px solid var(--border)",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",color:"var(--muted)",fontFamily:"inherit" }}>View Full →</button>
                  </div>
                  <div style={{ display:"flex",gap:18,alignItems:"flex-start" }}>
                    <img src={myProfile.avatar||fb} onError={e => { e.target.src=fb; }}
                      style={{ width:60,height:60,borderRadius:14,objectFit:"cover",border:"2px solid var(--blue-light)",boxShadow:"0 4px 12px rgba(37,99,235,.15)" }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800,fontSize:16,marginBottom:4 }}>{myProfile.name}</div>
                      <div style={{ color:"var(--muted)",fontSize:13,marginBottom:8 }}>
                        {getCat(myProfile.categoryId)?.name} · {myProfile.specialization}
                      </div>
                      <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                        {myProfile.yearsOfExp > 0 && <span style={{ background:"#eff6ff",border:"1px solid #bfdbfe",color:"#1d4ed8",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20 }}>🏆 {myProfile.yearsOfExp}+ yrs exp</span>}
                        {myProfile.rating > 0 && <span style={{ display:"flex",alignItems:"center",gap:4,background:"#fffbeb",border:"1px solid #fde68a",color:"#92400e",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20 }}><Icon name="star" size={11} color="#f59e0b" /> {myProfile.rating}</span>}
                        <span style={{ background:myProfile.availability?"#ecfdf5":"#f1f5f9",border:`1px solid ${myProfile.availability?"#a7f3d0":"#e2e8f0"}`,color:myProfile.availability?"#059669":"#94a3b8",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20 }}>
                          {myProfile.availability?"● Available":"● Offline"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── BOOKINGS TAB ─────────────────────────── */}
          {tab === "bookings" && (
            <>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:12 }}>
                <div>
                  <h2 style={{ fontWeight:800,fontSize:22,letterSpacing:"-.5px",margin:0 }}>My Bookings</h2>
                  <p style={{ color:"var(--muted)",fontSize:13,marginTop:4 }}>{bookings.length} total requests</p>
                </div>
                <button onClick={loadAll} style={{ background:"var(--surface)",border:"1.5px solid var(--border)",borderRadius:10,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:"pointer",color:"var(--text)",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6 }}>
                  ↻ Refresh
                </button>
              </div>

              {/* Filter pills */}
              <div style={{ display:"flex",gap:8,marginBottom:20,flexWrap:"wrap" }}>
                {[
                  { val:"all",     label:`All (${bookings.length})` },
                  { val:"pending", label:`Pending (${pendingCount})` },
                  { val:"accepted",label:`Accepted (${acceptedCount})` },
                  { val:"in_progress",label:`In Progress (${inProgressCount})` },
                  { val:"completed",label:`Completed (${completedCount})` },
                  { val:"rejected",label:`Rejected (${bookings.filter(b=>b.status==="rejected").length})` },
                ].map(f => (
                  <button key={f.val} onClick={() => setFilter(f.val)}
                    style={{ padding:"6px 16px",borderRadius:20,border:`1.5px solid ${bookingFilter===f.val?"var(--primary)":"var(--border)"}`,background:bookingFilter===f.val?"var(--primary)":"white",color:bookingFilter===f.val?"white":"var(--muted)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .15s" }}>
                    {f.label}
                  </button>
                ))}
              </div>

              {filteredBookings.length === 0 ? (
                <div style={{ textAlign:"center",padding:"60px 24px",background:"var(--surface)",borderRadius:18,border:"1px solid var(--border)" }}>
                  <div style={{ fontSize:40,marginBottom:12 }}>📋</div>
                  <p style={{ fontWeight:700,fontSize:16,color:"var(--text)" }}>No bookings found</p>
                  <p style={{ color:"var(--muted)",fontSize:13,marginTop:4 }}>Bookings will appear here once customers request your services.</p>
                </div>
              ) : (
                filteredBookings.map(b => (
                  <BookingCard key={b.id} booking={b} role="worker" onStatusChange={handleBookingStatus} onDelete={() => {}} onChat={setChatBooking} onNavigate={setNavBooking} workerProfile={myProfile} />
                ))
              )}
            </>
          )}

          {/* ── PROFILE TAB ─────────────────────────── */}
          {tab === "profile" && myProfile && (
            <>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24 }}>
                <div>
                  <h2 style={{ fontWeight:800,fontSize:22,letterSpacing:"-.5px",margin:0 }}>My Worker Profile</h2>
                  <p style={{ color:"var(--muted)",fontSize:13,marginTop:4 }}>How clients see you</p>
                </div>
                <button className="btn-blue" onClick={() => setEdit(true)} style={{ padding:"10px 22px",fontSize:14,display:"flex",alignItems:"center",gap:8,borderRadius:10 }}>
                  <Icon name="edit" size={15} color="white" /> Edit Profile
                </button>
              </div>

              <div className="card" style={{ padding:32,marginBottom:20 }}>
                <div style={{ display:"flex",gap:28,alignItems:"flex-start",marginBottom:28,flexWrap:"wrap" }}>
                  <div style={{ position:"relative",flexShrink:0 }}>
                    <img src={myProfile.avatar||fb} onError={e => { e.target.src=fb; }}
                      style={{ width:110,height:110,borderRadius:22,objectFit:"cover",border:"3px solid var(--blue-light)",boxShadow:"0 6px 24px rgba(37,99,235,.18)" }} />
                    <div style={{ position:"absolute",bottom:4,right:4,width:20,height:20,borderRadius:"50%",background:myProfile.availability?"#22c55e":"#94a3b8",border:"3px solid white" }} />
                  </div>
                  <div style={{ flex:1,minWidth:200 }}>
                    <h3 style={{ fontWeight:800,fontSize:22,marginBottom:10 }}>{myProfile.name}</h3>
                    <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:12 }}>
                      <span className="badge badge-blue">{getCat(myProfile.categoryId)?.name}</span>
                      {myProfile.specialization && <span style={{ color:"var(--muted)",fontSize:13 }}>· {myProfile.specialization}</span>}
                      <span className={`badge ${myProfile.availability?"badge-green":"badge-gray"}`}>{myProfile.availability?"● Available":"● Unavailable"}</span>
                    </div>
                    <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                      {myProfile.yearsOfExp > 0 && <span style={{ background:"#eff6ff",border:"1px solid #bfdbfe",color:"#1d4ed8",fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:20 }}>🏆 {myProfile.yearsOfExp}+ years</span>}
                      {myProfile.rating > 0 && <span style={{ display:"flex",alignItems:"center",gap:5,background:"#fffbeb",border:"1px solid #fde68a",color:"#92400e",fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:20 }}><Icon name="star" size={13} color="#f59e0b" /> {myProfile.rating} · {myProfile.jobsCompleted} jobs</span>}
                    </div>
                  </div>
                </div>

                {myProfile.experience && (
                  <div style={{ background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:12,padding:"16px 18px",marginBottom:18 }}>
                    <div style={{ fontSize:11,fontWeight:800,color:"#1d4ed8",textTransform:"uppercase",letterSpacing:".06em",marginBottom:10 }}>Work Experience</div>
                    <p style={{ color:"#1e40af",fontSize:14,lineHeight:1.75,margin:0 }}>{myProfile.experience}</p>
                  </div>
                )}
                {myProfile.bio && (
                  <div style={{ background:"var(--bg)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 18px",marginBottom:18 }}>
                    <div style={{ fontSize:11,fontWeight:800,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:10 }}>About Me</div>
                    <p style={{ color:"var(--text-secondary)",fontSize:14,lineHeight:1.75,margin:0 }}>{myProfile.bio}</p>
                  </div>
                )}
                {Array.isArray(myProfile.skills) && myProfile.skills.length > 0 && (
                  <div style={{ marginBottom:18 }}>
                    <div style={{ fontSize:11,fontWeight:800,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:10 }}>Skills & Services</div>
                    <div style={{ display:"flex",gap:7,flexWrap:"wrap" }}>
                      {myProfile.skills.map(s => <span key={s} style={{ background:"#f0fdf4",border:"1px solid #bbf7d0",color:"#15803d",fontSize:12,fontWeight:700,padding:"5px 14px",borderRadius:20 }}>{s}</span>)}
                    </div>
                  </div>
                )}
                <div style={{ display:"flex",flexDirection:"column",gap:10,paddingTop:20,borderTop:"1px solid var(--border)" }}>
                  <div style={{ fontSize:11,fontWeight:800,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4 }}>Contact Details</div>
                  {[
                    { icon:"phone",label:myProfile.phone,href:`tel:${myProfile.phone}` },
                    { icon:"mail",label:myProfile.email,href:`mailto:${myProfile.email}` },
                    myProfile.pincode && { icon:"map-pin",label:`Pincode ${myProfile.pincode}${myProfile.street?` · ${myProfile.street}`:""}` },
                  ].filter(Boolean).filter(x=>x.label).map(x => (
                    <div key={x.icon} style={{ display:"flex",alignItems:"center",gap:10 }}>
                      <div style={{ background:"var(--blue-bg)",padding:9,borderRadius:9,border:"1px solid var(--blue-light)" }}>
                        <Icon name={x.icon} size={15} color="var(--blue-mid)" />
                      </div>
                      {x.href ? <a href={x.href} style={{ fontSize:14,color:"var(--blue-mid)",fontWeight:600,textDecoration:"none" }}>{x.label}</a> : <span style={{ fontSize:14,color:"var(--text-secondary)" }}>{x.label}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── PAYOUT TAB ─────────────────────────── */}
          {tab === "payout" && (
            <>
              <div style={{ marginBottom:24 }}>
                <h2 style={{ fontWeight:800,fontSize:22,letterSpacing:"-.5px",margin:0 }}>Payout Account</h2>
                <p style={{ color:"var(--muted)",fontSize:13,marginTop:4 }}>Add your bank & UPI details to receive payments</p>
              </div>

              {/* Info banner */}
              <div style={{ background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:14,padding:"16px 20px",marginBottom:24,display:"flex",gap:14,alignItems:"flex-start" }}>
                <div style={{ width:36,height:36,borderRadius:10,background:"#dbeafe",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18 }}>💡</div>
                <div>
                  <p style={{ margin:"0 0 4px",fontSize:13,fontWeight:800,color:"#1d4ed8" }}>How Payouts Work</p>
                  <p style={{ margin:0,fontSize:12,color:"var(--text-secondary)",lineHeight:1.6 }}>
                    When a user confirms your work, GeoServe processes payment. You receive <strong>95%</strong> (service fee). The platform retains <strong>5%</strong> as commission. Your UPI/bank details below are shown to customers for payment.
                  </p>
                </div>
              </div>

              {/* QR Preview (if UPI set) */}
              {myProfile?.payoutAccount?.upiId && (
                <div style={{ background:"var(--surface)",border:"1.5px solid #86efac",borderRadius:16,padding:"20px 24px",marginBottom:24 }}>
                  <div style={{ fontWeight:800,fontSize:14,color:"#059669",marginBottom:16,display:"flex",alignItems:"center",gap:8 }}>
                    <span style={{ fontSize:18 }}>✅</span> Payment Account Active
                  </div>
                  <div style={{ display:"flex",gap:24,alignItems:"flex-start",flexWrap:"wrap" }}>
                    <div>
                      <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:8 }}>YOUR PAYMENT QR CODE</div>
                      <div style={{ background:"var(--surface)",border:"2px solid #e2e8f0",borderRadius:16,padding:12,display:"inline-block",boxShadow:"0 4px 20px rgba(0,0,0,.08)" }}>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${myProfile.payoutAccount.upiId}&pn=${encodeURIComponent(myProfile.name)}&cu=INR`)}`}
                          alt="UPI QR" width={130} height={130} style={{ display:"block",borderRadius:6 }}
                        />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:12 }}>ACCOUNT DETAILS</div>
                      <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                        <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                          <span style={{ fontSize:13,color:"var(--muted)",minWidth:80 }}>UPI ID</span>
                          <span style={{ fontWeight:800,color:"#059669",fontSize:14 }}>{myProfile.payoutAccount.upiId}</span>
                        </div>
                        {myProfile.payoutAccount.bankName && <div style={{ display:"flex",gap:10 }}><span style={{ fontSize:13,color:"var(--muted)",minWidth:80 }}>Bank</span><span style={{ fontWeight:700,fontSize:13 }}>{myProfile.payoutAccount.bankName}</span></div>}
                        {myProfile.payoutAccount.accountNumber && <div style={{ display:"flex",gap:10 }}><span style={{ fontSize:13,color:"var(--muted)",minWidth:80 }}>Account</span><span style={{ fontWeight:700,fontSize:13 }}>****{myProfile.payoutAccount.accountNumber.slice(-4)}</span></div>}
                        {myProfile.payoutAccount.ifscCode && <div style={{ display:"flex",gap:10 }}><span style={{ fontSize:13,color:"var(--muted)",minWidth:80 }}>IFSC</span><span style={{ fontWeight:700,fontSize:13 }}>{myProfile.payoutAccount.ifscCode}</span></div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form */}
              <div className="card" style={{ padding:28,maxWidth:560 }}>
                <h3 style={{ fontWeight:800,fontSize:16,marginBottom:20 }}>Bank Account & UPI Details</h3>
                <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
                  {[
                    { key:"accountHolderName",label:"Account Holder Name",placeholder:"As on bank passbook",icon:"👤" },
                    { key:"bankName",          label:"Bank Name",           placeholder:"e.g. State Bank of India",icon:"🏦" },
                    { key:"accountNumber",     label:"Account Number",      placeholder:"10-digit account number",icon:"🔢" },
                    { key:"ifscCode",          label:"IFSC Code",           placeholder:"e.g. SBIN0001234",icon:"🏷️" },
                    { key:"upiId",             label:"UPI ID",              placeholder:"e.g. name@upi",icon:"📱" },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display:"block",fontSize:12,fontWeight:700,color:"var(--text-secondary)",marginBottom:6 }}>{f.icon} {f.label}</label>
                      <input type="text"
                        value={payoutForm[f.key] || myProfile?.payoutAccount?.[f.key] || ""}
                        placeholder={f.placeholder}
                        onChange={e => setPayoutForm(p => ({ ...p,[f.key]:e.target.value }))}
                        style={{ width:"100%",padding:"11px 14px",borderRadius:10,border:"1.5px solid var(--border)",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",transition:"border-color .15s" }}
                        onFocus={e => { e.target.style.borderColor="#4f46e5"; e.target.style.boxShadow="0 0 0 3px rgba(79,70,229,.1)"; }}
                        onBlur={e => { e.target.style.borderColor="#e2e8f0"; e.target.style.boxShadow="none"; }}
                      />
                    </div>
                  ))}
                  <button disabled={savingPayout} style={{ marginTop:8,padding:"13px",borderRadius:11,border:"none",background:savingPayout?"#a5b4fc":"linear-gradient(135deg,#4f46e5,#6366f1)",color:"#fff",fontSize:14,fontWeight:800,cursor:savingPayout?"not-allowed":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:savingPayout?"none":"0 6px 20px rgba(79,70,229,.35)" }}
                    onClick={async () => {
                      if (!myProfile) return;
                      setSavingPayout(true);
                      try {
                        const updated = await api.updatePayoutAccount(myProfile.id, payoutForm);
                        setMyProfile(updated);
                        onToast("Payout account saved!");
                      } catch (e) { onToast(e.response?.data?.error || "Failed to save","error"); }
                      finally { setSavingPayout(false); }
                    }}
                  >
                    {savingPayout ? "Saving…" : "💾 Save Payout Account"}
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {editModal && myProfile && <WorkerModal worker={myProfile} categories={categories} onSave={handleUpdateProfile} onClose={() => setEdit(false)} />}
      {navBooking && <NavigationModal booking={navBooking} workerProfile={myProfile} onClose={() => setNavBooking(null)} />}
      {chatBooking && <ChatModal booking={chatBooking} currentUser={user} onClose={() => setChatBooking(null)} />}

      <style>{`
        @keyframes pulseGreen { 0%,100%{box-shadow:0 0 0 3px rgba(34,197,94,.25)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,.15)} }
        @keyframes timerPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
      `}</style>
    </div>
  );
}
