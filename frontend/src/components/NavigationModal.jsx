import { useState, useEffect } from "react";
import Icon from "./Icon";

export default function NavigationModal({ booking, workerProfile, onClose }) {
  const [workerLoc, setWorkerLoc] = useState(
    workerProfile?.lat && workerProfile?.lng ? { lat: workerProfile.lat, lng: workerProfile.lng } : null
  );
  const [gettingLoc, setGettingLoc] = useState(false);
  const [tab, setTab] = useState("map");

  const userLat = booking?.userLat || null;
  const userLng = booking?.userLng || null;
  const hasUserLoc = userLat && userLng;

  useEffect(() => {
    if (!workerLoc && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setWorkerLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const getMyLoc = () => {
    if (!navigator.geolocation) return;
    setGettingLoc(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setWorkerLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGettingLoc(false); },
      () => setGettingLoc(false)
    );
  };

  const mapsUrl = hasUserLoc
    ? (workerLoc
        ? `https://www.google.com/maps/dir/${workerLoc.lat},${workerLoc.lng}/${userLat},${userLng}`
        : `https://www.google.com/maps/dir/current+location/${userLat},${userLng}`)
    : null;

  const mapEmbed = hasUserLoc
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(userLng)-0.012},${parseFloat(userLat)-0.012},${parseFloat(userLng)+0.012},${parseFloat(userLat)+0.012}&layer=mapnik&marker=${userLat},${userLng}`
    : null;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(15,23,42,.7)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"var(--surface)", borderRadius:22, width:"100%", maxWidth:560, boxShadow:"0 32px 100px rgba(0,0,0,.3)", overflow:"hidden", maxHeight:"90vh", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#065f46,#059669,#10b981)", padding:"18px 22px", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center", border:"1.5px solid rgba(255,255,255,.3)", fontSize:20 }}>🗺️</div>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:"white", fontFamily:"'DM Sans',sans-serif" }}>Navigate to Customer</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.8)", marginTop:1 }}>Route to {booking.userName}'s location</div>
              </div>
            </div>
            <button onClick={onClose} style={{ width:34, height:34, borderRadius:9, background:"rgba(255,255,255,.2)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon name="x" size={16} color="white" />
            </button>
          </div>
          <div style={{ display:"flex", gap:4, marginTop:14, background:"rgba(0,0,0,.2)", borderRadius:10, padding:3 }}>
            {[["map","🗺️ Map & Navigate"],["contact","📞 Contact Info"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setTab(id)} style={{ flex:1, padding:"7px 0", borderRadius:8, background:tab===id?"white":"transparent", border:"none", cursor:"pointer", fontSize:12, fontWeight:700, color:tab===id?"#059669":"rgba(255,255,255,.8)", fontFamily:"inherit" }}>{lbl}</button>
            ))}
          </div>
        </div>

        {/* Booking summary bar */}
        <div style={{ background:"#f0fdf4", borderBottom:"1px solid #a7f3d0", padding:"10px 20px", display:"flex", gap:20, flexWrap:"wrap", flexShrink:0 }}>
          {[["Customer",booking.userName],["Service",booking.category||"General Service"],["Date",(() => { try { return new Date(booking.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"}); } catch { return booking.date; } })()]].map(([lbl,val])=>(
            <div key={lbl} style={{ fontSize:12 }}>
              <span style={{ color:"#6b7280", fontWeight:600 }}>{lbl}: </span>
              <span style={{ color:"#065f46", fontWeight:700 }}>{val}</span>
            </div>
          ))}
        </div>

        <div style={{ padding:"16px 20px 20px", overflowY:"auto", flex:1 }}>
          {tab==="map" && (
            <>
              {hasUserLoc ? (
                <>
                  <div style={{ borderRadius:14, overflow:"hidden", border:"1.5px solid var(--border)", height:230, marginBottom:12, position:"relative", boxShadow:"0 4px 16px rgba(0,0,0,.08)" }}>
                    <iframe src={mapEmbed} style={{ width:"100%", height:"100%", border:"none" }} title="Location Map" />
                    <div style={{ position:"absolute", top:10, left:10, background:"var(--surface)", borderRadius:8, padding:"5px 10px", fontSize:11, fontWeight:700, color:"#dc2626", boxShadow:"0 2px 8px rgba(0,0,0,.15)", display:"flex", alignItems:"center", gap:5 }}>📍 Customer</div>
                    {workerLoc && <div style={{ position:"absolute", top:10, right:10, background:"var(--surface)", borderRadius:8, padding:"5px 10px", fontSize:11, fontWeight:700, color:"#2563eb", boxShadow:"0 2px 8px rgba(0,0,0,.15)" }}>🔧 You</div>}
                  </div>
                  <div style={{ background:"var(--bg)", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px", marginBottom:14, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:12 }}>
                    <div><div style={{ color:"#dc2626", fontWeight:700, marginBottom:2 }}>📍 Customer</div><div style={{ color:"var(--muted)" }}>{parseFloat(userLat).toFixed(5)}, {parseFloat(userLng).toFixed(5)}</div></div>
                    {workerLoc && <div><div style={{ color:"#2563eb", fontWeight:700, marginBottom:2 }}>🔧 Your Location</div><div style={{ color:"var(--muted)" }}>{workerLoc.lat.toFixed(5)}, {workerLoc.lng.toFixed(5)}</div></div>}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, background:"#4285F4", color:"white", borderRadius:12, padding:"13px 20px", textDecoration:"none", fontWeight:800, fontSize:14, fontFamily:"'DM Sans',sans-serif", boxShadow:"0 4px 16px rgba(66,133,244,.35)" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                      Navigate with Google Maps
                    </a>
                    {!workerLoc ? (
                      <button onClick={getMyLoc} disabled={gettingLoc} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, background:"var(--surface)", color:"#2563eb", border:"1.5px solid #bfdbfe", borderRadius:12, padding:"11px 20px", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                        <Icon name="map-pin" size={14} color="#2563eb" />
                        {gettingLoc ? "Getting location…" : "Add My Location for Better Directions"}
                      </button>
                    ) : (
                      <div style={{ background:"#ecfdf5", border:"1px solid #a7f3d0", borderRadius:10, padding:"9px 14px", fontSize:12, color:"#065f46", display:"flex", alignItems:"center", gap:8 }}>
                        <Icon name="check-circle" size={13} color="#059669" /> Your location added — Google Maps shows exact route
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ textAlign:"center", padding:"40px 24px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:14 }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>📍</div>
                  <div style={{ fontWeight:700, fontSize:15, color:"var(--text)", marginBottom:8 }}>Customer Location Not Shared</div>
                  <p style={{ color:"#92400e", fontSize:13, lineHeight:1.6, marginBottom:16 }}>Contact the customer via the Contact tab to confirm the address.</p>
                  {booking.notes && (
                    <div style={{ background:"var(--surface)", border:"1px solid #fde68a", borderRadius:10, padding:"10px 14px", textAlign:"left" }}>
                      <div style={{ fontSize:10, fontWeight:700, color:"#92400e", marginBottom:4, textTransform:"uppercase" }}>Customer Notes</div>
                      <div style={{ fontSize:13, color:"var(--text)" }}>{booking.notes}</div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {tab==="contact" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ background:"var(--bg)", border:"1.5px solid var(--border)", borderRadius:14, padding:"16px 18px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:"white" }}>
                    {booking.userName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:"var(--text)" }}>{booking.userName}</div>
                    <div style={{ fontSize:11, color:"var(--muted)" }}>Customer</div>
                  </div>
                </div>
                {booking.userPhone ? (
                  <a href={`tel:${booking.userPhone}`} style={{ display:"flex", alignItems:"center", gap:10, background:"#22c55e", color:"white", padding:"11px 16px", borderRadius:10, textDecoration:"none", fontWeight:700, fontSize:14, boxShadow:"0 3px 12px rgba(34,197,94,.3)", marginBottom:8 }}>
                    <Icon name="phone" size={16} color="white" /> Call {booking.userName} · {booking.userPhone}
                  </a>
                ) : (
                  <div style={{ fontSize:13, color:"var(--muted)", textAlign:"center", padding:"12px 0" }}>No phone number shared. Use in-app chat.</div>
                )}
                {booking.userAddress && (
                  <div style={{ display:"flex", alignItems:"flex-start", gap:10, background:"var(--surface)", border:"1px solid #e2e8f0", padding:"10px 14px", borderRadius:10, fontSize:13, color:"var(--text-secondary)" }}>
                    <Icon name="map-pin" size={15} color="#dc2626" /><span>{booking.userAddress}</span>
                  </div>
                )}
                {booking.notes && (
                  <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, padding:"10px 14px", marginTop:8 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"#92400e", textTransform:"uppercase", marginBottom:4 }}>Notes from Customer</div>
                    <div style={{ fontSize:13, color:"var(--text)" }}>{booking.notes}</div>
                  </div>
                )}
              </div>
              <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#1d4ed8", display:"flex", alignItems:"flex-start", gap:8 }}>
                <Icon name="info" size={13} color="#2563eb" />
                <span>Contact info is only visible after a booking is accepted to protect privacy.</span>
              </div>
            </div>
          )}

          <button onClick={onClose} style={{ width:"100%", marginTop:14, padding:"11px", background:"var(--bg)", border:"1.5px solid var(--border)", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit", color:"var(--muted)" }}>Close</button>
        </div>
      </div>
    </div>
  );
}
