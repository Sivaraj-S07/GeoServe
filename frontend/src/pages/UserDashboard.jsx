import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import * as api from "../api";
import WorkerList from "../components/WorkerList";
import MapView from "../components/MapView";
import BookingCard from "../components/BookingCard";
import { StatsGrid } from "../components/StatsCards";
import Icon, { CategoryCard, CategoryLabel } from "../components/Icon";
import ChatModal from "../components/ChatModal";
import SearchAutocomplete from "../components/SearchAutocomplete";
import { getLocalizedName } from "../utils/localizedName";

const TABS = (t) => [
  { id: "nearby",   label: t("userDashboard.findWorkers"), icon: "search"   },
  { id: "map",      label: t("userDashboard.map", { defaultValue: "Map" }),  icon: "map"      },
  { id: "bookings", label: t("userDashboard.myBookings"),  icon: "calendar" },
];

/* ── Skeleton card for workers ─────────────────────────────────────── */
function WorkerSkeleton() {
  return (
    <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ height: 3, background: "var(--border)" }} />
      <div style={{ padding: "18px 18px 16px" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <div className="skeleton" style={{ width: 72, height: 72, borderRadius: 18, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 14, width: "60%", marginBottom: 8, borderRadius: 6 }} />
            <div className="skeleton" style={{ height: 11, width: "40%", borderRadius: 6 }} />
          </div>
        </div>
        <div className="skeleton" style={{ height: 11, width: "90%", marginBottom: 6, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 11, width: "70%", marginBottom: 14, borderRadius: 6 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <div className="skeleton" style={{ height: 32, flex: 1, borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 32, flex: 1, borderRadius: 8 }} />
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton for booking cards ────────────────────────────────────── */
function BookingSkeleton() {
  return (
    <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "18px 20px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div className="skeleton" style={{ height: 16, width: "35%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 22, width: 80, borderRadius: 20 }} />
      </div>
      <div className="skeleton" style={{ height: 12, width: "55%", marginBottom: 8, borderRadius: 6 }} />
      <div className="skeleton" style={{ height: 12, width: "40%", borderRadius: 6 }} />
    </div>
  );
}

/* ── Category Filter Bar — icon chips ──────────────────────────────── */
function CategoryFilterBar({ categories, catFilter, onSelect, t }) {
  const allWorkerCounts = {}; // could be enhanced with real counts
  return (
    <div style={{
      display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4,
      scrollbarWidth: "none", msOverflowStyle: "none",
    }}>
      <style>{`.cat-filter-scroll::-webkit-scrollbar{display:none}`}</style>
      {/* "All" chip */}
      <button
        onClick={() => onSelect("")}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 14px", borderRadius: 99, whiteSpace: "nowrap",
          border: `1.5px solid ${!catFilter ? "var(--primary)" : "var(--border)"}`,
          background: !catFilter ? "var(--primary)" : "var(--surface)",
          color: !catFilter ? "white" : "var(--muted)",
          fontSize: 12, fontWeight: 700, cursor: "pointer",
          fontFamily: "'Manrope',sans-serif",
          transition: "all .15s", flexShrink: 0,
          boxShadow: !catFilter ? "0 3px 10px rgba(37,99,235,.25)" : "none",
        }}
      >
        <Icon name="grid" size={12} color={!catFilter ? "white" : "var(--muted)"} strokeWidth={2} />
        {t("userDashboard.allCategories")}
      </button>

      {categories.map(c => {
        const sel = String(catFilter) === String(c.id);
        return (
          <button
            key={c.id}
            onClick={() => onSelect(sel ? "" : String(c.id))}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 99, whiteSpace: "nowrap",
              border: `1.5px solid ${sel ? "var(--primary)" : "var(--border)"}`,
              background: sel ? "var(--primary)" : "var(--surface)",
              color: sel ? "white" : "var(--text)",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Manrope',sans-serif",
              transition: "all .15s", flexShrink: 0,
              boxShadow: sel ? "0 3px 10px rgba(37,99,235,.25)" : "none",
            }}
            onMouseEnter={e => {
              if (!sel) { e.currentTarget.style.borderColor = "var(--primary-border)"; e.currentTarget.style.background = "var(--primary-bg)"; e.currentTarget.style.color = "var(--primary)"; }
            }}
            onMouseLeave={e => {
              if (!sel) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.color = "var(--text)"; }
            }}
          >
            <CategoryLabel name={c.name} icon={c.icon} size={13} color={sel ? "white" : "var(--primary)"} />
          </button>
        );
      })}
    </div>
  );
}

