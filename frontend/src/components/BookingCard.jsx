import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import Icon, { CategoryChip } from "./Icon";
import { RatingSubmitForm } from "./StarRating";
import { getLocalizedName } from "../utils/localizedName";

/* ─── Status config ─────────────────────────────────────────────────────── */
const STATUS_COLORS = {
  pending:     { color:"var(--amber)",  bg:"var(--amber-bg)",  border:"var(--amber-border)",  icon:"clock"        },
  accepted:    { color:"var(--blue)",   bg:"var(--blue-bg)",   border:"var(--blue-border)",   icon:"check-circle" },
  in_progress: { color:"var(--purple)", bg:"var(--purple-bg)", border:"var(--purple-border)", icon:"trending-up"  },
  completed:   { color:"var(--green)",  bg:"var(--green-bg)",  border:"var(--green-border)",  icon:"check-circle" },
  confirmed:   { color:"var(--green)",  bg:"var(--green-bg)",  border:"var(--green-border)",  icon:"check-circle" },
  rejected:    { color:"var(--red)",    bg:"var(--red-bg)",    border:"var(--red-border)",    icon:"x-circle"     },
};

function getStatusMeta(status, t) {
  const labels = {
    pending:     t("bookingCard.pending"),
    accepted:    t("bookingCard.accepted"),
    in_progress: t("bookingCard.inProgress"),
    completed:   t("bookingCard.completed"),
    confirmed:   t("bookingCard.confirmed"),
    rejected:    t("bookingCard.rejected"),
  };
  return { ...(STATUS_COLORS[status] || STATUS_COLORS.pending), label: labels[status] || status };
}

/* ─── QR Code display ───────────────────────────────────────────────────── */
function buildUpiUri(scheme, { upiId, amount, workerName, bookingId }) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: workerName || "Worker",
    am: String(amount),
    cu: "INR",
    tn: `GeoServe booking #${bookingId}`,
  });
  if (bookingId) params.set("tr", `GEOSERVE${bookingId}`);
  return `${scheme}://pay?${params.toString()}`;
}

