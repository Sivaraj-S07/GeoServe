import { useTranslation } from "react-i18next";
/**
 * SupportPage.jsx — GeoServe Admin v6.0
 * Admin inbox: view all user support messages, reply in real time.
 * Left panel = conversation list. Right panel = chat window.
 * Polls every 5 seconds for new messages.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import * as api from "../api";

const fmt = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
  }
  return d.toLocaleDateString("en-IN", { day:"2-digit", month:"short" }) + " " +
         d.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
};

function Avatar({ name, size = 36 }) {
  const initials = (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const colors   = ["var(--primary)","#1a6fa8","#b07010","#6040a8","#b83040","#0d7a6e"];
  const color    = colors[name?.charCodeAt(0) % colors.length] || colors[0];
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:`linear-gradient(135deg,${color},${color}aa)`, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800, fontSize:size*0.35, flexShrink:0 }}>
      {initials}
    </div>
  );
}

export default function SupportPage({ onToast }) {
  const { t } = useTranslation();
  const [convList,   setConvList]   = useState([]);
  const [activeUid,  setActiveUid]  = useState(null);
  const [messages,   setMessages]   = useState([]);
  const [convLoading,setConvLoad]   = useState(true);
  const [msgLoading, setMsgLoad]    = useState(false);
  const [replyText,  setReplyText]  = useState("");
  const [sending,    setSending]    = useState(false);
  const [totalUnread,setTotalUnread]= useState(0);
  const bottomRef  = useRef(null);
  const pollRef    = useRef(null);
  const inputRef   = useRef(null);

  // Load all conversations
  const loadConvs = useCallback(async (silent = false) => {
    try {
      const data = await api.getSupportConversations();
      const list = data.conversations || [];
      setConvList(list);
      setTotalUnread(list.reduce((s, c) => s + (c.unreadByAdmin || 0), 0));
    } catch { if (!silent) onToast(t("common.error"), "error"); }
    finally { if (!silent) setConvLoad(false); }
  }, [onToast]);

  // Load messages for active conversation
  const loadMsgs = useCallback(async (uid, silent = false) => {
    if (!uid) return;
    if (!silent) setMsgLoad(true);
    try {
      const data = await api.getSupportConversation(uid);
      setMessages(data.messages || []);
      // Mark as read
      await api.markSupportRead(uid).catch(() => {});
      // Refresh unread count
      setConvList(prev => prev.map(c => c.userId === uid ? { ...c, unreadByAdmin: 0 } : c));
      setTotalUnread(prev => Math.max(0, prev - (convList.find(c => c.userId === uid)?.unreadByAdmin || 0)));
    } catch { if (!silent) onToast(t("common.error"), "error"); }
    finally { if (!silent) setMsgLoad(false); }
  }, [onToast, convList]);

  useEffect(() => {
    loadConvs();
    pollRef.current = setInterval(() => {
      loadConvs(true);
      if (activeUid) loadMsgs(activeUid, true);
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [loadConvs]);

  useEffect(() => {
    if (activeUid) { loadMsgs(activeUid); }
  }, [activeUid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  const selectUser = (uid) => {
    setActiveUid(uid); setReplyText("");
    inputRef.current?.focus();
  };

  const handleReply = async () => {
    const trimmed = replyText.trim();
    if (!trimmed || !activeUid || sending) return;
    setSending(true); setReplyText("");
    try {
      await api.replySupportMessage(activeUid, trimmed);
      await loadMsgs(activeUid, true);
    } catch (e) {
      onToast(e.message || t("common.error"), "error");
      setReplyText(trimmed);
    } finally { setSending(false); }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); }
  };

  const activeConv = convList.find(c => c.userId === activeUid);

  return (
    <div className="anim-fade" style={{ padding:"28px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom:24, display:"flex", alignItems:"center", gap:16 }}>
        <div>
          <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:24, fontWeight:400, color:"var(--text)", margin:0 }}>
            Support Inbox
          </h2>
          <p style={{ color:"var(--muted)", fontSize:13, margin:"4px 0 0" }}>
            {totalUnread > 0 ? (
              <span style={{ color:"var(--primary)", fontWeight:700 }}>{totalUnread} unread message{totalUnread !== 1 ? "s" : ""}</span>
            ) : "All caught up · No unread messages"}
          </p>
        </div>
        {totalUnread > 0 && (
          <div style={{ padding:"4px 14px", background:"var(--primary-bg)", border:"1.5px solid var(--primary-border)", borderRadius:20, fontSize:13, fontWeight:700, color:"var(--primary)" }}>
            💬 {totalUnread} new
          </div>
        )}
      </div>

      {convLoading ? (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:300, color:"var(--muted)", gap:12 }}>
          <div style={{ width:22, height:22, border:"2.5px solid var(--border)", borderTopColor:"var(--primary)", borderRadius:"50%", animation:"spin .7s linear infinite" }} />
          Loading conversations…
        </div>
      ) : (
        <div className="admin-support-panel">
          {/* ── Conversation list ── */}
          <div className="support-user-list">
            <div style={{ padding:"12px 16px 8px", fontSize:11, fontWeight:800, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".08em", borderBottom:"1px solid var(--border-light)" }}>
              Conversations ({convList.length})
            </div>
            {convList.length === 0 ? (
              <div style={{ padding:"40px 16px", textAlign:"center", color:"var(--muted)" }}>
                <div style={{ fontSize:36, marginBottom:8 }}>📭</div>
                <div style={{ fontSize:13, fontWeight:600 }}>No conversations yet</div>
                <div style={{ fontSize:12, marginTop:4 }}>Users will appear here when they message support</div>
              </div>
            ) : (
              convList.map(conv => (
                <div
                  key={conv.userId}
                  className={`support-user-item${activeUid === conv.userId ? " active" : ""}`}
                  onClick={() => selectUser(conv.userId)}
                >
                  <Avatar name={conv.userName} size={38} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6 }}>
                      <div style={{ fontWeight: conv.unreadByAdmin > 0 ? 800 : 600, fontSize:13.5, color:"var(--text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {conv.userName}
                      </div>
                      <div style={{ fontSize:10, color:"var(--muted)", flexShrink:0, whiteSpace:"nowrap" }}>
                        {conv.lastMessageAt ? fmt(conv.lastMessageAt) : ""}
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6, marginTop:2 }}>
                      <div style={{ fontSize:12, color: conv.unreadByAdmin > 0 ? "var(--text-secondary)" : "var(--muted)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", fontWeight: conv.unreadByAdmin > 0 ? 600 : 400 }}>
                        {conv.lastMessage || "No messages yet"}
                      </div>
                      {conv.unreadByAdmin > 0 && (
                        <span className="unread-badge">{conv.unreadByAdmin}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Chat window ── */}
          <div className="support-conv-panel">
            {!activeUid ? (
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"var(--muted)", padding:40 }}>
                <div style={{ fontSize:52, marginBottom:16, opacity:.4 }}>💬</div>
                <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:20, color:"var(--text)", marginBottom:8 }}>Select a conversation</div>
                <div style={{ fontSize:13, color:"var(--muted)", textAlign:"center", maxWidth:280, lineHeight:1.6 }}>
                  Pick a user from the left panel to read their messages and send a reply.
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="support-conv-header">
                  <Avatar name={activeConv?.userName} size={40} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:"var(--text)" }}>{activeConv?.userName}</div>
                    <div style={{ fontSize:12, color:"var(--muted)" }}>{activeConv?.userEmail}</div>
                  </div>
                  <div style={{ fontSize:12, color:"var(--muted)" }}>{activeConv?.totalMessages || 0} message{activeConv?.totalMessages !== 1 ? "s" : ""}</div>
                </div>

                {/* Messages */}
                <div className="support-conv-messages">
                  {msgLoading ? (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", flex:1, color:"var(--muted)", gap:10 }}>
                      <div style={{ width:18, height:18, border:"2px solid var(--border)", borderTopColor:"var(--primary)", borderRadius:"50%", animation:"spin .7s linear infinite" }} />
                      Loading…
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign:"center", padding:40, color:"var(--muted)" }}>
                      <div style={{ fontSize:32, marginBottom:8 }}>📝</div>
                      <div style={{ fontSize:13 }}>No messages yet. Start the conversation below.</div>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const isAdmin = msg.senderRole === "admin";
                      return (
                        <div key={msg.id || i} style={{ display:"flex", flexDirection:"column", alignItems: isAdmin ? "flex-end" : "flex-start", gap:2 }}>
                          {!isAdmin && (
                            <div style={{ fontSize:10, fontWeight:700, color:"var(--muted)", paddingLeft:2 }}>
                              {msg.senderName}
                            </div>
                          )}
                          <div className={isAdmin ? "admin-chat-bubble-admin" : "admin-chat-bubble-user"}>
                            {msg.text}
                          </div>
                          <div style={{ fontSize:10, color:"var(--muted)", paddingLeft:2, paddingRight:2 }}>
                            {fmt(msg.createdAt)} {isAdmin ? "· You" : ""}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Reply input */}
                <div className="support-conv-input">
                  <textarea
                    ref={inputRef}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={t("adminSupport.messagePlaceholder")}
                    rows={2}
                    style={{ flex:1, resize:"none", border:"1.5px solid var(--border)", borderRadius:12, padding:"9px 12px", fontSize:13, fontFamily:"inherit", outline:"none", background:"var(--input-bg)", color:"var(--text)", maxHeight:100, overflowY:"auto" }}
                    onFocus={e => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "0 0 0 3px var(--primary-glow)"; }}
                    onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim() || sending}
                    className="btn-primary"
                    style={{ flexShrink:0, padding:"10px 20px", opacity: (!replyText.trim() || sending) ? .5 : 1 }}
                  >
                    {sending ? (
                      <span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,.4)", borderTopColor:"white", borderRadius:"50%", animation:"spin .6s linear infinite", display:"inline-block" }} />
                    ) : t("adminSupport.send")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
