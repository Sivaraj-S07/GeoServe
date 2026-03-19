import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as api from "../api";
import Icon from "../components/Icon";

const DURATIONS = [
  { hours: 1, label: "1 Hour"      },
  { hours: 2, label: "2 Hours"     },
  { hours: 3, label: "3 Hours"     },
  { hours: 4, label: "4 Hours"     },
  { hours: 6, label: "Half Day 6h" },
  { hours: 8, label: "Full Day 8h" },
];

const fmt = n => "₹" + Number(n).toLocaleString("en-IN");

export default function BookingPage({ onToast }) {
  const { workerId } = useParams();
  const { user }     = useAuth();
  const nav          = useNavigate();

  const [worker,   setWorker]  = useState(null);
  const [category, setCategory]= useState(null);
  const [loading,  setLoading] = useState(true);
  const [busy,     setBusy]    = useState(false);
  const [done,     setDone]    = useState(false);
  const [refId,    setRefId]   = useState(null);
  const [locating, setLocating]= useState(false);

  const [form, setForm] = useState({
    date: "", notes: "", hours: 2,
    phone: "", address: "",
    userLat: null, userLng: null,
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    Promise.all([api.getWorker(workerId), api.getCategories()])
      .then(([w, cats]) => {
        // api.getWorker already returns 404 for inactive workers (backend guards it),
        // but add a belt-and-suspenders frontend check too
        if (!w.availability) {
          onToast("This worker is currently offline and cannot be booked.", "error");
          nav("/home");
          return;
        }
        setWorker(w);
        setCategory(cats.find(c => c.id === w.categoryId) || null);
      })
      .catch(() => { onToast("Worker not found or not currently active", "error"); nav("/home"); })
      .finally(() => setLoading(false));
  }, [workerId]);

  const getGPS = () => {
    if (!navigator.geolocation) { onToast("Geolocation not supported", "error"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(p => ({ ...p, userLat: pos.coords.latitude, userLng: pos.coords.longitude }));
        setLocating(false);
        onToast("Location captured! Worker will navigate to you.");
      },
      () => { onToast("Could not get GPS location", "error"); setLocating(false); }
    );
  };

  const rate     = worker?.hourlyRate || 500;
  const service  = rate * form.hours;
  const platform = Math.round(service * 0.05);
  const total    = service + platform;

  const handleBook = async () => {
    if (!form.date)  { onToast("Please select a date", "error"); return; }
    if (!form.phone.trim()) { onToast("Please enter your phone number", "error"); return; }
    if (form.phone.replace(/\D/g,"").length !== 10) { onToast("Phone number must be exactly 10 digits", "error"); return; }
    setBusy(true);
    try {
      const b = await api.createBooking({
        workerId: parseInt(workerId), workerName: worker.name,
        category: category?.name || "", date: form.date,
        notes: form.notes, hours: form.hours, cost: total,
        serviceCost: service, platformFee: platform, hourlyRate: rate,
        userLat: form.userLat, userLng: form.userLng,
        userPhone: form.phone, userAddress: form.address,
      });
      setRefId(b?.id || Math.floor(Math.random() * 900000) + 100000);
      setDone(true);
    } catch (e) {
      onToast(e.response?.data?.error || "Booking failed", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:400 }}>
      <div style={{ textAlign:"center" }}>
        <div className="spinner dark" style={{ margin:"0 auto 12px" }} />
        <p style={{ color:"var(--muted)", fontWeight:500 }}>Loading worker details…</p>
      </div>
    </div>
  );

  if (done) return (
    <div className="anim-fade" style={{ maxWidth:540, margin:"56px auto", padding:"0 20px" }}>
      <div style={{ background:"var(--surface)", borderRadius:20, border:"1.5px solid var(--border)", boxShadow:"0 8px 40px rgba(15,23,42,.09)", overflow:"hidden" }}>
        <div style={{ background:"linear-gradient(135deg,#059669,#10b981)", padding:"36px 32px 32px", textAlign:"center" }}>
          <div style={{ width:68, height:68, borderRadius:"50%", background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", border:"2px solid rgba(255,255,255,.4)" }}>
            <Icon name="check-circle" size={32} color="white" />
          </div>
          <h2 style={{ color:"#fff", fontWeight:800, fontSize:24, margin:0, fontFamily:"'DM Sans',sans-serif" }}>Booking Sent! 🎉</h2>
          {refId && <p style={{ color:"rgba(255,255,255,.85)", margin:"8px 0 0", fontSize:13 }}>Reference: #GS{refId}</p>}
        </div>
        <div style={{ padding:"24px 28px 28px" }}>
          <div style={{ marginBottom:22 }}>
            {[["⏳",`${worker?.name} will review and accept your request`],["💬","Once accepted, messaging and contact info unlocks"],["🗺️","Worker navigates to your location with Google Maps"],["✅","Confirm completion to release payment to worker"]].map(([emoji,text],i)=>(
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:12 }}>
                <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{emoji}</span>
                <span style={{ fontSize:13, color:"var(--text-secondary)", lineHeight:1.5 }}>{text}</span>
              </div>
            ))}
          </div>
          <div style={{ background:"linear-gradient(135deg,#f0fdf4,#dcfce7)", border:"1.5px solid #86efac", borderRadius:12, padding:"16px 20px", marginBottom:22 }}>
            <p style={{ fontSize:11, fontWeight:800, letterSpacing:".6px", color:"#15803d", margin:"0 0 10px" }}>PAYMENT SUMMARY (INR)</p>
            {[[`Service Fee (${form.hours}h × ${fmt(rate)}/hr)`,fmt(service)],["Platform Fee (5%)",fmt(platform)]].map(([l,v])=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:13, color:"var(--text-secondary)" }}>{l}</span>
                <span style={{ fontSize:13, fontWeight:700, color:"var(--text)" }}>{v}</span>
              </div>
            ))}
            <div style={{ height:1, background:"#a7f3d0", margin:"8px 0" }} />
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:15, fontWeight:800, color:"#15803d" }}>Total</span>
              <span style={{ fontSize:20, fontWeight:900, color:"#15803d", fontFamily:"'DM Sans',sans-serif" }}>{fmt(total)}</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button style={{ flex:1, padding:"11px 0", borderRadius:9, border:"1.5px solid var(--border)", background:"var(--surface)", fontSize:13, fontWeight:600, cursor:"pointer", color:"var(--text-secondary)", fontFamily:"inherit" }} onClick={()=>nav("/home?tab=bookings")}>View Bookings</button>
            <button className="btn-primary" style={{ flex:1, justifyContent:"center", padding:"11px 0" }} onClick={()=>nav("/home")}><Icon name="search" size={13} /> Find More</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="anim-fade" style={{ maxWidth:800, margin:"0 auto", padding:"32px 20px" }}>
      <button onClick={()=>nav(-1)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:6, padding:"6px 0 18px", fontFamily:"inherit" }}
        onMouseEnter={e=>e.currentTarget.style.color="#4f46e5"} onMouseLeave={e=>e.currentTarget.style.color="#64748b"}>
        <Icon name="arrow-left" size={14} color="currentColor" /> Back
      </button>
      <h1 style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:800, fontSize:26, letterSpacing:"-.5px", margin:"0 0 4px" }}>Book a Service</h1>
      <p style={{ color:"var(--muted)", fontSize:14, margin:"0 0 28px" }}>Select duration, share your location, and review pricing in <strong>Indian Rupees (₹)</strong></p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20, alignItems:"start" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Worker strip */}
          {worker && (
            <div style={{ background:"var(--surface)", borderRadius:14, border:"1.5px solid var(--border)", padding:"16px 18px", display:"flex", gap:14, alignItems:"center" }}>
              <img src={worker.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.name)}&background=4f46e5&color=fff&size=52`}
                onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=${encodeURIComponent(worker.name)}&background=4f46e5&color=fff&size=52`;}}
                style={{ width:52, height:52, borderRadius:12, objectFit:"cover", flexShrink:0, border:"2px solid #e0e7ff" }} />
              <div style={{ flex:1 }}>
                <p style={{ margin:"0 0 3px", fontWeight:700, fontSize:15, color:"var(--text)", fontFamily:"'DM Sans',sans-serif" }}>{worker.name}</p>
                <p style={{ margin:0, fontSize:12, color:"var(--muted)" }}>{category?.name||"Service Professional"}</p>
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ margin:"0 0 3px", fontWeight:800, fontSize:16, color:"var(--text)" }}>{fmt(rate)}<span style={{ fontSize:11, color:"var(--muted)", fontWeight:500 }}>/hr</span></p>
                <span style={{ fontSize:11, color:worker.availability?"#16a34a":"#94a3b8", fontWeight:700 }}>{worker.availability?"● Available":"● Unavailable"}</span>
              </div>
            </div>
          )}

          {/* Date */}
          <div style={{ background:"var(--surface)", borderRadius:14, border:"1.5px solid var(--border)", padding:"20px" }}>
            <label style={{ display:"block", fontSize:13, fontWeight:700, color:"var(--text-secondary)", marginBottom:8 }}>Preferred Date <span style={{ color:"#ef4444" }}>*</span></label>
            <input type="date" value={form.date} onChange={e=>set("date",e.target.value)} min={new Date().toISOString().split("T")[0]} />
          </div>

          {/* Duration */}
          <div style={{ background:"var(--surface)", borderRadius:14, border:"1.5px solid var(--border)", padding:"20px" }}>
            <label style={{ display:"block", fontSize:13, fontWeight:700, color:"var(--text-secondary)", marginBottom:12 }}>Service Duration</label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
              {DURATIONS.map(d=>{
                const sel=form.hours===d.hours;
                return (<button key={d.hours} onClick={()=>set("hours",d.hours)} style={{ padding:"10px 6px", borderRadius:9, border:sel?"2px solid #4f46e5":"1.5px solid #e2e8f0", background:sel?"#eef2ff":"#fff", color:sel?"#4f46e5":"#64748b", fontSize:12, fontWeight:sel?700:500, cursor:"pointer", textAlign:"center", fontFamily:"inherit" }}>
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:2, color:sel?"#4f46e5":"#0f172a" }}>{d.hours}h</div>
                  <div style={{ fontSize:10, color:sel?"#6366f1":"#94a3b8" }}>{fmt(rate*d.hours)}</div>
                </button>);
              })}
            </div>
          </div>

          {/* Contact & Location */}
          <div style={{ background:"var(--surface)", borderRadius:14, border:"1.5px solid #f59e0b", padding:"20px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <span style={{ fontSize:20 }}>📍</span>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:"var(--text)" }}>Your Location & Contact</div>
                <div style={{ fontSize:11, color:"var(--muted)" }}>The worker needs this to navigate to you after accepting</div>
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:800, color:"var(--text-secondary)", marginBottom:6, textTransform:"uppercase", letterSpacing:".04em" }}>Phone Number <span style={{ color:"#ef4444" }}>*</span></label>
              <input type="tel" value={form.phone} onChange={e=>{ const d=e.target.value.replace(/\D/g,"").slice(0,10); set("phone",d); }} maxLength={10} inputMode="numeric" placeholder="10-digit mobile number"
                style={{ width:"100%", padding:"10px 12px", border:"1.5px solid var(--border)", borderRadius:9, fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }} />
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:800, color:"var(--text-secondary)", marginBottom:6, textTransform:"uppercase", letterSpacing:".04em" }}>GPS Location</label>
              <button onClick={getGPS} disabled={locating} style={{ width:"100%", padding:"11px 16px", borderRadius:9, border:form.userLat?"1.5px solid #a7f3d0":"1.5px dashed #bfdbfe", background:form.userLat?"#f0fdf4":"#f8fafc", color:form.userLat?"#15803d":"#2563eb", fontSize:13, fontWeight:700, cursor:locating?"default":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                {locating ? <><div className="spinner" style={{ width:14, height:14, border:"2px solid #bfdbfe", borderTopColor:"#2563eb", borderRadius:"50%", animation:"spin .7s linear infinite", flexShrink:0 }} /> Getting GPS…</>
                  : form.userLat ? <><Icon name="check-circle" size={14} color="#15803d" /> Location: {parseFloat(form.userLat).toFixed(4)}, {parseFloat(form.userLng).toFixed(4)} — tap to update</>
                  : <><Icon name="map-pin" size={14} color="#2563eb" /> Share My GPS Location (Recommended)</>}
              </button>
              {form.userLat && <p style={{ fontSize:11, color:"#15803d", marginTop:5 }}>✓ Worker will see your exact location on their map</p>}
            </div>

            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:800, color:"var(--text-secondary)", marginBottom:6, textTransform:"uppercase", letterSpacing:".04em" }}>Address / Landmark</label>
              <input type="text" value={form.address} onChange={e=>set("address",e.target.value)} placeholder="Flat 201, Green View Apts, Anna Nagar, Chennai"
                style={{ width:"100%", padding:"10px 12px", border:"1.5px solid var(--border)", borderRadius:9, fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }} />
            </div>
          </div>

          {/* Notes */}
          <div style={{ background:"var(--surface)", borderRadius:14, border:"1.5px solid var(--border)", padding:"20px" }}>
            <label style={{ display:"block", fontSize:13, fontWeight:700, color:"var(--text-secondary)", marginBottom:8 }}>Job Description / Notes</label>
            <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Describe the work needed, any specific requirements, access details…" rows={3}
              style={{ resize:"vertical", width:"100%", padding:"10px 12px", border:"1.5px solid var(--border)", borderRadius:9, fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }} />
          </div>

          <div style={{ background:"#eef2ff", borderRadius:12, border:"1px solid #c7d2fe", padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:"#4f46e5", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="user" size={15} color="white" /></div>
            <div>
              <p style={{ margin:"0 0 2px", fontSize:11, fontWeight:700, color:"#4f46e5", letterSpacing:".3px" }}>BOOKING AS</p>
              <p style={{ margin:0, fontSize:13, color:"var(--text-secondary)", fontWeight:500 }}>{user?.name} · {user?.email}</p>
            </div>
          </div>
        </div>

        {/* Right sticky */}
        <div style={{ position:"sticky", top:20 }}>
          <div style={{ background:"var(--surface)", borderRadius:16, border:"1.5px solid var(--border)", boxShadow:"0 4px 20px rgba(15,23,42,.07)", overflow:"hidden" }}>
            <div style={{ background:"linear-gradient(135deg,#1e1b4b,#4f46e5,#6366f1)", padding:"22px 22px 18px" }}>
              <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, letterSpacing:".5px", color:"rgba(255,255,255,.7)" }}>BOOKING TOTAL</p>
              <p style={{ margin:0, fontFamily:"'DM Sans',sans-serif", fontWeight:900, fontSize:34, color:"#fff", letterSpacing:"-1px" }}>{fmt(total)}</p>
              <p style={{ margin:"4px 0 0", fontSize:12, color:"rgba(255,255,255,.65)" }}>{form.hours}h · {worker?.name}</p>
            </div>
            <div style={{ padding:"18px 20px" }}>
              {[[`Service Fee`,`${fmt(rate)}/hr × ${form.hours}h`,fmt(service)],["Platform Fee","5% of service cost",fmt(platform)]].map(([l,s,v])=>(
                <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"10px 0", borderBottom:"1px solid #f1f5f9" }}>
                  <div><p style={{ margin:0, fontSize:13, color:"var(--text-secondary)", fontWeight:600 }}>{l}</p><p style={{ margin:0, fontSize:11, color:"var(--muted)" }}>{s}</p></div>
                  <span style={{ fontWeight:700, fontSize:14, color:"var(--text)" }}>{v}</span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0 0" }}>
                <span style={{ fontSize:15, fontWeight:800, color:"var(--text)" }}>Total (INR)</span>
                <span style={{ fontSize:22, fontWeight:900, color:"#4f46e5", fontFamily:"'DM Sans',sans-serif" }}>{fmt(total)}</span>
              </div>
              <div style={{ borderTop:"1px solid #f1f5f9", marginTop:14, paddingTop:14, display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
                {[["1","Book & wait for acceptance"],["2","Worker navigates to your location"],["3","Chat or call while en route"],["4","Confirm done → payment released"]].map(([n,t])=>(
                  <div key={n} style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                    <div style={{ width:20, height:20, borderRadius:"50%", background:"#eef2ff", border:"1px solid #c7d2fe", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ fontSize:10, fontWeight:800, color:"#4f46e5" }}>{n}</span>
                    </div>
                    <span style={{ fontSize:12, color:"var(--text-secondary)", lineHeight:1.4, marginTop:2 }}>{t}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <button onClick={handleBook} disabled={busy} style={{ width:"100%", padding:"14px 0", borderRadius:10, border:"none", background:busy?"#a5b4fc":"linear-gradient(135deg,#4f46e5,#6366f1)", color:"#fff", fontSize:14, fontWeight:800, cursor:busy?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:busy?"none":"0 4px 16px rgba(79,70,229,.4)" }}
                  onMouseEnter={e=>{if(!busy){e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 7px 22px rgba(79,70,229,.5)";}}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 16px rgba(79,70,229,.4)";}}>
                  {busy ? <><div className="spinner" /> Processing…</> : <><Icon name="calendar" size={15} color="white" /> Confirm Booking · {fmt(total)}</>}
                </button>
                <button style={{ width:"100%", padding:"11px 0", borderRadius:10, border:"1.5px solid var(--border)", background:"var(--surface)", color:"var(--muted)", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }} onClick={()=>nav(-1)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
