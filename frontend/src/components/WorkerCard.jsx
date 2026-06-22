import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CategoryChip, CategoryBanner } from "./Icon";
import { StarDisplay } from "./StarRating";
import { getLocalizedName } from "../utils/localizedName";

export default function WorkerCard({ worker, category, showBook = false }) {
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  // Bilingual display name — falls back to the legacy name for worker
  // profiles created before this feature existed (null-safe).
  const displayName = getLocalizedName(worker, i18n.language) || worker.name || "";
  const fb  = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563eb&color=fff&size=160`;

  return (
    <div
      className="worker-card-v2"
      onClick={() => nav(`/worker/${worker.id}`)}
      style={{ cursor: "pointer", position: "relative" }}
    >
      {/* Dynamic profession banner — colour-themed per category, auto-generated for new ones */}
      <CategoryBanner name={category?.name} icon={category?.icon} bannerColor={category?.bannerColor} size="sm" rounded={0} />

      <div style={{ padding: "0 20px 20px" }}>
        {/* Avatar + name row — avatar overlaps the banner above */}
        <div style={{ display: "flex", gap: 15, alignItems: "flex-start", marginTop: -34, marginBottom: 14 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <img
              src={worker.avatar || fb}
              onError={e => { e.target.src = fb; }}
              style={{
                width: 72, height: 72, borderRadius: 18,
                objectFit: "cover",
                border: "3px solid var(--surface)",
                boxShadow: "0 6px 20px rgba(0,0,0,.25)",
              }}
              loading="lazy"
            />
            {/* Online dot */}
            <div style={{
              position: "absolute", bottom: 2, right: 2,
              width: 14, height: 14, borderRadius: "50%",
              background: worker.availability ? "#10b981" : "var(--muted-light)",
              border: "2.5px solid var(--surface)",
              boxShadow: worker.availability ? "0 0 0 3px rgba(16,185,129,.22)" : "none",
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 0, marginTop: 38 }}>
            <div style={{
              fontWeight: 800, fontSize: 16, color: "var(--text)", marginBottom: 6,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              letterSpacing: "-.4px", fontFamily: "'Bricolage Grotesque',sans-serif",
            }}>
              {displayName}
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
              {category && (
                <CategoryChip name={category.name} icon={category.icon} size={12} iconSize={18} />
              )}
              <span style={{
                background: worker.availability ? "var(--green-bg)" : "var(--surface-raised)",
                border: `1px solid ${worker.availability ? "var(--green-border)" : "var(--border)"}`,
                color: worker.availability ? "var(--green)" : "var(--muted)",
                fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99,
                display: "inline-flex", alignItems: "center", gap: 4,
                fontFamily: "'Manrope',sans-serif",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: worker.availability ? "var(--green)" : "var(--muted-light)", display: "inline-block" }} />
                {worker.availability ? t("common.available") : t("common.unavailable")}
              </span>
            </div>
          </div>
        </div>

        {/* Specialization */}
        {worker.specialization && (
          <p style={{
            fontSize: 13, color: "var(--muted)", marginBottom: 14, lineHeight: 1.55,
            overflow: "hidden", display: "-webkit-box",
            WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>
            {worker.specialization}
          </p>
        )}

        {/* Stats row */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {worker.rating > 0 && (
            <div style={{
              display: "flex", alignItems: "center",
              background: "var(--amber-bg)", padding: "4px 9px",
              borderRadius: 99, border: "1px solid var(--amber-border)",
            }}>
              <StarDisplay rating={worker.rating} totalRatings={worker.totalRatings} size={12} showCount={true} compact />
            </div>
          )}
          {worker.yearsOfExp > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 11, fontWeight: 700, color: "var(--blue-dark)",
              background: "var(--blue-bg)", padding: "4px 9px",
              borderRadius: 99, border: "1px solid var(--blue-border)",
            }}>
              🏆 {worker.yearsOfExp}+ yrs
            </div>
          )}
          {worker.distance != null && (
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 11, fontWeight: 600, color: "var(--muted)",
              background: "var(--surface-raised)", padding: "4px 9px",
              borderRadius: 99, border: "1px solid var(--border)",
            }}>
              📍 {worker.distance} km
            </div>
          )}
          {worker.price_per_hour && (
            <div style={{ marginLeft: "auto", fontSize: 16, fontWeight: 800, color: "var(--primary)", fontFamily: "'Bricolage Grotesque',sans-serif" }}>
              ₹{worker.price_per_hour}<span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>/hr</span>
            </div>
          )}
        </div>

        {/* Book button */}
        {showBook && worker.availability && (
          <button
            onClick={e => { e.stopPropagation(); nav(`/book/${worker.id}`); }}
            style={{
              width: "100%", marginTop: 14, padding: "12px",
              borderRadius: 12, background: "var(--grad-primary)",
              color: "white", border: "none", fontWeight: 700, fontSize: 14,
              cursor: "pointer", fontFamily: "'Manrope',sans-serif",
              boxShadow: "0 4px 14px rgba(37,99,235,.30)",
              transition: "all .18s cubic-bezier(.34,1.56,.64,1)",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 22px rgba(37,99,235,.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(37,99,235,.30)"; }}
          >
            Book Now
          </button>
        )}
      </div>
    </div>
  );
}