function QRCodeDisplay({ upiId, amount, workerName, bookingId }) {
  const qrData = buildUpiUri("upi", { upiId, amount, workerName, bookingId });
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

  // Deep links to open specific UPI apps directly (falls back to the generic
  // "upi://" intent, which any installed UPI app — GPay, PhonePe, Paytm, or
  // otherwise — can handle). The amount and booking reference are baked into
  // every link and can never be edited by the customer.
  const apps = [
    { label: "Google Pay", emoji: "🟢", uri: buildUpiUri("tez", { upiId, amount, workerName, bookingId }) },
    { label: "PhonePe",    emoji: "🟣", uri: buildUpiUri("phonepe", { upiId, amount, workerName, bookingId }) },
    { label: "Paytm",      emoji: "🔵", uri: buildUpiUri("paytmmp", { upiId, amount, workerName, bookingId }) },
    { label: "Other UPI",  emoji: "📲", uri: qrData },
  ];

  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ background:"var(--surface)", padding:12, borderRadius:16, border:"2px solid var(--border)", display:"inline-block", boxShadow:"0 4px 20px rgba(0,0,0,.1)" }}>
        <img
          src={qrUrl}
          alt="Payment QR"
          width={160}
          height={160}
          style={{ display:"block", borderRadius:8 }}
          onError={e => { e.target.style.display = "none"; }}
        />
      </div>
      {bookingId && (
        <div style={{ fontSize:11, color:"var(--muted)", marginTop:8 }}>Booking ref: GEOSERVE{bookingId}</div>
      )}
      {/* App-specific deep links — mainly useful on mobile devices where a UPI app is installed */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center", marginTop:10 }}>
        {apps.map(a => (
          <a key={a.label} href={a.uri}
            style={{ fontSize:11, fontWeight:700, color:"var(--text)", background:"var(--bg)", border:"1px solid var(--border)", borderRadius:20, padding:"5px 10px", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:4 }}
          >
            <span>{a.emoji}</span>{a.label}
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─── Work Timer ────────────────────────────────────────────────────────── */
function WorkTimer({ startedAt, durationHours }) {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const totalSeconds = durationHours * 3600;

  useEffect(() => {
    const start = startedAt ? new Date(startedAt).getTime() : Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [startedAt]);

  const remaining = Math.max(0, totalSeconds - elapsed);
  const pct = totalSeconds > 0 ? Math.min(100, (elapsed / totalSeconds) * 100) : 0;
  const isOvertime = elapsed > totalSeconds && totalSeconds > 0;
  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference * (1 - pct / 100);

  const fmtTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? h + "h " : ""}${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
  };

  return (
    <div style={{ background:"linear-gradient(135deg,#0d1b3e,#1a3a8f,#047857)", borderRadius:16, padding:"20px 24px", color:"white", marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
        <div style={{ position:"relative", flexShrink:0 }}>
          <svg width={100} height={100} viewBox="0 0 100 100">
            <circle cx={50} cy={50} r={44} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={6} />
            <circle cx={50} cy={50} r={44} fill="none"
              stroke={isOvertime ? "#f59e0b" : pct > 80 ? "var(--green)" : "#6366f1"}
              strokeWidth={6} strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 50 50)"
              style={{ transition:"stroke-dashoffset .5s ease, stroke .3s ease" }}
            />
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.6)", fontWeight:600 }}>{Math.round(pct)}%</div>
          </div>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:"var(--green)", animation:"timerPulse 1.5s infinite", display:"inline-block" }} />
            <span style={{ fontSize:12, fontWeight:700, color:"#a5b4fc", letterSpacing:".06em", textTransform:"uppercase" }}>
              {isOvertime ? t("bookingCard.overtime") : t("bookingCard.workInProgress")}
            </span>
          </div>
          <div style={{ fontSize:28, fontWeight:800, fontFamily:"monospace", letterSpacing:"-1px", marginBottom:4 }}>
            {fmtTime(elapsed)}
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.5)" }}>
            {totalSeconds > 0
              ? (isOvertime ? `${fmtTime(elapsed - totalSeconds)} over scheduled time` : `${fmtTime(remaining)} remaining`)
              : "—"}
          </div>
        </div>
        <div style={{ flexShrink:0, textAlign:"right" }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", marginBottom:4 }}>{t("bookingCard.duration")}</div>
          <div style={{ fontSize:18, fontWeight:800, color:isOvertime ? "#fbbf24" : "white" }}>{durationHours}h</div>
          {isOvertime && <div style={{ fontSize:10, color:"#fbbf24", fontWeight:700 }}>{t("bookingCard.overtime")}</div>}
        </div>
      </div>
      <style>{`@keyframes timerPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }`}</style>
    </div>
  );
}

/* ─── Payment Method Selection Modal (shown when user clicks Complete) ───── */
function PaymentMethodModal({ booking, workerProfile, onConfirm, onCancel, busy }) {
  const { t, i18n } = useTranslation();
  const [payMode, setPayMode] = useState(null); // null | "upi" | "cash"
  const [utr, setUtr] = useState("");
  const amount = booking.cost || 0;
  const workerDisplayName = getLocalizedName(
    { name: booking.workerName, nameEn: booking.workerNameEn },
    i18n.language
  ) || "the worker";
  const upiId = workerProfile?.payoutAccount?.upiId || null;

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:9999,
      display:"flex", alignItems:"center", justifyContent:"center", padding:"16px",
    }}>
      <div style={{
        background:"var(--surface)", borderRadius:20, padding:0, width:"100%", maxWidth:460,
        boxShadow:"0 24px 64px rgba(0,0,0,.25)", overflow:"hidden", animation:"fadeInUp .2s ease",
      }}>
        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#2563eb,#3b82f6)", padding:"24px 24px 20px", color:"white" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:14, background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>💳</div>
            <div>
              <div style={{ fontWeight:800, fontSize:18 }}>Select Payment Method</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.75)", marginTop:2 }}>Choose how you'd like to pay</div>
            </div>
            <div style={{ marginLeft:"auto", textAlign:"right" }}>
              <div style={{ fontSize:26, fontWeight:900 }}>₹{amount.toLocaleString()}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.65)" }}>Total Amount</div>
            </div>
          </div>
        </div>

        <div style={{ padding:"20px 24px" }}>
          {/* Payment options */}
          {payMode === null && (
            <>
              <p style={{ fontSize:13, color:"var(--muted)", marginBottom:16, marginTop:0 }}>
                Please complete the payment before marking this job as done.
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
                {/* UPI Option */}
                <button
                  onClick={() => setPayMode("upi")}
                  style={{
                    padding:"16px 18px", borderRadius:14, border:"2px solid var(--border)",
                    background:"var(--bg)", cursor:"pointer", fontFamily:"inherit",
                    display:"flex", alignItems:"center", gap:14, textAlign:"left",
                    transition:"all .18s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="#2563eb"; e.currentTarget.style.background="#eff6ff"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.background="var(--bg)"; }}
                >
                  <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#7c3aed,#a78bfa)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>📱</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:14, color:"var(--text)", marginBottom:2 }}>UPI Payment</div>
                    <div style={{ fontSize:12, color:"var(--muted)" }}>Scan QR code or use UPI ID</div>
                  </div>
                  <Icon name="chevron-right" size={16} color="var(--muted)" />
                </button>

                {/* Cash Option */}
                <button
                  onClick={() => setPayMode("cash")}
                  style={{
                    padding:"16px 18px", borderRadius:14, border:"2px solid var(--border)",
                    background:"var(--bg)", cursor:"pointer", fontFamily:"inherit",
                    display:"flex", alignItems:"center", gap:14, textAlign:"left",
                    transition:"all .18s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="#16a34a"; e.currentTarget.style.background="#f0fdf4"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.background="var(--bg)"; }}
                >
                  <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#16a34a,#22c55e)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>💵</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:14, color:"var(--text)", marginBottom:2 }}>Cash Payment</div>
                    <div style={{ fontSize:12, color:"var(--muted)" }}>Pay directly in cash to the worker</div>
                  </div>
                  <Icon name="chevron-right" size={16} color="var(--muted)" />
                </button>
              </div>

              <button
                onClick={onCancel}
                style={{ width:"100%", padding:"12px", borderRadius:10, border:"1.5px solid var(--border)", background:"var(--surface)", color:"var(--muted)", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
              >
                Cancel — Continue Working
              </button>
            </>
          )}

          {/* UPI sub-screen */}
          {payMode === "upi" && (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
                <button onClick={() => setPayMode(null)} style={{ background:"none", border:"1px solid var(--border)", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, color:"var(--muted)", fontFamily:"inherit" }}>← Back</button>
                <span style={{ fontWeight:700, fontSize:15, color:"var(--text)" }}>UPI Payment</span>
              </div>
              <div style={{ background:"var(--bg)", borderRadius:14, padding:"20px", border:"1.5px solid #bfdbfe", textAlign:"center", marginBottom:16 }}>
                {upiId ? (
                  <>
                    <QRCodeDisplay upiId={upiId} amount={amount} workerName={workerProfile?.name || "Worker"} bookingId={booking.id} />
                    <div style={{ marginTop:14, fontSize:14, fontWeight:800, color:"var(--primary)" }}>UPI ID: {upiId}</div>
                    <div style={{ fontSize:13, color:"var(--muted)", marginTop:4 }}>Amount: ₹{amount.toLocaleString()}</div>
                    <div style={{ marginTop:10, fontSize:12, color:"var(--muted)", background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"8px 12px" }}>
                      Scan the QR code with any UPI app and complete the payment, then click Confirm below.
                    </div>
                    <div style={{ marginTop:14, textAlign:"left" }}>
                      <label style={{ fontSize:12, fontWeight:700, color:"var(--text)", display:"block", marginBottom:4 }}>UPI Transaction / UTR No. (optional)</label>
                      <input
                        value={utr}
                        onChange={e => setUtr(e.target.value)}
                        placeholder="e.g. 123456789012"
                        style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:"1.5px solid var(--border)", background:"var(--surface)", color:"var(--text)", fontSize:13, fontFamily:"inherit", boxSizing:"border-box" }}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ padding:"20px 0", color:"var(--muted)" }}>
                    <div style={{ fontSize:32, marginBottom:10 }}>📵</div>
                    <div style={{ fontWeight:700, marginBottom:4 }}>No UPI details available</div>
                    <div style={{ fontSize:12 }}>The worker hasn't added a UPI ID yet. Please use Cash payment instead.</div>
                  </div>
                )}
              </div>
              <button
                disabled={busy}
                onClick={() => onConfirm("upi", utr)}
                style={{ width:"100%", padding:"14px", background:busy ? "#a5b4fc" : "linear-gradient(135deg,#2563eb,#3b82f6)", color:"white", border:"none", borderRadius:12, fontWeight:800, fontSize:14, cursor:busy ? "not-allowed" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:busy ? "none" : "0 6px 20px rgba(37,99,235,.4)", marginBottom:10 }}
              >
                {busy ? "Processing..." : "✅ I've Paid via UPI — Mark as Complete"}
              </button>
              <button onClick={onCancel} style={{ width:"100%", padding:"10px", borderRadius:10, border:"1.5px solid var(--border)", background:"var(--surface)", color:"var(--muted)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                Cancel
              </button>
            </>
          )}

          {/* Cash sub-screen */}
          {payMode === "cash" && (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
                <button onClick={() => setPayMode(null)} style={{ background:"none", border:"1px solid var(--border)", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, color:"var(--muted)", fontFamily:"inherit" }}>← Back</button>
                <span style={{ fontWeight:700, fontSize:15, color:"var(--text)" }}>Cash Payment</span>
              </div>
              <div style={{ background:"var(--bg)", borderRadius:14, padding:"24px 20px", border:"1.5px solid #bbf7d0", textAlign:"center", marginBottom:16 }}>
                <div style={{ fontSize:52, marginBottom:12 }}>💵</div>
                <div style={{ fontSize:28, fontWeight:900, color:"var(--text)", marginBottom:6 }}>₹{amount.toLocaleString()}</div>
                <div style={{ fontSize:13, color:"var(--muted)" }}>Pay this amount in cash to <strong>{workerDisplayName}</strong></div>
                <div style={{ marginTop:12, fontSize:12, color:"#15803d", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"8px 12px" }}>
                  Hand over the cash and then click the button below to mark the job as complete.
                </div>
              </div>
              <button
                disabled={busy}
                onClick={() => onConfirm("cash")}
                style={{ width:"100%", padding:"14px", background:busy ? "#86efac" : "linear-gradient(135deg,#16a34a,#22c55e)", color:"white", border:"none", borderRadius:12, fontWeight:800, fontSize:14, cursor:busy ? "not-allowed" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:busy ? "none" : "0 6px 20px rgba(22,163,74,.4)", marginBottom:10 }}
              >
                {busy ? "Processing..." : "✅ Cash Paid — Mark as Complete"}
              </button>
              <button onClick={onCancel} style={{ width:"100%", padding:"10px", borderRadius:10, border:"1.5px solid var(--border)", background:"var(--surface)", color:"var(--muted)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}

/* ─── Payment Screen (shown after booking is marked completed by user) ──── */
function PaymentScreen({ booking, workerProfile, onUserConfirm, busy }) {
  const { t } = useTranslation();
  const [payMode, setPayMode] = useState(null);
  const [utr, setUtr] = useState("");
  const amount = booking.cost || 0;
  const upiId = workerProfile?.payoutAccount?.upiId || null;

  return (
    <div style={{ background:"linear-gradient(135deg,#f0fdf4,var(--primary-bg))", border:"2px solid #86efac", borderRadius:16, padding:"20px 22px", marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#2563eb,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, boxShadow:"0 4px 12px rgba(37,99,235,.30)" }}>💰</div>
        <div>
          <div style={{ fontWeight:800, fontSize:16, color:"#064e3b" }}>{t("bookingCard.paymentDue")}</div>
          <div style={{ fontSize:13, color:"var(--primary)" }}>{t("bookingCard.workCompletedProcessPayment")}</div>
        </div>
        <div style={{ marginLeft:"auto", textAlign:"right" }}>
          <div style={{ fontSize:28, fontWeight:900, color:"var(--primary)" }}>₹{amount.toLocaleString()}</div>
          <div style={{ fontSize:11, color:"var(--green-border)", fontWeight:600 }}>{t("bookingCard.totalAmount")}</div>
        </div>
      </div>

      {payMode === null && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <button onClick={() => setPayMode("qr")}
            style={{ padding:"16px 14px", background:"var(--surface)", border:"2px solid var(--border)", borderRadius:14, cursor:"pointer", fontFamily:"inherit", textAlign:"center", transition:"all .2s ease" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="#2563eb"; e.currentTarget.style.boxShadow="0 4px 16px rgba(79,70,229,.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.boxShadow="none"; }}
          >
            <div style={{ fontSize:28, marginBottom:8 }}>📱</div>
            <div style={{ fontWeight:800, fontSize:14, color:"var(--text)", marginBottom:2 }}>Scan QR & Pay</div>
            <div style={{ fontSize:12, color:"var(--muted)" }}>UPI / QR Code payment</div>
          </button>
          <button onClick={() => setPayMode("cash")}
            style={{ padding:"16px 14px", background:"var(--surface)", border:"2px solid var(--border)", borderRadius:14, cursor:"pointer", fontFamily:"inherit", textAlign:"center", transition:"all .2s ease" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="var(--primary)"; e.currentTarget.style.boxShadow="0 4px 16px rgba(37,99,235,.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.boxShadow="none"; }}
          >
            <div style={{ fontSize:28, marginBottom:8 }}>💵</div>
            <div style={{ fontWeight:800, fontSize:14, color:"var(--text)", marginBottom:2 }}>Pay Cash</div>
            <div style={{ fontSize:12, color:"var(--muted)" }}>Give cash directly</div>
          </button>
        </div>
      )}

      {payMode === "qr" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <button onClick={() => setPayMode(null)} style={{ background:"none", border:"1px solid #e2e8f0", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, color:"var(--muted)", fontFamily:"inherit" }}>← Back</button>
            <span style={{ fontWeight:700, fontSize:14, color:"var(--text)" }}>Scan QR Code</span>
          </div>
          <div style={{ background:"var(--surface)", borderRadius:12, padding:"20px", border:"1px solid #bbf7d0", textAlign:"center", marginBottom:16 }}>
            {upiId ? (
              <>
                <QRCodeDisplay upiId={upiId} amount={amount} workerName={workerProfile?.name || "Worker"} bookingId={booking.id} />
                <div style={{ marginTop:12, fontSize:13, color:"var(--primary)", fontWeight:700 }}>UPI: {upiId}</div>
                <div style={{ fontSize:12, color:"var(--muted)", marginTop:4 }}>Amount: ₹{amount.toLocaleString()}</div>
                <div style={{ marginTop:12, textAlign:"left" }}>
                  <label style={{ fontSize:12, fontWeight:700, color:"var(--text)", display:"block", marginBottom:4 }}>UPI Transaction / UTR No. (optional)</label>
                  <input
                    value={utr}
                    onChange={e => setUtr(e.target.value)}
                    placeholder="e.g. 123456789012"
                    style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:"1.5px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontSize:13, fontFamily:"inherit", boxSizing:"border-box" }}
                  />
                </div>
              </>
            ) : (
              <div style={{ padding:"24px 0", color:"var(--muted)" }}>
                <div style={{ fontSize:24, marginBottom:8 }}>📵</div>
                <div>Worker hasn't added UPI details yet</div>
              </div>
            )}
          </div>
          <button disabled={busy} onClick={() => onUserConfirm("upi", utr)}
            style={{ width:"100%", padding:"14px", background:busy ? "var(--green-soft)" : "linear-gradient(135deg,#2563eb,#3b82f6)", color:"white", border:"none", borderRadius:12, fontWeight:800, fontSize:14, cursor:busy ? "not-allowed" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:busy ? "none" : "0 6px 20px rgba(37,99,235,.4)" }}
          >
            {busy ? t("common.updating") : t("bookingCard.confirm")}
          </button>
        </div>
      )}

      {payMode === "cash" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <button onClick={() => setPayMode(null)} style={{ background:"none", border:"1px solid #e2e8f0", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontSize:12, color:"var(--muted)", fontFamily:"inherit" }}>← Back</button>
            <span style={{ fontWeight:700, fontSize:14, color:"var(--text)" }}>Cash Payment</span>
          </div>
          <div style={{ background:"var(--surface)", borderRadius:12, padding:"20px", border:"1px solid #bbf7d0", marginBottom:16 }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:8 }}>💵</div>
              <div style={{ fontSize:24, fontWeight:900, color:"var(--text)" }}>₹{amount.toLocaleString()}</div>
              <div style={{ fontSize:13, color:"var(--muted)", marginTop:4 }}>Pay this amount in cash to the worker</div>
            </div>
          </div>
          <button disabled={busy} onClick={() => onUserConfirm("cash")}
            style={{ width:"100%", padding:"14px", background:busy ? "var(--green-soft)" : "linear-gradient(135deg,#2563eb,#3b82f6)", color:"white", border:"none", borderRadius:12, fontWeight:800, fontSize:14, cursor:busy ? "not-allowed" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:busy ? "none" : "0 6px 20px rgba(37,99,235,.4)" }}
          >
            {busy ? t("common.updating") : t("bookingCard.confirm")}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main BookingCard ──────────────────────────────────────────────────── */
export default function BookingCard({
  booking,
  role,
  onStatusChange,
  onConfirm,
  onDelete,
  onChat,
  onNavigate,
  workerProfile,
  categories = [],
  onRated,
  onToast,
}) {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const sm = getStatusMeta(booking.status, t);

  // Bilingual display name for the *other* party on this booking — built
  // from the bilingual name snapshot captured when the booking was created
  // (falls back to the legacy single-language snapshot for older bookings).
  const otherPartyDisplayName = role === "worker"
    ? getLocalizedName({ name: booking.userName,   nameEn: booking.userNameEn   }, i18n.language)
    : getLocalizedName({ name: booking.workerName, nameEn: booking.workerNameEn }, i18n.language);

  const act = async (fn) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  const fmtDate = (d) => {
    try { return new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }); }
    catch { return d; }
  };

  const handleStartWork = () => act(() => onStatusChange(booking.id, "in_progress"));

  // Called when user selects a payment method in the modal
  const handlePaymentConfirm = async (paymentMode, customerPaymentRef) => {
    await act(async () => {
      // Step 1 — mark booking as completed (stops timer, records payment_mode note)
      await onStatusChange(booking.id, "completed", `payment_mode:${paymentMode}`);
      // Step 2 — confirm with paymentMode (triggers commission/payment processing)
      if (onConfirm) await onConfirm(booking.id, paymentMode, customerPaymentRef);
    });
    setShowPaymentModal(false);
  };

  // Payment confirm for bookings already in "completed" state (payment screen inside card)
  const handleInCardConfirm = (paymentMode, customerPaymentRef) => act(() => onConfirm && onConfirm(booking.id, paymentMode, customerPaymentRef));

  // Only show the in-card payment screen when booking is already in "completed" state (user role)
  const showPaymentScreen = role === "user" && booking.status === "completed";

  return (
    <>
      {/* Payment method selection modal (shown when user clicks Complete on in_progress booking) */}
      {showPaymentModal && (
        <PaymentMethodModal
          booking={booking}
          workerProfile={workerProfile}
          busy={busy}
          onConfirm={handlePaymentConfirm}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}

      <div
        className="card"
        style={{
          padding:0, marginBottom:16, overflow:"hidden",
          border:`1.5px solid ${sm.border}`,
          borderLeft:`4px solid ${sm.color}`,
          transition:"box-shadow .2s, transform .2s",
          borderRadius:14,
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow="0 8px 32px rgba(0,0,0,.1)"; e.currentTarget.style.transform="translateY(-1px)"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow=""; e.currentTarget.style.transform=""; }}
      >
        {/* ── Card Header ── */}
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${sm.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
            <div>
              <div style={{ fontFamily:"'Manrope',sans-serif", fontWeight:700, fontSize:15, color:"var(--text)", marginBottom:3 }}>
                {otherPartyDisplayName}
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                <span style={{ fontSize:12, color:"var(--muted)", display:"flex", alignItems:"center", gap:4 }}>
                  <Icon name="calendar" size={11} color="var(--muted)" /> {fmtDate(booking.date)}
                </span>
                {booking.category && (
                  <CategoryChip
                    name={booking.category}
                    icon={categories.find(c => c.name === booking.category)?.icon}
                    size={11}
                    bg="#eff6ff" border="#bfdbfe" color="#1d4ed8"
                  />
                )}
                {booking.duration > 0 && (
                  <span style={{ background:"#f5f3ff", border:"1px solid #ddd6fe", color:"#7c3aed", fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>
                    ⏱ {booking.duration}h
                  </span>
                )}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
              <span style={{ background:sm.bg, border:`1px solid ${sm.border}`, color:sm.color, fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:20, display:"flex", alignItems:"center", gap:5, fontFamily:"'Manrope',sans-serif" }}>
                <Icon name={sm.icon} size={11} color={sm.color} /> {sm.label}
              </span>
              {booking.cost > 0 && (
                <div style={{ fontWeight:900, fontSize:18, color:"var(--primary)", fontFamily:"'Manrope',sans-serif" }}>
                  ₹{booking.cost.toLocaleString()}
                </div>
              )}
              {booking.distanceCost > 0 && (
                <div style={{ fontSize:11, color:"#92400e", fontWeight:600, background:"#fffbeb", border:"1px solid #fde68a", padding:"2px 8px", borderRadius:20 }}>
                  🚗 +₹{booking.distanceCost} travel
                </div>
              )}
            </div>
          </div>
          {booking.notes && (
            <div style={{ marginTop:10, fontSize:12, color:"var(--muted)", fontStyle:"italic", background:"var(--bg)", padding:"8px 12px", borderRadius:8 }}>
              "{booking.notes.length > 100 ? booking.notes.slice(0, 100) + "…" : booking.notes}"
            </div>
          )}
        </div>

        {/* ── Timer (in_progress only) ── */}
        {booking.status === "in_progress" && (
          <div style={{ padding:"16px 20px 0" }}>
            <WorkTimer
              startedAt={booking.workStartedAt || booking.updatedAt}
              durationHours={booking.duration || 1}
            />
          </div>
        )}

        {/* ── Payment screen (user, completed state — awaiting confirm) ── */}
        {showPaymentScreen && (
          <div style={{ padding:"16px 20px 0" }}>
            <PaymentScreen
              booking={booking}
              workerProfile={workerProfile}
              busy={busy}
              onUserConfirm={(mode, ref) => handleInCardConfirm(mode, ref)}
            />
          </div>
        )}

        {/* ── Cost breakdown (confirmed, worker/admin) ── */}
        {booking.status === "confirmed" && ["worker","admin"].includes(role) && booking.splitDetails && (
          <div style={{ margin:"0 20px 0", padding:"12px 16px", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:10 }}>
            <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:800, color:"#15803d", letterSpacing:".04em" }}>PAYMENT BREAKDOWN</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
              {[
                ["① Service",  `₹${(booking.serviceCost || 0).toLocaleString()}`],
                booking.distanceCost > 0 ? ["② Distance", `₹${(booking.distanceCost || 0).toLocaleString()}`] : null,
                ["③ Platform", `₹${(booking.adminCommission || 0).toLocaleString()}`],
              ].filter(Boolean).map(([l, v]) => (
                <div key={l} style={{ background:"white", borderRadius:7, padding:"8px 10px", border:"1px solid #d1fae5" }}>
                  <div style={{ fontSize:10, color:"var(--muted)", fontWeight:700 }}>{l}</div>
                  <div style={{ fontSize:14, fontWeight:800, color:"var(--text)" }}>{v}</div>
                </div>
              ))}
            </div>
            <p style={{ margin:"8px 0 0", fontSize:11, color:"#15803d", fontWeight:600 }}>
              Worker received: ₹{(booking.workerPayout || 0).toLocaleString()} · Txn: {booking.transactionId || "—"}
            </p>
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div style={{ padding:"12px 20px 16px", display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>

          {/* WORKER: pending → accept / reject */}
          {role === "worker" && booking.status === "pending" && (
            <>
              <button disabled={busy} onClick={() => act(() => onStatusChange(booking.id, "accepted"))}
                style={{ padding:"8px 18px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#2563eb,#60a5fa)", color:"white", fontSize:12, fontWeight:700, cursor:busy ? "not-allowed" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, opacity:busy ? 0.7 : 1, boxShadow:"0 3px 10px rgba(37,99,235,.3)" }}>
                <Icon name="check" size={12} color="white" /> {t("bookingCard.accept")}
              </button>
              <button disabled={busy} onClick={() => act(() => onStatusChange(booking.id, "rejected"))}
                style={{ padding:"8px 18px", borderRadius:9, border:"1.5px solid #fecaca", background:"#fef2f2", color:"#dc2626", fontSize:12, fontWeight:700, cursor:busy ? "not-allowed" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, opacity:busy ? 0.7 : 1 }}>
                <Icon name="x" size={12} color="#dc2626" /> {t("bookingCard.reject")}
              </button>
            </>
          )}

          {/* WORKER: accepted → start job */}
          {role === "worker" && booking.status === "accepted" && (
            <button disabled={busy} onClick={handleStartWork}
              style={{ padding:"8px 18px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#7c3aed,#a78bfa)", color:"white", fontSize:12, fontWeight:700, cursor:busy ? "not-allowed" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, opacity:busy ? 0.7 : 1, boxShadow:"0 3px 10px rgba(124,58,237,.3)" }}>
              <span>▶</span> {t("bookingCard.start")}
            </button>
          )}

          {/* WORKER: cancel accepted booking */}
          {role === "worker" && booking.status === "accepted" && (
            <button disabled={busy} onClick={() => {
              if (window.confirm("Cancel this accepted booking? The user will be notified."))
                act(() => onStatusChange(booking.id, "rejected", "Cancelled by worker after acceptance"));
            }}
              style={{ padding:"8px 14px", borderRadius:9, border:"1.5px solid #fecaca", background:"#fef2f2", color:"#dc2626", fontSize:12, fontWeight:700, cursor:busy ? "not-allowed" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, opacity:busy ? 0.7 : 1 }}>
              <Icon name="x" size={12} color="#dc2626" /> {t("common.cancel")}
            </button>
          )}

          {/* WORKER: in_progress — Worker does not have a Complete button. Only the User completes the job. */}

          {/* WORKER: chat + navigate + call */}
          {role === "worker" && ["accepted","in_progress"].includes(booking.status) && onChat && (
            <button onClick={() => onChat(booking)}
              style={{ padding:"8px 14px", borderRadius:9, border:"1.5px solid #bfdbfe", background:"#eff6ff", color:"#1d4ed8", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
              <Icon name="message-circle" size={12} color="#1d4ed8" /> {t("bookingCard.chat")}
            </button>
          )}
          {role === "worker" && ["accepted","in_progress"].includes(booking.status) && onNavigate && (booking.userLat || booking.userAddress) && (
            <button onClick={() => onNavigate(booking)}
              style={{ padding:"8px 14px", borderRadius:9, border:"1.5px solid var(--primary-border)", background:"var(--primary-bg)", color:"var(--primary-dark)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
              <Icon name="map-pin" size={12} color="var(--primary)" /> {t("bookingCard.navigate")}
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
              <Icon name="message-circle" size={12} color="#1d4ed8" /> {t("bookingCard.chat")}
            </button>
          )}

          {/* USER: Complete button — opens payment method selection modal */}
          {role === "user" && booking.status === "in_progress" && (
            <button
              disabled={busy}
              onClick={() => setShowPaymentModal(true)}
              style={{ padding:"8px 18px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#16a34a,#22c55e)", color:"white", fontSize:12, fontWeight:700, cursor:busy ? "not-allowed" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, opacity:busy ? 0.7 : 1, boxShadow:"0 3px 10px rgba(22,163,74,.30)" }}
            >
              <Icon name="check-circle" size={12} color="white" /> {t("bookingCard.complete")}
            </button>
          )}

          {/* USER: cancel accepted booking (before work starts) */}
          {role === "user" && booking.status === "accepted" && (
            <button disabled={busy} onClick={() => {
              if (window.confirm("Cancel this booking? The worker will be notified."))
                act(() => onStatusChange(booking.id, "rejected", "Cancelled by user after acceptance"));
            }}
              style={{ padding:"8px 14px", borderRadius:9, border:"1.5px solid #fecaca", background:"#fef2f2", color:"#dc2626", fontSize:12, fontWeight:700, cursor:busy ? "not-allowed" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, opacity:busy ? 0.7 : 1 }}>
              <Icon name="x" size={12} color="#dc2626" /> {t("common.cancel")}
            </button>
          )}

          {/* USER: confirmed status badge */}
          {role === "user" && booking.status === "confirmed" && (
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", background:"#f0fdf4", border:"1.5px solid #86efac", borderRadius:9 }}>
              <span style={{ fontSize:14 }}>✅</span>
              <div>
                <span style={{ fontSize:12, fontWeight:700, color:"var(--primary)" }}>Payment Confirmed</span>
                {booking.paymentMode && booking.paymentMode !== "pending" && (
                  <span style={{ fontSize:11, color:"var(--muted)", marginLeft:6 }}>
                    via {booking.paymentMode === "upi" ? "UPI" : "Cash"}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* USER: delete booking (pending, rejected, confirmed) */}
          {role === "user" && ["pending","rejected","confirmed"].includes(booking.status) && onDelete && (
            <button
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Delete this ${booking.status} booking?\n\nBooking: ${booking.category || "Service"} with ${booking.workerName}\nDate: ${booking.date}\n\nThis action cannot be undone.`))
                  act(() => onDelete(booking.id));
              }}
              style={{ padding:"8px 14px", borderRadius:9, border:"1.5px solid #fecaca", background:"#fef2f2", color:"#dc2626", fontSize:12, fontWeight:700, cursor:busy ? "not-allowed" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, opacity:busy ? 0.7 : 1, transition:"all .15s" }}
            >
              <Icon name="trash" size={12} color="#dc2626" /> Delete Booking
            </button>
          )}

          {/* WORKER: delete booking (rejected or confirmed) */}
          {role === "worker" && ["rejected","confirmed"].includes(booking.status) && onDelete && (
            <button onClick={() => { if (window.confirm("Delete this booking record?")) onDelete(booking.id); }}
              style={{ padding:"8px 14px", borderRadius:9, border:"1.5px solid #fecaca", background:"#fef2f2", color:"#dc2626", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
              <Icon name="trash" size={12} color="#dc2626" /> Delete
            </button>
          )}

          {/* ADMIN: delete */}
          {role === "admin" && onDelete && (
            <button onClick={() => onDelete(booking.id)}
              style={{ padding:"8px 14px", borderRadius:9, border:"1.5px solid #fecaca", background:"#fef2f2", color:"#dc2626", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
              <Icon name="trash" size={12} color="#dc2626" /> Delete
            </button>
          )}

          {/* Booking ID */}
          <span style={{ marginLeft:"auto", fontSize:11, color:"var(--muted-light)", alignSelf:"center", fontFamily:"monospace" }}>
            #{String(booking.id || "").slice(-6)}
          </span>
        </div>

        {/* ── Rating Section (user, confirmed booking) ── */}
        {role === "user" && booking.status === "confirmed" && booking.paymentStatus === "paid" && (
          <div style={{ padding: "0 20px 20px" }}>
            <div style={{ height: 1, background: "var(--border)", marginBottom: 16 }} />
            <RatingSubmitForm
              booking={booking}
              onRated={onRated}
              onToast={onToast}
            />
          </div>
        )}
      </div>
    </>
  );
}
