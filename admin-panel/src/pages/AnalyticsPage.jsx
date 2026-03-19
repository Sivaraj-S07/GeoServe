import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../api";

function fmt(n)    { return (n || 0).toLocaleString("en-IN"); }
function fmtRs(n)  { return `₹${fmt(n)}`; }
function pct(a, b) { return b ? ((a / b) * 100).toFixed(1) + "%" : "0%"; }

function StatCard({ label, value, sub, grad, bg, border, icon }) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 18, padding: "20px 22px", position: "relative", overflow: "hidden", transition: "all .2s", cursor: "default" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 10px 28px ${border}`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
      <div style={{ height: 3, background: grad, position: "absolute", top: 0, left: 0, right: 0, borderRadius: "18px 18px 0 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", letterSpacing: -1 }}>{value}</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", marginTop: 4 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{sub}</div>}
        </div>
        <div style={{ fontSize: 26, opacity: .75 }}>{icon}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>{title}</h2>
      {sub && <p style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

function BarChart({ data, valueKey, labelKey, colorGrad }) {
  if (!data?.length) return <EmptyState icon="📊" text="No data yet" />;
  const max = Math.max(...data.map(r => r[valueKey] || 0)) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((row, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 72, fontSize: 11, fontWeight: 700, color: "#64748b", textAlign: "right", flexShrink: 0 }}>{row[labelKey]}</div>
          <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 6, height: 20, overflow: "hidden" }}>
            <div style={{ width: `${(row[valueKey] / max) * 100}%`, height: "100%", background: colorGrad, borderRadius: 6, minWidth: 4, transition: "width .6s ease" }} />
          </div>
          <div style={{ width: 70, fontSize: 12, fontWeight: 700, color: "#0f172a", flexShrink: 0 }}>{fmtRs(row[valueKey])}</div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 24px", color: "#94a3b8" }}>
      <div style={{ fontSize: 36, marginBottom: 10, opacity: .5 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{text}</div>
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 18, boxShadow: "0 2px 10px rgba(0,0,0,.04)", ...style }}>{children}</div>;
}

function WithdrawModal({ balance, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount."); return; }
    if (amt > balance) { setError(`Amount exceeds available balance of ${fmtRs(balance)}.`); return; }
    setError(""); setLoading(true);
    try {
      const res = await api.withdraw(amt, note);
      onSuccess(res.newBalance, res.transaction);
    } catch (err) { setError(err.message || "Withdrawal failed."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "32px 36px", width: "100%", maxWidth: 420, boxShadow: "0 24px 60px rgba(0,0,0,.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", margin: 0 }}>Record Withdrawal</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#94a3b8" }}>×</button>
        </div>
        <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>Available: </span>
          <span style={{ fontSize: 16, fontWeight: 900, color: "#059669" }}>{fmtRs(balance)}</span>
        </div>
        {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 13, fontWeight: 600 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em" }}>Amount (₹)</label>
            <input type="number" min="1" max={balance} value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000" required
              style={{ width: "100%", height: 42, padding: "0 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 14 }} />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em" }}>Note (optional)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Monthly sweep"
              style={{ width: "100%", height: 42, padding: "0 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 14 }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, height: 42, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "white", color: "#475569", fontWeight: 700, fontFamily: "inherit", cursor: "pointer", fontSize: 14 }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 1, height: 42, borderRadius: 10, border: "none", background: loading ? "#a5b4fc" : "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "white", fontWeight: 800, fontFamily: "inherit", cursor: "pointer", fontSize: 14 }}>
              {loading ? "Processing…" : "Record Withdrawal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AnalyticsPage({ onToast }) {
  const [summary,   setSummary]   = useState(null);
  const [wallet,    setWallet]    = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [txns,      setTxns]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showWD,    setShowWD]    = useState(false);
  const [lastRefresh, setLR]      = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [sumData, walData, usrData, txnData] = await Promise.all([
        api.getCommissionSummary(),
        api.getWallet(),
        api.getUserStats(),
        api.getTransactions(),
      ]);
      setSummary(sumData);
      setWallet(walData);
      setUserStats(usrData);
      setTxns(txnData.transactions || []);
      setLR(new Date());
    } catch (err) {
      if (!silent) onToast(err.message || "Failed to load analytics", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 60_000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  const handleWithdrawSuccess = (newBalance, txn) => {
    setWallet(w => ({ ...w, balance: newBalance }));
    setTxns(prev => [txn, ...prev]);
    onToast(`Withdrawal of ${fmtRs(Math.abs(txn.amount))} recorded`);
    setShowWD(false);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64, gap: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #eef2ff", borderTopColor: "#4f46e5", animation: "spin .7s linear infinite" }} />
        <span style={{ color: "#64748b", fontWeight: 600 }}>Loading analytics…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const commRate = `${((summary?.commissionRate || 0.05) * 100).toFixed(0)}%`;
  const confirmed = summary?.confirmedBookingsCount || 0;
  const pendingRetry = summary?.pendingRetryCount || 0;
  const topCats = summary?.topCategories || [];
  const monthly = (summary?.monthly || []).slice().reverse();

  return (
    <div className="anim-fade">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-.5px", margin: 0 }}>Analytics</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 5 }}>
            Platform overview · {lastRefresh ? `Updated ${Math.floor((Date.now() - lastRefresh) / 1000)}s ago` : "Loading…"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => load()} style={{ display: "flex", alignItems: "center", gap: 6 }}>↻ Refresh</button>
          <button onClick={() => setShowWD(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 9, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#059669,#10b981)", color: "white", fontWeight: 700, fontSize: 13, fontFamily: "inherit", boxShadow: "0 3px 10px rgba(5,150,105,.3)" }}>
            💸 Record Withdrawal
          </button>
        </div>
      </div>

      {/* Revenue stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard label="Wallet Balance"    value={fmtRs(wallet?.balance)}           sub="Available to withdraw"             grad="linear-gradient(135deg,#059669,#10b981)" bg="#ecfdf5" border="#a7f3d0" icon="💰" />
        <StatCard label="Total Earned"      value={fmtRs(wallet?.totalEarned)}       sub={`Platform commission ${commRate}`} grad="linear-gradient(135deg,#4f46e5,#7c3aed)" bg="#eef2ff" border="#c7d2fe" icon="📈" />
        <StatCard label="Today's Revenue"   value={fmtRs(wallet?.todayEarnings)}     sub="Commission earned today"           grad="linear-gradient(135deg,#f59e0b,#d97706)" bg="#fffbeb" border="#fde68a" icon="🌅" />
        <StatCard label="This Month"        value={fmtRs(wallet?.monthEarnings)}     sub="Commission this month"             grad="linear-gradient(135deg,#2563eb,#3b82f6)" bg="#eff6ff" border="#bfdbfe" icon="📅" />
        <StatCard label="Confirmed Bookings" value={fmt(confirmed)}                  sub="Fully completed & paid"            grad="linear-gradient(135deg,#059669,#10b981)" bg="#ecfdf5" border="#a7f3d0" icon="✅" />
        <StatCard label="Total Bookings"    value={fmt(wallet?.totalBookings)}       sub="All time"                          grad="linear-gradient(135deg,#7c3aed,#a78bfa)" bg="#f5f3ff" border="#ddd6fe" icon="📋" />
      </div>

      {/* User stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Users"    value={fmt(userStats?.users)}         sub="Registered customers"  grad="linear-gradient(135deg,#0ea5e9,#38bdf8)" bg="#f0f9ff" border="#bae6fd" icon="👤" />
        <StatCard label="Total Workers"  value={fmt(userStats?.workers)}       sub="Registered workers"    grad="linear-gradient(135deg,#8b5cf6,#a78bfa)" bg="#f5f3ff" border="#ddd6fe" icon="🔧" />
        <StatCard label="Online Users"   value={fmt(userStats?.onlineUsers)}   sub="Active in last 5 min"  grad="linear-gradient(135deg,#22c55e,#4ade80)" bg="#f0fdf4" border="#bbf7d0" icon="🟢" />
        <StatCard label="Online Workers" value={fmt(userStats?.onlineWorkers)} sub="Active in last 5 min"  grad="linear-gradient(135deg,#f97316,#fb923c)" bg="#fff7ed" border="#fed7aa" icon="🟡" />
        <StatCard label="Commission Rate" value={commRate}                     sub="Platform fee per booking" grad="linear-gradient(135deg,#64748b,#94a3b8)" bg="#f8fafc" border="#e2e8f0" icon="⚙️" />
        {pendingRetry > 0 && (
          <StatCard label="Needs Retry" value={fmt(pendingRetry)} sub="Commission retry needed" grad="linear-gradient(135deg,#ef4444,#f87171)" bg="#fef2f2" border="#fecaca" icon="⚠️" />
        )}
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <Card style={{ padding: 24 }}>
          <SectionHeader title="Monthly Commission" sub="Last 6 months (oldest → newest)" />
          {monthly.length === 0
            ? <EmptyState icon="📊" text="No commission data yet" />
            : <BarChart data={monthly} valueKey="amount" labelKey="month" colorGrad="linear-gradient(90deg,#4f46e5,#7c3aed)" />
          }
        </Card>

        <Card style={{ padding: 24 }}>
          <SectionHeader title="Top Categories by Commission" sub="Based on confirmed bookings" />
          {topCats.length === 0
            ? <EmptyState icon="🗂️" text="No category data yet" />
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {topCats.map((cat, i) => {
                  const colors = [["#eef2ff","#c7d2fe","#4f46e5"],["#f0fdf4","#bbf7d0","#059669"],["#fff7ed","#fed7aa","#d97706"],["#fef2f2","#fecaca","#dc2626"],["#f5f3ff","#ddd6fe","#7c3aed"]];
                  const [bg, border, text] = colors[i % 5];
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: bg, border: `1.5px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: text }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.category}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmt(cat.count)} bookings</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#059669", flexShrink: 0 }}>{fmtRs(cat.total)}</div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </Card>
      </div>

      {/* User breakdown + Wallet */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <Card style={{ padding: 24 }}>
          <SectionHeader title="Platform Users" sub="Breakdown by account type" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Customers", value: userStats?.users,   color: "#3b82f6" },
              { label: "Workers",   value: userStats?.workers, color: "#8b5cf6" },
              { label: "Admins",    value: userStats?.admins,  color: "#64748b" },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 80, fontSize: 12, fontWeight: 700, color: "#64748b" }}>{row.label}</div>
                <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 6, height: 16, overflow: "hidden" }}>
                  <div style={{ width: pct(row.value, userStats?.total), height: "100%", background: row.color, borderRadius: 6, transition: "width .6s ease" }} />
                </div>
                <div style={{ width: 72, fontSize: 12, fontWeight: 800, color: "#0f172a", textAlign: "right" }}>
                  {fmt(row.value)} <span style={{ color: "#94a3b8", fontWeight: 500 }}>({pct(row.value, userStats?.total)})</span>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Total registered</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>{fmt(userStats?.total)}</span>
            </div>
          </div>
        </Card>

        <Card style={{ padding: 24 }}>
          <SectionHeader title="Wallet Summary" sub="Commission account overview" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Current Balance",     value: fmtRs(wallet?.balance),          accent: "#059669" },
              { label: "Total Ever Earned",   value: fmtRs(wallet?.totalEarned),      accent: "#4f46e5" },
              { label: "Today's Commission",  value: fmtRs(wallet?.todayEarnings),    accent: "#f59e0b" },
              { label: "This Month",          value: fmtRs(wallet?.monthEarnings),    accent: "#2563eb" },
              { label: "Avg per Booking",     value: fmtRs(wallet?.averageCommission),accent: "#7c3aed" },
              { label: "Commission Rate",     value: commRate,                         accent: "#64748b" },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
                <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.accent }}>{row.value}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setShowWD(true)} style={{ marginTop: 16, width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#059669,#10b981)", color: "white", fontWeight: 700, fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>
            💸 Record Withdrawal
          </button>
        </Card>
      </div>

      {/* Transactions table */}
      <Card style={{ padding: 24 }}>
        <SectionHeader title="Recent Commission Transactions" sub="Latest 20 entries from the ledger" />
        {txns.length === 0 ? (
          <EmptyState icon="💳" text="No transactions recorded yet" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr style={{ background: "linear-gradient(135deg,#f8fafc,#f1f5f9)" }}>
                  <th>Transaction ID</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Booking</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {txns.slice(0, 20).map((t, i) => {
                  const isCredit = t.amount > 0;
                  const isWD = t.type === "withdrawal";
                  return (
                    <tr key={t.id || i}>
                      <td><span style={{ fontFamily: "monospace", fontSize: 12, color: "#475569" }}>{String(t.id || "—").slice(0, 20)}</span></td>
                      <td><span className={`badge ${isWD ? "badge-red" : "badge-green"}`}>{isWD ? "⬆ Withdrawal" : "⬇ Commission"}</span></td>
                      <td><span style={{ fontWeight: 800, color: isCredit ? "#059669" : "#ef4444", fontSize: 14 }}>{isCredit ? "+" : ""}{fmtRs(t.amount)}</span></td>
                      <td>
                        <span className={`badge ${t.status === "credited" || t.status === "completed" ? "badge-green" : t.status === "pending_retry" ? "badge-amber" : "badge-gray"}`}>
                          {t.status || "—"}
                        </span>
                      </td>
                      <td>{t.bookingId ? <span style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>#{String(t.bookingId).slice(-8)}</span> : <span style={{ color: "#94a3b8" }}>—</span>}</td>
                      <td style={{ color: "#64748b", fontSize: 12 }}>{t.createdAt ? new Date(t.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showWD && <WithdrawModal balance={wallet?.balance || 0} onClose={() => setShowWD(false)} onSuccess={handleWithdrawSuccess} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
