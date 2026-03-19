/**
 * CommissionWallet.jsx
 *
 * Admin-only component showing platform commission earnings, wallet balance,
 * and full transaction ledger with withdraw capability.
 */
import { useState, useEffect, useCallback } from "react";
import * as api from "../api";
import Icon from "./Icon";

const fmt     = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const fmtDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
};

const STATUS_STYLE = {
  credited:      { bg: "#f0fdf4", color: "#166534", border: "#86efac" },
  pending_retry: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  skipped:       { bg: "#f8fafc", color: "var(--muted)", border: "#e2e8f0" },
  withdrawal:    { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, accent }) {
  const ACCENTS = {
    green:  { bg: "#f0fdf4", border: "#86efac", icon: "#16a34a", val: "#15803d" },
    blue:   { bg: "#eff6ff", border: "#bfdbfe", icon: "#2563eb", val: "#1d4ed8" },
    amber:  { bg: "#fffbeb", border: "#fde68a", icon: "#d97706", val: "#b45309" },
    purple: { bg: "#faf5ff", border: "#ddd6fe", icon: "#7c3aed", val: "#6d28d9" },
  };
  const a = ACCENTS[accent] || ACCENTS.blue;
  return (
    <div style={{
      background: a.bg, border: `1.5px solid ${a.border}`,
      borderRadius: 14, padding: "18px 20px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: a.icon, letterSpacing: ".3px" }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,.7)", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${a.border}` }}>
          <Icon name={icon} size={15} color={a.icon} />
        </div>
      </div>
      <div style={{ fontFamily: "'DM Sans','Outfit',sans-serif", fontWeight: 900, fontSize: 26, color: a.val, letterSpacing: "-1px", marginBottom: 4 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted)" }}>{sub}</div>}
    </div>
  );
}

// ── Withdraw modal ─────────────────────────────────────────────────────────────
function WithdrawModal({ balance, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [note,   setNote]   = useState("");
  const [ref,    setRef]    = useState("");
  const [busy,   setBusy]   = useState(false);
  const [error,  setError]  = useState("");

  const handleWithdraw = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    if (amt > balance)    { setError(`Cannot exceed available balance ${fmt(balance)}`); return; }
    setBusy(true); setError("");
    try {
      const result = await api.withdrawFromWallet({ amount: amt, note, reference: ref });
      onSuccess(result);
    } catch (e) { setError(e.response?.data?.error || "Withdrawal failed"); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--surface)", borderRadius: 18, padding: "28px 28px", width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(15,23,42,.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 18, margin: 0 }}>Record Withdrawal</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <Icon name="x" size={18} color="#64748b" />
          </button>
        </div>

        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "#1d4ed8" }}>
          Available balance: <strong>{fmt(balance)}</strong>
        </div>

        {[
          { label: "Amount (₹)", placeholder: "e.g. 5000", val: amount, set: setAmount, type: "number" },
          { label: "Bank Reference / UTR (optional)", placeholder: "e.g. UTR123456", val: ref, set: setRef, type: "text" },
          { label: "Note (optional)", placeholder: "e.g. Monthly sweep to SBI", val: note, set: setNote, type: "text" },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 5 }}>{f.label}</label>
            <input
              type={f.type}
              value={f.val}
              placeholder={f.placeholder}
              onChange={e => f.set(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1.5px solid var(--border)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
        ))}

        {error && <p style={{ color: "#dc2626", fontSize: 12, marginBottom: 14 }}>{error}</p>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "var(--text-secondary)" }}>
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={handleWithdraw}
            style={{ flex: 1, padding: "11px 0", borderRadius: 9, border: "none", background: busy ? "#a5b4fc" : "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {busy ? "Processing…" : "Confirm Withdrawal"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CommissionWallet({ onToast }) {
  const [summary,   setSummary]  = useState(null);
  const [txns,      setTxns]     = useState([]);
  const [page,      setPage]     = useState(1);
  const [pagination,setPagination] = useState({});
  const [loading,   setLoading]  = useState(true);
  const [showModal, setModal]    = useState(false);
  const [statusFilter, setStatus] = useState("");

  const load = useCallback(async (pg = 1, status = "") => {
    setLoading(true);
    try {
      const [sum, txnData] = await Promise.all([
        api.getCommissionSummary(),
        api.getCommissionTransactions({ page: pg, limit: 15, ...(status ? { status } : {}) }),
      ]);
      setSummary(sum);
      setTxns(txnData.transactions);
      setPagination(txnData.pagination);
    } catch { onToast?.("Failed to load commission data", "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1, statusFilter); }, [statusFilter]);

  const handleWithdrawSuccess = (result) => {
    setModal(false);
    onToast?.(`Withdrawal of ${fmt(Math.abs(result.transaction.amount))} recorded. New balance: ${fmt(result.newBalance)}`);
    load(1, statusFilter);
  };

  if (loading && !summary) return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div className="spinner dark" style={{ margin: "0 auto 12px" }} />
      <p style={{ color: "var(--muted)", fontWeight: 500 }}>Loading commission wallet…</p>
    </div>
  );

  const wallet = summary?.wallet || {};

  return (
    <div className="anim-fade">

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 22, letterSpacing: -.5, margin: "0 0 4px" }}>Commission Wallet</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
            Platform earns <strong>{((summary?.commissionRate || 0.05) * 100).toFixed(0)}%</strong> commission on every confirmed booking
          </p>
        </div>
        <button
          onClick={() => setModal(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg,#4f46e5,#6366f1)",
            color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 4px 14px rgba(79,70,229,.35)",
          }}
        >
          <Icon name="arrow-right" size={14} color="white" /> Withdraw Funds
        </button>
      </div>

      {/* ── Stats grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard label="WALLET BALANCE"    value={fmt(wallet.balance)}       sub="Available to withdraw"             icon="credit-card"  accent="green"  />
        <StatCard label="TOTAL EARNED"      value={fmt(wallet.totalEarned)}   sub={`${wallet.totalBookings || 0} confirmed bookings`} icon="trending-up" accent="blue" />
        <StatCard label="THIS MONTH"        value={fmt(summary?.monthEarnings || 0)}  sub="Month-to-date commission"         icon="calendar"     accent="purple" />
        <StatCard label="TODAY"             value={fmt(summary?.todayEarnings || 0)}  sub="Commission earned today"           icon="clock"        accent="amber"  />
        {(summary?.pendingRetryCount || 0) > 0 && (
          <StatCard label="PENDING RETRY"   value={summary.pendingRetryCount} sub="Commission credits need retry"     icon="x-circle"     accent="amber"  />
        )}
      </div>

      {/* ── Top categories ── */}
      {summary?.topCategories?.length > 0 && (
        <div className="card" style={{ padding: "20px 24px", marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 14, margin: "0 0 16px", fontFamily: "'Outfit',sans-serif" }}>Top Earning Categories</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {summary.topCategories.map((c, i) => {
              const pct = wallet.totalEarned > 0 ? Math.round((c.total / wallet.totalEarned) * 100) : 0;
              return (
                <div key={c.category} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--muted)", width: 16 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{c.category}</span>
                  <div style={{ flex: 2, height: 6, background: "var(--surface-raised)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#4f46e5,#818cf8)", borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5", width: 60, textAlign: "right" }}>{fmt(c.total)}</span>
                  <span style={{ fontSize: 11, color: "var(--muted)", width: 40, textAlign: "right" }}>{c.count} jobs</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Transaction ledger ── */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0, fontFamily: "'Outfit',sans-serif" }}>
            Transaction Ledger
            {pagination.total > 0 && <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 500, marginLeft: 8 }}>({pagination.total} entries)</span>}
          </h3>
          <select
            value={statusFilter}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid var(--border)", fontSize: 12, fontFamily: "inherit", background: "var(--surface)" }}
          >
            <option value="">All types</option>
            <option value="credited">Credited</option>
            <option value="pending_retry">Pending Retry</option>
            <option value="withdrawal">Withdrawals</option>
          </select>
        </div>

        {txns.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
            <Icon name="credit-card" size={36} color="var(--muted-light)" />
            <p style={{ marginTop: 10, fontWeight: 500 }}>No transactions yet</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {txns.map(t => {
                const isWithdrawal = t.type === "withdrawal";
                const style = STATUS_STYLE[isWithdrawal ? "withdrawal" : (t.status || "credited")] || STATUS_STYLE.credited;
                return (
                  <div key={t.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 14,
                    padding: "14px 16px", borderRadius: 12,
                    border: "1.5px solid #f1f5f9", background: "#fafafa",
                  }}>
                    {/* Amount pill */}
                    <div style={{
                      padding: "4px 12px", borderRadius: 20, flexShrink: 0,
                      background: style.bg, border: `1px solid ${style.border}`,
                      color: style.color, fontSize: 13, fontWeight: 800,
                      fontFamily: "'DM Sans',sans-serif",
                      minWidth: 80, textAlign: "center",
                    }}>
                      {isWithdrawal ? "-" : "+"}{fmt(Math.abs(t.amount))}
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                          {isWithdrawal ? "Withdrawal" : `Booking #${t.bookingId}`}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 20, background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                          {t.status?.replace("_", " ").toUpperCase()}
                        </span>
                        {t.mode === "simulation" && (
                          <span style={{ fontSize: 10, color: "#6366f1", fontWeight: 600, background: "#eef2ff", padding: "1px 7px", borderRadius: 20 }}>SIM</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {!isWithdrawal && t.workerName && <span>Worker: {t.workerName}</span>}
                        {!isWithdrawal && <span>Worker got: {fmt(t.workerPayout)}</span>}
                        {t.note && <span>{t.note}</span>}
                      </div>
                    </div>

                    {/* Date */}
                    <div style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0, textAlign: "right" }}>
                      {fmtDate(t.createdAt)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 18 }}>
                <button
                  disabled={page <= 1}
                  onClick={() => { const p = page - 1; setPage(p); load(p, statusFilter); }}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--surface)", cursor: page <= 1 ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", color: page <= 1 ? "#cbd5e1" : "#334155" }}
                >← Prev</button>
                <span style={{ padding: "6px 12px", fontSize: 12, color: "var(--muted)" }}>
                  Page {page} of {pagination.pages}
                </span>
                <button
                  disabled={!pagination.hasMore}
                  onClick={() => { const p = page + 1; setPage(p); load(p, statusFilter); }}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--surface)", cursor: !pagination.hasMore ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", color: !pagination.hasMore ? "#cbd5e1" : "#334155" }}
                >Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <WithdrawModal
          balance={wallet.balance || 0}
          onClose={() => setModal(false)}
          onSuccess={handleWithdrawSuccess}
        />
      )}
    </div>
  );
}
