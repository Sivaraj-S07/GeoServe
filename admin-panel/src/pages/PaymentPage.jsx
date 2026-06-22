import { useTranslation } from "react-i18next";
/**
 * PaymentPage.jsx — GeoServe v5.2
 *
 * NEW: Settings tab now has a full "Commission Payout Account" form.
 *      Admin can set name, bank account number, IFSC, bank name, UPI ID
 *      and phone. This account is stored in adminWallet.json and is
 *      attached to every commission credit and withdrawal for audit trail.
 *      UPI ID shows a live QR code preview.
 */
import { useState, useEffect, useCallback } from "react";
import * as api from "../api";

const fmt = (n) => `₹${Number(n||0).toLocaleString("en-IN", { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:16, padding:"20px 24px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:color }} />
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>{label}</div>
          <div style={{ fontSize:28, fontWeight:900, color:"var(--text)", letterSpacing:-1 }}>{value}</div>
          {sub && <div style={{ fontSize:12, color:"var(--muted)", marginTop:4 }}>{sub}</div>}
        </div>
        <div style={{ fontSize:28, opacity:.18 }}>{icon}</div>
      </div>
    </div>
  );
}

function TxnBadge({ status, type }) {
  if (type === "withdrawal") return <span style={{ padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700, color:"#dc2626", background:"#fee2e2" }}>WITHDRAWAL</span>;
  const map = { credited:["var(--primary)","var(--green-soft)"], skipped:["#9ca3af","#f3f4f6"], pending_retry:["#d97706","#fef3c7"] };
  const [color, bg] = map[status] || ["#6b7280","#f9fafb"];
  return <span style={{ padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700, color, background:bg }}>{(status||"").replace("_"," ").toUpperCase()}</span>;
}

// ── Payout Account Form ───────────────────────────────────────────────────────
function PayoutAccountSection({ onToast }) {
  const { t } = useTranslation();
  const [form, setForm]     = useState({ name:"", accountNumber:"", ifscCode:"", bankName:"", upiId:"", phone:"" });
  const [saved, setSaved]   = useState(null);   // currently saved account
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPayoutAccount()
      .then(res => {
        const acct = res?.payoutAccount || null;
        setSaved(acct);
        if (acct) setForm({
          name:          acct.name          || "",
          accountNumber: acct.accountNumber || "",
          ifscCode:      acct.ifscCode      || "",
          bankName:      acct.bankName      || "",
          upiId:         acct.upiId         || "",
          phone:         acct.phone         || "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.accountNumber && !form.upiId && !form.phone) {
      onToast("Enter at least one of: Account Number, UPI ID, or Phone", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await api.updatePayoutAccount(form);
      setSaved(res.payoutAccount);
      onToast(t("workerDashboard.payoutAccountSaved"), "success");
    } catch (e) {
      onToast(e.message || "Failed to save payout account", "error");
    } finally { setSaving(false); }
  };

  const field = (key, label, placeholder, icon, opts = {}) => (
    <div key={key}>
      <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--muted)", marginBottom:6 }}>
        {icon} {label}
      </label>
      <input
        type={opts.type || "text"}
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: opts.upper ? e.target.value.toUpperCase() : e.target.value }))}
        placeholder={placeholder}
        style={{ width:"100%", padding:"10px 13px", border:"1.5px solid var(--border)", borderRadius:10,
          fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box",
          background:"var(--bg)", color:"var(--text)", letterSpacing: opts.mono ? ".04em" : "normal" }}
        onFocus={e => { e.target.style.borderColor="var(--primary)"; e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,.1)"; }}
        onBlur={e => { e.target.style.borderColor="var(--border)"; e.target.style.boxShadow="none"; }}
      />
    </div>
  );

  const qrData = form.upiId
    ? `upi://pay?pa=${encodeURIComponent(form.upiId)}&pn=${encodeURIComponent(form.name||"GeoServe Admin")}&cu=INR`
    : null;

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, alignItems:"start" }}>

      {/* Form column */}
      <div style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:16, padding:28 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:"#eef2ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🏦</div>
          <div>
            <h3 style={{ margin:0, fontWeight:800, fontSize:16 }}>Commission Payout Account</h3>
            <p style={{ margin:"2px 0 0", fontSize:12, color:"var(--muted)" }}>All commission earnings are credited here</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:32, color:"var(--muted)" }}>Loading…</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {field("name",          t("workerDashboard.accountHolderName"),  "Full name as on bank account", "👤")}
            {field("bankName",      t("workerDashboard.bankName"),            "e.g. State Bank of India",     "🏦")}
            {field("accountNumber", t("workerDashboard.accountNumber"),       "10–18 digit account number",   "🔢", { mono:true })}
            {field("ifscCode",      "IFSC Code",            "e.g. SBIN0001234",             "🏷️", { upper:true, mono:true })}
            {field("upiId",         "UPI ID",               "e.g. admin@upi or 9876543210@paytm", "📱")}
            {field("phone",         "Phone / UPI Number",   "Registered mobile number",     "📞", { type:"tel" })}

            <button
              onClick={handleSave} disabled={saving}
              style={{ marginTop:4, padding:"12px", borderRadius:11, border:"none",
                background: saving ? "var(--green-border)" : "linear-gradient(135deg,#2563eb,#3b82f6)",
                color:"white", fontSize:14, fontWeight:800, cursor: saving ? "not-allowed" : "pointer",
                fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                boxShadow: saving ? "none" : "0 6px 20px rgba(37,99,235,.35)" }}
            >
              {saving ? t("common.saving") : t("workerDashboard.savePayoutAccount")}
            </button>
          </div>
        )}
      </div>

      {/* Preview column */}
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

        {/* Current saved account card */}
        <div style={{ background:"var(--surface)", border: saved ? "1.5px solid var(--primary-border)" : "1.5px solid var(--border)", borderRadius:16, padding:24 }}>
          <div style={{ fontWeight:800, fontSize:14, marginBottom:14, color: saved ? "var(--primary)" : "var(--muted)" }}>
            {saved ? "✅ Active Payout Account" : "⚠️ No Payout Account Set"}
          </div>
          {saved ? (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                ["Holder",   saved.name],
                ["Bank",     saved.bankName],
                ["Account",  saved.accountNumber ? "****" + saved.accountNumber.slice(-4) : null],
                ["IFSC",     saved.ifscCode],
                ["UPI ID",   saved.upiId],
                ["Phone",    saved.phone],
              ].filter(([,v]) => v).map(([label, value]) => (
                <div key={label} style={{ display:"flex", gap:10 }}>
                  <span style={{ fontSize:12, color:"var(--muted)", minWidth:64, flexShrink:0 }}>{label}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"var(--text)", wordBreak:"break-all" }}>{value}</span>
                </div>
              ))}
              {saved.updatedAt && (
                <div style={{ fontSize:11, color:"var(--muted)", marginTop:4, paddingTop:8, borderTop:"1px solid var(--border)" }}>
                  Last updated: {fmtDate(saved.updatedAt)}
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize:13, color:"var(--muted)", margin:0, lineHeight:1.6 }}>
              Commission earnings are being tracked in the wallet but no payout account is configured.
              Fill in the form to set where funds are sent.
            </p>
          )}
        </div>

        {/* Live UPI QR preview */}
        {(form.upiId || saved?.upiId) && (
          <div style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:16, padding:24, textAlign:"center" }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:14, color:"var(--text)" }}>📱 UPI QR Code Preview</div>
            <div style={{ display:"inline-block", padding:12, background:"white", borderRadius:12, border:"2px solid #e2e8f0", boxShadow:"0 4px 20px rgba(0,0,0,.08)" }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrData || `upi://pay?pa=${encodeURIComponent(saved?.upiId||"")}&pn=GeoServe&cu=INR`)}`}
                alt="UPI QR" width={140} height={140}
                style={{ display:"block", borderRadius:6 }}
              />
            </div>
            <div style={{ fontSize:12, color:"var(--muted)", marginTop:10 }}>
              {form.upiId || saved?.upiId}
            </div>
          </div>
        )}

        {/* How it works info */}
        <div style={{ background:"#fffbeb", border:"1.5px solid #fde68a", borderRadius:16, padding:20 }}>
          <div style={{ fontWeight:800, fontSize:13, color:"#92400e", marginBottom:10 }}>💡 How Commission Payouts Work</div>
          <div style={{ fontSize:12, color:"#78350f", lineHeight:1.7 }}>
            <div>• Every confirmed booking → <strong>5% commission</strong> credited to admin wallet</div>
            <div>• Commission is tracked in real-time in the wallet balance</div>
            <div>• Use the <strong>Withdraw</strong> button to record a payout from this balance</div>
            <div>• The account set here is recorded on every transaction for audit</div>
            <div>• With Razorpay keys set, live payouts are sent automatically via IMPS</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main PaymentPage ──────────────────────────────────────────────────────────
export default function PaymentPage({ onToast }) {
  const { t } = useTranslation();
  const [wallet,   setWallet]   = useState(null);
  const [summary,  setSummary]  = useState(null);
  const [txns,     setTxns]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [txnPage,  setTxnPage]  = useState(1);
  const [txnTotal, setTxnTotal] = useState(0);
  const [filter,   setFilter]   = useState("all");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [wAmount,  setWAmount]  = useState("");
  const [wNote,    setWNote]    = useState("");
  const [wBusy,    setWBusy]    = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [w, s] = await Promise.all([api.getCommissionWallet(), api.getCommissionSummary()]);
      setWallet(w); setSummary(s);
    } catch (e) {
      if (!silent) onToast(e.message || "Failed to load payment data", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [onToast]);

  const loadTxns = useCallback(async () => {
    try {
      const res = await api.getTransactions();
      let all = res.transactions || [];
      if (filter !== "all") all = all.filter(t => t.type === filter);
      setTxnTotal(all.length);
      setTxns(all.slice((txnPage-1)*15, txnPage*15));
    } catch (e) { onToast(e.message || "Failed to load transactions", "error"); }
  }, [filter, txnPage, onToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (activeTab === "transactions") loadTxns(); }, [activeTab, loadTxns]);

  const handleWithdraw = async () => {
    const amt = Number(wAmount);
    if (!amt || amt <= 0) { onToast("Enter a valid amount", "error"); return; }
    if (amt > (wallet?.balance || 0)) { onToast("Amount exceeds available balance", "error"); return; }
    setWBusy(true);
    try {
      await api.withdraw(amt, wNote || "Manual withdrawal");
      onToast(`₹${amt.toLocaleString("en-IN")} withdrawn successfully`, "success");
      setShowWithdraw(false); setWAmount(""); setWNote("");
      load(true);
    } catch (e) { onToast(e.message || "Withdrawal failed", "error"); }
    finally { setWBusy(false); }
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh", flexDirection:"column", gap:16 }}>
      <div style={{ width:44, height:44, border:"3px solid var(--border)", borderTopColor:"var(--primary)", borderRadius:"50%", animation:"spin .7s linear infinite" }} />
      <p style={{ color:"var(--muted)", fontWeight:600 }}>Loading payment data…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const monthly  = summary?.monthly || [];
  const maxMonth = Math.max(...monthly.map(m => m.amount), 1);

  const TABS = ["overview","transactions","settings"];
  const TAB_LABELS = { overview:"📊 Overview", transactions:"📋 Transactions", settings:"⚙️ Payout Account" };

  return (
    <div className="anim-fade" style={{ padding:"28px 32px" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:"var(--text)", margin:0 }}>💳 Payment & Commission</h1>
          <p style={{ color:"var(--muted)", margin:"4px 0 0", fontSize:13 }}>
            Platform earns <strong style={{color:"var(--primary)"}}>5%</strong> on every confirmed booking ·{" "}
            {wallet?.payoutAccount?.upiId || wallet?.payoutAccount?.accountNumber
              ? <span style={{color:"var(--primary)"}}>✅ Payout account configured</span>
              : <span style={{color:"#d97706"}}>⚠️ No payout account set</span>}
          </p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => setActiveTab("settings")}
            style={{ padding:"10px 18px", background:"transparent", color:"var(--primary)", border:"1.5px solid var(--primary)", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}>
            ⚙️ Set Payout Account
          </button>
          <button onClick={() => setShowWithdraw(true)}
            style={{ padding:"10px 22px", background:"var(--primary)", color:"white", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer" }}>
            💸 Withdraw
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:28 }}>
        <StatCard label="Wallet Balance"    value={fmt(wallet?.balance)}        icon="💰" color="linear-gradient(90deg,var(--primary),#8b5cf6)" sub="Available to withdraw" />
        <StatCard label="Total Earned"      value={fmt(wallet?.totalEarned)}    icon="📈" color="linear-gradient(90deg,var(--primary),var(--green))" sub={`${wallet?.totalBookings||0} bookings`} />
        <StatCard label="Today's Earnings"  value={fmt(wallet?.todayEarnings)}  icon="🌅" color="linear-gradient(90deg,#f59e0b,#fbbf24)" />
        <StatCard label="This Month"        value={fmt(wallet?.monthEarnings)}  icon="📅" color="linear-gradient(90deg,var(--blue),#60a5fa)" />
        <StatCard label="Total Withdrawn"   value={fmt(wallet?.totalWithdrawn)} icon="🏦" color="linear-gradient(90deg,#ef4444,#f87171)" />
        <StatCard label="Commission Rate"   value="5.00%"                       icon="%" color="linear-gradient(90deg,#8b5cf6,#c084fc)" sub="Per confirmed booking" />
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:20, borderBottom:"2px solid var(--border)" }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding:"9px 20px", border:"none", borderRadius:"8px 8px 0 0", cursor:"pointer",
            fontWeight:600, fontSize:13,
            background: activeTab===tab ? "var(--primary)" : "transparent",
            color:      activeTab===tab ? "white" : "var(--muted)",
            marginBottom: activeTab===tab ? -2 : 0,
            borderBottom: activeTab===tab ? "2px solid var(--primary)" : "none",
          }}>
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <div style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:16, padding:24, gridColumn:"1/-1" }}>
            <h3 style={{ margin:"0 0 20px", fontWeight:700, fontSize:15 }}>📊 Monthly Commission Earnings</h3>
            {monthly.length === 0 ? (
              <p style={{ color:"var(--muted)", textAlign:"center", padding:"40px 0" }}>No earnings yet. Commissions appear after bookings are confirmed.</p>
            ) : (
              <div style={{ display:"flex", alignItems:"flex-end", gap:12, height:160, padding:"0 8px" }}>
                {[...monthly].reverse().map(({ month, amount }) => (
                  <div key={month} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"var(--primary)" }}>₹{amount>0?Math.round(amount).toLocaleString("en-IN"):"0"}</div>
                    <div style={{ width:"100%", borderRadius:"6px 6px 0 0",
                      height: `${Math.max(4, (amount/maxMonth)*130)}px`,
                      background:"linear-gradient(180deg,var(--primary),#8b5cf6)", transition:"height .4s ease" }} />
                    <div style={{ fontSize:10, color:"var(--muted)", fontWeight:600, whiteSpace:"nowrap" }}>
                      {new Date(month+"-01").toLocaleString("en-IN",{month:"short",year:"2-digit"})}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:16, padding:24 }}>
            <h3 style={{ margin:"0 0 16px", fontWeight:700, fontSize:15 }}>🏆 Top Earning Categories</h3>
            {(summary?.topCategories||[]).length === 0
              ? <p style={{ color:"var(--muted)", fontSize:13 }}>No data yet</p>
              : (summary?.topCategories||[]).map((c,i) => (
                <div key={c.category} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid var(--border-light)" }}>
                  <div style={{ width:26, height:26, borderRadius:8, background:`hsl(${i*60},70%,60%)`, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800, fontSize:12 }}>{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:13 }}>{c.category}</div>
                    <div style={{ fontSize:11, color:"var(--muted)" }}>{c.count} booking{c.count!==1?"s":""}</div>
                  </div>
                  <div style={{ fontWeight:800, color:"var(--primary)", fontSize:14 }}>{fmt(c.total)}</div>
                </div>
              ))}
          </div>

          <div style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:16, padding:24 }}>
            <h3 style={{ margin:"0 0 16px", fontWeight:700, fontSize:15 }}>🕐 Recent Transactions</h3>
            {(summary?.recentTransactions||[]).length === 0
              ? <p style={{ color:"var(--muted)", fontSize:13 }}>No transactions yet</p>
              : (summary?.recentTransactions||[]).map(t => (
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid var(--border-light)" }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:"#eef0ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>💸</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.note || t.category}</div>
                    <div style={{ fontSize:11, color:"var(--muted)" }}>{fmtDate(t.createdAt)}</div>
                  </div>
                  <div style={{ fontWeight:800, color:"var(--primary)", fontSize:13 }}>+{fmt(t.amount)}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TRANSACTIONS */}
      {activeTab === "transactions" && (
        <div style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1.5px solid var(--border)", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <span style={{ fontWeight:700, fontSize:13, marginRight:8 }}>Filter:</span>
            {["all","commission","withdrawal"].map(f => (
              <button key={f} onClick={() => { setFilter(f); setTxnPage(1); }} style={{
                padding:"5px 14px", borderRadius:20, border:"1.5px solid", cursor:"pointer", fontSize:12, fontWeight:600,
                background: filter===f ? "var(--primary)" : "transparent",
                color:      filter===f ? "white" : "var(--primary)", borderColor:"var(--primary)",
              }}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
            <span style={{ marginLeft:"auto", fontSize:12, color:"var(--muted)" }}>{txnTotal} records</span>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"var(--bg)", fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".06em" }}>
                  {["Transaction ID","Type","Booking","Worker/Note","Amount","Status","Date"].map(h => (
                    <th key={h} style={{ padding:"10px 14px", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.length === 0
                  ? <tr><td colSpan={7} style={{ padding:40, textAlign:"center", color:"var(--muted)" }}>No transactions found</td></tr>
                  : txns.map((t,i) => (
                    <tr key={t.id} style={{ borderTop:"1px solid var(--border-light)", background:i%2===0?"transparent":"rgba(0,0,0,.01)" }}>
                      <td style={{ padding:"10px 14px", fontFamily:"monospace", fontSize:11, color:"var(--muted)" }}>{(t.id||"").slice(0,18)}…</td>
                      <td style={{ padding:"10px 14px" }}>
                        <span style={{ padding:"2px 8px", borderRadius:12, fontSize:11, fontWeight:700,
                          background: t.type==="withdrawal"?"#fee2e2":"#eef0ff",
                          color:      t.type==="withdrawal"?"#dc2626":"var(--primary)" }}>
                          {t.type==="withdrawal"?"↑ Withdrawal":"↓ Commission"}
                        </span>
                      </td>
                      <td style={{ padding:"10px 14px", color:"var(--text)", fontWeight:600 }}>#{t.bookingId||"—"}</td>
                      <td style={{ padding:"10px 14px", color:"var(--text)" }}>{t.workerName||t.note||"—"}</td>
                      <td style={{ padding:"10px 14px", fontWeight:800, color:t.amount<0?"#dc2626":"var(--primary)" }}>
                        {t.amount<0?"−":"+"}₹{Math.abs(t.amount).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding:"10px 14px" }}><TxnBadge status={t.status} type={t.type} /></td>
                      <td style={{ padding:"10px 14px", color:"var(--muted)", whiteSpace:"nowrap", fontSize:12 }}>{fmtDate(t.createdAt)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {txnTotal > 15 && (
            <div style={{ padding:"14px 20px", borderTop:"1.5px solid var(--border)", display:"flex", gap:8, alignItems:"center", justifyContent:"center" }}>
              <button onClick={() => setTxnPage(p=>Math.max(1,p-1))} disabled={txnPage===1}
                style={{ padding:"6px 14px", border:"1.5px solid var(--border)", borderRadius:8, cursor:"pointer", fontWeight:600, opacity:txnPage===1?.4:1 }}>← Prev</button>
              <span style={{ fontSize:13, fontWeight:600 }}>Page {txnPage} of {Math.ceil(txnTotal/15)}</span>
              <button onClick={() => setTxnPage(p=>p+1)} disabled={txnPage*15>=txnTotal}
                style={{ padding:"6px 14px", border:"1.5px solid var(--border)", borderRadius:8, cursor:"pointer", fontWeight:600, opacity:txnPage*15>=txnTotal?.4:1 }}>Next →</button>
            </div>
          )}
        </div>
      )}

      {/* PAYOUT ACCOUNT SETTINGS */}
      {activeTab === "settings" && <PayoutAccountSection onToast={onToast} />}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:"var(--surface)", borderRadius:20, padding:32, width:380, boxShadow:"0 24px 60px rgba(0,0,0,.3)" }}>
            <h3 style={{ margin:"0 0 8px", fontWeight:800, fontSize:18 }}>💸 Withdraw Funds</h3>
            <p style={{ margin:"0 0 20px", fontSize:13, color:"var(--muted)" }}>
              Available: <strong style={{color:"var(--green)"}}>{fmt(wallet?.balance)}</strong>
              {wallet?.payoutAccount?.upiId && <> · To: <strong>{wallet.payoutAccount.upiId}</strong></>}
              {wallet?.payoutAccount?.accountNumber && !wallet?.payoutAccount?.upiId && <> · To: <strong>****{wallet.payoutAccount.accountNumber.slice(-4)}</strong></>}
            </p>
            <label style={{ display:"block", fontWeight:700, fontSize:13, marginBottom:6 }}>Amount (₹)</label>
            <input type="number" value={wAmount} onChange={e=>setWAmount(e.target.value)}
              placeholder="Enter amount" min="1" max={wallet?.balance||0}
              style={{ width:"100%", padding:"10px 12px", border:"1.5px solid var(--border)", borderRadius:10, fontSize:14,
                marginBottom:14, boxSizing:"border-box", background:"var(--bg)", color:"var(--text)" }} />
            <label style={{ display:"block", fontWeight:700, fontSize:13, marginBottom:6 }}>Note (optional)</label>
            <input type="text" value={wNote} onChange={e=>setWNote(e.target.value)} placeholder="Withdrawal reason"
              style={{ width:"100%", padding:"10px 12px", border:"1.5px solid var(--border)", borderRadius:10, fontSize:14,
                marginBottom:20, boxSizing:"border-box", background:"var(--bg)", color:"var(--text)" }} />
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setShowWithdraw(false)}
                style={{ flex:1, padding:"11px", border:"1.5px solid var(--border)", borderRadius:10, cursor:"pointer", fontWeight:700, background:"transparent", color:"var(--text)" }}>Cancel</button>
              <button onClick={handleWithdraw} disabled={wBusy}
                style={{ flex:1, padding:"11px", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, background:"var(--primary)", color:"white", opacity:wBusy?.6:1 }}>
                {wBusy ? "Processing…" : "Confirm Withdraw"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
