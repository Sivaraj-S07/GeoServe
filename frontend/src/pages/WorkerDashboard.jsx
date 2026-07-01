import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import * as api from "../api";
import BookingCard from "../components/BookingCard";
import WorkerModal from "../components/WorkerModal";
import { StatsGrid } from "../components/StatsCards";
import Icon, { CategoryChip, CategoryListItem, CategoryLabel, CategoryBanner } from "../components/Icon";
import NavigationModal from "../components/NavigationModal";
import ChatModal from "../components/ChatModal";
import PaymentMethodManager from "../components/PaymentMethodManager";
import UpiManager from "../components/UpiManager";
import { getLocalizedName } from "../utils/localizedName";

const TABS = (t) => [
  { id:"overview",  label:t("workerDashboard.overview"),     icon:"trending-up" },
  { id:"bookings",  label:t("workerDashboard.myBookings"),   icon:"calendar"    },
  { id:"profile",   label:t("workerDashboard.myProfile"),    icon:"user"        },
  { id:"pricing",   label:"My Pricing",                      icon:"tag"         },
  { id:"payout",    label:t("workerDashboard.payoutAccount"), icon:"credit-card" },
];

const STATUS_COLORS = {
  pending:"badge-amber", accepted:"badge-blue", in_progress:"badge-purple",
  completed:"badge-green", confirmed:"badge-green", rejected:"badge-red",
};

