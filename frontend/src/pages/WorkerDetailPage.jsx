import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as api from "../api";
import MapView from "../components/MapView";
import Icon from "../components/Icon";

export default function WorkerDetailPage({ onToast }) {
  const { id }    = useParams();
  const nav       = useNavigate();
  const { user }  = useAuth();
  const [worker,   setWorker]  = useState(null);
  const [category, setCategory]= useState(null);
  const [loading,  setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getWorker(id), api.getCategories()])
      .then(([w, cats]) => { setWorker(w); setCategory(cats.find(c => c.id === w.categoryId) || null); })
      .catch(() => { onToast?.("Worker not found","error"); nav(-1); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 0" }}>
      <div style={{ textAlign:"center" }}>
        <div className="spinner dark" style={{ margin:"0 auto 12px" }} />
        <p style={{ color:"var(--muted)", fontWeight:500 }}>Loading profile…</p>
      </div>
    </div>
  );
  if (!worker) return null;

  const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.name)}&background=4f46e5&color=fff&size=100`;

  return (
    <div className="anim-up" style={{ maxWidth:800, margin:"0 auto", padding:"32px 24px" }}>
      <button onClick={()=>nav(-1)} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:14, fontWeight:600, display:"flex", alignItems:"center", gap:6, marginBottom:22, fontFamily:"inherit", padding:"6px 10px 6px 0" }}
        onMouseEnter={e=>e.currentTarget.style.color="var(--primary)"} onMouseLeave={e=>e.currentTarget.style.color="var(--muted)"}>
        <Icon name="arrow-left" size={15} color="currentColor" /> Back to listings
      </button>

      <div className="card" style={{ overflow:"hidden" }}>
        {/* Hero */}
        <div style={{ background:"linear-gradient(135deg,#312e81,#4f46e5,#6366f1)", padding:"32px 32px 80px", position:"relative" }}>
          <div style={{ position:"absolute", top:-40, right:-40, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,.05)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", bottom:-40, left:60, width:120, height:120, borderRadius:"50%", background:"rgba(255,255,255,.03)", pointerEvents:"none" }} />
        </div>

        <div style={{ padding:"0 32px 28px", marginTop:-56, position:"relative" }}>
          <div style={{ display:"flex", gap:20, alignItems:"flex-end", marginBottom:20 }}>
            <div style={{ position:"relative", flexShrink:0 }}>
              <img src={worker.avatar||fb} alt={worker.name} onError={e=>{e.target.src=fb;}}
                style={{ width:100, height:100, borderRadius:20, objectFit:"cover", border:"4px solid white", boxShadow:"0 8px 32px rgba(79,70,229,.25)" }} />
              <div style={{ position:"absolute", bottom:4, right:4, width:16, height:16, borderRadius:"50%", background:worker.availability?"#22c55e":"#94a3b8", border:"3px solid white" }} />
            </div>
            <div style={{ flex:1, paddingBottom:4 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6, flexWrap:"wrap" }}>
                <h2 style={{ fontSize:26, fontWeight:800, letterSpacing:-.5 }}>{worker.name}</h2>
                <span style={{ background:worker.availability?"var(--green-soft)":"var(--bg)", color:worker.availability?"var(--green)":"var(--muted)", fontSize:12, fontWeight:700, padding:"3px 10px", borderRadius:20, border:`1px solid ${worker.availability?"var(--green-light)":"var(--border)"}`, display:"inline-flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:worker.availability?"var(--green)":"var(--muted-light)" }} />
                  {worker.availability?"Available":"Unavailable"}
                </span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                {category && (
                  <span style={{ background:"var(--primary-bg)", padding:"4px 10px", borderRadius:20, display:"inline-flex", alignItems:"center", gap:5, border:"1px solid var(--primary-border)" }}>
                    <Icon name={category.icon||"globe"} size={12} color="var(--primary)" />
                    <span style={{ fontSize:12, fontWeight:700, color:"var(--primary)" }}>{category.name}</span>
                  </span>
                )}
                {worker.specialization && <span style={{ color:"var(--muted)", fontSize:14 }}>· {worker.specialization}</span>}
                {worker.yearsOfExp > 0 && (
                  <span style={{ background:"#eff6ff", border:"1px solid #bfdbfe", color:"#1d4ed8", fontSize:12, fontWeight:700, padding:"4px 10px", borderRadius:20 }}>
                    🏆 {worker.yearsOfExp}+ yrs exp
                  </span>
                )}
              </div>
            </div>
            {worker.rating > 0 && (
              <div style={{ textAlign:"center", padding:"12px 18px", background:"var(--amber-bg)", borderRadius:12, border:"1px solid var(--amber-light)", flexShrink:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:4, justifyContent:"center", marginBottom:2 }}>
                  <Icon name="star" size={16} color="#f59e0b" />
                  <span style={{ fontFamily:"'Outfit',sans-serif", fontWeight:800, fontSize:22, color:"var(--text)" }}>{worker.rating}</span>
                </div>
                <div style={{ fontSize:12, color:"var(--muted)" }}>{worker.jobsCompleted} jobs</div>
              </div>
            )}
          </div>

          {/* Experience section — Requirement 6 */}
          {worker.experience && (
            <div style={{ background:"linear-gradient(135deg,#eff6ff,#dbeafe)", border:"1.5px solid #bfdbfe", borderRadius:14, padding:"18px 20px", marginBottom:22 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <span style={{ fontSize:18 }}>🏆</span>
                <div style={{ fontSize:12, fontWeight:800, color:"#1d4ed8", textTransform:"uppercase", letterSpacing:".05em" }}>Work Experience</div>
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
              <div style={{ fontSize:11, fontWeight:800, color:"var(--text-secondary)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>Skills & Services</div>
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
                <div style={{ fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:16, marginBottom:2, letterSpacing:-.2 }}>Ready to book {worker.name}?</div>
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
                <div style={{ fontFamily:"'Outfit',sans-serif", fontWeight:800, fontSize:15, color:"#991b1b", marginBottom:3 }}>Worker is currently unavailable</div>
                <div style={{ fontSize:13, color:"#b91c1c" }}>This worker has paused their services. Please check back later or browse other professionals.</div>
              </div>
            </div>
          )}

          {!user && (
            <div style={{ background:"var(--blue-bg)", border:"1px solid var(--blue-light)", borderRadius:12, padding:"14px 18px", marginBottom:24, display:"flex", alignItems:"center", gap:10 }}>
              <Icon name="info" size={16} color="var(--blue-mid)" />
              <span style={{ fontSize:13, color:"var(--blue)" }}>
                <span onClick={()=>nav("/login")} style={{ color:"var(--blue-mid)", fontWeight:700, cursor:"pointer", textDecoration:"underline" }}>Log in</span>{" "}as a User to book this worker.
              </span>
            </div>
          )}

          {/* Contact info */}
          <div style={{ borderTop:"1px solid var(--border)", paddingTop:22, marginBottom:24 }}>
            <h3 style={{ fontWeight:700, fontSize:15, marginBottom:14, fontFamily:"'Outfit',sans-serif" }}>Contact Information</h3>
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

          {/* Map */}
          {worker.lat && worker.lng && (
            <div style={{ borderRadius:14, overflow:"hidden", height:280, border:"1px solid var(--border)", boxShadow:"var(--shadow)" }}>
              <MapView workers={[worker]} center={[worker.lat,worker.lng]} zoom={14} onWorkerClick={()=>{}} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
