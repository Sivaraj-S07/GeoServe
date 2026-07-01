/**
 * components/StarRating.jsx — GeoServe Worker Rating & Review System
 *
 * Sub-components:
 *   StarDisplay        — read-only star display (e.g. on worker profile)
 *   RatingBreakdown    — visual bar chart of 5→1 star distribution
 *   RatingSubmitForm   — interactive form used inside BookingCard
 *   WorkerRatingSummary — full rating panel for WorkerDetailPage
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import * as api from "../api";
import Icon from "./Icon";

/* ── Single filled/half/empty star ─────────────────────────────────── */
function Star({ filled, size = 18, color = "#f59e0b", interactive = false, onClick, onHover }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : "none"}
      stroke={color}
      strokeWidth={filled ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ cursor: interactive ? "pointer" : "default", flexShrink: 0, transition: "transform .12s" }}
      onClick={onClick}
      onMouseEnter={onHover}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

/* ── Read-only star row with numeric rating ─────────────────────────── */
export function StarDisplay({ rating, totalRatings, size = 14, showCount = true, compact = false }) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  const fullStars  = Math.floor(safeRating);
  const hasPartial = safeRating - fullStars >= 0.5;
  const color      = "#f59e0b";

  if (safeRating === 0 && !showCount) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 3 : 5, flexWrap: "nowrap" }}>
      <div style={{ display: "flex", gap: 1 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            size={size}
            color={color}
            filled={i <= fullStars || (i === fullStars + 1 && hasPartial)}
          />
        ))}
      </div>
      {safeRating > 0 && (
        <span style={{ fontSize: size, fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>
          {safeRating.toFixed(1)}
        </span>
      )}
      {showCount && totalRatings != null && (
        <span style={{ fontSize: Math.max(10, size - 2), color: "var(--muted)", lineHeight: 1 }}>
          ({totalRatings} {totalRatings === 1 ? "rating" : "ratings"})
        </span>
      )}
      {safeRating === 0 && showCount && (
        <span style={{ fontSize: Math.max(10, size - 2), color: "var(--muted)" }}>No ratings yet</span>
      )}
    </div>
  );
}

