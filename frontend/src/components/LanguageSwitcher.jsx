import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧", nativeLabel: "English" },
  { code: "ta", label: "Tamil",   flag: "🇮🇳", nativeLabel: "தமிழ்" },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef();

  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Change language"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 30,
          border: "1.5px solid var(--border)",
          background: open ? "var(--primary-bg)" : "var(--surface)",
          borderColor: open ? "var(--primary-border)" : "var(--border)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-secondary)",
          fontFamily: "'Outfit', sans-serif",
          transition: "all .18s",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = "var(--primary-border)";
            e.currentTarget.style.background = "var(--primary-bg)";
            e.currentTarget.style.color = "var(--primary)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.background = "var(--surface)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }
        }}
      >
        <span style={{ fontSize: 16 }}>{current.flag}</span>
        <span className="lang-label">{current.nativeLabel}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform .2s",
            flexShrink: 0,
          }}
        >
          <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(15,23,42,.12), 0 2px 8px rgba(15,23,42,.06)",
            minWidth: 160,
            overflow: "hidden",
            zIndex: 500,
            animation: "slideUp .15s cubic-bezier(.16,1,.3,1)",
          }}
        >
          <div
            style={{
              padding: "8px 12px 6px",
              fontSize: 10,
              fontWeight: 800,
              color: "var(--muted)",
              letterSpacing: ".06em",
              textTransform: "uppercase",
              fontFamily: "'Outfit', sans-serif",
              borderBottom: "1px solid var(--border)",
              marginBottom: 4,
            }}
          >
            Language / மொழி
          </div>
          {LANGUAGES.map((lang) => {
            const isActive = lang.code === i18n.language;
            return (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 14px",
                  width: "100%",
                  border: "none",
                  background: isActive ? "var(--primary-bg)" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background .1s",
                  borderRadius: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "var(--surface-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "none";
                }}
              >
                <span style={{ fontSize: 18 }}>{lang.flag}</span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isActive ? "var(--primary)" : "var(--text)",
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    {lang.nativeLabel}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                    {lang.label}
                  </div>
                </div>
                {isActive && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M2.5 7l3 3 6-6"
                      stroke="var(--primary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 500px) {
          .lang-label { display: none; }
        }
      `}</style>
    </div>
  );
}
