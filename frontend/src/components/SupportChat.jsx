/**
 * SupportChat.jsx — GeoServe v6.0
 * Floating support chat widget. Sends messages to /api/support/messages.
 * Polls every 4 seconds for admin replies. Auto-scrolls to bottom.
 */
import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import * as api from "../api";

const fmt = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
};

export default function SupportChat({ user, onClose, onToast }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState("");
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [unread,   setUnread]   = useState(0);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);
  const prevLen   = useRef(0);

  const loadMsgs = async (silent = false) => {
    try {
      const data = await api.getSupportMessages();
      const msgs = data.messages || [];
      // Count new admin replies since last check
      const newReplies = msgs.filter(m => m.senderRole === "admin" && !m.readByUser).length;
      setUnread(newReplies);
      setMessages(msgs);
      if (!silent && msgs.length > prevLen.current) {
        prevLen.current = msgs.length;
      }
    } catch { /* silently fail polling */ }
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => {
    loadMsgs();
    pollRef.current = setInterval(() => loadMsgs(true), 4000);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    try {
      await api.sendSupportMessage(trimmed);
      await loadMsgs(true);
    } catch (e) {
      onToast(e.message || t("common.error"), "error");
      setText(trimmed); // restore
    } finally { setSending(false); }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="support-chat-panel">
      {/* Header */}
      <div className="support-chat-header">
        <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🛟</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:14, lineHeight:1.2 }}>{t("support.geoserveSupport")}</div>
          <div style={{ fontSize:11, opacity:.8, display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#a8ffcc", display:"inline-block" }} />
            Typically replies in minutes
          </div>
        </div>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:"50%", width:30, height:30, cursor:"pointer", color:"white", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>✕</button>
      </div>

      {/* Messages */}
      <div className="support-chat-messages">
        {loading ? (
          <div style={{ textAlign:"center", padding:"24px 0", color:"var(--muted)", fontSize:13 }}>
            <div style={{ width:24, height:24, border:"2.5px solid var(--border)", borderTopColor:"var(--primary)", borderRadius:"50%", animation:"spin .7s linear infinite", margin:"0 auto 8px" }} />
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign:"center", padding:"32px 16px" }}>
            <div style={{ fontSize:36, marginBottom:10 }}>💬</div>
            <div style={{ fontWeight:600, fontSize:14, color:"var(--text)" }}>{t("support.startConversationSupport")}</div>
            <div style={{ fontSize:12, color:"var(--muted)", marginTop:4, lineHeight:1.5 }}>
              Send us a message and our support team will reply shortly.
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isUser = msg.senderRole === "user";
            return (
              <div key={msg.id || i} style={{ display:"flex", flexDirection:"column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                {!isUser && (
                  <div style={{ fontSize:10, fontWeight:700, color:"var(--primary)", marginBottom:3, paddingLeft:2 }}>
                    {t("support.geoserveSupport")}
                  </div>
                )}
                <div className={isUser ? "chat-bubble chat-bubble-user" : "chat-bubble chat-bubble-admin"}>
                  {msg.text}
                  <div className="chat-bubble-time" style={{ textAlign: isUser ? "right" : "left" }}>
                    {fmt(msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="support-chat-input-row">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={t("support.placeholder")}
          rows={1}
          style={{
            flex:1, resize:"none", border:"1.5px solid var(--border)", borderRadius:12,
            padding:"9px 12px", fontSize:13, fontFamily:"inherit", outline:"none",
            background:"var(--input-bg)", color:"var(--text)",
            maxHeight:80, overflowY:"auto", lineHeight:1.5,
          }}
          onFocus={e => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "0 0 0 3px var(--primary-glow)"; }}
          onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            width:38, height:38, borderRadius:"50%", border:"none", cursor:"pointer",
            background: text.trim() ? "var(--grad-primary)" : "var(--bg-alt)",
            color: text.trim() ? "white" : "var(--muted)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:16,
            flexShrink:0, transition:"all .18s",
            boxShadow: text.trim() ? "0 3px 10px var(--primary-glow)" : "none",
          }}
        >
          {sending ? <div style={{ width:14, height:14, border:"2px solid rgba(255,255,255,.4)", borderTopColor:"white", borderRadius:"50%", animation:"spin .6s linear infinite" }} /> : "↑"}
        </button>
      </div>
    </div>
  );
}