/* ── Rating breakdown bar chart ─────────────────────────────────────── */
export function RatingBreakdown({ breakdown = {}, totalRatings = 0 }) {
  const stars = [5, 4, 3, 2, 1];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {stars.map(s => {
        const count = breakdown[s] || 0;
        const pct   = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 52 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{s}</span>
              <Star size={11} filled color="#f59e0b" />
            </div>
            <div style={{ flex: 1, height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${pct}%`,
                background: s >= 4 ? "#22c55e" : s === 3 ? "#f59e0b" : "#ef4444",
                borderRadius: 99,
                transition: "width .4s ease",
              }} />
            </div>
            <span style={{ fontSize: 11, color: "var(--muted)", minWidth: 18, textAlign: "right" }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Interactive star picker ─────────────────────────────────────────── */
function StarPicker({ value, onChange, size = 28 }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div
      style={{ display: "flex", gap: 4 }}
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          style={{
            cursor: "pointer",
            transform: active >= i ? "scale(1.15)" : "scale(1)",
            transition: "transform .12s",
          }}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
        >
          <Star size={size} filled={active >= i} color="#f59e0b" />
        </div>
      ))}
    </div>
  );
}

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

/* ── Rating Submit Form — embedded in BookingCard ─────────────────────── */
export function RatingSubmitForm({ booking, onRated, onToast }) {
  const { t } = useTranslation();
  const [stars,     setStars]     = useState(0);
  const [review,    setReview]    = useState("");
  const [submitting,setSubmitting]= useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existing,  setExisting]  = useState(null);
  const [checking,  setChecking]  = useState(true);

  // Check if already rated on mount — skip API call if booking already flagged
  useEffect(() => {
    if (booking.isRated) {
      // Booking already flagged as rated — still fetch the rating details to show
      (async () => {
        try {
          const res = await api.getBookingRating(booking.id);
          if (res.rated) { setExisting(res.rating); setSubmitted(true); }
        } catch { /* ignore */ }
        finally { setChecking(false); }
      })();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getBookingRating(booking.id);
        if (!cancelled) {
          if (res.rated) {
            setExisting(res.rating);
            setSubmitted(true);
          }
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setChecking(false); }
    })();
    return () => { cancelled = true; };
  }, [booking.id, booking.isRated]);

  const handleSubmit = async () => {
    if (stars < 1 || stars > 5) {
      onToast?.("Please select a star rating", "error");
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.submitRating(booking.id, stars, review.trim());
      setSubmitted(true);
      setExisting(result.rating);
      onToast?.("Rating submitted! Thank you for your feedback.", "success");
      onRated?.(result);
    } catch (err) {
      const msg = err.message || "Failed to submit rating";
      if (msg.toLowerCase().includes("already")) {
        setSubmitted(true);
        onToast?.("You've already rated this booking", "info");
      } else {
        onToast?.(msg, "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) return (
    <div style={{ padding: "14px 0", display: "flex", justifyContent: "center" }}>
      <div className="spinner" style={{ width: 18, height: 18 }} />
    </div>
  );

  if (submitted && existing) return (
    <div style={{
      background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
      border: "1.5px solid #fde68a",
      borderRadius: 14,
      padding: "16px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>⭐</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#92400e" }}>Your Rating</div>
          <div style={{ fontSize: 11, color: "#a16207", marginTop: 1 }}>
            {new Date(existing.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
          {[1,2,3,4,5].map(i => <Star key={i} size={16} filled={i <= existing.stars} color="#f59e0b" />)}
        </div>
      </div>
      {existing.review && (
        <p style={{ fontSize: 13, color: "#78350f", margin: 0, fontStyle: "italic", lineHeight: 1.5 }}>
          "{existing.review}"
        </p>
      )}
    </div>
  );

  return (
    <div style={{
      background: "linear-gradient(135deg, #fffbeb, #fff7ed)",
      border: "1.5px solid #fed7aa",
      borderRadius: 14,
      padding: "18px 20px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: "linear-gradient(135deg,#f59e0b,#fbbf24)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, boxShadow: "0 3px 10px rgba(245,158,11,.3)",
        }}>⭐</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text)" }}>Rate Your Experience</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
            How was your service with <strong>{booking.workerName}</strong>?
          </div>
        </div>
      </div>

      {/* Star picker */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <StarPicker value={stars} onChange={setStars} size={32} />
        {stars > 0 && (
          <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e", background: "#fef3c7", padding: "3px 12px", borderRadius: 99, border: "1px solid #fde68a" }}>
            {STAR_LABELS[stars]}
          </span>
        )}
        {stars === 0 && (
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Tap a star to rate</span>
        )}
      </div>

      {/* Review textarea */}
      <textarea
        value={review}
        onChange={e => setReview(e.target.value)}
        placeholder="Share details about your experience (optional)…"
        maxLength={1000}
        rows={2}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "10px 12px", borderRadius: 10,
          border: "1.5px solid #fed7aa",
          background: "rgba(255,255,255,.7)",
          fontSize: 13, color: "var(--text)",
          fontFamily: "inherit", resize: "vertical",
          outline: "none", lineHeight: 1.5,
          transition: "border-color .15s",
          marginBottom: 12,
        }}
        onFocus={e => { e.target.style.borderColor = "#f59e0b"; }}
        onBlur={e => { e.target.style.borderColor = "#fed7aa"; }}
      />
      {review.length > 800 && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8, textAlign: "right" }}>
          {review.length}/1000
        </div>
      )}

      {/* Submit button */}
      <button
        disabled={submitting || stars === 0}
        onClick={handleSubmit}
        style={{
          width: "100%", padding: "12px",
          background: stars > 0 && !submitting
            ? "linear-gradient(135deg,#f59e0b,#fbbf24)"
            : "var(--border)",
          color: stars > 0 && !submitting ? "white" : "var(--muted)",
          border: "none", borderRadius: 10,
          fontWeight: 800, fontSize: 14,
          cursor: (submitting || stars === 0) ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          boxShadow: stars > 0 && !submitting ? "0 4px 16px rgba(245,158,11,.35)" : "none",
          transition: "all .2s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {submitting ? (
          <><div className="spinner" style={{ width: 16, height: 16, borderTopColor: "white" }} /> Submitting…</>
        ) : (
          "⭐ Submit Rating"
        )}
      </button>
    </div>
  );
}

/* ── Full rating panel for worker profile page ────────────────────────── */
export function WorkerRatingSummary({ workerId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(0);
  const PAGE = 5;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getWorkerRatings(workerId);
      setData(res);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [workerId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ padding: "32px 0", display: "flex", justifyContent: "center" }}>
      <div className="spinner dark" />
    </div>
  );

  if (!data || data.stats.totalRatings === 0) return (
    <div style={{
      textAlign: "center", padding: "32px 24px",
      background: "var(--bg)", borderRadius: 14,
      border: "1.5px dashed var(--border)",
    }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>⭐</div>
      <p style={{ fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>No ratings yet</p>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
        Ratings appear here after customers complete and confirm a booking.
      </p>
    </div>
  );

  const { ratings, stats } = data;
  const visible = ratings.slice(0, (page + 1) * PAGE);
  const hasMore = visible.length < ratings.length;

  return (
    <div>
      {/* Summary row */}
      <div style={{
        display: "flex", alignItems: "stretch", gap: 16, marginBottom: 20,
        flexWrap: "wrap",
      }}>
        {/* Big average */}
        <div style={{
          flex: "0 0 auto", textAlign: "center",
          background: "linear-gradient(135deg,#fffbeb,#fef3c7)",
          border: "1.5px solid #fde68a",
          borderRadius: 14, padding: "20px 28px",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ fontSize: 48, fontWeight: 900, color: "var(--text)", lineHeight: 1, fontFamily: "'Bricolage Grotesque',sans-serif" }}>
            {(stats.averageRating || 0).toFixed(1)}
          </div>
          <div style={{ display: "flex", gap: 2, margin: "6px 0" }}>
            {[1,2,3,4,5].map(i => (
              <Star key={i} size={14} filled={i <= Math.round(stats.averageRating)} color="#f59e0b" />
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
            {stats.totalRatings} {stats.totalRatings === 1 ? "rating" : "ratings"}
          </div>
        </div>

        {/* Breakdown bars */}
        <div style={{ flex: 1, minWidth: 180, padding: "16px 20px", background: "var(--bg)", borderRadius: 14, border: "1.5px solid var(--border)" }}>
          <RatingBreakdown breakdown={stats.breakdown} totalRatings={stats.totalRatings} />
        </div>
      </div>

      {/* Individual reviews */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visible.map(r => (
          <div key={r.id} style={{
            background: "var(--surface)", border: "1.5px solid var(--border)",
            borderRadius: 12, padding: "14px 16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: r.review ? 8 : 0 }}>
              <img
                src={r.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.userName)}&background=2563eb&color=fff&size=36`}
                alt={r.userName}
                style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.userName)}&background=2563eb&color=fff&size=36`; }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{r.userName}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                  {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 2 }}>
                {[1,2,3,4,5].map(i => <Star key={i} size={13} filled={i <= r.stars} color="#f59e0b" />)}
              </div>
            </div>
            {r.review && (
              <p style={{
                margin: 0, fontSize: 13, color: "var(--text-secondary)",
                lineHeight: 1.6, fontStyle: "italic",
                paddingLeft: 44, // align with name
              }}>
                "{r.review}"
              </p>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setPage(p => p + 1)}
          style={{
            marginTop: 14, width: "100%", padding: "10px",
            background: "var(--bg)", border: "1.5px solid var(--border)",
            borderRadius: 10, fontSize: 13, fontWeight: 700,
            color: "var(--primary)", cursor: "pointer", fontFamily: "inherit",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--primary-bg)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--bg)"; }}
        >
          Show more reviews ({ratings.length - visible.length} remaining)
        </button>
      )}
    </div>
  );
}
