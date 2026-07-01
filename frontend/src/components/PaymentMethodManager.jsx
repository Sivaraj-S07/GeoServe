import { useState, useEffect, useCallback } from "react";
import * as api from "../api";
import BankSelect from "./BankSelect";
import { getBankByCode, validateAccountNumber, validateIfsc, validateAccountHolderName } from "../config/banks";

const emptyForm = { bankCode: "", accountHolderName: "", accountNumber: "", ifscCode: "" };

function validateForm(form) {
  const errors = {};
  if (!form.bankCode) errors.bankCode = "Please select a bank";
  const nameErr = validateAccountHolderName(form.accountHolderName);
  if (nameErr) errors.accountHolderName = nameErr;
  if (form.bankCode) {
    const acctErr = validateAccountNumber(form.bankCode, form.accountNumber);
    if (acctErr) errors.accountNumber = acctErr;
  } else if (!String(form.accountNumber || "").trim()) {
    errors.accountNumber = "Account number is required";
  }
  const ifscErr = validateIfsc(form.ifscCode);
  if (ifscErr) errors.ifscCode = ifscErr;
  return errors;
}

/* ── Field ───────────────────────────────────────────────────────────── */
function Field({ label, icon, error, children, hint }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
        {icon} {label}
      </label>
      {children}
      {error
        ? <div style={{ color: "#ef4444", fontSize: 11, fontWeight: 600, marginTop: 5 }}>{error}</div>
        : (hint && <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 5 }}>{hint}</div>)}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, error, maxLength, inputMode, transform }) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      onChange={e => onChange(transform ? transform(e.target.value) : e.target.value)}
      style={{
        width: "100%", padding: "11px 14px", borderRadius: 10,
        border: `1.5px solid ${error ? "#ef4444" : "var(--border)"}`,
        fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color .15s,box-shadow .15s",
      }}
      onFocus={e => { if (!error) { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,.12)"; } }}
      onBlur={e => { e.target.style.borderColor = error ? "#ef4444" : "var(--border)"; e.target.style.boxShadow = "none"; }}
    />
  );
}

/* ── Add/Edit Modal ──────────────────────────────────────────────────── */
function BankAccountFormModal({ initial, onClose, onSubmit, saving }) {
  const [form, setForm]     = useState(initial || emptyForm);
  const [touched, setTouched] = useState({});
  const errors = validateForm(form);

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const markTouched = (key) => setTouched(t => ({ ...t, [key]: true }));

  const bank = getBankByCode(form.bankCode);

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ bankCode: true, accountHolderName: true, accountNumber: true, ifscCode: true });
    if (Object.keys(errors).length) return;
    onSubmit(form);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16,
        animation: "pmOverlayIn .15s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card"
        style={{ width: "100%", maxWidth: 460, padding: 26, maxHeight: "90vh", overflowY: "auto", animation: "pmModalIn .18s ease" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h3 style={{ fontWeight: 800, fontSize: 17, margin: 0 }}>{initial ? "✏️ Edit Bank Account" : "➕ Add Bank Account"}</h3>
          <button type="button" onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "var(--muted)", lineHeight: 1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Bank Name" icon="🏦" error={touched.bankCode ? errors.bankCode : ""}>
            <BankSelect
              value={form.bankCode}
              onChange={(code) => { setField("bankCode", code); markTouched("bankCode"); }}
              error={touched.bankCode ? errors.bankCode : ""}
            />
          </Field>

          <Field label="Account Holder Name" icon="👤" error={touched.accountHolderName ? errors.accountHolderName : ""} hint="As it appears on the passbook">
            <TextInput
              value={form.accountHolderName}
              placeholder="e.g. Ramesh Kumar"
              onChange={v => setField("accountHolderName", v)}
              error={touched.accountHolderName ? errors.accountHolderName : ""}
            />
          </Field>

          <Field
            label="Account Number"
            icon="🔢"
            error={touched.accountNumber ? errors.accountNumber : ""}
            hint={bank ? `${bank.name} accounts: ${bank.minLen}–${bank.maxLen} digits` : "Select a bank to see the valid length"}
          >
            <TextInput
              value={form.accountNumber}
              placeholder={bank ? `${bank.minLen}-${bank.maxLen} digit account number` : "Account number"}
              inputMode="numeric"
              maxLength={bank ? bank.maxLen : 18}
              transform={v => v.replace(/\D/g, "")}
              onChange={v => { setField("accountNumber", v); markTouched("accountNumber"); }}
              error={touched.accountNumber ? errors.accountNumber : ""}
            />
          </Field>

          <Field label="IFSC Code" icon="🏷️" error={touched.ifscCode ? errors.ifscCode : ""} hint="11 characters, e.g. SBIN0001234">
            <TextInput
              value={form.ifscCode}
              placeholder="e.g. SBIN0001234"
              maxLength={11}
              transform={v => v.toUpperCase().replace(/[^A-Z0-9]/g, "")}
              onChange={v => { setField("ifscCode", v); markTouched("ifscCode"); }}
              error={touched.ifscCode ? errors.ifscCode : ""}
            />
          </Field>

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{ flex: 1, padding: "12px", borderRadius: 11, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1.4, padding: "12px", borderRadius: 11, border: "none",
                background: saving ? "#a5b4fc" : "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff",
                fontWeight: 800, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: saving ? "none" : "0 6px 20px rgba(37,99,235,.35)",
              }}
            >
              {saving ? (<><Spinner /> Saving…</>) : (initial ? "Save Changes" : "Add Account")}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes pmOverlayIn { from{opacity:0} to{opacity:1} }
        @keyframes pmModalIn { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>
    </div>
  );
}

