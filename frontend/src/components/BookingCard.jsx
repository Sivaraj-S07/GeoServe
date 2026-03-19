import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "./Icon";

/* ─── Status config ─────────────────────────────────────────────────────── */
const STATUS_META = {
  pending:     { color:"#d97706", bg:"#fffbeb", border:"#fde68a", label:"Pending",     icon:"clock"        },
  accepted:    { color:"#2563eb", bg:"#eff6ff", border:"#bfdbfe", label:"Accepted",    icon:"check-circle" },
  in_progress: { color:"#7c3aed", bg:"#f5f3ff", border:"#ddd6fe", label:"In Progress", icon:"trending-up"  },
  completed:   { color:"#059669", bg:"#ecfdf5", border:"#a7f3d0", label:"Completed",   icon:"check-circle" },
  confirmed:   { color:"#16a34a", bg:"#f0fdf4", border:"#bbf7d0", label:"Confirmed",   icon:"check-circle" },
  rejected:    { color:"#dc2626", bg:"#fef2f2", border:"#fecaca", label:"Rejected",    icon:"x-circle"     },
};

/* ─── QR Code generator (inline SVG-based) ─────────────────────────────── */
function QRCodeDisplay({ upiId, amount, workerName }) {
  const qrData = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(workerName)}&am=${amount}&cu=INR`;
  // Use a QR API service for real QR generation
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ background:"var(--surface)", padding:12, borderRadius:16, border:"2px solid #e2e8f0", display:"inline-block", boxShadow:"0 4px 20px rgba(0,0,0,.1)" }}>
        <img src={qrUrl} alt="Payment QR" width={160} height={160} style={{ display:"block", borderRadius:8 }}
          onError={e => {
            // Fallback QR pattern if image fails
            e.target.style.display="none";
            e.target.nextSibling.style.display="flex";
          }}
        />
        <div style={{ width:160,height:160,display:"none",alignItems:"center",justifyContent:"center",background:"var(--bg)",borderRadius:8,flexDirection:"column",gap:8 }}>
          <div style={{ fontSize:36 }}>📱</div>
          <div style={{ fontSize:11,color:"var(--muted)",fontWeight:600 }}>Scan to Pay</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Work Timer component ──────────────────────────────────────────────── */
function WorkTimer({ startedAt, durationHours, onComplete }) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const totalSeconds = durationHours * 3600;

  useEffect(() => {
    const start = startedAt ? new Date(startedAt).getTime() : Date.now();
    const tick = () => {
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      setElapsed(diff);
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [startedAt]);

  const remaining = Math.max(0, totalSeconds - elapsed);
  const pct = totalSeconds > 0 ? Math.min(100, (elapsed / totalSeconds) * 100) : 0;
  const isOvertime = elapsed > totalSeconds && totalSeconds > 0;

  const fmt = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? h + "h " : ""}${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
  };

  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <div style={{ background:"linear-gradient(135deg,#0f172a,#1e1b4b)", borderRadius:16, padding:"20px 24px", color:"white", marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
        {/* Circular progress */}
        <div style={{ position:"relative", flexShrink:0 }}>
          <svg width={100} height={100} viewBox="0 0 100 100">
            <circle cx={50} cy={50} r={44} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={6} />
            <circle cx={50} cy={50} r={44} fill="none"
              stroke={isOvertime ? "#f59e0b" : pct > 80 ? "#10b981" : "#6366f1"}
              strokeWidth={6} strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 50 50)"
              style={{ transition:"stroke-dashoffset .5s ease, stroke .3s ease" }}
            />
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.6)", fontWeight:600 }}>{Math.round(pct)}%</div>
          </div>
        </div>

        {/* Timer info */}
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:"#10b981", animation:"timerPulse 1.5s infinite", display:"inline-block" }} />
            <span style={{ fontSize:12, fontWeight:700, color:"#a5b4fc", letterSpacing:".06em", textTransform:"uppercase" }}>
              {isOvertime ? "Overtime" : "Work In Progress"}
            </span>
          </div>
          <div style={{ fontSize:28, fontWeight:800, fontFamily:"monospace", letterSpacing:"-1px", marginBottom:4 }}>
            {fmt(elapsed)}
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.5)" }}>
            {totalSeconds > 0 ? (
              isOvertime ? `${fmt(elapsed - totalSeconds)} over scheduled time` : `${fmt(remaining)} remaining`
            ) : "No duration set"}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ flexShrink:0, textAlign:"right" }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", marginBottom:4 }}>Duration</div>
          <div style={{ fontSize:18, fontWeight:800, color:isOvertime?"#fbbf24":"white" }}>
            {durationHours}h
          </div>
          {isOvertime && <div style={{ fontSize:10, color:"#fbbf24", fontWeight:700 }}>OVERTIME</div>}
        </div>
      </div>

      <style>{`
        @keyframes timerPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
      `}</style>
    </div>
  );
}

/* ─── Payment Screen component ──────────────────────────────────────────── */
function PaymentScreen({ booking, role, workerProfile, onQRPaid, onCashPaid, onUserConfirm, busy }) {
  const [payMode, setPayMode] = useState(null); // "qr" | "cash"
  const [confirming, setConfirming] = useState(false);

  const payoutAccount = workerProfile?.payoutAccount || {};
  const hasUPI = payoutAccount.upiId;
  const hasBankAccount = payoutAccount.accountNumber;
  const amount = booking.cost || 0;

  return (
    <div style={{ background:"linear-gradient(135deg,#f0fdf4,#ecfdf5)", border:"2px solid #86efac", borderRadius:16, padding:"20px 22px", marginBottom:16 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#059669,#10b981)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, boxShadow:"0 4px 12px rgba(5,150,105,.3)" }}>💰</div>
        <div>
          <div style={{ fontWeight:800, fontSize:16, color:"#064e3b" }}>Payment Due</div>
          <div style={{ fontSize:13, color:"#059669" }}>Work completed · Please process payment</div>
        </div>
        <div style={{ marginLeft:"auto", textAlign:"right" }}>
          <div style={{ fontSize:28, fontWeight:900, color:"#059669" }}>₹{amount.toLocaleString()}</div>
          <div style={{ fontSize:11, color:"#6ee7b7", fontWeight:600 }}>Total Amount</div>
        </div>
      </div>

      {/* WORKER VIEW — show payment details */}
      {role === "worker" && (
        <>
          {/* Payment details card */}
          <div style={{ background:"var(--surface)", borderRadius:12, padding:"16px 18px", marginBottom:16, border:"1px solid #bbf7d0" }}>
            <div style={{ fontSize:11, fontWeight:800, color:"#6b7280", textTransform:"uppercase", letterSpacing:".06em", marginBottom:14 }}>Your Payment Details (Show to User)</div>

            {hasUPI && (
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12, padding:"12px 14px", background:"#f0fdf4", borderRadius:10, border:"1px solid #a7f3d0" }}>
                <div style={{ width:36, height:36, borderRadius:9, background:"linear-gradient(135deg,#059669,#10b981)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>📱</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", marginBottom:2 }}>UPI ID</div>
                  <div style={{ fontSize:15, fontWeight:800, color:"#059669", letterSpacing:".02em" }}>{payoutAccount.upiId}</div>
                </div>
                <button onClick={() => navigator.clipboard?.writeText(payoutAccount.upiId)} style={{ background:"none", border:"1px solid #a7f3d0", borderRadius:6, padding:"4px 10px", fontSize:11, color:"#059669", cursor:"pointer", fontWeight:600 }}>Copy</button>
              </div>
            )}

            {hasBankAccount && (
              <div style={{ padding:"12px 14px", background:"var(--bg)", borderRadius:10, border:"1px solid #e2e8f0" }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", marginBottom:8 }}>Bank Account</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 12px", fontSize:13 }}>
                  <div><span style={{ color:"var(--muted)" }}>Name: </span><span style={{ fontWeight:700 }}>{payoutAccount.accountHolderName}</span></div>
                  <div><span style={{ color:"var(--muted)" }}>Bank: </span><span style={{ fontWeight:700 }}>{payoutAccount.bankName}</span></div>
                  <div><span style={{ color:"var(--muted)" }}>Account: </span><span style={{ fontWeight:700 }}>****{payoutAccount.accountNumber?.slice(-4)}</span></div>
                  <div><span style={{ color:"var(--muted)" }}>IFSC: </span><span style={{ fontWeight:700 }}>{payoutAccount.ifscCode}</span></div>
                </div>
              </div>
            )}

            {/* QR Code */}
            {hasUPI && (
              <div style={{ marginTop:14, textAlign:"center" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#6b7280", marginBottom:10 }}>Scan QR to Pay ₹{amount}</div>
                <QRCodeDisplay upiId={payoutAccount.upiId} amount={amount} workerName={workerProfile?.name || "Worker"} />
                <div style={{ fontSize:11, color:"var(--muted)", marginTop:8 }}>User can scan this QR code to pay directly</div>
              </div>
            )}

            {!hasUPI && !hasBankAccount && (
              <div style={{ textAlign:"center", padding:"20px", color:"var(--muted)" }}>
                <div style={{ fontSize:24, marginBottom:8 }}>⚠️</div>
                <div style={{ fontSize:13, fontWeight:600 }}>No payment account configured</div>
                <div style={{ fontSize:12, marginTop:4 }}>Go to Payout Account tab to add your bank/UPI details</div>
              </div>
            )}
          </div>

          {/* Cash received button */}
          <button disabled={busy} onClick={onCashPaid}
            style={{ width:"100%", padding:"14px", background:busy?"#d1fae5":"linear-gradient(135deg,#059669,#10b981)", color:"white", border:"none", borderRadius:12, fontWeight:800, fontSize:14, cursor:busy?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:busy?"none":"0 6px 20px rgba(5,150,105,.4)", transition:"all .2s ease" }}
            onMouseEnter={e => { if(!busy) e.currentTarget.style.transform="translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; }}
          >
            <span style={{ fontSize:18 }}>💵</span>
            {busy ? "Processing…" : "Cash Received — Mark as Paid"}
          </button>
        </>
      )}

      {/* USER VIEW — payment options */}
      {role === "user" && (
        <>
          {!payMode ? (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <button onClick={() => setPayMode("qr")} style={{ padding:"16px 14px", background:"var(--surface)", border:"2px solid #e2e8f0", borderRadius:14, cursor:"pointer", fontFamily:"inherit", transition:"all .2s ease", textAlign:"center" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="#4f46e5"; e.currentTarget.style.boxShadow="0 4px 16px rgba(79,70,229,.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.boxShadow="none"; }}
              >
                <div style={{ fontSize:28, marginBottom:8 }}>📱</div>
                <div style={{ fontWeight:800, fontSize:14, color:"var(--text)", marginBottom:2 }}>Scan QR & Pay</div>
                <div style={{ fontSize:12, color:"var(--muted)" }}>UPI / QR Code payment</div>
              </button>
              <button onClick={() => setPayMode("cash")} style={{ padding:"16px 14px", background:"var(--surface)", border:"2px solid #e2e8f0", borderRadius:14, cursor:"pointer", fontFamily:"inherit", transition:"all .2s ease", textAlign:"center" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="#059669"; e.currentTarget.style.boxShadow="0 4px 16px rgba(5,150,105,.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.boxShadow="none"; }}
              >
                <div style={{ fontSize:28, marginBottom:8 }}>💵</div>
                <div style={{ fontWeight:800, fontSize:14, color:"var(--text)", marginBottom:2 }}>Pay Cash</div>
                <div style={{ fontSize:12, color:"var(--muted)" }}>Give cash directly</div>
              </button>
            </div>
          ) : payMode === "qr" ? (
            <div style={{ marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                <button onClick={() => setPayMode(null)} style={{ background:"none", border:"1px solid #e2e8f0", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, color:"var(--muted)", fontFamily:"inherit" }}>← Back</button>
                <span style={{ fontWeight:700, fontSize:14, color:"var(--text)" }}>Scan QR Code</span>
              </div>
              <div style={{ background:"var(--surface)", borderRadius:12, padding:"20px", border:"1px solid #bbf7d0", textAlign:"center", marginBottom:16 }}>
                {workerProfile?.payoutAccount?.upiId ? (
                  <>
                    <QRCodeDisplay upiId={workerProfile.payoutAccount.upiId} amount={amount} workerName={workerProfile?.name || "Worker"} />
                    <div style={{ marginTop:12, fontSize:13, color:"#059669", fontWeight:700 }}>
                      UPI: {workerProfile.payoutAccount.upiId}
                    </div>
                    <div style={{ fontSize:12, color:"var(--muted)", marginTop:4 }}>Amount: ₹{amount.toLocaleString()}</div>
                  </>
                ) : (
                  <div style={{ padding:"24px 0", color:"var(--muted)" }}>
                    <div style={{ fontSize:24, marginBottom:8 }}>📵</div>
                    <div>Worker hasn't added UPI details yet</div>
                  </div>
                )}
              </div>
              <button disabled={busy} onClick={onUserConfirm}
                style={{ width:"100%", padding:"14px", background:busy?"#d1fae5":"linear-gradient(135deg,#059669,#10b981)", color:"white", border:"none", borderRadius:12, fontWeight:800, fontSize:14, cursor:busy?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:busy?"none":"0 6px 20px rgba(5,150,105,.4)" }}
              >
                {busy ? "Processing…" : "✅ I've Paid — Confirm Payment"}
              </button>
            </div>
          ) : (
            <div style={{ marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                <button onClick={() => setPayMode(null)} style={{ background:"none", border:"1px solid #e2e8f0", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, color:"var(--muted)", fontFamily:"inherit" }}>← Back</button>
                <span style={{ fontWeight:700, fontSize:14, color:"var(--text)" }}>Cash Payment</span>
              </div>
              <div style={{ background:"var(--surface)", borderRadius:12, padding:"20px", border:"1px solid #bbf7d0", marginBottom:16 }}>
                <div style={{ textAlign:"center", marginBottom:16 }}>
                  <div style={{ fontSize:48, marginBottom:8 }}>💵</div>
                  <div style={{ fontSize:24, fontWeight:900, color:"var(--text)" }}>₹{amount.toLocaleString()}</div>
                  <div style={{ fontSize:13, color:"var(--muted)", marginTop:4 }}>Pay this amount in cash to the worker</div>
                </div>
              </div>
              <button disabled={busy} onClick={onUserConfirm}
                style={{ width:"100%", padding:"14px", background:busy?"#d1fae5":"linear-gradient(135deg,#059669,#10b981)", color:"white", border:"none", borderRadius:12, fontWeight:800, fontSize:14, cursor:busy?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:busy?"none":"0 6px 20px rgba(5,150,105,.4)" }}
              >
                {busy ? "Processing…" : "✅ Cash Paid — Confirm Payment"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Main BookingCard ──────────────────────────────────────────────────── */
export default function BookingCard({ booking, role, onStatusChange, onConfirm, onDelete, onChat, onNavigate, workerProfile }) {
  const [busy, setBusy] = useState(false);
  const [showTimer, setShowTimer] = useState(booking.status === "in_progress");
  const sm = STATUS_META[booking.status] || STATUS_META.pending;

  const act = async (fn) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  const fmt = (d) => {
    try { return new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }); }
    catch { return d; }
  };

  const handleStartWork = () => {
    act(() => onStatusChange(booking.id, "in_progress"));
    setShowTimer(true);
  };

  const handleCashPaid = () => {
    act(() => onStatusChange(booking.id, "completed", "cash_payment"));
  };

  const showPaymentScreen = (
    (role === "worker" && booking.status === "completed") ||
    (role === "user"   && booking.status === "completed")
  );

  return (
    <div className="card" style={{
      padding:0, marginBottom:16, overflow:"hidden",
      border:`1.5px solid ${sm.border}`,
      borderLeft:`4px solid ${sm.color}`,
      transition:"box-shadow .2s, transform .2s",
      borderRadius:14,
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow="0 8px 32px rgba(0,0,0,.1)"; e.currentTarget.style.transform="translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow=""; e.currentTarget.style.transform=""; }}
    >
      {/* Header */}
      <div style={{ padding:"16px 20px", borderBottom:`1px solid ${sm.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={{ fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:15, color:"var(--text)", marginBottom:3 }}>
              {role === "worker" ? booking.userName : booking.workerName}
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <span style={{ fontSize:12, color:"var(--muted)", display:"flex", alignItems:"center", gap:4 }}>
                <Icon name="calendar" size={11} color="var(--muted)" /> {fmt(booking.date)}
              </span>
              {booking.category && (
                <span style={{ background:"#eff6ff", border:"1px solid #bfdbfe", color:"#1d4ed8", fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>{booking.category}</span>
              )}
              {booking.duration > 0 && (
                <span style={{ background:"#f5f3ff", border:"1px solid #ddd6fe", color:"#7c3aed", fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>
                  ⏱ {booking.duration}h
                </span>
              )}
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
            <span style={{ background:sm.bg, border:`1px solid ${sm.border}`, color:sm.color, fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:20, display:"flex", alignItems:"center", gap:5, fontFamily:"'Outfit',sans-serif" }}>
              <Icon name={sm.icon} size={11} color={sm.color} /> {sm.label}
            </span>
            {booking.cost > 0 && (
              <div style={{ fontWeight:900, fontSize:18, color:"#059669", fontFamily:"'Outfit',sans-serif" }}>₹{booking.cost?.toLocaleString()}</div>
            )}
          </div>
        </div>
        {booking.notes && (
          <div style={{ marginTop:10, fontSize:12, color:"var(--muted)", fontStyle:"italic", background:"var(--bg)", padding:"8px 12px", borderRadius:8 }}>
            "{booking.notes.length > 100 ? booking.notes.slice(0,100)+"…" : booking.notes}"
          </div>
        )}
      </div>

      {/* Timer (when in_progress) */}
      {booking.status === "in_progress" && (
        <div style={{ padding:"16px 20px 0" }}>
          <WorkTimer
            startedAt={booking.workStartedAt || booking.updatedAt}
            durationHours={booking.duration || 1}
            onComplete={() => {}}
          />
        </div>
      )}

      {/* Payment screen (when completed) */}
      {showPaymentScreen && (
        <div style={{ padding:"16px 20px 0" }}>
          <PaymentScreen
            booking={booking}
            role={role}
            workerProfile={workerProfile}
            busy={busy}
            onCashPaid={() => act(() => onStatusChange(booking.id, "confirmed", "cash_payment"))}
            onUserConfirm={() => act(() => onConfirm(booking.id))}
          />
        </div>
      )}

      {/* Action buttons */}
      <div style={{ padding:"12px 20px 16px", display:"flex", gap:8, flexWrap:"wrap" }}>

        {/* WORKER: pending → accept/reject */}
        {role === "worker" && booking.status === "pending" && (<>
          <button disabled={busy} onClick={() => act(() => onStatusChange(booking.id,"accepted"))}
            style={{ padding:"8px 18px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#2563eb,#60a5fa)", color:"white", fontSize:12, fontWeight:700, cursor:busy?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, opacity:busy?.7:1, boxShadow:"0 3px 10px rgba(37,99,235,.3)" }}>
            <Icon name="check" size={12} color="white" /> Accept Job
          </button>
          <button disabled={busy} onClick={() => act(() => onStatusChange(booking.id,"rejected"))}
            style={{ padding:"8px 18px", borderRadius:9, border:"1.5px solid #fecaca", background:"#fef2f2", color:"#dc2626", fontSize:12, fontWeight:700, cursor:busy?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, opacity:busy?.7:1 }}>
            <Icon name="x" size={12} color="#dc2626" /> Decline
          </button>
        </>)}

        {/* WORKER: accepted → start job */}
        {role === "worker" && booking.status === "accepted" && (
          <button disabled={busy} onClick={handleStartWork}
            style={{ padding:"8px 18px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#7c3aed,#a78bfa)", color:"white", fontSize:12, fontWeight:700, cursor:busy?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, opacity:busy?.7:1, boxShadow:"0 3px 10px rgba(124,58,237,.3)" }}>
            <span>▶</span> Start Work (Timer)
          </button>
        )}

        {/* WORKER: in_progress → complete */}
        {role === "worker" && booking.status === "in_progress" && (
          <button disabled={busy} onClick={() => act(() => onStatusChange(booking.id,"completed"))}
            style={{ padding:"8px 18px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#059669,#34d399)", color:"white", fontSize:12, fontWeight:700, cursor:busy?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, opacity:busy?.7:1, boxShadow:"0 3px 10px rgba(5,150,105,.3)" }}>
            <Icon name="check-circle" size={12} color="white" /> Complete Work
          </button>
        )}

        {/* WORKER chat + navigate */}
        {role === "worker" && ["accepted","in_progress"].includes(booking.status) && onChat && (
          <button onClick={() => onChat(booking)}
            style={{ padding:"8px 14px", borderRadius:9, border:"1.5px solid #bfdbfe", background:"#eff6ff", color:"#1d4ed8", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
            <Icon name="message-circle" size={12} color="#1d4ed8" /> Chat
          </button>
        )}

        {role === "worker" && ["accepted","in_progress"].includes(booking.status) && onNavigate && (booking.userLat||booking.userAddress) && (
          <button onClick={() => onNavigate(booking)}
            style={{ padding:"8px 14px", borderRadius:9, border:"1.5px solid #a7f3d0", background:"#ecfdf5", color:"#065f46", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
            <Icon name="map-pin" size={12} color="#059669" /> Navigate
          </button>
        )}

        {role === "worker" && ["accepted","in_progress"].includes(booking.status) && booking.userPhone && (
          <a href={`tel:${booking.userPhone}`}
            style={{ padding:"8px 14px", borderRadius:9, border:"1.5px solid #bbf7d0", background:"#f0fdf4", color:"#15803d", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, textDecoration:"none" }}>
            <Icon name="phone" size={12} color="#16a34a" /> Call
          </a>
        )}

        {/* USER: chat */}
        {role === "user" && ["accepted","in_progress"].includes(booking.status) && onChat && (
          <button onClick={() => onChat(booking)}
            style={{ padding:"8px 14px", borderRadius:9, border:"1.5px solid #bfdbfe", background:"#eff6ff", color:"#1d4ed8", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
            <Icon name="message-circle" size={12} color="#1d4ed8" /> Chat
          </button>
        )}

        {/* USER: confirmed status */}
        {role === "user" && booking.status === "confirmed" && (
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", background:"#f0fdf4", border:"1.5px solid #86efac", borderRadius:9 }}>
            <span style={{ fontSize:14 }}>✅</span>
            <span style={{ fontSize:12, fontWeight:700, color:"#059669" }}>Payment Confirmed</span>
          </div>
        )}

        {/* Booking ID */}
        <span style={{ marginLeft:"auto", fontSize:11, color:"var(--muted-light)", alignSelf:"center", fontFamily:"monospace" }}>
          #{booking.id?.toString().slice(-6)}
        </span>
      </div>
    </div>
  );
}
