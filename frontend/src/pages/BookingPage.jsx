import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import * as api from "../api";
import Icon, { CategoryLabel, CategoryBanner } from "../components/Icon";
import { getLocalizedName } from "../utils/localizedName";

const DISTANCE_RATE_PER_KM = 12;
const fmt = n => "₹" + Number(n).toLocaleString("en-IN");

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function BookingPage({ onToast }) {
  const { workerId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();

  const DURATIONS = [
    { hours: 1, label: "1h" }, { hours: 2, label: "2h" }, { hours: 3, label: "3h" },
    { hours: 4, label: "4h" }, { hours: 6, label: "6h" }, { hours: 8, label: "8h" },
  ];

  const [worker, setWorker] = useState(null);
  const [category, setCategory] = useState(null);
  const [workerPricing, setWorkerPricing] = useState(null); // { baseHourlyRate, customRates }
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [refId, setRefId] = useState(null);
  const [locating, setLocating] = useState(false);

  const [form, setForm] = useState({ date: "", notes: "", hours: 2, phone: "", address: "", userLat: null, userLng: null });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    Promise.all([api.getWorker(workerId), api.getCategories()])
      .then(([w, cats]) => {
        setWorker(w);
        setCategory(cats.find(c => c.id === w.categoryId) || null);
        if (!w.availability) onToast(t("bookingPage.workerOffline"), "error");
        // Load worker-controlled pricing (non-blocking)
        api.getWorkerPricing(w.id)
          .then(p => setWorkerPricing(p))
          .catch(() => {}); // Fall back to hourlyRate if unavailable
      })
      .catch(() => { onToast(t("bookingPage.workerNotFound"), "error"); nav("/home"); })
      .finally(() => setLoading(false));
  }, [workerId]);

  // Keep the category (incl. admin-updated icon/image) fresh without a full reload
  useEffect(() => {
    const refresh = () => {
      api.getCategories().then(cats => {
        setCategory(prev => {
          if (!prev) return prev;
          return cats.find(c => c.id === prev.id) || prev;
        });
      }).catch(() => {});
    };
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Get the effective price for a given number of hours
  const getPriceForHours = (hours) => {
    if (workerPricing) {
      const custom = workerPricing.customRates?.[String(hours)];
      if (custom !== undefined && custom !== null && custom !== "") return Number(custom);
      return (workerPricing.baseHourlyRate || worker?.hourlyRate || 500) * hours;
    }
    return (worker?.hourlyRate || 500) * hours;
  };

  const getGPS = () => {
    if (!navigator.geolocation) { onToast(t("bookingPage.gpsNotSupported"), "error"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(p => ({ ...p, userLat: pos.coords.latitude, userLng: pos.coords.longitude }));
        setLocating(false);
        onToast(t("bookingPage.gpsCapturedToast"));
      },
      (err) => {
        setLocating(false);
        let msg = t("bookingPage.gpsUnavailable");
        if (err.code === 1) msg = t("bookingPage.gpsPermissionDenied");
        else if (err.code === 3) msg = t("bookingPage.gpsTimeout");
        onToast(msg, "error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const rate = workerPricing
    ? (workerPricing.baseHourlyRate || worker?.hourlyRate || 500)
    : (worker?.hourlyRate || 500);
  const service = Math.round(getPriceForHours(form.hours));
  const workerLat = worker?.lat || null;
  const workerLng = worker?.lng || null;
  const distKm = (form.userLat && form.userLng && workerLat && workerLng)
    ? Math.max(1, Math.round(haversineKm(workerLat, workerLng, form.userLat, form.userLng) * 10) / 10)
    : null;
  const distance = distKm !== null ? Math.round(distKm * DISTANCE_RATE_PER_KM) : 0;
  const platform = Math.round(service * 0.05);
  const total = service + distance + platform;

  const handleBook = async () => {
    if (!worker?.availability) { onToast(t("bookingPage.workerOfflineCannotBook"), "error"); return; }
    if (!form.date) { onToast(t("bookingPage.dateRequired"), "error"); return; }
    if (!form.phone.trim()) { onToast(t("bookingPage.phoneRequired"), "error"); return; }
    if (form.phone.replace(/\D/g, "").length !== 10) { onToast(t("bookingPage.phone10Digits"), "error"); return; }
    if (!form.userLat || !form.userLng) {
      onToast(t("bookingPage.gpsRequired2"), "error");
      if (navigator.geolocation) {
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
          pos => {
            setForm(p => ({ ...p, userLat: pos.coords.latitude, userLng: pos.coords.longitude }));
            setLocating(false);
            onToast(t("bookingPage.locationCaptured"), "success");
          },
          (err) => {
            setLocating(false);
            let msg = err.code === 1 ? t("bookingPage.locationDenied") : t("bookingPage.gpsUnavailable");
            onToast(msg, "error");
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      }
      return;
    }
    setBusy(true);
    try {
      // Use the effective hourly-rate equivalent for this duration
      const effectiveHourlyRate = form.hours > 0 ? Math.round(service / form.hours) : rate;
      const b = await api.createBooking({
        workerId: parseInt(workerId), workerName: worker.name, category: category?.name || "",
        date: form.date, notes: form.notes, hours: form.hours, duration: form.hours,
        cost: total, serviceCost: service, distanceCost: distance, distanceKm: distKm || 0,
        distanceRate: DISTANCE_RATE_PER_KM, platformFee: platform, hourlyRate: effectiveHourlyRate,
        userLat: form.userLat, userLng: form.userLng, userPhone: form.phone, userAddress: form.address,
      });
      setRefId(b?.id || Math.floor(Math.random() * 900000) + 100000);
      setDone(true);
    } catch (e) {
      onToast(e.message || t("bookingPage.bookingFailed"), "error");
    } finally { setBusy(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner dark" style={{ margin: "0 auto 12px" }} />
        <p style={{ color: "var(--muted)", fontWeight: 500 }}>{t("bookingPage.loadingWorker")}</p>
      </div>
    </div>
  );

  // Bilingual display name — falls back to the legacy name for worker
  // profiles created before this feature existed (null-safe).
  const workerDisplayName = getLocalizedName(worker, i18n.language) || worker?.name || "";
  const userDisplayName   = getLocalizedName(user,   i18n.language) || user?.name   || "";

  if (done) return (
    <div className="anim-fade" style={{ maxWidth: 560, margin: "56px auto", padding: "0 20px", paddingBottom: "max(56px, calc(48px + env(safe-area-inset-bottom, 16px)))" }}>
      <div style={{ background: "var(--surface)", borderRadius: 20, border: "1.5px solid var(--border)", boxShadow: "0 8px 40px rgba(15,23,42,.09)", overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)", padding: "36px 32px 32px", textAlign: "center" }}>
          <div style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: "2px solid rgba(255,255,255,.4)" }}>
            <Icon name="check-circle" size={32} color="white" />
          </div>
          <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 24, margin: 0 }}>{t("bookingPage.bookingSent")}</h2>
          {refId && <p style={{ color: "rgba(255,255,255,.85)", margin: "8px 0 0", fontSize: 13 }}>{t("bookingPage.reference", { id: refId })}</p>}
        </div>
        <div style={{ padding: "24px 28px 28px" }}>
          <div style={{ marginBottom: 22 }}>
            {[
              ["⏳", t("bookingPage.reviewStep1", { name: workerDisplayName })],
              ["💬", t("bookingPage.reviewStep2")],
              ["🗺️", t("bookingPage.reviewStep3")],
              ["✅", t("bookingPage.reviewStep4")],
            ].map(([emoji, text], i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{emoji}</span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1.5px solid #86efac", borderRadius: 12, padding: "16px 20px", marginBottom: 22 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".6px", color: "#15803d", margin: "0 0 10px" }}>{t("bookingPage.paymentBreakdown")}</p>
            {[
              [
                workerPricing?.customRates?.[String(form.hours)] !== undefined
                  ? `${t("bookingPage.serviceFee")} (${form.hours}h — custom rate)`
                  : `${t("bookingPage.serviceFee")} (${form.hours}h × ${fmt(rate)}/hr)`,
                fmt(service)
              ],
              distance > 0 ? [`${t("bookingPage.distanceFee")} (${distKm}km × ₹${DISTANCE_RATE_PER_KM}/km)`, fmt(distance)] : null,
              [t("bookingPage.platformFee") + " (5%)", fmt(platform)],
            ].filter(Boolean).map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{l}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{v}</span>
              </div>
            ))}
            <div style={{ height: 1, background: "#86efac", margin: "8px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#15803d" }}>{t("bookingPage.totalINR")}</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#15803d" }}>{fmt(total)}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ flex: 1, padding: "11px 0", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--text-secondary)", fontFamily: "inherit" }} onClick={() => nav("/home?tab=bookings")}>{t("common.viewBookings")}</button>
            <button className="btn-primary" style={{ flex: 1, justifyContent: "center", padding: "11px 0" }} onClick={() => nav("/home")}><Icon name="search" size={13} /> {t("common.findMore")}</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="anim-fade booking-page-wrapper" style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px", paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}>
      <button onClick={() => nav(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, padding: "6px 0 18px", fontFamily: "inherit" }}
        onMouseEnter={e => e.currentTarget.style.color = "var(--primary)"} onMouseLeave={e => e.currentTarget.style.color = "#64748b"}>
        <Icon name="arrow-left" size={14} color="currentColor" /> {t("bookingPage.back")}
      </button>
      <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: "-.5px", margin: "0 0 4px" }}>{t("bookingPage.bookService")}</h1>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 28px" }}>{t("bookingPage.bookDesc")}</p>

      <div className="booking-layout-grid" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {worker && (
            <div style={{ background: "var(--surface)", borderRadius: 14, border: "1.5px solid var(--border)", overflow: "hidden" }}>
              <CategoryBanner name={category?.name} icon={category?.icon} bannerColor={category?.bannerColor} size="sm" rounded={0} style={{ height: 56 }} />
              <div style={{ padding: "16px 18px", display: "flex", gap: 14, alignItems: "center" }}>
                <img src={worker.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(workerDisplayName)}&background=2563eb&color=fff&size=52`}
                  onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(workerDisplayName)}&background=2563eb&color=fff&size=52`; }}
                  style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover", flexShrink: 0, border: "2px solid #e0e7ff" }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{workerDisplayName}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>{category ? <CategoryLabel name={category.name} icon={category.icon} size={12} color="var(--muted)" /> : "Service Professional"}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: "0 0 3px", fontWeight: 800, fontSize: 16, color: "var(--text)" }}>{fmt(rate)}<span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>{t("workerDetail.perHour")}</span></p>
                  <span style={{ fontSize: 11, color: worker.availability ? "#16a34a" : "#94a3b8", fontWeight: 700 }}>{worker.availability ? t("workerDetail.available") : t("workerDetail.unavailable")}</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ background: "var(--surface)", borderRadius: 14, border: "1.5px solid var(--border)", padding: "20px" }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>{t("bookingPage.preferredDate")} <span style={{ color: "#ef4444" }}>*</span></label>
            <input type="date" value={form.date} onChange={e => set("date", e.target.value)} min={new Date().toISOString().split("T")[0]} />
          </div>

          <div style={{ background: "var(--surface)", borderRadius: 14, border: "1.5px solid var(--border)", padding: "20px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>{t("bookingPage.serviceDuration")}</label>
              {workerPricing && Object.keys(workerPricing.customRates || {}).length > 0 && (
                <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:10, background:"#f5f3ff", color:"#7c3aed", border:"1px solid #c4b5fd" }}>
                  Worker Pricing
                </span>
              )}
            </div>
            <div className="duration-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {DURATIONS.map(d => {
                const sel = form.hours === d.hours;
                const dPrice = Math.round(getPriceForHours(d.hours));
                const isCustom = workerPricing?.customRates?.[String(d.hours)] !== undefined;
                const autoCalc = Math.round((workerPricing?.baseHourlyRate || worker?.hourlyRate || 500) * d.hours);
                const isDiscount = isCustom && dPrice < autoCalc;
                return (
                  <button key={d.hours} onClick={() => set("hours", d.hours)} style={{
                    padding: "10px 6px", borderRadius: 9,
                    border: sel ? "2px solid var(--primary)" : "1.5px solid #e2e8f0",
                    background: sel ? "#eef2ff" : (isCustom ? "#faf5ff" : "#fff"),
                    color: sel ? "var(--primary)" : "#64748b",
                    fontSize: 12, fontWeight: sel ? 700 : 500,
                    cursor: "pointer", textAlign: "center", fontFamily: "inherit",
                    position: "relative",
                  }}>
                    {isDiscount && !sel && (
                      <div style={{ position:"absolute", top:-6, right:-6, background:"#7c3aed", color:"#fff", fontSize:9, fontWeight:800, padding:"1px 5px", borderRadius:8 }}>
                        DEAL
                      </div>
                    )}
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, color: sel ? "var(--primary)" : "#0d1b3e" }}>{d.hours}h</div>
                    <div style={{ fontSize: 11, fontWeight:700, color: sel ? "var(--green)" : (isCustom ? "#7c3aed" : "#94a3b8") }}>{fmt(dPrice)}</div>
                    {isCustom && !sel && (
                      <div style={{ fontSize:9, color:"#7c3aed", marginTop:1 }}>Custom</div>
                    )}
                  </button>
                );
              })}
            </div>
            {workerPricing?.notes && (
              <div style={{ marginTop:10, fontSize:11, color:"var(--muted)", padding:"8px 12px", background:"var(--bg)", borderRadius:8, border:"1px solid var(--border)" }}>
                💬 {workerPricing.notes}
              </div>
            )}
          </div>

          <div style={{ background: "var(--surface)", borderRadius: 14, border: "1.5px solid #f59e0b", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>📍</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{t("bookingPage.locationContact")}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{t("bookingPage.locationRequired")}</div>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>{t("bookingPage.phoneNumber")} <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="tel" value={form.phone} onChange={e => { const d = e.target.value.replace(/\D/g, "").slice(0, 10); set("phone", d); }} maxLength={10} inputMode="numeric" placeholder={t("bookingPage.phonePlaceholder")}
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 9, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>
                {t("bookingPage.gpsLocation")} <span style={{ color: "#ef4444" }}>*</span> <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>({t("bookingPage.gpsRequired")})</span>
              </label>
              <button onClick={getGPS} disabled={locating} style={{ width: "100%", padding: "11px 16px", borderRadius: 9, border: form.userLat ? "1.5px solid #16a34a" : "2px dashed #ef4444", background: form.userLat ? "#f0fdf4" : "#fff5f5", color: form.userLat ? "#15803d" : "#dc2626", fontSize: 13, fontWeight: 700, cursor: locating ? "default" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {locating
                  ? <><div className="spinner" style={{ width: 14, height: 14, border: "2px solid #bfdbfe", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} /> {t("bookingPage.gettingGPS")}</>
                  : form.userLat
                    ? <><Icon name="check-circle" size={14} color="#15803d" /> ✅ {t("bookingPage.gpsCaptured", { lat: parseFloat(form.userLat).toFixed(4), lng: parseFloat(form.userLng).toFixed(4) })}</>
                    : <><Icon name="map-pin" size={14} color="#dc2626" /> {t("bookingPage.shareGPS")}</>
                }
              </button>
              {!form.userLat && <p style={{ fontSize: 11, color: "#dc2626", marginTop: 5, fontWeight: 600 }}>{t("bookingPage.gpsMandatory")}</p>}
              {distKm !== null && (
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8 }}>
                  <span style={{ fontSize: 14 }}>🚗</span>
                  <span style={{ fontSize: 12, color: "#92400e", fontWeight: 600 }}>
                    {t("bookingPage.workerDistance", { km: distKm, cost: fmt(distance), rate: DISTANCE_RATE_PER_KM })}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>{t("bookingPage.addressLandmark")}</label>
              <input type="text" value={form.address} onChange={e => set("address", e.target.value)} placeholder={t("bookingPage.addressPlaceholder")}
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 9, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          <div style={{ background: "var(--surface)", borderRadius: 14, border: "1.5px solid var(--border)", padding: "20px" }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>{t("bookingPage.jobNotes")}</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder={t("bookingPage.notesPlaceholder")} rows={3}
              style={{ resize: "vertical", width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 9, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ background: "#eef2ff", borderRadius: 12, border: "1px solid #c7d2fe", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="user" size={15} color="white" /></div>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, color: "var(--primary)", letterSpacing: ".3px" }}>{t("bookingPage.bookingAs")}</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>{userDisplayName} · {user?.email}</p>
            </div>
          </div>
        </div>

        {/* Cost summary */}
        <div className="booking-cost-sticky" style={{ position: "sticky", top: 20 }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, border: "1.5px solid var(--border)", boxShadow: "0 4px 20px rgba(15,23,42,.07)", overflow: "hidden" }}>
            <div style={{ background: "var(--grad-hero)", padding: "22px 22px 18px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: ".5px", color: "rgba(255,255,255,.7)" }}>{t("bookingPage.bookingTotal")}</p>
              <p style={{ margin: 0, fontFamily: "'Manrope',sans-serif", fontWeight: 900, fontSize: 34, color: "#fff", letterSpacing: "-1px" }}>{fmt(total)}</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,.65)" }}>{form.hours}h · {workerDisplayName}</p>
            </div>
            <div style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontWeight: 700 }}>{t("bookingPage.serviceFee")}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
                    {workerPricing?.customRates?.[String(form.hours)] !== undefined
                      ? `${form.hours}h (custom rate by worker)`
                      : `${fmt(rate)}/hr × ${form.hours}h`
                    }
                  </p>
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{fmt(service)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontWeight: 700 }}>{t("bookingPage.distanceFee")}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
                    {distKm !== null ? `${distKm}km × ₹${DISTANCE_RATE_PER_KM}/km` : t("bookingPage.shareGPSCalculate")}
                  </p>
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: distance > 0 ? "#d97706" : "var(--muted)" }}>{distance > 0 ? fmt(distance) : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontWeight: 700 }}>{t("bookingPage.platformFee")}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>5% of service cost</p>
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{fmt(platform)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 0" }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{t("bookingPage.totalINR")}</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: "var(--primary)", fontFamily: "'Manrope',sans-serif" }}>{fmt(total)}</span>
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 9 }}>
                <p style={{ margin: 0, fontSize: 11, color: "#15803d", fontWeight: 600 }}>
                  {t("bookingPage.workerReceivesInfo", { amount: fmt(service + distance), fee: fmt(platform) })}
                </p>
              </div>

              <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 14, paddingTop: 14, display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {[
                  ["1", t("bookingPage.step1")], ["2", t("bookingPage.step2")],
                  ["3", t("bookingPage.step3")], ["4", t("bookingPage.step4")],
                ].map(([n, txt]) => (
                  <div key={n} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#eef2ff", border: "1px solid #c7d2fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "var(--primary)" }}>{n}</span>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4, marginTop: 2 }}>{txt}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={handleBook} disabled={busy || locating || !worker?.availability}
                  style={{ width: "100%", padding: "14px 0", borderRadius: 10, border: "none", background: (!worker?.availability) ? "#94a3b8" : busy ? "#a5b4fc" : (!form.userLat ? "#94a3b8" : "linear-gradient(135deg,#2563eb,#3b82f6)"), color: "#fff", fontSize: 14, fontWeight: 800, cursor: (busy || locating || !worker?.availability) ? "not-allowed" : "pointer", fontFamily: "'Manrope',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: (!form.userLat || busy || !worker?.availability) ? "none" : "0 4px 16px rgba(37,99,235,.4)" }}>
                  {!worker?.availability
                    ? <><Icon name="x-circle" size={15} color="white" /> {t("bookingPage.workerOfflineBtn")}</>
                    : busy ? <><div className="spinner" /> {t("bookingPage.processing")}</>
                    : !form.userLat ? <><Icon name="map-pin" size={15} color="white" /> {t("bookingPage.shareGPSUnlock")}</>
                    : <><Icon name="calendar" size={15} color="white" /> {t("bookingPage.confirmBooking", { total: fmt(total) })}</>
                  }
                </button>
                <button style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }} onClick={() => nav(-1)}>{t("bookingPage.cancel")}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