/* ── Delete Confirm Modal ────────────────────────────────────────────── */
function ConfirmDeleteModal({ account, onCancel, onConfirm, deleting }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 210, padding: 16, animation: "pmOverlayIn .15s ease" }}>
      <div onClick={e => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 380, padding: 24, textAlign: "center", animation: "pmModalIn .18s ease" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 24 }}>🗑️</div>
        <h3 style={{ fontWeight: 800, fontSize: 16, margin: "0 0 8px" }}>Remove this bank account?</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 20px", lineHeight: 1.6 }}>
          {account?.bankName} — account ending in <strong>****{(account?.accountNumber || "").slice(-4)}</strong> will be permanently removed. This cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} disabled={deleting} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--surface)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={onConfirm} disabled={deleting} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: deleting ? "#fca5a5" : "#ef4444", color: "#fff", fontWeight: 800, fontSize: 13, cursor: deleting ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {deleting ? (<><Spinner light /> Removing…</>) : "Yes, Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Spinner({ light }) {
  return (
    <span style={{
      width: 13, height: 13, borderRadius: "50%",
      border: `2px solid ${light ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.4)"}`,
      borderTopColor: "#fff", display: "inline-block", animation: "pmSpin .7s linear infinite",
    }}>
      <style>{`@keyframes pmSpin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

/* ── Account Card ─────────────────────────────────────────────────────── */
function AccountCard({ account, isPrimary, onEdit, onDelete, onSetPrimary, settingPrimary }) {
  return (
    <div
      className="card"
      style={{
        padding: 18, position: "relative", border: isPrimary ? "1.5px solid #86efac" : "1.5px solid var(--border)",
        background: isPrimary ? "linear-gradient(135deg,#f0fdf4,var(--surface) 60%)" : "var(--surface)",
        transition: "transform .15s,box-shadow .15s",
      }}
    >
      {isPrimary && (
        <span style={{ position: "absolute", top: -9, left: 16, background: "#16a34a", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999, letterSpacing: ".03em", boxShadow: "0 2px 8px rgba(22,163,74,.3)" }}>
          ✓ PRIMARY
        </span>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--primary-bg,#eff6ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🏦</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{account.bankName}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{account.accountHolderName}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", gap: 8, fontSize: 12.5 }}>
          <span style={{ color: "var(--muted)", minWidth: 70 }}>Account</span>
          <span style={{ fontWeight: 700, letterSpacing: ".03em" }}>****{(account.accountNumber || "").slice(-4)}</span>
        </div>
        <div style={{ display: "flex", gap: 8, fontSize: 12.5 }}>
          <span style={{ color: "var(--muted)", minWidth: 70 }}>IFSC</span>
          <span style={{ fontWeight: 700 }}>{account.ifscCode}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        {!isPrimary && (
          <button onClick={onSetPrimary} disabled={settingPrimary} style={{ flex: "1 1 auto", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #86efac", background: "#f0fdf4", color: "#16a34a", fontWeight: 700, fontSize: 11.5, cursor: settingPrimary ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {settingPrimary ? "Setting…" : "Set as Primary"}
          </button>
        )}
        <button onClick={onEdit} style={{ flex: "1 1 auto", padding: "8px 10px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontWeight: 700, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>
          ✏️ Edit
        </button>
        <button onClick={onDelete} style={{ flex: "1 1 auto", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #fecaca", background: "#fef2f2", color: "#ef4444", fontWeight: 700, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>
          🗑️ Delete
        </button>
      </div>
    </div>
  );
}

/* ── Main: PaymentMethodManager ──────────────────────────────────────── */
export default function PaymentMethodManager({ workerId, onToast, onProfileUpdate }) {
  const [accounts, setAccounts]   = useState([]);
  const [primaryId, setPrimaryId] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [formModal, setFormModal] = useState(null); // null | "add" | account-object (edit)
  const [saving, setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [settingPrimaryId, setSettingPrimaryId] = useState(null);

  const load = useCallback(() => {
    if (!workerId) return;
    setLoading(true);
    api.getBankAccounts(workerId)
      .then(d => { setAccounts(d.accounts || []); setPrimaryId(d.primaryAccountId || null); })
      .catch(() => onToast("Failed to load saved bank accounts", "error"))
      .finally(() => setLoading(false));
  }, [workerId, onToast]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (form) => {
    setSaving(true);
    try {
      const res = await api.addBankAccount(workerId, form);
      setAccounts(prev => [...prev, res.account]);
      if (accounts.length === 0) setPrimaryId(res.account.id);
      onProfileUpdate?.(res.profile);
      onToast("Bank account added successfully ✅");
      setFormModal(null);
    } catch (e) {
      onToast(e?.response?.data?.error || e.message || "Failed to add bank account", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (form) => {
    setSaving(true);
    try {
      const res = await api.updateBankAccount(workerId, formModal.id, form);
      setAccounts(prev => prev.map(a => a.id === res.account.id ? res.account : a));
      onProfileUpdate?.(res.profile);
      onToast("Bank account updated successfully ✅");
      setFormModal(null);
    } catch (e) {
      onToast(e?.response?.data?.error || e.message || "Failed to update bank account", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.deleteBankAccount(workerId, deleteTarget.id);
      setAccounts(prev => prev.filter(a => a.id !== deleteTarget.id));
      if (primaryId === deleteTarget.id) {
        const remaining = accounts.filter(a => a.id !== deleteTarget.id);
        setPrimaryId(remaining[0]?.id || null);
      }
      onProfileUpdate?.(res.profile);
      onToast("Bank account removed");
      setDeleteTarget(null);
    } catch (e) {
      onToast(e?.response?.data?.error || e.message || "Failed to delete bank account", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleSetPrimary = async (account) => {
    setSettingPrimaryId(account.id);
    try {
      const res = await api.setPrimaryBankAccount(workerId, account.id);
      setPrimaryId(account.id);
      onProfileUpdate?.(res.profile);
      onToast(`${account.bankName} set as primary payout account`);
    } catch (e) {
      onToast(e?.response?.data?.error || e.message || "Failed to set primary account", "error");
    } finally {
      setSettingPrimaryId(null);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>Saved Bank Accounts</h3>
          <p style={{ color: "var(--muted)", fontSize: 12, margin: "4px 0 0" }}>Add, edit or remove the bank accounts customers can pay into.</p>
        </div>
        <button
          onClick={() => setFormModal("add")}
          disabled={accounts.length >= 5}
          style={{
            padding: "10px 16px", borderRadius: 10, border: "none",
            background: accounts.length >= 5 ? "#cbd5e1" : "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff",
            fontWeight: 800, fontSize: 12.5, cursor: accounts.length >= 5 ? "not-allowed" : "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 6, boxShadow: accounts.length >= 5 ? "none" : "0 4px 14px rgba(37,99,235,.3)",
            whiteSpace: "nowrap",
          }}
        >
          ➕ Add Bank Account
        </button>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
          {[0, 1].map(i => (
            <div key={i} className="card" style={{ padding: 18, height: 150 }}>
              <div style={{ width: "60%", height: 14, borderRadius: 6, background: "#e2e8f0", marginBottom: 10, animation: "pmPulse 1.3s ease-in-out infinite" }} />
              <div style={{ width: "40%", height: 11, borderRadius: 6, background: "#eef2f7", marginBottom: 18, animation: "pmPulse 1.3s ease-in-out infinite" }} />
              <div style={{ width: "70%", height: 11, borderRadius: 6, background: "#eef2f7", marginBottom: 8, animation: "pmPulse 1.3s ease-in-out infinite" }} />
              <div style={{ width: "50%", height: 11, borderRadius: 6, background: "#eef2f7", animation: "pmPulse 1.3s ease-in-out infinite" }} />
            </div>
          ))}
          <style>{`@keyframes pmPulse { 0%,100%{opacity:.55} 50%{opacity:1} }`}</style>
        </div>
      ) : accounts.length === 0 ? (
        <div className="card" style={{ padding: "36px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>🏦</div>
          <p style={{ fontWeight: 700, fontSize: 14, margin: "0 0 4px" }}>No bank accounts saved yet</p>
          <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "0 0 16px" }}>Add a bank account so customers know where to send your payments.</p>
          <button
            onClick={() => setFormModal("add")}
            style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff", fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}
          >
            ➕ Add Your First Account
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
          {accounts.map(acc => (
            <AccountCard
              key={acc.id}
              account={acc}
              isPrimary={acc.id === primaryId}
              onEdit={() => setFormModal(acc)}
              onDelete={() => setDeleteTarget(acc)}
              onSetPrimary={() => handleSetPrimary(acc)}
              settingPrimary={settingPrimaryId === acc.id}
            />
          ))}
        </div>
      )}

      {accounts.length >= 5 && (
        <p style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 10 }}>You've reached the maximum of 5 saved bank accounts. Remove one to add a new account.</p>
      )}

      {formModal && (
        <BankAccountFormModal
          initial={formModal !== "add" ? {
            bankCode: formModal.bankCode, accountHolderName: formModal.accountHolderName,
            accountNumber: formModal.accountNumber, ifscCode: formModal.ifscCode,
          } : null}
          saving={saving}
          onClose={() => !saving && setFormModal(null)}
          onSubmit={formModal === "add" ? handleAdd : handleEdit}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          account={deleteTarget}
          deleting={deleting}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