export default function WorkerDashboard({ onToast, sidebarOpen, onCloseSidebar, notifState }) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
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

  // Pricing state
  const DURATION_OPTIONS = [1, 2, 3, 4, 6, 8];
  const [pricingForm,   setPricingForm]   = useState({ baseHourlyRate: 500, customRates: {}, notes: "" });
  const [pricingLoaded, setPricingLoaded] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingErr,    setPricingErr]    = useState("");

  // Fire all requests in parallel on mount — no sequential blocking
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);

    // All three run simultaneously
    const catsProm    = api.getCategories().catch(() => []);
    const verifProm   = api.getMyVerification().catch(() => null);
    const profileProm = api.getMyWorkerProfile().catch(e => {
      if (e?.status !== 404) onToast(t("workerDashboard.failedLoadProfile"), "error");
      return null;
    });

    Promise.all([catsProm, verifProm, profileProm]).then(([cats, verif, profile]) => {
      setCats(cats);
      if (verif) setVerifStatus(verif.verification_status);
      if (profile) {
        setMyProfile(profile);
        if (profile.payoutAccount) {
          setPayoutForm({
            accountHolderName: profile.payoutAccount.accountHolderName || "",
            accountNumber:     profile.payoutAccount.accountNumber     || "",
            ifscCode:          profile.payoutAccount.ifscCode          || "",
            bankName:          profile.payoutAccount.bankName          || "",
            upiId:             profile.payoutAccount.upiId             || "",
          });
        }
        // Load bookings only after profile resolves (needs profile.id)
        api.getBookings({ workerId: profile.id })
          .then(setBookings)
          .catch(() => onToast(t("workerDashboard.failedLoadBookings"), "error"));
        // Load worker pricing
        api.getWorkerPricing(profile.id)
          .then(p => {
            setPricingForm({
              baseHourlyRate: p.baseHourlyRate || 500,
              customRates:    p.customRates    || {},
              notes:          p.notes          || "",
            });
            setPricingLoaded(true);
          })
          .catch(() => setPricingLoaded(true)); // non-fatal
      }
    }).catch(() => onToast(t("workerDashboard.failedLoadData"), "error"))
      .finally(() => setLoading(false));
  }, [user?.id]);

  // Keep category data (incl. admin-updated icons/images) fresh without a full page reload
  useEffect(() => {
    const refreshCategories = () => { api.getCategories().then(setCats).catch(() => {}); };
    const onVisible = () => { if (document.visibilityState === "visible") refreshCategories(); };
    window.addEventListener("focus", refreshCategories);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refreshCategories);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const loadAll = () => {}; // kept for any remaining references

  // Auto-refresh bookings when SSE delivers a new_booking event
  const myProfileIdRef = useRef(null);
  useEffect(() => {
    if (myProfile?.id) myProfileIdRef.current = myProfile.id;
  }, [myProfile?.id]);

  useEffect(() => {
    if (!notifState?.notifications?.length) return;
    const latest = notifState.notifications[0];
    if (latest?.type === "new_booking") {
      onToast(t("workerDashboard.newBookingRequest"), "success");
    }
    if (latest?.type === "new_booking" || latest?.type === "booking_update") {
      if (myProfileIdRef.current) {
        api.getBookings({ workerId: myProfileIdRef.current })
          .then(setBookings)
          .catch(() => {});
      }
    }
  }, [notifState?.notifications?.length]);

  const handleToggleAvailability = async () => {
    if (!myProfile) return;
    setToggling(true);
    try {
      const updated = await api.toggleAvailability(myProfile.id, !myProfile.availability);
      setMyProfile(updated);
      onToast(t("workerDashboard.availabilityUpdated", { status: updated.availability ? t("workerDashboard.activeAcceptingBookings") : t("workerDashboard.inactiveNotAvailable") }));
    } catch { onToast(t("workerDashboard.failedUpdateAvailability"),"error"); }
    finally { setToggling(false); }
  };

  const handleBookingStatus = async (id, status, note) => {
    try {
      const updated = await api.updateBookingStatus(id, status, note);
      setBookings(p => p.map(b => b.id === updated.id ? updated : b));
      onToast(t("workerDashboard.bookingStatus", { status: status.replace("_"," ") }));
      if (status === "accepted") setNavBooking(updated);
    } catch { onToast(t("workerDashboard.failedUpdateBooking"),"error"); }
  };

  const handleDeleteBooking = async (id) => {
    try {
      await api.deleteBooking(id);
      setBookings(p => p.filter(b => b.id !== id));
      onToast(t("workerDashboard.bookingDeleted"));
    } catch (e) { onToast(e.message || t("workerDashboard.failedDeleteBooking"),"error"); }
  };

  const handleUpdateProfile = async (data) => {
    try {
      const updated = await api.updateWorker(myProfile.id, data);
      setMyProfile(updated);
      onToast(t("workerDashboard.profileUpdated"));
      setEdit(false);
    } catch (e) { onToast(e.message || t("workerDashboard.failedSave"),"error"); }
  };

  // Memoized booking stats — avoids re-computing on every unrelated render
  const pendingCount    = useMemo(() => bookings.filter(b => b.status==="pending").length,                          [bookings]);
  const acceptedCount   = useMemo(() => bookings.filter(b => b.status==="accepted").length,                        [bookings]);
  const inProgressCount = useMemo(() => bookings.filter(b => b.status==="in_progress").length,                     [bookings]);
  const completedCount  = useMemo(() => bookings.filter(b => ["completed","confirmed"].includes(b.status)).length, [bookings]);
  const earnings        = useMemo(() =>
    bookings.filter(b => ["completed","confirmed"].includes(b.status)).reduce((s,b) => s + (b.serviceCost || b.cost || 0), 0),
    [bookings]);

  const getCat = id => categories.find(c => c.id === id);
  // Bilingual display name — prefers the worker profile's name (kept in
  // sync with the account at signup/edit time), falls back to the account
  // name, and finally to the legacy single-language name (null-safe).
  const displayName = getLocalizedName(myProfile || user, i18n.language) || user.name || "";
  const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563eb&color=fff&size=80`;

  const filteredBookings = useMemo(() => bookingFilter === "all" ? bookings : bookings.filter(b => b.status === bookingFilter), [bookings, bookingFilter]);

  // Skeleton layout shown while loading — sidebar + content visible immediately
  if (loading) return (
    <div style={{ display:"flex", minHeight:"calc(100vh - 64px)" }}>
      {/* Skeleton sidebar */}
      <aside style={{ width:220, background:"var(--surface)", borderRight:"1.5px solid var(--border)", padding:"24px 14px", flexShrink:0 }}>
        <div style={{ textAlign:"center", paddingBottom:20, borderBottom:"1px solid var(--border)", marginBottom:16 }}>
          <div className="skeleton" style={{ width:64, height:64, borderRadius:"50%", margin:"0 auto 10px" }} />
          <div className="skeleton" style={{ height:14, width:"70%", margin:"0 auto 8px", borderRadius:6 }} />
          <div className="skeleton" style={{ height:11, width:"55%", margin:"0 auto", borderRadius:6 }} />
        </div>
        {[1,2,3,4].map(i => (
          <div key={i} className="skeleton" style={{ height:38, borderRadius:9, marginBottom:4 }} />
        ))}
      </aside>
      {/* Skeleton main */}
      <main style={{ flex:1, padding:"28px 32px", background:"var(--bg)" }}>
        <div className="skeleton" style={{ height:120, borderRadius:18, marginBottom:24 }} />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))", gap:14, marginBottom:24 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:90, borderRadius:14 }} />)}
        </div>
        <div className="skeleton" style={{ height:200, borderRadius:14, marginBottom:16 }} />
        <div className="skeleton" style={{ height:160, borderRadius:14 }} />
      </main>
    </div>
  );

  /* ── Mobile Bottom Navigation items for Worker Portal ──
     Per requirements: Activities, Dashboard, Bookings order
     Activities = profile/work activity; Dashboard = overview; Bookings = bookings
  ── */
  const WORKER_BOTTOM_NAV = [
    { id: "overview",  label: t("workerDashboard.overview"),     icon: "trending-up"  },
    { id: "bookings",  label: t("workerDashboard.myBookings"),   icon: "calendar"     },
    { id: "pricing",   label: "Pricing",                         icon: "tag"          },
    { id: "profile",   label: t("workerDashboard.myProfile"),    icon: "user"         },
    { id: "payout",    label: t("workerDashboard.payoutAccount"), icon: "credit-card" },
  ];

  const WorkerMobileBottomNav = () => (
    <nav className="mobile-bottom-nav" role="navigation" aria-label="Mobile navigation">
      {WORKER_BOTTOM_NAV.map(item => (
        <button
          key={item.id}
          className={`mobile-bottom-nav-item blue${tab === item.id ? " active" : ""}`}
          onClick={() => setTab(item.id)}
          aria-label={item.label}
          aria-current={tab === item.id ? "page" : undefined}
        >
          {item.id === "bookings" && (pendingCount > 0 || notifState?.bookingBadge > 0) && (
            <span className="mobile-bottom-nav-badge">{pendingCount || notifState?.bookingBadge}</span>
          )}
          <Icon name={item.icon} size={20} color={tab === item.id ? "var(--blue)" : "var(--muted)"} />
          <span className="mobile-bottom-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div style={{ display:"flex", minHeight:"calc(100vh - 64px)", flexDirection:"column" }}>
      {/* Verification Banner */}
      {verifStatus === "pending" && (
        <div style={{ background:"linear-gradient(135deg,#fffbeb,#fef3c7)", borderBottom:"2px solid #fde68a", padding:"14px 24px", display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:24 }}>⏳</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800,color:"#92400e",fontSize:14 }}>{t("workerDashboard.verificationPending")}</div>
            <div style={{ fontSize:12,color:"#78350f",marginTop:2 }}>{t("workerDashboard.verificationPendingDesc")}</div>
          </div>
        </div>
      )}
      {verifStatus === "rejected" && (
        <div style={{ background:"linear-gradient(135deg,#fef2f2,#fee2e2)", borderBottom:"2px solid #fecaca", padding:"14px 24px", display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:24 }}>❌</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800,color:"#991b1b",fontSize:14 }}>{t("workerDashboard.verificationRejected")}</div>
            <div style={{ fontSize:12,color:"#7f1d1d",marginTop:2 }}>{t("workerDashboard.verificationRejectedDesc")}</div>
          </div>
          <button onClick={() => nav("/verify-worker")} style={{ padding:"8px 16px",background:"#dc2626",color:"white",border:"none",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",flexShrink:0 }}>{t("workerDashboard.resubmit")}</button>
        </div>
      )}
      {(!verifStatus || verifStatus === "unverified") && (
        <div style={{ background:"linear-gradient(135deg,#eef2ff,#f5f3ff)", borderBottom:"2px solid #c7d2fe", padding:"14px 24px", display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:24 }}>🛡️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800,color:"#047857",fontSize:14 }}>{t("workerDashboard.completeVerification")}</div>
            <div style={{ fontSize:12,color:"var(--primary)",marginTop:2 }}>{t("workerDashboard.completeVerificationDesc")}</div>
          </div>
          <button onClick={() => nav("/verify-worker")} style={{ padding:"8px 16px",background:"var(--gradient-primary)",color:"white",border:"none",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",flexShrink:0,boxShadow:"0 4px 12px rgba(37,99,235,.4)" }}>{t("workerDashboard.verifyNow")}</button>
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
            <div style={{ fontWeight:800,fontSize:15,marginBottom:2 }}>{displayName}</div>
            <div style={{ color:"var(--muted)",fontSize:12,marginBottom:10 }}>{user.email}</div>

            {/* Earnings mini-badge */}
            {earnings > 0 && (
              <div style={{ background:"linear-gradient(135deg,#f0fdf4,#dcfce7)", border:"1.5px solid #86efac", borderRadius:10, padding:"8px 12px", marginBottom:12 }}>
                <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:2 }}>{t("workerDashboard.totalEarnings")}</div>
                <div style={{ fontWeight:900,fontSize:22,color:"var(--primary)" }}>₹{earnings.toLocaleString()}</div>
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
                    <span>⏹</span> {toggling ? t("workerDashboard.updating") : t("workerDashboard.stopOffline")}
                  </button>
                </div>
              ) : (
                <button disabled={toggling} onClick={handleToggleAvailability}
                  style={{ width:"100%",padding:"10px 0",borderRadius:10,border:"none",background:toggling?"#dcfce7":"linear-gradient(135deg,#16a34a,#22c55e)",color:"white",fontSize:13,fontWeight:800,cursor:toggling?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxShadow:toggling?"none":"0 3px 12px rgba(22,163,74,.35)",transition:"all .15s",opacity:toggling?.7:1 }}>
                  <span>▶</span> {toggling ? t("workerDashboard.updating") : t("workerDashboard.startGoActive")}
                </button>
              )}
              <div style={{ marginTop:6,textAlign:"center",fontSize:11,fontWeight:700,color:myProfile?.availability?"#16a34a":"#94a3b8",display:"flex",alignItems:"center",justifyContent:"center",gap:4 }}>
                <div style={{ width:7,height:7,borderRadius:"50%",background:myProfile?.availability?"#22c55e":"#94a3b8" }} />
                {myProfile?.availability ? t("workerDashboard.activeAcceptingBookings") : t("workerDashboard.inactiveNotAvailable")}
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
                {item.id==="bookings" && (pendingCount > 0 || notifState?.bookingBadge > 0) && (
                  <span style={{ marginLeft:"auto",background:"#ef4444",color:"white",fontSize:10,fontWeight:800,padding:"1px 7px",borderRadius:20,animation:"notif-pop .25s ease" }}>{pendingCount || notifState?.bookingBadge}</span>
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
        <main className="anim-fade dashboard-main" style={{ flex:1,overflowY:"auto",background:"var(--bg)" }}>

          {/* ── OVERVIEW TAB ─────────────────────────── */}
          {tab === "overview" && (
            <>
              {/* Hero */}
              <div className="gs-hero-banner" style={{ background:"var(--grad-hero)",borderRadius:20,padding:"28px 32px",marginBottom:24,position:"relative",overflow:"hidden",boxShadow:"0 8px 32px rgba(37,99,235,.3)" }}>
                <div style={{ position:"absolute",top:-40,right:-40,width:180,height:180,borderRadius:"50%",background:"rgba(255,255,255,.06)",pointerEvents:"none" }} />
                <div style={{ position:"absolute",bottom:-30,left:"60%",width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,.04)",pointerEvents:"none" }} />
                <div style={{ position:"relative",zIndex:1,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16 }}>
                  <div>
                    <div style={{ fontSize:11,fontWeight:700,color:"rgba(255,255,255,.6)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:6 }}>{t("workerDashboard.workerDashboardTitle")}</div>
                    <h1 style={{ color:"white",fontWeight:800,fontSize:26,marginBottom:6,letterSpacing:"-.5px" }}>
                      Welcome back, {displayName.split(" ")[0]}! 👋
                    </h1>
                    <p style={{ color:"rgba(255,255,255,.75)",fontSize:14,margin:0 }}>{t("workerDashboard.jobActivitySummary")}</p>
                  </div>
                  <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                    {inProgressCount > 0 && (
                      <div style={{ background:"rgba(124,58,237,.3)",border:"1px solid rgba(167,139,250,.4)",borderRadius:12,padding:"10px 16px",backdropFilter:"blur(8px)" }}>
                        <div style={{ fontSize:11,color:"#c4b5fd",fontWeight:700 }}>{t("workerDashboard.inProgressStatus")}</div>
                        <div style={{ fontSize:20,fontWeight:900,color:"white" }}>{inProgressCount}</div>
                      </div>
                    )}
                    {pendingCount > 0 && (
                      <div style={{ background:"rgba(217,119,6,.3)",border:"1px solid rgba(251,191,36,.4)",borderRadius:12,padding:"10px 16px",backdropFilter:"blur(8px)" }}>
                        <div style={{ fontSize:11,color:"#fcd34d",fontWeight:700 }}>{t("workerDashboard.pendingStatus")}</div>
                        <div style={{ fontSize:20,fontWeight:900,color:"white" }}>{pendingCount}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Mobile-only: Go Active / Go Offline + Cancel Request buttons ── */}
              <div className="worker-mobile-action-row">
                {myProfile?.availability ? (
                  <>
                    <button
                      disabled={toggling}
                      onClick={handleToggleAvailability}
                      className="worker-mobile-btn worker-mobile-btn-offline"
                      style={{ opacity: toggling ? 0.7 : 1, cursor: toggling ? "not-allowed" : "pointer" }}
                    >
                      <span>⏹</span> {toggling ? t("workerDashboard.updating") : t("workerDashboard.stopOffline")}
                    </button>
                    <button
                      className="worker-mobile-btn worker-mobile-btn-cancel"
                      onClick={() => {
                        if (myProfile?.id) {
                          handleToggleAvailability();
                        }
                      }}
                      disabled={toggling}
                      style={{ opacity: toggling ? 0.7 : 1, cursor: toggling ? "not-allowed" : "pointer" }}
                    >
                      ✕ Cancel Request
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      disabled={toggling}
                      onClick={handleToggleAvailability}
                      className="worker-mobile-btn worker-mobile-btn-active"
                      style={{ opacity: toggling ? 0.7 : 1, cursor: toggling ? "not-allowed" : "pointer" }}
                    >
                      <span>▶</span> {toggling ? t("workerDashboard.updating") : t("workerDashboard.startGoActive")}
                    </button>
                    <button
                      className="worker-mobile-btn worker-mobile-btn-cancel"
                      onClick={() => {}}
                      disabled={toggling}
                      style={{ opacity: toggling ? 0.5 : 0.7, cursor: "default" }}
                    >
                      ✕ Cancel Request
                    </button>
                  </>
                )}
              </div>

              {/* Stats grid */}
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:14,marginBottom:24 }}>
                {[
                  { icon:"📅",label:t("workerDashboard.totalBookings"),value:bookings.length,grad:"var(--gradient-primary)",bg:"#eef2ff",border:"#c7d2fe" },
                  { icon:"⏳",label:t("workerDashboard.pending"),value:pendingCount,grad:"linear-gradient(135deg,#d97706,#f59e0b)",bg:"#fffbeb",border:"#fde68a" },
                  { icon:"⚡",label:t("workerDashboard.inProgress"),value:inProgressCount,grad:"linear-gradient(135deg,#7c3aed,#a78bfa)",bg:"#f5f3ff",border:"#ddd6fe" },
                  { icon:"✅",label:t("workerDashboard.completed"),value:completedCount,grad:"linear-gradient(135deg,#2563eb,#3b82f6)",bg:"var(--primary-bg)",border:"var(--primary-border)" },
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
                    <span style={{ background:"#fffbeb",border:"1px solid #fde68a",color:"#d97706",fontSize:11,fontWeight:700,padding:"2px 10px",borderRadius:20 }}>{t("workerDashboard.actionRequired")}</span>
                  </div>
                  {bookings.filter(b => b.status==="pending").map(b => (
                    <BookingCard key={b.id} booking={b} role="worker" onStatusChange={handleBookingStatus} onDelete={handleDeleteBooking} onChat={setChatBooking} onNavigate={setNavBooking} workerProfile={myProfile} categories={categories} />
                  ))}
                </div>
              )}

              {/* Profile summary */}
              {myProfile && (
                <div className="card" style={{ padding:0, overflow:"hidden" }}>
                  {/* ── Banner: category name label sits on the right — never behind the avatar ── */}
                  <CategoryBanner name={getCat(myProfile.categoryId)?.name} icon={getCat(myProfile.categoryId)?.icon} bannerColor={getCat(myProfile.categoryId)?.bannerColor} size="sm" rounded={0} />
                  {/* ── Profile row: avatar pulls up over banner; name always to the right ── */}
                  <div style={{ padding:"0 20px 20px", marginTop:-28, position:"relative" }}>
                    <div style={{ display:"flex", alignItems:"flex-end", gap:14, flexWrap:"nowrap" }}>
                      {/* Avatar overlaps banner bottom */}
                      <div style={{ position:"relative", flexShrink:0 }}>
                        <img src={myProfile.avatar||fb} onError={e => { e.target.src=fb; }}
                          style={{ width:64, height:64, borderRadius:16, objectFit:"cover",
                            border:"3px solid var(--surface)", boxShadow:"0 4px 16px rgba(0,0,0,.22)",
                            display:"block" }} />
                        <div style={{ position:"absolute", bottom:3, right:3, width:14, height:14,
                          borderRadius:"50%", background:myProfile.availability?"#22c55e":"#94a3b8",
                          border:"2.5px solid white" }} />
                      </div>
                      {/* Name + meta — always right of avatar, never overlapping banner text */}
                      <div style={{ flex:1, minWidth:0, paddingBottom:4 }}>
                        <div style={{ fontWeight:800, fontSize:16, marginBottom:3,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {displayName}
                        </div>
                        <div style={{ color:"var(--muted)", fontSize:12, marginBottom:6,
                          display:"flex", alignItems:"center", gap:4 }}>
                          <CategoryLabel name={`${getCat(myProfile.categoryId)?.name || ""} · ${myProfile.specialization || ""}`} icon={getCat(myProfile.categoryId)?.icon} size={12} color="var(--muted)" />
                        </div>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {myProfile.yearsOfExp > 0 && <span style={{ background:"#eff6ff", border:"1px solid #bfdbfe", color:"#1d4ed8", fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20 }}>🏆 {myProfile.yearsOfExp}+ yrs</span>}
                          {myProfile.rating > 0 && <span style={{ display:"flex", alignItems:"center", gap:3, background:"#fffbeb", border:"1px solid #fde68a", color:"#92400e", fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20 }}><Icon name="star" size={10} color="#f59e0b" /> {myProfile.rating}</span>}
                          <span style={{ background:myProfile.availability?"var(--primary-bg)":"#f1f5f9", border:`1px solid ${myProfile.availability?"var(--primary-border)":"#e2e8f0"}`, color:myProfile.availability?"var(--primary)":"#94a3b8", fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20 }}>
                            {myProfile.availability?"● Available":"● Offline"}
                          </span>
                        </div>
                      </div>
                      {/* View Full button */}
                      <button onClick={() => setTab("profile")} style={{ flexShrink:0, alignSelf:"flex-start", marginTop:34, background:"none", border:"1px solid var(--border)", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer", color:"var(--muted)", fontFamily:"inherit" }}>
                        {t("workerDashboard.viewFull")}
                      </button>
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
                  <h2 style={{ fontWeight:800,fontSize:22,letterSpacing:"-.5px",margin:0 }}>{t("workerDashboard.myBookingsTitle")}</h2>
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
                  <p style={{ fontWeight:700,fontSize:16,color:"var(--text)" }}>{t("workerDashboard.noBookingsFound")}</p>
                  <p style={{ color:"var(--muted)",fontSize:13,marginTop:4 }}>{t("workerDashboard.noBookingsFoundDesc")}</p>
                </div>
              ) : (
                filteredBookings.map(b => (
                  <BookingCard key={b.id} booking={b} role="worker" onStatusChange={handleBookingStatus} onDelete={handleDeleteBooking} onChat={setChatBooking} onNavigate={setNavBooking} workerProfile={myProfile} categories={categories} />
                ))
              )}
            </>
          )}

          {/* ── PROFILE TAB ─────────────────────────── */}
          {tab === "profile" && myProfile && (
            <>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24 }}>
                <div>
                  <h2 style={{ fontWeight:800,fontSize:22,letterSpacing:"-.5px",margin:0 }}>{t("workerDashboard.myWorkerProfileTitle")}</h2>
                  <p style={{ color:"var(--muted)",fontSize:13,marginTop:4 }}>{t("workerDashboard.howClientsSeeYou")}</p>
                </div>
                <button className="btn-blue" onClick={() => setEdit(true)} style={{ padding:"10px 22px",fontSize:14,display:"flex",alignItems:"center",gap:8,borderRadius:10 }}>
                  <Icon name="edit" size={15} color="white" /> Edit Profile
                </button>
              </div>

              <div className="card" style={{ overflow:"hidden", marginBottom:20 }}>
                {/* ── Hero banner — gradient/watermark only; label moved below avatar */}
                <CategoryBanner
                  name={getCat(myProfile.categoryId)?.name}
                  icon={getCat(myProfile.categoryId)?.icon}
                  bannerColor={getCat(myProfile.categoryId)?.bannerColor}
                  size="lg" rounded={0} style={{ height:150 }}
                  showLabel={false}
                />
                <div style={{ padding:32, marginTop:-58, position:"relative" }}>
                {/* ── Centered hero: avatar → category → name/status/exp ── */}
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:28 }}>
                  {/* Avatar + availability dot */}
                  <div style={{ position:"relative", flexShrink:0, marginBottom:12 }}>
                    <img src={myProfile.avatar||fb} onError={e => { e.target.src=fb; }}
                      style={{ width:110,height:110,borderRadius:22,objectFit:"cover",border:"4px solid var(--surface)",boxShadow:"0 6px 24px rgba(0,0,0,.25)" }} />
                    <div style={{ position:"absolute",bottom:4,right:4,width:20,height:20,borderRadius:"50%",background:myProfile.availability?"#22c55e":"#94a3b8",border:"3px solid white" }} />
                  </div>
                  {/* Category name — centered clearly below photo */}
                  {getCat(myProfile.categoryId) && (
                    <div style={{ marginBottom:10 }}>
                      <CategoryChip
                        name={getCat(myProfile.categoryId)?.name || "—"}
                        icon={getCat(myProfile.categoryId)?.icon}
                      />
                    </div>
                  )}
                  {/* Worker name — centered */}
                  <h3 style={{ fontWeight:800, fontSize:22, marginBottom:8, textAlign:"center" }}>
                    {displayName}
                  </h3>
                  {/* Status + specialization row — centered */}
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginBottom:8 }}>
                    {myProfile.specialization && (
                      <span style={{ color:"var(--muted)", fontSize:13 }}>· {myProfile.specialization}</span>
                    )}
                    <span className={`badge ${myProfile.availability?"badge-green":"badge-gray"}`}>
                      {myProfile.availability?"● Available":"● Unavailable"}
                    </span>
                  </div>
                  {/* Experience + rating badges — centered */}
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
                    {myProfile.yearsOfExp > 0 && (
                      <span style={{ background:"#eff6ff",border:"1px solid #bfdbfe",color:"#1d4ed8",fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:20 }}>
                        🏆 {myProfile.yearsOfExp}+ years
                      </span>
                    )}
                    {myProfile.rating > 0 && (
                      <span style={{ display:"flex",alignItems:"center",gap:5,background:"#fffbeb",border:"1px solid #fde68a",color:"#92400e",fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:20 }}>
                        <Icon name="star" size={13} color="#f59e0b" /> {myProfile.rating} · {myProfile.jobsCompleted} jobs
                      </span>
                    )}
                  </div>
                </div>

                {myProfile.experience && (
                  <div style={{ background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:12,padding:"16px 18px",marginBottom:18 }}>
                    <div style={{ fontSize:11,fontWeight:800,color:"#1d4ed8",textTransform:"uppercase",letterSpacing:".06em",marginBottom:10 }}>{t("workerDashboard.workExperience")}</div>
                    <p style={{ color:"#1e40af",fontSize:14,lineHeight:1.75,margin:0 }}>{myProfile.experience}</p>
                  </div>
                )}
                {myProfile.bio && (
                  <div style={{ background:"var(--bg)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 18px",marginBottom:18 }}>
                    <div style={{ fontSize:11,fontWeight:800,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:10 }}>{t("workerDashboard.aboutMe")}</div>
                    <p style={{ color:"var(--text-secondary)",fontSize:14,lineHeight:1.75,margin:0 }}>{myProfile.bio}</p>
                  </div>
                )}
                {Array.isArray(myProfile.skills) && myProfile.skills.length > 0 && (
                  <div style={{ marginBottom:18 }}>
                    <div style={{ fontSize:11,fontWeight:800,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:10 }}>{t("workerDashboard.skillsAndServices")}</div>
                    <div style={{ display:"flex",gap:7,flexWrap:"wrap" }}>
                      {myProfile.skills.map(s => <span key={s} style={{ background:"#f0fdf4",border:"1px solid #bbf7d0",color:"#15803d",fontSize:12,fontWeight:700,padding:"5px 14px",borderRadius:20 }}>{s}</span>)}
                    </div>
                  </div>
                )}
                <div style={{ display:"flex",flexDirection:"column",gap:10,paddingTop:20,borderTop:"1px solid var(--border)" }}>
                  <div style={{ fontSize:11,fontWeight:800,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4 }}>{t("workerDashboard.contactDetails")}</div>
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
              </div>
            </>
          )}

          {/* ── PRICING TAB ─────────────────────────── */}
          {tab === "pricing" && (
            <>
              <div style={{ marginBottom:24 }}>
                <h2 style={{ fontWeight:800, fontSize:22, letterSpacing:"-.5px", margin:0, display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#7c3aed,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Icon name="tag" size={17} color="#fff" />
                  </div>
                  My Service Pricing
                </h2>
                <p style={{ color:"var(--muted)", fontSize:13, marginTop:6 }}>
                  Set your hourly rate and custom prices per duration. Users will see these prices when booking you.
                </p>
              </div>

              {/* Info banner */}
              <div style={{ background:"linear-gradient(135deg,#eff6ff,#f0fdf4)", border:"1px solid #bfdbfe", borderRadius:14, padding:"16px 20px", marginBottom:24, display:"flex", gap:14, alignItems:"flex-start" }}>
                <div style={{ width:38, height:38, borderRadius:10, background:"linear-gradient(135deg,#2563eb,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon name="info" size={17} color="#fff" />
                </div>
                <div>
                  <p style={{ margin:"0 0 4px", fontSize:13, fontWeight:800, color:"#1d4ed8" }}>How worker pricing works</p>
                  <p style={{ margin:0, fontSize:12, color:"var(--text-secondary)", lineHeight:1.7 }}>
                    Set your <strong>base hourly rate</strong> (used when no custom price is configured for a duration).
                    Optionally set <strong>custom prices per duration</strong> to offer discounts for longer bookings.
                    All future bookings will automatically use your latest prices.
                  </p>
                </div>
              </div>

              {/* Base hourly rate card */}
              <div className="card" style={{ padding:24, marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#059669,#10b981)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Icon name="indianrupee" size={15} color="#fff" />
                  </div>
                  <div>
                    <h3 style={{ fontWeight:800, fontSize:15, margin:0 }}>Base Hourly Rate</h3>
                    <p style={{ fontSize:11, color:"var(--muted)", margin:0 }}>Fallback rate when no custom price is set</p>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ position:"relative", flex:1 }}>
                    <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", fontWeight:800, color:"var(--muted)", fontSize:16, pointerEvents:"none" }}>₹</span>
                    <input
                      type="number"
                      min={0} max={100000} step={10}
                      value={pricingForm.baseHourlyRate}
                      onChange={e => {
                        setPricingErr("");
                        setPricingForm(p => ({ ...p, baseHourlyRate: e.target.value === "" ? "" : Number(e.target.value) }));
                      }}
                      style={{ width:"100%", padding:"12px 14px 12px 32px", borderRadius:11, border:"1.5px solid var(--border)", fontSize:18, fontWeight:800, fontFamily:"inherit", outline:"none", boxSizing:"border-box", transition:"border-color .15s", color:"var(--text)", background:"var(--surface)" }}
                      onFocus={e => { e.target.style.borderColor="var(--primary)"; e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,.12)"; }}
                      onBlur={e => { e.target.style.borderColor="var(--border)"; e.target.style.boxShadow="none"; }}
                      placeholder="500"
                    />
                  </div>
                  <div style={{ fontSize:13, color:"var(--muted)", fontWeight:600, whiteSpace:"nowrap" }}>per hour</div>
                </div>
              </div>

              {/* Per-duration pricing */}
              <div className="card" style={{ padding:24, marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#7c3aed,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Icon name="sliders" size={15} color="#fff" />
                  </div>
                  <div>
                    <h3 style={{ fontWeight:800, fontSize:15, margin:0 }}>Custom Duration Rates</h3>
                    <p style={{ fontSize:11, color:"var(--muted)", margin:0 }}>Override per-duration. Leave blank to auto-calculate from base rate.</p>
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12, marginTop:18 }}>
                  {DURATION_OPTIONS.map(h => {
                    const autoCalc = Math.round((pricingForm.baseHourlyRate || 500) * h);
                    const customVal = pricingForm.customRates[String(h)];
                    const isCustom = customVal !== undefined && customVal !== "";
                    return (
                      <div key={h} style={{ background: isCustom ? "linear-gradient(135deg,#f5f3ff,#ede9fe)" : "var(--bg)", border: `1.5px solid ${isCustom ? "#c4b5fd" : "var(--border)"}`, borderRadius:12, padding:"14px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                            <div style={{ width:28, height:28, borderRadius:8, background: isCustom ? "linear-gradient(135deg,#7c3aed,#8b5cf6)" : "var(--surface)", border: isCustom ? "none" : "1.5px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <Icon name="clock" size={13} color={isCustom ? "#fff" : "var(--muted)"} />
                            </div>
                            <span style={{ fontWeight:800, fontSize:14, color:"var(--text)" }}>{h} {h === 1 ? "hour" : "hours"}</span>
                          </div>
                          {isCustom && (
                            <button
                              onClick={() => {
                                setPricingErr("");
                                setPricingForm(p => {
                                  const next = { ...p.customRates };
                                  delete next[String(h)];
                                  return { ...p, customRates: next };
                                });
                              }}
                              style={{ background:"none", border:"none", cursor:"pointer", color:"#7c3aed", fontSize:11, fontWeight:700, padding:"2px 6px", borderRadius:6, display:"flex", alignItems:"center", gap:3 }}
                            >
                              <Icon name="x" size={11} color="#7c3aed" /> Reset
                            </button>
                          )}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ position:"relative", flex:1 }}>
                            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontWeight:700, color:"var(--muted)", fontSize:14, pointerEvents:"none" }}>₹</span>
                            <input
                              type="number"
                              min={0} max={1000000} step={10}
                              value={isCustom ? customVal : ""}
                              placeholder={`Auto: ₹${autoCalc}`}
                              onChange={e => {
                                setPricingErr("");
                                const val = e.target.value;
                                setPricingForm(p => ({
                                  ...p,
                                  customRates: val === ""
                                    ? (() => { const n = { ...p.customRates }; delete n[String(h)]; return n; })()
                                    : { ...p.customRates, [String(h)]: Number(val) },
                                }));
                              }}
                              style={{ width:"100%", padding:"9px 10px 9px 26px", borderRadius:9, border:"1.5px solid", borderColor: isCustom ? "#c4b5fd" : "var(--border)", fontSize:14, fontWeight:700, fontFamily:"inherit", outline:"none", boxSizing:"border-box", background: isCustom ? "#faf5ff" : "var(--surface)", color:"var(--text)", transition:"border-color .15s" }}
                              onFocus={e => { e.target.style.borderColor="#7c3aed"; e.target.style.boxShadow="0 0 0 3px rgba(124,58,237,.12)"; }}
                              onBlur={e => { e.target.style.borderColor=isCustom?"#c4b5fd":"var(--border)"; e.target.style.boxShadow="none"; }}
                            />
                          </div>
                        </div>
                        {!isCustom && (
                          <div style={{ fontSize:11, color:"var(--muted)", marginTop:6, textAlign:"center" }}>
                            Will use ₹{autoCalc} (base × {h})
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pricing notes */}
              <div className="card" style={{ padding:24, marginBottom:24 }}>
                <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:700, color:"var(--text-secondary)", marginBottom:8 }}>
                  <Icon name="edit" size={13} color="var(--muted)" /> Pricing Notes (optional)
                </label>
                <textarea
                  value={pricingForm.notes}
                  onChange={e => setPricingForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  maxLength={500}
                  placeholder="E.g. 'Rates may vary for specific tasks. Contact me for a custom quote.'"
                  style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:"1.5px solid var(--border)", fontSize:13, fontFamily:"inherit", outline:"none", resize:"vertical", boxSizing:"border-box", background:"var(--surface)", color:"var(--text)" }}
                  onFocus={e => { e.target.style.borderColor="var(--primary)"; e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,.10)"; }}
                  onBlur={e => { e.target.style.borderColor="var(--border)"; e.target.style.boxShadow="none"; }}
                />
                <div style={{ fontSize:11, color:"var(--muted)", marginTop:4, textAlign:"right" }}>{pricingForm.notes.length}/500</div>
              </div>

              {/* Price preview */}
              <div style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:14, padding:"16px 20px", marginBottom:24 }}>
                <div style={{ fontSize:13, fontWeight:800, color:"var(--text)", marginBottom:12, display:"flex", alignItems:"center", gap:7 }}>
                  <Icon name="eye" size={15} color="var(--primary)" /> Live Preview — How Users Will See Your Prices
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {DURATION_OPTIONS.map(h => {
                    const custom = pricingForm.customRates[String(h)];
                    const base   = (pricingForm.baseHourlyRate || 500) * h;
                    const price  = (custom !== undefined && custom !== "") ? custom : Math.round(base);
                    const isDisc = custom !== undefined && custom !== "" && Number(custom) < Math.round(base);
                    return (
                      <div key={h} style={{ padding:"8px 14px", borderRadius:10, background: isDisc ? "#f5f3ff" : "var(--bg)", border:`1.5px solid ${isDisc ? "#c4b5fd" : "var(--border)"}`, textAlign:"center", minWidth:72 }}>
                        <div style={{ fontSize:11, color:"var(--muted)", fontWeight:600 }}>{h}h</div>
                        <div style={{ fontSize:15, fontWeight:800, color: isDisc ? "#7c3aed" : "var(--text)", marginTop:2 }}>₹{Number(price).toLocaleString("en-IN")}</div>
                        {isDisc && <div style={{ fontSize:10, color:"#7c3aed", fontWeight:700 }}>Custom ✓</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Error */}
              {pricingErr && (
                <div style={{ background:"var(--red-soft)", border:"1px solid var(--red-border)", borderRadius:10, padding:"10px 14px", marginBottom:16, color:"var(--red)", fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
                  <Icon name="alert-circle" size={14} color="var(--red)" /> {pricingErr}
                </div>
              )}

              {/* Save button */}
              <button
                disabled={savingPricing || !myProfile}
                style={{ padding:"14px 28px", borderRadius:12, border:"none", background: savingPricing ? "#a5b4fc" : "linear-gradient(135deg,#7c3aed,#8b5cf6)", color:"#fff", fontSize:14, fontWeight:800, cursor: savingPricing || !myProfile ? "not-allowed" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:9, boxShadow: savingPricing ? "none" : "0 6px 20px rgba(124,58,237,.35)", transition:"all .2s" }}
                onMouseEnter={e => { if (!savingPricing) { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 10px 28px rgba(124,58,237,.45)"; }}}
                onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow=savingPricing?"none":"0 6px 20px rgba(124,58,237,.35)"; }}
                onClick={async () => {
                  if (!myProfile) return;
                  // Validate
                  const rate = parseFloat(pricingForm.baseHourlyRate);
                  if (isNaN(rate) || rate < 0 || rate > 100000) {
                    setPricingErr("Base hourly rate must be between ₹0 and ₹1,00,000"); return;
                  }
                  for (const [h, p] of Object.entries(pricingForm.customRates)) {
                    const price = parseFloat(p);
                    if (isNaN(price) || price < 0 || price > 1000000) {
                      setPricingErr(`Invalid price for ${h}h: must be ₹0–₹10,00,000`); return;
                    }
                  }
                  setSavingPricing(true); setPricingErr("");
                  try {
                    const saved = await api.updateWorkerPricing(myProfile.id, {
                      baseHourlyRate: rate,
                      customRates:    pricingForm.customRates,
                      notes:          pricingForm.notes,
                    });
                    setPricingForm({ baseHourlyRate: saved.baseHourlyRate, customRates: saved.customRates, notes: saved.notes });
                    // Also update myProfile's hourlyRate so Overview reflects new rate
                    setMyProfile(p => p ? { ...p, hourlyRate: saved.baseHourlyRate } : p);
                    onToast("✅ Pricing saved! All future bookings will use the updated rates.", "success");
                  } catch (e) {
                    setPricingErr(e.message || "Failed to save pricing");
                  } finally { setSavingPricing(false); }
                }}
              >
                {savingPricing
                  ? (<><div className="spinner" style={{ width:16, height:16, borderWidth:2 }} /> Saving…</>)
                  : (<><Icon name="check" size={16} color="#fff" strokeWidth={2.5} /> Save Pricing</>)
                }
              </button>

              {pricingForm.notes === "" && Object.keys(pricingForm.customRates).length === 0 && (
                <p style={{ fontSize:12, color:"var(--muted)", marginTop:10 }}>
                  💡 Tip: Set custom duration rates to offer discounts for longer bookings and attract more customers.
                </p>
              )}
            </>
          )}

          {/* ── PAYOUT TAB ─────────────────────────── */}
          {tab === "payout" && (
            <>
              <div style={{ marginBottom:24 }}>
                <h2 style={{ fontWeight:800,fontSize:22,letterSpacing:"-.5px",margin:0 }}>{t("workerDashboard.payoutAccountTitle")}</h2>
                <p style={{ color:"var(--muted)",fontSize:13,marginTop:4 }}>{t("workerDashboard.addBankUpiDetails")}</p>
              </div>

              {/* Info banner */}
              <div style={{ background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:14,padding:"16px 20px",marginBottom:24,display:"flex",gap:14,alignItems:"flex-start" }}>
                <div style={{ width:36,height:36,borderRadius:10,background:"#dbeafe",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18 }}>💡</div>
                <div>
                  <p style={{ margin:"0 0 4px",fontSize:13,fontWeight:800,color:"#1d4ed8" }}>{t("workerDashboard.howPayoutsWork")}</p>
                  <p style={{ margin:0,fontSize:12,color:"var(--text-secondary)",lineHeight:1.6 }}>
                    When a user confirms your work, GeoServe processes payment. You receive <strong>95%</strong> (service fee). The platform retains <strong>5%</strong> as commission. Your UPI/bank details below are shown to customers for payment.
                  </p>
                </div>
              </div>

              {/* QR Preview (if UPI set) */}
              {myProfile?.payoutAccount?.upiId && (
                <div style={{ background:"var(--surface)",border:"1.5px solid #86efac",borderRadius:16,padding:"20px 24px",marginBottom:24 }}>
                  <div style={{ fontWeight:800,fontSize:14,color:"var(--primary)",marginBottom:16,display:"flex",alignItems:"center",gap:8 }}>
                    <span style={{ fontSize:18 }}>✅</span> Payment Account Active
                  </div>
                  <div style={{ display:"flex",gap:24,alignItems:"flex-start",flexWrap:"wrap" }}>
                    <div>
                      <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:8 }}>{t("workerDashboard.yourUpiQr")}</div>
                      <div style={{ background:"var(--surface)",border:"2px solid #e2e8f0",borderRadius:16,padding:12,display:"inline-block",boxShadow:"0 4px 20px rgba(0,0,0,.08)" }}>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${myProfile.payoutAccount.upiId}&pn=${encodeURIComponent(myProfile.name)}&cu=INR`)}`}
                          alt="UPI QR" width={130} height={130} style={{ display:"block",borderRadius:6 }}
                        />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:12 }}>{t("workerDashboard.accountDetails")}</div>
                      <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                        <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                          <span style={{ fontSize:13,color:"var(--muted)",minWidth:80 }}>{t("workerDashboard.upiIdLabel")}</span>
                          <span style={{ fontWeight:800,color:"var(--primary)",fontSize:14 }}>{myProfile.payoutAccount.upiId}</span>
                        </div>
                        {myProfile.payoutAccount.bankName && <div style={{ display:"flex",gap:10 }}><span style={{ fontSize:13,color:"var(--muted)",minWidth:80 }}>{t("workerDashboard.bankLabel")}</span><span style={{ fontWeight:700,fontSize:13 }}>{myProfile.payoutAccount.bankName}</span></div>}
                        {myProfile.payoutAccount.accountNumber && <div style={{ display:"flex",gap:10 }}><span style={{ fontSize:13,color:"var(--muted)",minWidth:80 }}>{t("workerDashboard.accountLabel")}</span><span style={{ fontWeight:700,fontSize:13 }}>****{myProfile.payoutAccount.accountNumber.slice(-4)}</span></div>}
                        {myProfile.payoutAccount.ifscCode && <div style={{ display:"flex",gap:10 }}><span style={{ fontSize:13,color:"var(--muted)",minWidth:80 }}>{t("workerDashboard.ifscCodeLabel")}</span><span style={{ fontWeight:700,fontSize:13 }}>{myProfile.payoutAccount.ifscCode}</span></div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* UPI IDs — full CRUD Payment Method module */}
              {myProfile && (
                <UpiManager
                  workerId={myProfile.id}
                  onToast={onToast}
                  onProfileUpdate={(updated) => updated && setMyProfile(updated)}
                />
              )}

              {/* Bank Accounts — full CRUD Payment Method module */}
              {myProfile && (
                <PaymentMethodManager
                  workerId={myProfile.id}
                  onToast={onToast}
                  onProfileUpdate={(updated) => updated && setMyProfile(updated)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {editModal && myProfile && <WorkerModal worker={myProfile} categories={categories} onSave={handleUpdateProfile} onClose={() => setEdit(false)} />}
      {navBooking && <NavigationModal booking={navBooking} workerProfile={myProfile} onClose={() => setNavBooking(null)} />}
      {chatBooking && <ChatModal booking={chatBooking} currentUser={user} onClose={() => setChatBooking(null)} />}

      {/* Mobile bottom navigation — visible only on small screens via CSS */}
      <WorkerMobileBottomNav />

      <style>{`
        @keyframes pulseGreen { 0%,100%{box-shadow:0 0 0 3px rgba(34,197,94,.25)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,.15)} }
        @keyframes timerPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
      `}</style>
    </div>
  );
}
