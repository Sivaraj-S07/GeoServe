import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import * as api from "../api";
import MapView from "../components/MapView";
import Icon, { CategoryChip, CategoryBanner } from "../components/Icon";
import { StarDisplay, WorkerRatingSummary } from "../components/StarRating";
import { getLocalizedName } from "../utils/localizedName";

export default function WorkerDetailPage({ onToast }) {
  const { id }    = useParams();
  const nav       = useNavigate();
  const { user }  = useAuth();
  const { t, i18n } = useTranslation();
  const [worker,   setWorker]  = useState(null);
  const [category, setCategory]= useState(null);
  const [loading,  setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getWorker(id), api.getCategories()])
      .then(([w, cats]) => { setWorker(w); setCategory(cats.find(c => c.id === w.categoryId) || null); })
      .catch(() => { onToast?.("Worker not found","error"); nav(-1); })
      .finally(() => setLoading(false));
  }, [id]);

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

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 0" }}>
      <div style={{ textAlign:"center" }}>
        <div className="spinner dark" style={{ margin:"0 auto 12px" }} />
        <p style={{ color:"var(--muted)", fontWeight:500 }}>Loading profile…</p>
      </div>
    </div>
  );
  if (!worker) return null;

  // Bilingual display name — falls back to the legacy name for worker
  // profiles created before this feature existed (null-safe).
  const displayName = getLocalizedName(worker, i18n.language) || worker.name || "";
  const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563eb&color=fff&size=100`;

  return (
    <div className="anim-up worker-detail-page-root" style={{ maxWidth:800, margin:"0 auto", padding:"24px 12px" }}>
      <button onClick={()=>nav(-1)} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:14, fontWeight:600, display:"flex", alignItems:"center", gap:6, marginBottom:22, fontFamily:"inherit", padding:"6px 10px 6px 0" }}
        onMouseEnter={e=>e.currentTarget.style.color="var(--primary)"} onMouseLeave={e=>e.currentTarget.style.color="var(--muted)"}>
        <Icon name="arrow-left" size={15} color="currentColor" /> Back to listings
      </button>

      <div className="card" style={{ overflow:"hidden" }}>
        {/* ── Hero banner — gradient/watermark only; no text label (moved below avatar) */}
        <CategoryBanner
          name={category?.name}
          icon={category?.icon}
          bannerColor={category?.bannerColor}
          size="lg"
          rounded={0}
          style={{ height:160 }}
          showLabel={false}
        />

        {/* ── Profile header — avatar centered, category centered beneath it ── */}
        <div style={{ padding:"0 24px 24px", marginTop:-56, position:"relative" }}>

          {/* Avatar block — centered column */}
          <div className="worker-detail-hero" style={{
            display:"flex", flexDirection:"column", alignItems:"center",
            marginBottom:20,
          }}>
            {/* Avatar + availability dot */}
            <div style={{ position:"relative", flexShrink:0, marginBottom:12 }}>
              <img
                src={worker.avatar||fb}
                alt={displayName}
                onError={e=>{e.target.src=fb;}}
                style={{ width:100, height:100, borderRadius:20, objectFit:"cover",
                  border:"4px solid white", boxShadow:"0 8px 32px rgba(37,99,235,.25)" }}
              />
              <div style={{ position:"absolute", bottom:4, right:4, width:16, height:16,
                borderRadius:"50%", background:worker.availability?"#22c55e":"#94a3b8",
                border:"3px solid white" }} />
            </div>

            {/* Category name — centered below photo, clearly visible */}
            {category && (
              <div style={{ marginBottom:10 }}>
                <CategoryChip name={category.name} icon={category.icon} size={14} iconSize={24} />
              </div>
            )}

            {/* Worker name + availability badge — centered */}
            <div style={{ display:"flex", alignItems:"center", gap:10,
              marginBottom:8, flexWrap:"wrap", justifyContent:"center" }}>
              <h2 style={{ fontSize:26, fontWeight:800, letterSpacing:-.5,
                textAlign:"center" }}>{displayName}</h2>
              <span style={{
                background:worker.availability?"var(--green-soft)":"var(--bg)",
                color:worker.availability?"var(--green)":"var(--muted)",
                fontSize:12, fontWeight:700, padding:"3px 10px", borderRadius:20,
                border:`1px solid ${worker.availability?"var(--green-light)":"var(--border)"}`,
                display:"inline-flex", alignItems:"center", gap:5,
              }}>
                <span style={{ width:6, height:6, borderRadius:"50%",
                  background:worker.availability?"var(--green)":"var(--muted-light)" }} />
                {worker.availability?t("common.available"):t("common.unavailable")}
              </span>
            </div>

            {/* Specialization · years — centered */}
            <div style={{ display:"flex", alignItems:"center", gap:8,
              flexWrap:"wrap", justifyContent:"center" }}>
              {worker.specialization && (
                <span style={{ color:"var(--muted)", fontSize:14 }}>
                  · {worker.specialization}
                </span>
              )}
              {worker.yearsOfExp > 0 && (
                <span style={{ background:"#eff6ff", border:"1px solid #bfdbfe",
                  color:"#1d4ed8", fontSize:12, fontWeight:700,
                  padding:"4px 10px", borderRadius:20 }}>
                  🏆 {worker.yearsOfExp}+ yrs exp
                </span>
              )}
            </div>

            {/* Rating — only rendered when present, below the name block */}
            {worker.rating > 0 && (
              <div style={{ marginTop:12, textAlign:"center", padding:"10px 18px",
                background:"var(--amber-bg)", borderRadius:12,
                border:"1px solid var(--amber-light)" }}>
                <StarDisplay
                  rating={worker.rating}
                  totalRatings={worker.totalRatings ?? worker.jobsCompleted}
                  size={15}
                  showCount={true}
                />
              </div>
            )}
          </div>

          {/* Experience section — Requirement 6 */}
          {worker.experience && (
            <div style={{ background:"linear-gradient(135deg,#eff6ff,#dbeafe)", border:"1.5px solid #bfdbfe", borderRadius:14, padding:"18px 20px", marginBottom:22 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <span style={{ fontSize:18 }}>🏆</span>
                <div style={{ fontSize:12, fontWeight:800, color:"#1d4ed8", textTransform:"uppercase", letterSpacing:".05em" }}>{t("workerDetail.workExperience")}</div>
              </div>
              <p style={{ color:"var(--text-secondary)", fontSize:14, lineHeight:1.8, margin:0 }}>{worker.experience}</p>
            </div>
          )}

          {worker.bio && (
            <p style={{ color:"var(--muted)", fontSize:14, lineHeight:1.8, marginBottom:22 }}>{worker.bio}</p>
          )}

          {/* Skills */}
          {Array.isArray(worker.skills) && worker.skills.length > 0 && (
            <div style={{ marginBottom:22 }}>
              <div style={{ fontSize:11, fontWeight:800, color:"var(--text-secondary)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>{t("workerDetail.skillsServices")}</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {worker.skills.map(s=>(
                  <span key={s} style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", color:"#15803d", fontSize:12, fontWeight:700, padding:"5px 13px", borderRadius:20 }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Book CTA */}
          {user?.role==="user" && worker.availability && (
            <div style={{ background:"linear-gradient(135deg,var(--primary-bg),var(--primary-soft))", border:"1.5px solid var(--primary-border)", borderRadius:14, padding:"18px 22px", marginBottom:28, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:14 }}>
              <div>
                <div style={{ fontFamily:"'Manrope',sans-serif", fontWeight:700, fontSize:16, marginBottom:2, letterSpacing:-.2 }}>Ready to book {displayName}?</div>
                <div style={{ color:"var(--muted)", fontSize:13 }}>Submit a request and they'll confirm availability.</div>
              </div>
              <button className="btn-primary" style={{ padding:"11px 26px", whiteSpace:"nowrap" }} onClick={()=>nav(`/book/${worker.id}`)}>
                <Icon name="calendar" size={15} color="white" /> Book Now — ₹{(worker.hourlyRate||500).toLocaleString("en-IN")}/hr
              </button>
            </div>
          )}

          {/* Worker unavailable message */}
          {user?.role === "user" && !worker.availability && (
            <div style={{ background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:14, padding:"18px 22px", marginBottom:28, display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:"#fee2e2", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:"1.5px solid #fca5a5" }}>
                <span style={{ fontSize:22 }}>🔴</span>
              </div>
              <div>
                <div style={{ fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:15, color:"#991b1b", marginBottom:3 }}>{t("workerDetail.workerUnavailable")}</div>
                <div style={{ fontSize:13, color:"#b91c1c" }}>{t("workerDetail.workerUnavailableDesc")}</div>
              </div>
            </div>
          )}

          {!user && (
            <div style={{ background:"var(--blue-bg)", border:"1px solid var(--blue-light)", borderRadius:12, padding:"14px 18px", marginBottom:24, display:"flex", alignItems:"center", gap:10 }}>
              <Icon name="info" size={16} color="var(--blue-mid)" />
              <span style={{ fontSize:13, color:"var(--blue)" }}>
                <span onClick={()=>nav("/login")} style={{ color:"var(--blue-mid)", fontWeight:700, cursor:"pointer", textDecoration:"underline" }}>{t("workerDetail.logIn")}</span>{" "}as a User to book this worker.
              </span>
            </div>
          )}

          {/* Contact info */}
          <div style={{ borderTop:"1px solid var(--border)", paddingTop:22, marginBottom:24 }}>
            <h3 style={{ fontWeight:700, fontSize:15, marginBottom:14, fontFamily:"'Manrope',sans-serif" }}>{t("workerDetail.contactInformation")}</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
                { icon:"phone", label:worker.phone, href:`tel:${worker.phone}` },
                { icon:"mail",  label:worker.email, href:`mailto:${worker.email}` },
                worker.pincode && { icon:"map-pin", label:`Pincode ${worker.pincode}${worker.street?` · ${worker.street}`:""}` },
              ].filter(Boolean).filter(x=>x.label).map(x=>(
                <div key={x.icon} style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ background:"var(--primary-bg)", padding:10, borderRadius:10, border:"1px solid var(--primary-border)", flexShrink:0 }}>
                    <Icon name={x.icon} size={16} color="var(--primary)" />
                  </div>
                  {x.href ? (
                    <a href={x.href} style={{ color:"var(--primary)", textDecoration:"none", fontWeight:600, fontSize:14 }}>{x.label}</a>
                  ) : (
                    <span style={{ color:"var(--muted)", fontSize:14 }}>{x.label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Ratings & Reviews ── */}
          <div style={{ borderTop:"1px solid var(--border)", paddingTop:22, marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#fef3c7,#fde68a)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, border:"1.5px solid #fde68a" }}>⭐</div>
              <div>
                <h3 style={{ fontWeight:800, fontSize:15, margin:0, fontFamily:"'Manrope',sans-serif" }}>Ratings &amp; Reviews</h3>
                {worker.rating > 0 && (
                  <div style={{ marginTop:3 }}>
                    <StarDisplay rating={worker.rating} totalRatings={worker.totalRatings} size={13} showCount={true} />
                  </div>
                )}
              </div>
            </div>
            <WorkerRatingSummary workerId={worker.id} />
          </div>

          {/* Map */}
          {worker.lat && worker.lng && (
            <div style={{ borderRadius:18, overflow:"hidden", border:"1.5px solid var(--border)", boxShadow:"0 8px 32px rgba(0,0,0,.10)" }}>
              <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)", background:"var(--surface)", display:"flex", alignItems:"center", gap:8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span style={{ fontWeight:700, fontSize:13, color:"var(--text)" }}>{t("workerDetail.workerLocation")}</span>
              </div>
              <div style={{ height:"clamp(280px,38vh,420px)", position:"relative", display:"block", width:"100%" }}>
                <MapView workers={[worker]} center={[worker.lat,worker.lng]} zoom={14} onWorkerClick={()=>{}} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
