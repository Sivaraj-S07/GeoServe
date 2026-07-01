import { useState, useRef, useEffect, useMemo } from "react";
import { BANKS, BANK_CATEGORY_LABELS, BANK_CATEGORY_ORDER } from "../config/banks";

/**
 * BankSelect — searchable, categorized bank dropdown.
 *
 * Props:
 *   value      : selected bank code (string) or ""
 *   onChange   : (bankCode, bankObj) => void
 *   error      : optional error string to display
 *   disabled   : optional
 */
export default function BankSelect({ value, onChange, error, disabled }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const rootRef  = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(() => BANKS.find(b => b.code === value) || null, [value]);

  useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? BANKS.filter(b => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)) : BANKS;
    const groups = {};
    list.forEach(b => {
      if (!groups[b.category]) groups[b.category] = [];
      groups[b.category].push(b);
    });
    return groups;
  }, [query]);

  const order = BANK_CATEGORY_ORDER;

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: "100%", textAlign: "left", padding: "11px 14px", borderRadius: 10,
          border: `1.5px solid ${error ? "#ef4444" : open ? "var(--primary)" : "var(--border)"}`,
          background: disabled ? "#f1f5f9" : "var(--surface)",
          fontSize: 13, fontFamily: "inherit", cursor: disabled ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          boxShadow: open ? "0 0 0 3px rgba(37,99,235,.12)" : "none", transition: "border-color .15s,box-shadow .15s",
        }}
      >
        <span style={{ color: selected ? "var(--text)" : "var(--muted)", fontWeight: selected ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? `🏦 ${selected.name}` : "Select your bank…"}
        </span>
        <span style={{ fontSize: 11, color: "var(--muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }}>▾</span>
      </button>

      {error && <div style={{ color: "#ef4444", fontSize: 11, fontWeight: 600, marginTop: 5 }}>{error}</div>}

      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 60,
            background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 12,
            boxShadow: "0 12px 36px rgba(0,0,0,.16)", overflow: "hidden",
            animation: "bankDropdownIn .14s ease",
          }}
        >
          <div style={{ padding: 10, borderBottom: "1px solid var(--border)" }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search bank name…"
              style={{
                width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid var(--border)",
                fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ maxHeight: 280, overflowY: "auto", padding: "4px 0" }}>
            {order.filter(cat => filtered[cat]?.length).map(cat => (
              <div key={cat}>
                <div style={{ padding: "8px 14px 4px", fontSize: 10.5, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                  {BANK_CATEGORY_LABELS[cat]}
                </div>
                {filtered[cat].map(b => {
                  const active = b.code === value;
                  return (
                    <button
                      key={b.code}
                      type="button"
                      onClick={() => { onChange(b.code, b); setOpen(false); }}
                      style={{
                        width: "100%", textAlign: "left", padding: "9px 14px", border: "none",
                        background: active ? "var(--primary-bg, #eff6ff)" : "transparent",
                        color: active ? "var(--primary)" : "var(--text)",
                        fontWeight: active ? 800 : 500, fontSize: 13, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#f8fafc"; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span>{b.name}</span>
                      {active && <span style={{ fontSize: 13 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            ))}
            {!order.some(cat => filtered[cat]?.length) && (
              <div style={{ padding: "20px 14px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                No banks match "{query}"
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes bankDropdownIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
