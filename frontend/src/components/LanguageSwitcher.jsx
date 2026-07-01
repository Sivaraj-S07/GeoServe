import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧", nativeLabel: "English" },
  { code: "ta", label: "Tamil",   flag: "🇮🇳", nativeLabel: "தமிழ்" },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 180 });
  const wrapRef = useRef();
  const btnRef = useRef();
  const menuRef = useRef();

  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  // Close on outside click / tap (checks both trigger and the fixed-position menu)
  useEffect(() => {
    const h = (e) => {
      if (
        wrapRef.current && !wrapRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h, { passive: true });
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("touchstart", h);
    };
  }, []);

  // Close on scroll/resize so the menu never ends up misaligned
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  // Position the dropdown using fixed coordinates computed from the trigger
  // button's bounding rect. This guarantees the menu is never clipped by any
  // ancestor with overflow:hidden (e.g. a parent dropdown panel) and always
  // stays fully on-screen, including on small / mobile viewports.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;

    const rect = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const menuWidth = Math.min(200, vw - 24);
    let left = rect.right - menuWidth;
    if (left < 12) left = 12;
    if (left + menuWidth > vw - 12) left = vw - 12 - menuWidth;

    let top = rect.bottom + 8;
    const estMenuHeight = 140;
    if (top + estMenuHeight > vh - 12) {
      // Not enough room below — open upward instead
      top = Math.max(12, rect.top - estMenuHeight - 8);
    }

    setCoords({ top, left, width: menuWidth });
  }, [open]);

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }} className="lang-switcher-root">
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        title="Change language"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="lang-switcher-trigger"
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
          fontFamily: "'Manrope', sans-serif",
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
        <>
          {/* Mobile-friendly backdrop so a tap anywhere closes the menu */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 998, background: "transparent" }}
          />
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              boxShadow: "0 12px 32px rgba(15,23,42,.18), 0 2px 8px rgba(15,23,42,.08)",
              overflow: "hidden",
              zIndex: 999,
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
                fontFamily: "'Manrope', sans-serif",
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
                    padding: "12px 14px",
                    width: "100%",
                    minHeight: 44,
                    border: "none",
                    background: isActive ? "var(--primary-bg)" : "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background .1s",
                    borderRadius: 0,
                    touchAction: "manipulation",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "var(--surface-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "none";
                  }}
                >
                  <span style={{ fontSize: 18 }}>{lang.flag}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: isActive ? "var(--primary)" : "var(--text)",
                        fontFamily: "'Manrope', sans-serif",
                      }}
                    >
                      {lang.nativeLabel}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                      {lang.label}
                    </div>
                  </div>
                  {isActive && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
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
        </>
      )}

      <style>{`
        @media (max-width: 380px) {
          .lang-switcher-trigger .lang-label { display: none; }
          .lang-switcher-trigger { padding: 6px 10px !important; }
        }
      `}</style>
    </div>
  );
}
