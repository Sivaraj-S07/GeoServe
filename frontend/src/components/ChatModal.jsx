import { useState, useEffect, useRef } from "react";
import * as api from "../api";
import Icon from "./Icon";

export default function ChatModal({ booking, currentUser, onClose }) {
  const [messages,       setMessages]       = useState([]);
  const [contactInfo,    setContactInfo]    = useState(null);
  const [contactVisible, setContactVisible] = useState(false);
  const [text,           setText]           = useState("");
  const [sending,        setSending]        = useState(false);
  const [loading,        setLoading]        = useState(true);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  const otherName = currentUser.role === "user" ? booking.workerName : booking.userName;
  const otherRole = currentUser.role === "user" ? "worker" : "user";
  const myContact  = currentUser.role === "user" ? contactInfo?.worker : contactInfo?.user;

  // Build Google Maps link from booking location
  const locationLink = booking.userLat && booking.userLng
    ? `https://www.google.com/maps?q=${booking.userLat},${booking.userLng}`
    : booking.userAddress
    ? `https://www.google.com/maps/search/${encodeURIComponent(booking.userAddress)}`
    : null;
  const locationLabel = booking.userAddress || (booking.userLat && booking.userLng
    ? `${Number(booking.userLat).toFixed(4)}, ${Number(booking.userLng).toFixed(4)}`
    : null);

  const STATUS_LOCKED = ["pending","rejected"].includes(booking.status);

  const loadMessages = async () => {
    try {
      const data = await api.getMessages(booking.id);
      setMessages(data.messages || []);
      setContactInfo(data.contactInfo);
      setContactVisible(data.contactVisible);
      api.markMessagesRead(booking.id).catch(() => {});
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, [booking.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(booking.id, text.trim());
      setMessages(p => [...p, msg]);
      setText("");
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(15,23,42,.65)", backdropFilter:"blur(6px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"var(--surface)", borderRadius:"24px 24px 0 0", width:"100%", maxWidth:520, height:"85vh", display:"flex", flexDirection:"column", boxShadow:"0 -24px 80px rgba(0,0,0,.25)", overflow:"hidden", animation:"slideUp .3s cubic-bezier(.34,1.56,.64,1)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#1e3a8a,#2563eb)", padding:"18px 20px 16px", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16, color:"white", flexShrink:0, border:"1.5px solid rgba(255,255,255,.3)" }}>
              {otherName?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"white", fontFamily:"'DM Sans',sans-serif" }}>{otherName}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.75)", marginTop:1 }}>
                {otherRole==="worker" ? "🔧 Service Worker" : "👤 Customer"} · Booking #{booking.id}
              </div>
            </div>
            {contactVisible && myContact?.phone && (
              <a href={`tel:${myContact.phone}`} style={{ width:40, height:40, borderRadius:10, background:"#22c55e", display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none", boxShadow:"0 3px 12px rgba(34,197,94,.4)" }} title={`Call ${otherName}`}>
                <Icon name="phone" size={17} color="white" />
              </a>
            )}
            <button onClick={onClose} style={{ width:36, height:36, borderRadius:9, background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon name="x" size={16} color="white" />
            </button>
          </div>
          {contactVisible && myContact?.phone && (
            <div style={{ marginTop:10, padding:"7px 12px", background:"rgba(255,255,255,.12)", borderRadius:9, display:"flex", alignItems:"center", gap:8, fontSize:12, color:"rgba(255,255,255,.9)" }}>
              <Icon name="phone" size={12} color="rgba(255,255,255,.9)" />
              <span style={{ fontWeight:600 }}>{myContact.phone}</span>
              <span style={{ opacity:.7 }}>· tap 📞 to call</span>
            </div>
          )}
          <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:6, fontSize:11, color:"rgba(255,255,255,.8)" }}>
            <span style={{ background:"rgba(255,255,255,.2)", padding:"2px 9px", borderRadius:20, fontWeight:700, textTransform:"capitalize" }}>{booking.status?.replace("_"," ")}</span>
            <span>·</span><span>{booking.category||"Service"}</span>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 8px", background:"var(--bg)", display:"flex", flexDirection:"column", gap:6 }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:32, color:"var(--muted)" }}>Loading messages…</div>
          ) : STATUS_LOCKED ? (
            <div style={{ textAlign:"center", padding:"48px 24px", background:"var(--surface)", borderRadius:16, border:"1px solid #e2e8f0", margin:"auto" }}>
              <div style={{ fontSize:32, marginBottom:12 }}>🔒</div>
              <div style={{ fontWeight:700, fontSize:15, color:"var(--text)", marginBottom:8 }}>Messaging Available After Acceptance</div>
              <div style={{ fontSize:13, color:"var(--muted)", lineHeight:1.6 }}>Once the worker accepts your booking, messaging unlocks.</div>
            </div>
          ) : (
            <>
              {/* Location pinned message — always first */}
              {locationLabel && (
                <div style={{ display:"flex", justifyContent:"flex-start", gap:8, alignItems:"flex-end", marginBottom:4 }}>
                  <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, background:"linear-gradient(135deg,#059669,#34d399)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"white" }}>📍</div>
                  <div style={{ maxWidth:"80%" }}>
                    {locationLink ? (
                      <a
                        href={locationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display:"flex", alignItems:"center", gap:8,
                          background:"linear-gradient(135deg,#ecfdf5,#d1fae5)",
                          border:"1.5px solid #6ee7b7",
                          color:"#065f46",
                          padding:"10px 14px",
                          borderRadius:"4px 16px 16px 16px",
                          fontSize:13, lineHeight:1.5,
                          textDecoration:"none",
                          boxShadow:"0 1px 4px rgba(5,150,105,.15)",
                          cursor:"pointer",
                          transition:"all .15s",
                        }}
                        onMouseEnter={e=>{e.currentTarget.style.background="linear-gradient(135deg,#d1fae5,#a7f3d0)";e.currentTarget.style.boxShadow="0 3px 12px rgba(5,150,105,.25)";}}
                        onMouseLeave={e=>{e.currentTarget.style.background="linear-gradient(135deg,#ecfdf5,#d1fae5)";e.currentTarget.style.boxShadow="0 1px 4px rgba(5,150,105,.15)";}}
                      >
                        <Icon name="map-pin" size={15} color="#059669" />
                        <div>
                          <div style={{ fontWeight:700, fontSize:12, color:"#065f46", marginBottom:1 }}>📍 Customer Location</div>
                          <div style={{ fontSize:12, color:"#047857" }}>{locationLabel}</div>
                          <div style={{ fontSize:10, color:"#6ee7b7", marginTop:2, fontWeight:600 }}>Tap to open in Maps →</div>
                        </div>
                      </a>
                    ) : (
                      <div style={{
                        display:"flex", alignItems:"center", gap:8,
                        background:"linear-gradient(135deg,#ecfdf5,#d1fae5)",
                        border:"1.5px solid #6ee7b7",
                        color:"#065f46",
                        padding:"10px 14px",
                        borderRadius:"4px 16px 16px 16px",
                        fontSize:13,
                        boxShadow:"0 1px 4px rgba(5,150,105,.15)",
                      }}>
                        <Icon name="map-pin" size={14} color="#059669" />
                        <div>
                          <div style={{ fontWeight:700, fontSize:12, marginBottom:1 }}>📍 Customer Location</div>
                          <div style={{ fontSize:12, color:"#047857" }}>Location not available</div>
                        </div>
                      </div>
                    )}
                    <div style={{ fontSize:10, color:"var(--muted)", marginTop:3, paddingLeft:4 }}>System</div>
                  </div>
                </div>
              )}

              {messages.length === 0 ? (
                <div style={{ textAlign:"center", padding:"48px 24px", background:"var(--surface)", borderRadius:16, border:"1px dashed #e2e8f0", margin:"auto" }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>💬</div>
                  <div style={{ fontWeight:700, fontSize:15, color:"var(--text)", marginBottom:8 }}>Start the conversation</div>
                  <div style={{ fontSize:13, color:"var(--muted)", lineHeight:1.6 }}>Discuss service details or location with {otherName}.</div>
                </div>
              ) : messages.map(msg => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div key={msg.id} style={{ display:"flex", justifyContent:isMe?"flex-end":"flex-start", gap:8, alignItems:"flex-end" }}>
                    {!isMe && <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, background:"linear-gradient(135deg,#2563eb,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"white" }}>{msg.senderName?.charAt(0).toUpperCase()}</div>}
                    <div style={{ maxWidth:"72%" }}>
                      <div style={{ background:isMe?"linear-gradient(135deg,#2563eb,#4f46e5)":"white", color:isMe?"white":"#0f172a", padding:"10px 14px", borderRadius:isMe?"16px 4px 16px 16px":"4px 16px 16px 16px", fontSize:14, lineHeight:1.5, border:isMe?"none":"1px solid #e8ecf0", boxShadow:isMe?"0 3px 10px rgba(37,99,235,.25)":"0 1px 4px rgba(0,0,0,.06)" }}>{msg.text}</div>
                      <div style={{ fontSize:10, color:"var(--muted)", marginTop:3, textAlign:isMe?"right":"left", paddingLeft:isMe?0:4 }}>
                        {new Date(msg.createdAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                        {isMe && <span style={{ marginLeft:4 }}>✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding:"12px 16px 16px", background:"var(--surface)", borderTop:"1px solid #f1f5f9", flexShrink:0 }}>
          {STATUS_LOCKED ? (
            <div style={{ textAlign:"center", padding:"12px", fontSize:13, color:"var(--muted)" }}>Waiting for worker to accept booking…</div>
          ) : (
            <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
              <textarea value={text} onChange={e=>setText(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}}
                placeholder="Type a message… (Enter to send)" rows={1}
                style={{ flex:1, padding:"10px 14px", border:"1.5px solid var(--border)", borderRadius:12, fontSize:14, fontFamily:"'Manrope',sans-serif", resize:"none", outline:"none", lineHeight:1.5, maxHeight:100, overflowY:"auto" }}
              />
              <button onClick={handleSend} disabled={sending||!text.trim()} style={{ width:44, height:44, borderRadius:12, background:text.trim()?"linear-gradient(135deg,#2563eb,#4f46e5)":"#e2e8f0", border:"none", cursor:text.trim()?"pointer":"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:text.trim()?"0 3px 12px rgba(37,99,235,.35)":"none" }}>
                {sending ? <div style={{ width:16, height:16, border:"2px solid rgba(255,255,255,.4)", borderTopColor:"white", borderRadius:"50%", animation:"spin .7s linear infinite" }} /> : <Icon name="send" size={16} color={text.trim()?"white":"#94a3b8"} />}
              </button>
            </div>
          )}
          {contactVisible && myContact?.phone && (
            <div style={{ marginTop:10, padding:"8px 12px", background:"#f0fdf4", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12 }}>
              <span style={{ color:"#15803d", fontWeight:600 }}>📞 {otherName}: {myContact.phone}</span>
              <a href={`tel:${myContact.phone}`} style={{ background:"#22c55e", color:"white", padding:"4px 12px", borderRadius:20, textDecoration:"none", fontSize:11, fontWeight:700 }}>Call Now</a>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}