/* ── All Categories section — visual grid ──────────────────────────── */
function AllCategoriesGrid({ categories, catFilter, onSelect, workers }) {
  // Count workers per category
  const counts = {};
  workers.forEach(w => {
    if (w.categoryId) counts[w.categoryId] = (counts[w.categoryId] || 0) + 1;
  });

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
      gap: 12,
    }}>
      {categories.map(c => (
        <CategoryCard
          key={c.id}
          name={c.name}
          icon={c.icon || c.name}
          workerCount={counts[c.id] || 0}
          selected={String(catFilter) === String(c.id)}
          onClick={() => onSelect(String(catFilter) === String(c.id) ? "" : String(c.id))}
        />
      ))}
    </div>
  );
}

export default function UserDashboard({ onToast, sidebarOpen, onCloseSidebar, notifState }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  // Read ?tab= from URL on mount and on navigation (e.g. from BookingPage "View Bookings")
  const getInitialTab = () => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    return ["bookings", "map"].includes(tabParam) ? tabParam : "nearby";
  };

  const [tab,             setTab]            = useState(getInitialTab);
  const [workers,         setWorkers]         = useState([]);
  const [categories,      setCats]            = useState([]);
  const [bookings,        setBookings]        = useState([]);
  const [loadingWorkers,  setLoadingWorkers]  = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [viewMode,        setViewMode]        = useState("grid");
  const [search,          setSearch]          = useState("");
  const [catFilter,       setCatFilter]       = useState("");
  const [userLoc,         setUserLoc]         = useState({ lat: user?.lat || 13.0827, lng: user?.lng || 80.2707 });
  const [locating,        setLocating]        = useState(false);
  const [chatBooking,     setChatBooking]     = useState(null);
  const [workerPayInfos,  setWorkerPayInfos]  = useState({});
  const [pincodeFilter,   setPincodeFilter]   = useState(user?.pincode || "");
  const [usePincode,      setUsePincode]      = useState(false);
  const [pincodeInfo,     setPincodeInfo]     = useState(null);
  const [showCatGrid,     setShowCatGrid]     = useState(false);

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const bks = await api.getBookings();
      setBookings(bks);
    } catch { onToast(t("common.error"), "error"); }
    finally { setLoadingBookings(false); }
  }, [t]);

  // Sync tab state when URL changes (e.g. navigating to /home?tab=bookings)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (["bookings", "map"].includes(tabParam)) {
      setTab(tabParam);
    }
  }, [location.search]);

  useEffect(() => {
    if (!user?.id) return;
    const loc = { lat: user.lat || 13.0827, lng: user.lng || 80.2707 };
    setUserLoc(loc);
    setLoadingWorkers(true);
    setLoadingBookings(true);

    const workerParams = { lat: loc.lat, lng: loc.lng };
    if (user.pincode && usePincode) workerParams.pincode = user.pincode;

    Promise.all([api.getWorkers(workerParams), api.getCategories()])
      .then(([w, cats]) => { setWorkers(w); setCats(cats); })
      .catch(() => onToast(t("common.error"), "error"))
      .finally(() => setLoadingWorkers(false));

    api.getBookings()
      .then(bks => setBookings(bks))
      .catch(() => onToast(t("common.error"), "error"))
      .finally(() => setLoadingBookings(false));

    if (user.pincode) api.lookupPincode(user.pincode).then(setPincodeInfo).catch(() => {});
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

  const getMyLocation = () => {
    if (!navigator.geolocation) { onToast(t("common.error"), "error"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const loc = { lat: coords.latitude, lng: coords.longitude };
        setUserLoc(loc);
        setLoadingWorkers(true);
        const params = { lat: loc.lat, lng: loc.lng };
        if (usePincode && pincodeFilter) params.pincode = pincodeFilter;
        api.getWorkers(params)
          .then(w => { setWorkers(w); onToast(t("userDashboard.findNearbyWorkers")); })
          .catch(() => onToast(t("common.error"), "error"))
          .finally(() => { setLoadingWorkers(false); setLocating(false); });
      },
      () => { onToast(t("common.error"), "error"); setLocating(false); }
    );
  };

  const togglePincodeFilter = async () => {
    const next = !usePincode;
    setUsePincode(next);
    setLoadingWorkers(true);
    try {
      const params = { lat: userLoc.lat, lng: userLoc.lng };
      if (next && pincodeFilter) params.pincode = pincodeFilter;
      const w = await api.getWorkers(params);
      setWorkers(w);
    } catch { onToast(t("common.error"), "error"); }
    finally { setLoadingWorkers(false); }
  };

  const handleUserStatusChange = async (id, status, note) => {
    try {
      const updated = await api.updateBookingStatus(id, status, note);
      setBookings(p => p.map(b => b.id === (updated.id || updated.booking?.id) ? (updated.booking || updated) : b));
    } catch (e) { onToast(e.message || t("common.error"), "error"); }
  };

  const handleConfirmBooking = async (id, paymentMode = "cash", customerPaymentRef = "") => {
    try {
      const result = await api.confirmBooking(id, paymentMode, customerPaymentRef);
      // Backend returns { booking, payment } or just the booking
      const updatedBooking = result.booking || result;
      setBookings(p => p.map(b => b.id === updatedBooking.id ? updatedBooking : b));
      onToast(t("userDashboard.paymentConfirmed"), "success");
    } catch (e) {
      onToast(e.message || t("common.error"), "error");
    }
  };

  const handleDeleteBooking = async (id) => {
    try {
      await api.deleteBooking(id);
      setBookings(p => p.filter(b => b.id !== id));
      onToast("Booking deleted successfully", "success");
    } catch (e) {
      onToast(e.message || "Failed to delete booking", "error");
    }
  };

  const fetchWorkerPayInfo = async (workerId) => {
    if (workerPayInfos[workerId]) return;
    try {
      const info = await api.getWorkerPaymentInfo(workerId);
      setWorkerPayInfos(p => ({ ...p, [workerId]: info }));
    } catch {}
  };

  useEffect(() => {
    bookings.filter(b => b.status === "completed" && b.workerId).forEach(b => fetchWorkerPayInfo(b.workerId));
  }, [bookings]);

  useEffect(() => {
    if (!notifState?.notifications?.length) return;
    if (notifState.notifications[0]?.type === "booking_update") loadBookings();
  }, [notifState?.notifications?.length]);

  // Memoized worker filtering — avoids O(n×m) recalculation on every render
  const filtered = useMemo(() => {
    const catId = catFilter ? parseInt(catFilter) : null;
    const q     = search.toLowerCase().trim();

    // Build a Map for O(1) category name lookup instead of O(n) find() per worker
    const catNameMap = new Map(categories.map(c => [c.id, (c.name || "").toLowerCase()]));

    return workers.filter(w => {
      const mCat = !catId || w.categoryId === catId;
      if (!q) return mCat;
      const categoryName = catNameMap.get(w.categoryId) || "";
      const skillsText   = Array.isArray(w.skills) ? w.skills.join(" ").toLowerCase() : "";
      const matches =
        w.name.toLowerCase().includes(q) ||
        (w.nameEn || "").toLowerCase().includes(q) ||
        (w.specialization || "").toLowerCase().includes(q) ||
        (w.bio || "").toLowerCase().includes(q) ||
        categoryName.includes(q) ||
        skillsText.includes(q);
      return mCat && matches;
    });
  }, [workers, catFilter, search, categories]);

  const pendingCount    = useMemo(() => bookings.filter(b => b.status === "pending").length,                           [bookings]);
  const inProgressCount = useMemo(() => bookings.filter(b => b.status === "in_progress").length,                      [bookings]);
  const completedCount  = useMemo(() => bookings.filter(b => ["completed","confirmed"].includes(b.status)).length,     [bookings]);

  const stats = [
    { icon:"calendar",     label:t("userDashboard.totalBookings"), value:bookings.length, color:"primary" },
    { icon:"clock",        label:t("userDashboard.pending"),        value:pendingCount,    color:"amber"   },
    { icon:"clock",        label:t("userDashboard.inProgress"),     value:inProgressCount, color:"purple"  },
    { icon:"check-circle", label:t("userDashboard.completed"),      value:completedCount,  color:"green"   },
  ];

  // Bilingual display name — falls back to the legacy name for accounts
  // created before this feature existed (null-safe).
  const displayName = getLocalizedName(user, i18n.language) || user.name || "";
  const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563eb&color=fff&size=80`;

  const UserMobileBottomNav = () => (
    <nav className="mobile-bottom-nav" role="navigation" aria-label="Mobile navigation">
      {TABS(t).map(item => (
        <button
          key={item.id}
          className={`mobile-bottom-nav-item${tab === item.id ? " active" : ""}`}
          onClick={() => setTab(item.id)}
          aria-label={item.label}
          aria-current={tab === item.id ? "page" : undefined}
        >
          {item.id === "bookings" && (pendingCount > 0 || (notifState?.bookingBadge > 0)) && (
            <span className="mobile-bottom-nav-badge">{pendingCount || notifState?.bookingBadge}</span>
          )}
          <Icon name={item.icon} size={20} color={tab === item.id ? "var(--primary)" : "var(--muted)"} />
          <span className="mobile-bottom-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className="dashboard-layout">
      {sidebarOpen && <div className="mobile-overlay" onClick={onCloseSidebar} />}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar${sidebarOpen ? " mobile-open" : ""}`}>
        <div style={{ padding:"4px 8px 20px", borderBottom:"1px solid var(--border)", marginBottom:16, textAlign:"center" }}>
          <div style={{ position:"relative", display:"inline-block", marginBottom:10 }}>
            <img src={user.avatar || fb} onError={e => { e.target.src = fb; }}
              style={{ width:64, height:64, borderRadius:"50%", objectFit:"cover", border:"3px solid var(--primary-border)", boxShadow:"0 4px 16px rgba(37,99,235,.2)" }} />
            <div style={{ position:"absolute", bottom:2, right:2, width:14, height:14, borderRadius:"50%", background:"#22c55e", border:"2px solid var(--surface)" }} />
          </div>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:2, letterSpacing:-.2 }}>{displayName}</div>
          <div style={{ color:"var(--muted)", fontSize:12, marginBottom:6 }}>{user.email}</div>
          {user.pincode && (
            <div style={{ fontSize:11, color:"var(--muted)", display:"flex", alignItems:"center", gap:4, justifyContent:"center", marginBottom:8 }}>
              <Icon name="map-pin" size={10} color="var(--muted)" /> {user.pincode}
            </div>
          )}
          <span className="badge badge-primary">{t("common.userBadge")}</span>
        </div>

        <div style={{ flex:1 }}>
          {TABS(t).map(item => (
            <button key={item.id} className={`sidebar-tab${tab === item.id ? " active" : ""}`}
              onClick={() => { setTab(item.id); onCloseSidebar?.(); }}>
              <Icon name={item.icon} size={15} color={tab === item.id ? "var(--primary)" : "var(--muted)"} />
              {item.label}
              {item.id === "bookings" && (pendingCount > 0 || (notifState?.bookingBadge > 0)) && (
                <span style={{ marginLeft:"auto", background:"#ef4444", color:"white", fontSize:10, fontWeight:700, padding:"1px 7px", borderRadius:20 }}>
                  {pendingCount || notifState?.bookingBadge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ marginTop:"auto", padding:"14px 12px", background:"var(--primary-bg)", borderRadius:10, border:"1px solid var(--primary-border)" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--primary)", letterSpacing:.3, marginBottom:4 }}>
            {t("userDashboard.workersNearYou")}
          </div>
          {loadingWorkers ? (
            <div className="skeleton" style={{ height:28, width:60, borderRadius:6, marginBottom:4 }} />
          ) : (
            <div style={{ fontSize:22, fontWeight:800, color:"var(--text)" }}>{workers.length}</div>
          )}
          <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>{t("userDashboard.professionalsFound")}</div>
          {pincodeInfo && (
            <div style={{ fontSize:11, color:"var(--muted)", marginTop:6, paddingTop:6, borderTop:"1px solid var(--primary-border)" }}>
              📍 {pincodeInfo.district}, {pincodeInfo.state}
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="dashboard-main anim-fade">

        {/* ── FIND WORKERS tab ── */}
        {tab === "nearby" && (
          <div>
            {/* Hero banner */}
            <div className="gs-hero-banner" style={{ background:"var(--grad-hero)", borderRadius:18, padding:"28px 32px", marginBottom:16, position:"relative", overflow:"hidden", boxShadow:"0 8px 32px rgba(37,99,235,.30)" }}>
              <div style={{ position:"absolute", top:-40, right:-40, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,.04)", pointerEvents:"none" }} />
              <div style={{ position:"relative", zIndex:1 }}>
                <h2 style={{ color:"white", fontWeight:800, fontSize:24, marginBottom:6, fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:-.5 }}>
                  {t("userDashboard.findNearbyWorkers")}
                </h2>
                <p style={{ color:"rgba(255,255,255,.75)", fontSize:14, marginBottom:18 }}>
                  {t("userDashboard.browseSkilled")}
                </p>
                <div className="hero-btns-row" style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  <button onClick={getMyLocation} disabled={locating} style={{ background:"rgba(255,255,255,.18)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,.28)", color:"white", borderRadius:9, padding:"10px 20px", fontSize:13, fontWeight:700, cursor:locating?"default":"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:8, transition:"all .15s" }}>
                    {locating ? <><div className="spinner" /> {t("userDashboard.gettingLocation")}</> : <><Icon name="pin" size={14} color="white" /> {t("userDashboard.useGPS")}</>}
                  </button>
                  <button onClick={togglePincodeFilter} style={{ background:usePincode?"rgba(255,255,255,.32)":"rgba(255,255,255,.1)", backdropFilter:"blur(8px)", border:`1px solid ${usePincode?"rgba(255,255,255,.48)":"rgba(255,255,255,.2)"}`, color:"white", borderRadius:9, padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:8, transition:"all .15s" }}>
                    <Icon name="map-pin" size={14} color="white" />
                    {usePincode ? t("userDashboard.pincodeOn",{pincode:pincodeFilter||""}) : t("userDashboard.filterByPincode",{pincode:pincodeFilter||""})}
                  </button>
                </div>
              </div>
            </div>

            {/* Pincode area info */}
            {usePincode && pincodeInfo && (
              <div style={{ background:"var(--primary-bg)", border:"1px solid var(--primary-border)", borderRadius:12, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
                <Icon name="map-pin" size={18} color="var(--primary)" />
                <div style={{ fontSize:13, fontWeight:600, color:"var(--primary-dark)" }}>
                  {t("userDashboard.showingWorkersPincode",{pincode:pincodeInfo.pincode, district:pincodeInfo.district, state:pincodeInfo.state})}
                </div>
              </div>
            )}

            {/* ── Search + Pincode controls ── */}
            <div className="card gs-filter-bar" style={{ padding:"14px 18px", marginBottom:16 }}>
              {/* Smart Search Autocomplete */}
              <SearchAutocomplete
                value={search}
                onChange={setSearch}
                categories={categories}
                workers={workers}
                onCategorySelect={(catId) => {
                  setCatFilter(catId);
                  setSearch("");
                }}
                placeholder={t("userDashboard.searchPlaceholder")}
              />

              {/* Pincode input + toggle */}
              <div className="gs-filter-pincode-group">
                <div style={{ position:"relative", flex:1 }}>
                  <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                    <Icon name="map-pin" size={14} color={usePincode ? "var(--primary)" : "var(--muted-light)"} />
                  </span>
                  <input
                    value={pincodeFilter}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g,"").slice(0,6);
                      setPincodeFilter(v);
                      if (usePincode) {
                        setLoadingWorkers(true);
                        api.getWorkers({ lat:userLoc.lat, lng:userLoc.lng, pincode:v })
                          .then(setWorkers).catch(() => {}).finally(() => setLoadingWorkers(false));
                      }
                    }}
                    placeholder={t("common.pincodePlaceholder")}
                    maxLength={6} inputMode="numeric"
                    className="gs-filter-pincode-input"
                    style={{ paddingLeft:34, height:38, borderRadius:"var(--radius-sm)", fontSize:13, fontFamily:"inherit", outline:"none", border:`1.5px solid ${usePincode?"var(--primary-border)":"var(--border)"}`, background:usePincode?"var(--primary-bg)":"var(--surface)", color:usePincode?"var(--primary)":"var(--text)", transition:"all .15s", width:"100%" }}
                  />
                </div>
                <button onClick={togglePincodeFilter} style={{ padding:"8px 12px", borderRadius:"var(--radius-sm)", background:usePincode?"var(--primary)":"var(--bg)", border:`1.5px solid ${usePincode?"var(--primary)":"var(--border)"}`, color:usePincode?"white":"var(--muted)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all .15s", whiteSpace:"nowrap" }}>
                  {usePincode ? t("common.pincodeOn") : t("common.pincodeFilter")}
                </button>
              </div>

              {/* View mode btns */}
              <div className="gs-filter-view-btns">
                {[{mode:"grid",icon:"grid"},{mode:"map",icon:"map"}].map(({mode,icon}) => (
                  <button key={mode} onClick={() => setViewMode(mode)} style={{ padding:"9px 13px", borderRadius:"var(--radius-sm)", border:viewMode===mode?"none":"1.5px solid var(--border)", background:viewMode===mode?"var(--primary)":"var(--surface)", cursor:"pointer", display:"flex", alignItems:"center", boxShadow:viewMode===mode?"0 2px 8px rgba(37,99,235,.30)":"none", transition:"all .15s" }}>
                    <Icon name={icon} size={15} color={viewMode===mode?"white":"var(--muted)"} />
                  </button>
                ))}
              </div>
            </div>

            {/* ── All Categories section — icon grid ── */}
            {categories.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <Icon name="layers" size={15} color="var(--primary)" />
                    <span style={{ fontWeight:700, fontSize:13, color:"var(--text)", fontFamily:"'Manrope',sans-serif", letterSpacing:-.2 }}>
                      {t("userDashboard.allCategories")}
                    </span>
                    {catFilter && (
                      <button
                        onClick={() => setCatFilter("")}
                        style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99, background:"var(--primary-bg)", border:"1px solid var(--primary-border)", color:"var(--primary)", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Manrope',sans-serif" }}
                      >
                        <Icon name="x" size={10} color="var(--primary)" />
                        {categories.find(c => String(c.id) === String(catFilter))?.name}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setShowCatGrid(v => !v)}
                    style={{ background:"none", border:"none", color:"var(--muted)", fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontFamily:"'Manrope',sans-serif" }}
                  >
                    {showCatGrid ? t("userDashboard.hide") : t("userDashboard.browse")}
                    <Icon name={showCatGrid ? "chevron-up" : "chevron-down"} size={13} color="var(--muted)" />
                  </button>
                </div>

                {/* Chip strip — always visible */}
                <CategoryFilterBar
                  categories={categories}
                  catFilter={catFilter}
                  onSelect={setCatFilter}
                  t={t}
                />

                {/* Expandable card grid */}
                {showCatGrid && (
                  <div style={{ marginTop:14 }}>
                    <AllCategoriesGrid
                      categories={categories}
                      catFilter={catFilter}
                      onSelect={v => { setCatFilter(v); setShowCatGrid(false); }}
                      workers={workers}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Map view */}
            {viewMode === "map" && (
              <div className="gs-map-section">
                {/* Map header bar */}
                <div className="gs-map-section-header">
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:32, height:32, borderRadius:9, background:"var(--primary-bg)", border:"1.5px solid var(--primary-border)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Icon name="map" size={16} color="var(--primary)" />
                    </div>
                    <div>
                      <div style={{ fontWeight:800, fontSize:14, color:"var(--text)", letterSpacing:-.2 }}>{t("userDashboard.liveWorkerMap")}</div>
                      <div style={{ fontSize:11, color:"var(--muted)", marginTop:1 }}>{t("userDashboard.tapMarkerToView")}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:"var(--green)", background:"var(--green-bg)", border:"1px solid var(--green-border)", borderRadius:99, padding:"3px 10px", display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--green)", display:"inline-block" }} />
                      {filtered.filter(w => w.availability !== false).length} {t("userDashboard.online")}
                    </span>
                    <span style={{ fontSize:11, color:"var(--muted)", fontWeight:600 }}>{filtered.length} {t("userDashboard.total")}</span>
                  </div>
                </div>

                {/* Map container — tall, prominent */}
                <div className="gs-map-container-enhanced">
                  <MapView
                    workers={filtered}
                    userLocation={userLoc}
                    onWorkerClick={w => nav(`/worker/${w.id}`)}
                    zoom={13}
                  />
                </div>

                {/* Map footer tip */}
                <div className="gs-map-section-footer">
                  <Icon name="pin" size={12} color="var(--muted-light)" />
                  <span>{t("userDashboard.mapTip")}</span>
                </div>
              </div>
            )}

            {/* Grid view */}
            {viewMode === "grid" && (
              loadingWorkers ? (
                <div>
                  <div style={{ fontSize:13, color:"var(--muted)", marginBottom:14, fontWeight:500 }}>{t("common.loadingWorkers")}</div>
                  <div className="worker-grid">
                    {Array.from({length:6}).map((_,i) => <WorkerSkeleton key={i} />)}
                  </div>
                </div>
              ) : (
                <WorkerList workers={filtered} categories={categories} loading={false} showBook={true} />
              )
            )}
          </div>
        )}

        {/* ── MAP tab ── */}
        {tab === "map" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontWeight: 800, fontSize: 22, letterSpacing: -.5, marginBottom: 4 }}>
                {t("userDashboard.liveWorkerMap")}
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>
                {t("userDashboard.tapMarkerToView")}
              </p>
            </div>
            <div className="gs-map-section">
              <div className="gs-map-section-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--primary-bg)", border: "1.5px solid var(--primary-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="map" size={16} color="var(--primary)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text)", letterSpacing: -.2 }}>{t("userDashboard.liveWorkerMap")}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{t("userDashboard.tapMarkerToView")}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", background: "var(--green-bg)", border: "1px solid var(--green-border)", borderRadius: 99, padding: "3px 10px", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
                    {workers.filter(w => w.availability !== false).length} {t("userDashboard.online")}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{workers.length} {t("userDashboard.total")}</span>
                </div>
              </div>
              <div className="gs-map-container-enhanced" style={{ minHeight: 500 }}>
                <MapView
                  workers={workers}
                  userLocation={userLoc}
                  onWorkerClick={w => nav(`/worker/${w.id}`)}
                  zoom={13}
                />
              </div>
              <div className="gs-map-section-footer">
                <Icon name="pin" size={12} color="var(--muted-light)" />
                <span>{t("userDashboard.mapTip")}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── MY BOOKINGS tab ── */}
        {tab === "bookings" && (
          <div>
            <div style={{ marginBottom:24 }}>
              <h2 style={{ fontWeight:700, fontSize:22, letterSpacing:-.5 }}>{t("userDashboard.myBookings")}</h2>
              <p style={{ color:"var(--muted)", fontSize:13, marginTop:4 }}>{t("userDashboard.trackRequests")}</p>
            </div>

            <StatsGrid stats={stats} />

            {loadingBookings ? (
              <div>{Array.from({length:3}).map((_,i) => <BookingSkeleton key={i} />)}</div>
            ) : bookings.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 24px", background:"var(--surface)", borderRadius:18, border:"1px solid var(--border)" }}>
                <div style={{ width:72, height:72, borderRadius:"50%", background:"var(--primary-bg)", border:"2px solid var(--primary-border)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                  <Icon name="calendar" size={30} color="var(--primary)" />
                </div>
                <h3 style={{ fontWeight:700, marginBottom:8, fontSize:18 }}>{t("userDashboard.noBookingsYet")}</h3>
                <p style={{ color:"var(--muted)", fontSize:14, marginBottom:24 }}>{t("userDashboard.noBookingsDesc")}</p>
                <button className="btn-primary" onClick={() => setTab("nearby")}>
                  <Icon name="search" size={14} /> {t("userDashboard.findWorkersCta")}
                </button>
              </div>
            ) : (
              <div style={{ paddingBottom: 8 }}>
                {bookings.map(b => (
                  <BookingCard key={b.id} booking={b} role="user"
                    onStatusChange={handleUserStatusChange} onConfirm={handleConfirmBooking}
                    onDelete={handleDeleteBooking} onChat={setChatBooking}
                    workerProfile={workerPayInfos[b.workerId] || null} categories={categories}
                    onRated={loadBookings} onToast={onToast} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {chatBooking && <ChatModal booking={chatBooking} currentUser={user} onClose={() => setChatBooking(null)} />}
      <UserMobileBottomNav />
    </div>
  );
}
