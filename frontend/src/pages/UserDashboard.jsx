import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import * as api from "../api";
import WorkerList from "../components/WorkerList";
import MapView from "../components/MapView";
import BookingCard from "../components/BookingCard";
import { StatsGrid } from "../components/StatsCards";
import Icon from "../components/Icon";
import ChatModal from "../components/ChatModal";

const TABS = (t) => [
  { id: "nearby",   label: t("userDashboard.findWorkers"), icon: "map"      },
  { id: "bookings", label: t("userDashboard.myBookings"),  icon: "calendar" },
];

export default function UserDashboard({ onToast, sidebarOpen, onCloseSidebar }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { t } = useTranslation();
  const [tab,          setTab]       = useState("nearby");
  const [workers,      setWorkers]   = useState([]);
  const [categories,   setCats]      = useState([]);
  const [bookings,     setBookings]  = useState([]);
  const [loading,      setLoading]   = useState(true);
  const [viewMode,     setViewMode]  = useState("grid");
  const [search,       setSearch]    = useState("");
  const [catFilter,    setCatFilter] = useState("");
  const [userLoc,      setUserLoc]   = useState({ lat: user?.lat || 13.0827, lng: user?.lng || 80.2707 });
  const [locating,     setLocating]  = useState(false);
  const [chatBooking,  setChatBooking] = useState(null);
  const [workerPaymentInfos, setWorkerPaymentInfos] = useState({});
  // Pincode-based filtering (additional - does not replace lat/lng)
  const [pincodeFilter, setPincodeFilter] = useState(user?.pincode || "");
  const [usePincodeFilter, setUsePincodeFilter] = useState(false);
  const [pincodeInputVal, setPincodeInputVal] = useState(user?.pincode || "");
  const [pincodeInfo, setPincodeInfo] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cats, bks] = await Promise.all([api.getCategories(), api.getBookings()]);
      setCats(cats);
      setBookings(bks);
      await fetchWorkers();
      // Auto-load pincode info if user has one
      if (user?.pincode) {
        try {
          const info = await api.lookupPincode(user.pincode);
          setPincodeInfo(info);
        } catch {}
      }
    } catch { onToast("Failed to load", "error"); }
    finally { setLoading(false); }
  };

  const fetchWorkers = async (lat, lng, pincodeOverride) => {
    const uLat = lat ?? userLoc.lat;
    const uLng = lng ?? userLoc.lng;
    const params = { lat: uLat, lng: uLng };
    const pc = pincodeOverride !== undefined ? pincodeOverride : (usePincodeFilter ? pincodeFilter : "");
    if (pc) params.pincode = pc;
    const w = await api.getWorkers(params);
    setWorkers(w);
  };

  const getMyLocation = () => {
    if (!navigator.geolocation) { onToast("Geolocation not supported", "error"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(loc);
        fetchWorkers(loc.lat, loc.lng);
        onToast("Location updated! Showing nearby workers.");
        setLocating(false);
      },
      () => { onToast("Could not get location", "error"); setLocating(false); }
    );
  };

  const togglePincodeFilter = async () => {
    const next = !usePincodeFilter;
    setUsePincodeFilter(next);
    await fetchWorkers(undefined, undefined, next ? pincodeFilter : "");
    if (next && pincodeFilter) onToast(`Showing workers in pincode ${pincodeFilter}`);
    else onToast("Showing all nearby workers");
  };

  const filtered = workers.filter(w => {
    const mCat = !catFilter || w.categoryId === parseInt(catFilter);
    const q = search.toLowerCase();
    const mQ = !q || w.name.toLowerCase().includes(q) || (w.specialization || "").toLowerCase().includes(q);
    return mCat && mQ;
  });

  const handleConfirmBooking = async (id) => {
    try {
      // Try the full payment API first (Razorpay simulation)
      const result = await api.confirmBooking(id);
      setBookings(p => p.map(b => b.id === result.booking.id ? result.booking : b));
      onToast(`✅ Payment confirmed! Work completed successfully.`, "success");
    } catch (e) {
      // If payment fails, try direct status update (cash/offline payment)
      try {
        const updated = await api.updateBookingStatus(id, "confirmed", "user_confirmed");
        setBookings(p => p.map(b => b.id === updated.id ? updated : b));
        onToast("✅ Payment confirmed!", "success");
      } catch (e2) {
        onToast(e.response?.data?.error || "Confirmation failed. Please retry.", "error");
      }
    }
  };

  // Fetch worker payment info for completed bookings
  const fetchWorkerPaymentInfo = async (workerId) => {
    if (workerPaymentInfos[workerId]) return;
    try {
      const info = await api.getWorkerPaymentInfo(workerId);
      setWorkerPaymentInfos(p => ({ ...p, [workerId]: info }));
    } catch {}
  };

  useEffect(() => {
    bookings.filter(b => b.status === "completed" && b.workerId).forEach(b => {
      fetchWorkerPaymentInfo(b.workerId);
    });
  }, [bookings]);

  const pendingCount    = bookings.filter(b => b.status === "pending").length;
  const inProgressCount = bookings.filter(b => b.status === "in_progress").length;
  const completedCount  = bookings.filter(b => ["completed", "confirmed"].includes(b.status)).length;

  const stats = [
    { icon: "calendar",     label: t("userDashboard.totalBookings"), value: bookings.length,  color: "primary" },
    { icon: "clock",        label: t("userDashboard.pending"),        value: pendingCount,     color: "amber"   },
    { icon: "clock",        label: t("userDashboard.inProgress"),     value: inProgressCount,  color: "purple"  },
    { icon: "check-circle", label: t("userDashboard.completed"),      value: completedCount,   color: "green"   },
  ];

  const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4f46e5&color=fff&size=80`;

  return (
    <div className="dashboard-layout" style={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
      {sidebarOpen && <div className="mobile-overlay" onClick={onCloseSidebar} />}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar${sidebarOpen ? " mobile-open" : ""}`} style={{
        width: 240, background: "var(--surface)", borderRight: "1px solid var(--border)",
        padding: "24px 14px", flexShrink: 0, display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "4px 8px 20px", borderBottom: "1px solid var(--border)", marginBottom: 16, textAlign: "center" }}>
          <div style={{ position: "relative", display: "inline-block", marginBottom: 10 }}>
            <img src={user.avatar || fb} onError={e => { e.target.src = fb; }}
              style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--primary-border)", boxShadow: "0 4px 16px rgba(79,70,229,.2)" }} />
            <div style={{ position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "#22c55e", border: "2px solid var(--surface)" }} />
          </div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 2, letterSpacing: -.2 }}>{user.name}</div>
          <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 4 }}>{user.email}</div>
          {user.pincode && (
            <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4, justifyContent: "center", marginBottom: 8 }}>
              <Icon name="map-pin" size={10} color="var(--muted)" />
              {user.pincode}{user.street ? ` · ${user.street}` : ""}
            </div>
          )}
          <span className="badge badge-primary">User</span>
        </div>

        <div style={{ flex: 1 }}>
          {TABS(t).map(item => (
            <button key={item.id} className={`sidebar-tab${tab === item.id ? " active" : ""}`}
              onClick={() => { setTab(item.id); onCloseSidebar?.(); }}>
              <Icon name={item.icon} size={15} color={tab === item.id ? "var(--primary)" : "#6b7280"} />
              {item.label}
              {item.id === "bookings" && pendingCount > 0 && (
                <span style={{ marginLeft: "auto", background: "var(--amber)", color: "white", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Location info card */}
        <div style={{ marginTop: "auto", padding: "14px 12px", background: "var(--primary-bg)", borderRadius: 10, border: "1px solid var(--primary-border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", fontFamily: "'Outfit',sans-serif", letterSpacing: .3, marginBottom: 4 }}>
            {t("userDashboard.workersNearYou")}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Outfit',sans-serif", color: "var(--text)" }}>
            {workers.length}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{t("userDashboard.professionalsFound")}</div>
          {pincodeInfo && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--primary-border)" }}>
              📍 {pincodeInfo.district}, {pincodeInfo.state}
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="anim-fade dashboard-main" style={{ flex: 1, overflowY: "auto", padding: "28px 32px", background: "var(--bg)" }}>

        {/* FIND WORKERS */}
        {tab === "nearby" && (
          <div>
            {/* Hero banner */}
            <div style={{
              background: "linear-gradient(135deg, #312e81, #4f46e5, #7c3aed)",
              borderRadius: 18, padding: "28px 32px", marginBottom: 24,
              position: "relative", overflow: "hidden", boxShadow: "0 8px 32px rgba(79,70,229,.35)",
            }}>
              <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.05)", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <h2 style={{ color: "white", fontWeight: 800, fontSize: 24, marginBottom: 6, fontFamily: "'Outfit',sans-serif", letterSpacing: -.5 }}>
                  {t("userDashboard.findNearbyWorkers")}
                </h2>
                <p style={{ color: "rgba(255,255,255,.8)", fontSize: 14, marginBottom: 18 }}>
                  {t("userDashboard.browseSkilled")}
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={getMyLocation} disabled={locating} style={{
                    background: "rgba(255,255,255,.2)", backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,.3)", color: "white",
                    borderRadius: 9, padding: "10px 20px", fontSize: 13, fontWeight: 700,
                    cursor: locating ? "default" : "pointer", fontFamily: "'Outfit',sans-serif",
                    display: "inline-flex", alignItems: "center", gap: 8,
                  }}>
                    {locating ? <><div className="spinner" /> {t("userDashboard.gettingLocation")}</> : <><Icon name="pin" size={14} color="white" /> {t("userDashboard.useGPS")}</>}
                  </button>
                  {(
                    <button onClick={togglePincodeFilter} style={{
                      background: usePincodeFilter ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.12)",
                      backdropFilter: "blur(8px)",
                      border: `1px solid ${usePincodeFilter ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.2)"}`,
                      color: "white", borderRadius: 9, padding: "10px 20px",
                      fontSize: 13, fontWeight: 700, cursor: "pointer",
                      fontFamily: "'Outfit',sans-serif",
                      display: "inline-flex", alignItems: "center", gap: 8,
                    }}>
                      <Icon name="map-pin" size={14} color="white" />
                      {usePincodeFilter
                        ? t("userDashboard.pincodeOn", { pincode: pincodeFilter || user?.pincode || "" })
                        : t("userDashboard.filterByPincode", { pincode: pincodeFilter || user?.pincode || "" })}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Pincode area info banner */}
            {usePincodeFilter && pincodeInfo && (
              <div style={{
                background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 12,
                padding: "12px 16px", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <Icon name="map-pin" size={18} color="#059669" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>
                    {t("userDashboard.showingWorkersPincode", { pincode: pincodeInfo.pincode, district: pincodeInfo.district, state: pincodeInfo.state })}
                  </div>
                  {user?.street && (
                    <div style={{ fontSize: 12, color: "#065f46", marginTop: 2 }}>
                      {t("userDashboard.yourStreet", { street: user.street })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Filters bar */}
            <div className="card" style={{ padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
                  <Icon name="search" size={15} color="var(--muted-light)" />
                </span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("userDashboard.searchPlaceholder")} style={{ paddingLeft: 36 }} />
              </div>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: "auto", minWidth: 160 }}>
                <option value="">{t("userDashboard.allCategories")}</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {/* Pincode Filter Input - works for ALL users */}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                    <Icon name="map-pin" size={14} color={usePincodeFilter ? "#4f46e5" : "var(--muted-light)"} />
                  </span>
                  <input
                    value={pincodeFilter}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setPincodeFilter(v);
                      if (usePincodeFilter) fetchWorkers(undefined, undefined, v);
                    }}
                    placeholder="Pincode filter"
                    maxLength={6}
                    inputMode="numeric"
                    style={{
                      paddingLeft: 34, paddingRight: 10, height: 38,
                      border: `1.5px solid ${usePincodeFilter ? "#c7d2fe" : "var(--border)"}`,
                      borderRadius: "var(--radius-sm)", fontSize: 13,
                      background: usePincodeFilter ? "#eef2ff" : "white",
                      width: 120, fontFamily: "inherit", outline: "none",
                      color: usePincodeFilter ? "#4f46e5" : "var(--text)",
                    }}
                  />
                </div>
                <button
                  onClick={togglePincodeFilter}
                  style={{
                    padding: "8px 12px", borderRadius: "var(--radius-sm)",
                    background: usePincodeFilter ? "#4f46e5" : "var(--bg)",
                    border: `1.5px solid ${usePincodeFilter ? "#4f46e5" : "var(--border)"}`,
                    color: usePincodeFilter ? "white" : "var(--muted)",
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    whiteSpace: "nowrap", fontFamily: "inherit",
                    transition: "all .15s",
                  }}
                  title={usePincodeFilter ? "Remove pincode filter" : "Filter by pincode"}
                >
                  {usePincodeFilter ? "📍 On" : "📍 Filter"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[{ mode: "grid", icon: "grid" }, { mode: "map", icon: "map" }].map(({ mode, icon }) => (
                  <button key={mode} onClick={() => setViewMode(mode)} style={{
                    padding: "9px 13px", borderRadius: "var(--radius-sm)",
                    border: viewMode === mode ? "none" : "1.5px solid var(--border)",
                    background: viewMode === mode ? "var(--primary)" : "white",
                    cursor: "pointer", display: "flex", alignItems: "center",
                    boxShadow: viewMode === mode ? "0 2px 8px rgba(79,70,229,.3)" : "none",
                  }}>
                    <Icon name={icon} size={15} color={viewMode === mode ? "white" : "var(--muted)"} />
                  </button>
                ))}
              </div>
            </div>

            {viewMode === "map" && (
              <div style={{ borderRadius: 16, overflow: "hidden", height: 450, marginBottom: 20, boxShadow: "var(--shadow-md)", border: "1px solid var(--border)" }}>
                <MapView workers={filtered} userLocation={userLoc} onWorkerClick={w => nav(`/worker/${w.id}`)} />
              </div>
            )}
            {viewMode === "grid" && (
              <WorkerList workers={filtered} categories={categories} loading={loading} showBook={true} />
            )}
          </div>
        )}

        {/* MY BOOKINGS */}
        {tab === "bookings" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontWeight: 800, fontSize: 22, letterSpacing: -.5 }}>{t("userDashboard.myBookings")}</h2>
              <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{t("userDashboard.trackRequests")}</p>
            </div>
            <StatsGrid stats={stats} />
            {bookings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--primary-bg)", border: "2px solid var(--primary-border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Icon name="calendar" size={30} color="var(--primary)" />
                </div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 18, fontFamily: "'Outfit',sans-serif" }}>{t("userDashboard.noBookingsYet")}</h3>
                <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>{t("userDashboard.noBookingsDesc")}</p>
                <button className="btn-primary" onClick={() => setTab("nearby")}>
                  <Icon name="search" size={14} /> {t("userDashboard.findWorkersCta")}
                </button>
              </div>
            ) : (
              bookings.map(b => (
                <BookingCard key={b.id} booking={b} role="user" onStatusChange={() => {}} onConfirm={handleConfirmBooking} onDelete={() => {}} onChat={setChatBooking} workerProfile={workerPaymentInfos[b.workerId] || null} />
              ))
            )}
          </div>
        )}
      </main>
      {chatBooking && (
        <ChatModal booking={chatBooking} currentUser={user} onClose={() => setChatBooking(null)} />
      )}
    </div>
  );
}
