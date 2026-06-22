import { useTranslation } from "react-i18next";

// ─── SVG Path Library ────────────────────────────────────────────────────────
const PATHS = {
  // ── Dedicated Category Icons (hand-tuned for service categories) ──────────
  "cat-plumber":      "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  "cat-electrician":  "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  "cat-carpenter":    "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z M8 15h2M14 9h2",
  "cat-mechanic":     "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  "cat-car":          "M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2M14 17H9M7 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  "cat-bike":         "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM6 12h12M12 6v12",
  "cat-painter":      "M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z M8 12h8M12 8v8",
  "cat-ac":           "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3l-6 6m0 0h18m-2-3v3 M7 21v-4m5 4v-4m5 4v-4",
  "cat-cleaner":      "M22 12h-2V7H4v5H2v5h4v2h12v-2h4v-5z M8 12V9h8v3",
  "cat-gardener":     "M12 22V12M12 12C12 7 7 3 2 3s3 9 10 9M12 12c0-5 5-9 10-9s-7 9-10 9",
  "cat-doctor":       "M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1M8 15v1a4 4 0 0 0 4 4h0a4 4 0 0 0 4-4v-3",
  "cat-cook":         "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1v2H2v-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM5 19h14v2H5z",
  "cat-security":     "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  "cat-tutor":        "M22 10v6M2 10l10-5 10 5-10 5-10-5zM6 12v5c3 3 9 3 12 0v-5",
  "cat-delivery":     "M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2M14 17H9M7 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  "cat-mason":        "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  "cat-tailor":       "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM8 12h8M12 8v8",
  "cat-default":      "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 6v4l3 3",
  // ── General UI Icons ─────────────────────────────────────────────────────
  wrench:          "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  zap:             "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  stethoscope:     "M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1M8 15v1a4 4 0 0 0 4 4h0a4 4 0 0 0 4-4v-3",
  car:             "M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2M14 17H9M7 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  "paw-print":     "M7 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM5 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-7 1c-3 0-6 2-6 5s2 4 6 4 6-1 6-4-3-5-6-5z",
  home:            "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  globe:           "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 0c-2.22 4-3.33 8-3.33 10S9.78 16 12 18s3.33-4 3.33-6S14.22 6 12 2zm-10 10h20M2.5 9h19M2.5 15h19",
  map:             "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zm7-4v16m8-12v16",
  grid:            "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
  search:          "M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm4.243-1.757 4.245 4.242",
  x:               "M18 6 6 18M6 6l12 12",
  plus:            "M12 5v14M5 12h14",
  edit:            "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:           "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  phone:           "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.9 12 19.79 19.79 0 0 1 1.93 4.18 2 2 0 0 1 3.91 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  mail:            "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm16 2-8 5-8-5",
  user:            "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  users:           "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  layers:          "M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  check:           "M20 6 9 17l-5-5",
  "check-circle":  "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3",
  "x-circle":      "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm3-7l-6 6M9 9l6 6",
  "arrow-left":    "M19 12H5M12 19l-7-7 7-7",
  "arrow-right":   "M5 12h14M12 5l7 7-7 7",
  pin:             "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  logout:          "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  shield:          "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  lock:            "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
  calendar:        "M3 4h18v18H3zM16 2v4M8 2v4M3 10h18",
  clock:           "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 6v4l4 2",
  star:            "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  bell:            "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  briefcase:       "M20 7H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
  "trending-up":   "M22 7l-8.5 8.5L10 12l-7 7M15 7h7v7",
  "alert-circle":  "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 8v4m0 4h.01",
  info:            "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 8v4m0-8h.01",
  "chevron-down":  "M6 9l6 6 6-6",
  "chevron-right": "M9 18l6-6-6-6",
  "filter":        "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  "list":          "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  "menu":          "M3 12h18M3 6h18M3 18h18",
  "message-circle":"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  "send":          "M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z",
  "upload":        "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  "navigation":    "M3 11l19-9-9 19-2-8-8-2z",
  "map-pin":       "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  "chevron-up":    "M18 15l-6-6-6 6",
  "credit-card":   "M1 4h22v16H1zM1 10h22",
  "eye":           "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  "eye-off":       "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22",
  "user-plus":     "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11h-6",
  "settings":      "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  "log-out":        "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  // ── New icons for improved three-dot menu & pricing ──────────────────────
  "more-vertical":  "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0-7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  "sun":            "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-15v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M2 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42",
  "moon":           "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  "tag":            "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01",
  "indianrupee":    "M6 3h12M6 8h12M15.5 21 6 8M9 21l6.5-13",
  "percent":        "M19 5 5 19M6.5 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm11 11a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  "sliders":        "M4 21v-7m0-4V3M12 21V12m0-4V3M20 21v-5m0-4V3M1 14h6M9 8h6M17 16h6",
  "layout-grid":    "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
  "dollar-sign":    "M12 1v22M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6",
  "zap-off":        "M12.41 6.75 13 2l-2 2.5M18.57 12.91 21 10h-5.34M8 8l-5 6h9l-1 8 5-6M1 1l22 22",
  "wallet":         "M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm-9 9H6M21 9H3",
};

// ─── Core Icon Component ──────────────────────────────────────────────────────
export default function Icon({ name, size = 18, color = "currentColor", strokeWidth = 1.8 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle" }}
      aria-hidden="true"
    >
      <path d={PATHS[name] || PATHS["cat-default"]} />
    </svg>
  );
}

// ─── Comprehensive Category → Icon Mapping ────────────────────────────────────
const CAT_MAP = {
  // by stored icon field value
  "wrench":            "cat-plumber",
  "zap":               "cat-electrician",
  "home":              "cat-mason",
  "car":               "cat-car",
  "layers":            "cat-painter",
  "globe":             "cat-cleaner",
  "paw-print":         "cat-gardener",
  "briefcase":         "cat-default",
  "stethoscope":       "cat-doctor",
  "shield":            "cat-security",
  "star":              "cat-default",
  "phone":             "cat-default",
  // by name (all lowercase)
  "plumber":           "cat-plumber",
  "plumbing":          "cat-plumber",
  "pipe":              "cat-plumber",
  "electrician":       "cat-electrician",
  "electric":          "cat-electrician",
  "electrical":        "cat-electrician",
  "wiring":            "cat-electrician",
  "power":             "cat-electrician",
  "carpenter":         "cat-carpenter",
  "carpentry":         "cat-carpenter",
  "wood":              "cat-carpenter",
  "furniture":         "cat-carpenter",
  "mechanic":          "cat-mechanic",
  "repair":            "cat-mechanic",
  "tool":              "cat-mechanic",
  "car mechanic":      "cat-car",
  "auto mechanic":     "cat-car",
  "vehicle":           "cat-car",
  "automobile":        "cat-car",
  "bike mechanic":     "cat-bike",
  "motorcycle":        "cat-bike",
  "two-wheeler":       "cat-bike",
  "scooter":           "cat-bike",
  "painter":           "cat-painter",
  "painting":          "cat-painter",
  "wall":              "cat-painter",
  "ac mechanic":       "cat-ac",
  "ac technician":     "cat-ac",
  "air conditioning":  "cat-ac",
  "air conditioner":   "cat-ac",
  "hvac":              "cat-ac",
  "ac service":        "cat-ac",
  "cooling":           "cat-ac",
  "house cleaner":     "cat-cleaner",
  "home cleaner":      "cat-cleaner",
  "cleaner":           "cat-cleaner",
  "cleaning":          "cat-cleaner",
  "housekeeping":      "cat-cleaner",
  "maid":              "cat-cleaner",
  "gardener":          "cat-gardener",
  "gardening":         "cat-gardener",
  "garden":            "cat-gardener",
  "lawn":              "cat-gardener",
  "landscaping":       "cat-gardener",
  "doctor":            "cat-doctor",
  "nurse":             "cat-doctor",
  "medical":           "cat-doctor",
  "health":            "cat-doctor",
  "cook":              "cat-cook",
  "chef":              "cat-cook",
  "cooking":           "cat-cook",
  "catering":          "cat-cook",
  "food":              "cat-cook",
  "security":          "cat-security",
  "guard":             "cat-security",
  "tutor":             "cat-tutor",
  "teacher":           "cat-tutor",
  "education":         "cat-tutor",
  "delivery":          "cat-delivery",
  "courier":           "cat-delivery",
  "driver":            "cat-delivery",
  "mason":             "cat-mason",
  "masonry":           "cat-mason",
  "construction":      "cat-mason",
  "tailor":            "cat-tailor",
  "stitching":         "cat-tailor",
  "clothing":          "cat-tailor",
  "alterations":       "cat-tailor",
};

/**
 * Maps a category name OR icon string → a canonical cat-* icon key.
 * Tries exact match first, then partial match.
 */
export function getCategoryIcon(iconOrName) {
  if (!iconOrName) return "cat-default";
  const key = String(iconOrName).toLowerCase().trim();
  if (CAT_MAP[key]) return CAT_MAP[key];
  // partial / word-boundary match
  for (const [k, v] of Object.entries(CAT_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return "cat-default";
}

// ─── Icon Registry (for picker) ───────────────────────────────────────────────
export const ICON_REGISTRY = [
  { key: "cat-plumber",     label: "Plumber / Pipe",       tags: ["plumber","pipe","water","fix"] },
  { key: "cat-electrician", label: "Electrician / Power",  tags: ["electric","wiring","bolt","power","zap"] },
  { key: "cat-carpenter",   label: "Carpenter / Joinery",  tags: ["wood","furniture","carpentry","joiner"] },
  { key: "cat-mechanic",    label: "Mechanic / Repair",    tags: ["repair","tool","wrench","fix"] },
  { key: "cat-car",         label: "Car / Vehicle",        tags: ["car","auto","vehicle","automobile"] },
  { key: "cat-bike",        label: "Bike / Motorcycle",    tags: ["bike","scooter","moto","two-wheeler"] },
  { key: "cat-painter",     label: "Painter / Decorator",  tags: ["paint","wall","decor","colour"] },
  { key: "cat-ac",          label: "AC / HVAC",            tags: ["ac","air","cooling","hvac","cold"] },
  { key: "cat-cleaner",     label: "Cleaner / Housekeeping",tags: ["clean","maid","house","sweep"] },
  { key: "cat-gardener",    label: "Gardener / Landscaper",tags: ["garden","lawn","plant","tree"] },
  { key: "cat-doctor",      label: "Doctor / Medical",     tags: ["doctor","nurse","health","medical"] },
  { key: "cat-cook",        label: "Cook / Chef",          tags: ["cook","chef","food","catering"] },
  { key: "cat-security",    label: "Security / Guard",     tags: ["security","guard","protect","safety"] },
  { key: "cat-tutor",       label: "Tutor / Teacher",      tags: ["teach","tutor","school","education"] },
  { key: "cat-delivery",    label: "Delivery / Driver",    tags: ["deliver","courier","driver","transport"] },
  { key: "cat-mason",       label: "Mason / Construction", tags: ["mason","build","concrete","construct"] },
  { key: "cat-tailor",      label: "Tailor / Stitching",   tags: ["tailor","stitch","cloth","alter"] },
  { key: "cat-default",     label: "General / Other",      tags: ["other","general","misc","service"] },
];

/** Returns true if `icon` is a custom uploaded image (URL/path) rather than a preset key. */
export function isImageIcon(icon) {
  return typeof icon === "string" && (icon.startsWith("/uploads/") || icon.startsWith("http://") || icon.startsWith("https://") || icon.startsWith("data:"));
}

const ICON_API_BASE = (import.meta.env?.VITE_API_URL || "/api").replace(/\/api\/?$/, "");

export function resolveIconUrl(icon) {
  if (icon.startsWith("/uploads/")) return `${ICON_API_BASE}${icon}`;
  return icon;
}

/**
 * CategoryLabel – renders icon + name inline.
 * Usage: <CategoryLabel name={cat.name} icon={cat.icon} size={14} />
 */
export function CategoryLabel({
  name, icon, size = 14,
  color = "var(--primary)", showName = true, gap = 5,
}) {
  const { t } = useTranslation();
  const translatedName = t(`categoryNames.${name}`, { defaultValue: name });
  const iconSize = Math.max(size + 2, 18);
  const imgSize = Math.max(iconSize, 22);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap }}>
      {isImageIcon(icon) ? (
        <img
          src={resolveIconUrl(icon)} alt=""
          width={imgSize} height={imgSize}
          style={{ objectFit: "cover", borderRadius: 5, flexShrink: 0, border: "1px solid var(--border)" }}
        />
      ) : (
        <Icon name={getCategoryIcon(icon || name)} size={iconSize} color={color} strokeWidth={1.9} />
      )}
      {showName && <span style={{ lineHeight: 1 }}>{translatedName}</span>}
    </span>
  );
}

/**
 * CategoryChip – pill badge with icon+name. Used in filters, tags, breadcrumbs.
 */
export function CategoryChip({
  name, icon, size = 13, iconSize: iconSizeProp,
  bg = "var(--primary-bg)", border = "var(--primary-border)", color = "var(--primary)",
  onClick, style = {},
}) {
  const { t } = useTranslation();
  const iconSize = iconSizeProp ?? Math.max(16, size + 4);
  const hasImage = isImageIcon(icon);
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: bg, border: `1px solid ${border}`, color,
        fontSize: size, fontWeight: 700,
        padding: hasImage ? "3px 10px 3px 3px" : "4px 10px 4px 6px",
        borderRadius: 99,
        fontFamily: "'Manrope',sans-serif", cursor: onClick ? "pointer" : "default",
        whiteSpace: "nowrap", ...style,
      }}
    >
      {hasImage ? (
        <img
          src={resolveIconUrl(icon)} alt=""
          width={iconSize + 2} height={iconSize + 2}
          style={{ objectFit: "cover", borderRadius: "50%", flexShrink: 0, border: "1.5px solid var(--primary-border)" }}
        />
      ) : (
        <Icon name={getCategoryIcon(icon || name)} size={iconSize} color={color} strokeWidth={2} />
      )}
      {t(`categoryNames.${name}`, { defaultValue: name })}
    </span>
  );
}

/**
 * CategoryCard – big card for category grid displays.
 */
export function CategoryCard({
  name, icon, workerCount = 0, selected = false, onClick,
}) {
  const { t } = useTranslation();
  const translatedName = t(`categoryNames.${name}`, { defaultValue: name });
  const primary = "var(--primary)";
  const activeBg = "var(--primary-bg)";
  const activeBorder = "var(--primary-border)";
  const hasImage = isImageIcon(icon);
  return (
    <div
      onClick={onClick}
      className="gs-cat-card"
      style={{
        border: `2px solid ${selected ? activeBorder : "var(--border)"}`,
        background: selected ? activeBg : "var(--surface)",
        cursor: "pointer",
        borderRadius: 16,
        padding: "20px 14px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        transition: "all .18s ease",
        boxShadow: selected ? "0 6px 20px rgba(37,99,235,.16)" : "0 2px 6px rgba(0,0,0,.07)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Selected indicator top bar */}
      {selected && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "var(--grad-primary)", borderRadius: "16px 16px 0 0" }} />}
      {/* icon bubble */}
      <div style={{
        width: hasImage ? 76 : 72, height: hasImage ? 76 : 72,
        borderRadius: hasImage ? 18 : 18,
        background: hasImage ? "transparent" : (selected ? "var(--primary)" : "var(--surface-raised)"),
        border: hasImage ? "none" : `2px solid ${selected ? "var(--primary)" : "var(--border)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all .18s ease", overflow: "hidden",
        boxShadow: selected ? "0 6px 16px rgba(37,99,235,.28)" : (hasImage ? "0 2px 8px rgba(0,0,0,.12)" : "none"),
      }}>
        {hasImage ? (
          <img
            src={resolveIconUrl(icon)} alt={name}
            style={{ width: 76, height: 76, objectFit: "cover", borderRadius: 18, display: "block" }}
            onError={e => { e.target.style.display = "none"; }}
          />
        ) : (
          <Icon name={getCategoryIcon(icon || name)} size={32} color={selected ? "white" : primary} strokeWidth={1.8} />
        )}
      </div>
      {/* name */}
      <span style={{
        fontWeight: 700, fontSize: 12, color: selected ? primary : "var(--text)",
        fontFamily: "'Manrope',sans-serif", textAlign: "center", lineHeight: 1.35,
        maxWidth: "100%", wordBreak: "break-word",
      }}>
        {translatedName}
      </span>
      {/* worker count badge */}
      {workerCount > 0 && (
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: selected ? primary : "var(--muted)",
          background: selected ? "var(--primary-bg)" : "var(--surface-raised)",
          border: `1px solid ${selected ? activeBorder : "var(--border)"}`,
          padding: "2px 9px", borderRadius: 99,
        }}>
          {workerCount} {t(workerCount === 1 ? "workerCard.worker" : "workerCard.workers", { defaultValue: workerCount === 1 ? "worker" : "workers" })}
        </span>
      )}
    </div>
  );
}

// ─── Dynamic Worker Profile Banner System ─────────────────────────────────────
//
// Every service category gets a large, colourful, on-brand banner. Categories
// that match a known trade (plumber, electrician, gardener, …) use a
// hand-tuned premium gradient. Any category that doesn't match a known
// keyword — including brand-new ones created later in Admin → Categories —
// still gets a unique, good-looking, *stable* gradient theme automatically,
// derived from the category name itself. No code changes are ever required
// when a new category is added.

const BANNER_THEMES = {
  "cat-plumber":     { grad: "linear-gradient(135deg,#0c4a6e 0%,#0369a1 50%,#0ea5e9 100%)", glow: "rgba(14,165,233,.35)"  },
  "cat-electrician": { grad: "linear-gradient(135deg,#78350f 0%,#d97706 50%,#fbbf24 100%)", glow: "rgba(251,191,36,.35)"  },
  "cat-carpenter":   { grad: "linear-gradient(135deg,#3b1a08 0%,#78350f 40%,#b45309 75%,#d97706 100%)", glow: "rgba(180,83,9,.40)"   },
  "cat-mechanic":    { grad: "linear-gradient(135deg,#1e293b 0%,#334155 50%,#64748b 100%)", glow: "rgba(100,116,139,.35)" },
  "cat-car":         { grad: "linear-gradient(135deg,#1e1b4b 0%,#4338ca 50%,#6366f1 100%)", glow: "rgba(99,102,241,.35)"  },
  "cat-bike":        { grad: "linear-gradient(135deg,#3b0764 0%,#7e22ce 50%,#a855f7 100%)", glow: "rgba(168,85,247,.35)"  },
  "cat-painter":     { grad: "linear-gradient(135deg,#831843 0%,#db2777 50%,#f472b6 100%)", glow: "rgba(244,114,182,.35)" },
  "cat-ac":          { grad: "linear-gradient(135deg,#082f49 0%,#0891b2 50%,#22d3ee 100%)", glow: "rgba(34,211,238,.35)"  },
  "cat-cleaner":     { grad: "linear-gradient(135deg,#042f2e 0%,#0d9488 50%,#2dd4bf 100%)", glow: "rgba(45,212,191,.35)"  },
  "cat-gardener":    { grad: "linear-gradient(135deg,#14532d 0%,#16a34a 50%,#4ade80 100%)", glow: "rgba(74,222,128,.35)"  },
  "cat-doctor":      { grad: "linear-gradient(135deg,#7f1d1d 0%,#dc2626 50%,#f87171 100%)", glow: "rgba(248,113,113,.35)" },
  "cat-cook":        { grad: "linear-gradient(135deg,#7c2d12 0%,#ea580c 50%,#fb923c 100%)", glow: "rgba(251,146,60,.35)"  },
  "cat-security":    { grad: "linear-gradient(135deg,#0f172a 0%,#1e3a8a 50%,#3b82f6 100%)", glow: "rgba(59,130,246,.35)"  },
  "cat-tutor":       { grad: "linear-gradient(135deg,#1e1b4b 0%,#4f46e5 50%,#818cf8 100%)", glow: "rgba(129,140,248,.35)" },
  "cat-delivery":    { grad: "linear-gradient(135deg,#7c2d12 0%,#f97316 50%,#fdba74 100%)", glow: "rgba(249,115,22,.35)"  },
  "cat-mason":       { grad: "linear-gradient(135deg,#292524 0%,#57534e 50%,#a8a29e 100%)", glow: "rgba(168,162,158,.35)" },
  "cat-tailor":      { grad: "linear-gradient(135deg,#500724 0%,#be185d 50%,#f472b6 100%)", glow: "rgba(244,114,182,.35)" },
};

// Rotating fallback palette for categories that don't match a known keyword.
// Selection is deterministic (hashed from the category name) so the same
// category always renders the same theme, while still being visually distinct
// from other unmatched categories.
const FALLBACK_THEMES = [
  { grad: "linear-gradient(135deg,#1e1b4b 0%,#4338ca 50%,#818cf8 100%)", glow: "rgba(129,140,248,.35)" },
  { grad: "linear-gradient(135deg,#082f49 0%,#0284c7 50%,#38bdf8 100%)", glow: "rgba(56,189,248,.35)"  },
  { grad: "linear-gradient(135deg,#3b0764 0%,#9333ea 50%,#c084fc 100%)", glow: "rgba(192,132,252,.35)" },
  { grad: "linear-gradient(135deg,#052e16 0%,#15803d 50%,#4ade80 100%)", glow: "rgba(74,222,128,.35)"  },
  { grad: "linear-gradient(135deg,#78350f 0%,#c2410c 50%,#fb923c 100%)", glow: "rgba(251,146,60,.35)"  },
  { grad: "linear-gradient(135deg,#500724 0%,#be123c 50%,#fb7185 100%)", glow: "rgba(251,113,133,.35)" },
  { grad: "linear-gradient(135deg,#0f172a 0%,#0f766e 50%,#2dd4bf 100%)", glow: "rgba(45,212,191,.35)"  },
  { grad: "linear-gradient(135deg,#1e293b 0%,#475569 50%,#94a3b8 100%)", glow: "rgba(148,163,184,.35)" },
];

/** Tiny, deterministic string hash (no external deps). */
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

/** True if `value` is a valid hex color like #2563eb or #fff. */
function isValidHexColor(value) {
  return typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function hexToRgb(hex) {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/** Lightens (positive amount, 0..1) or darkens (negative amount) a hex color. */
function shadeColor(hex, amount) {
  try {
    const { r, g, b } = hexToRgb(hex);
    const target = amount < 0 ? 0 : 255;
    const p = Math.min(1, Math.abs(amount));
    const mix = (c) => Math.round(c + (target - c) * p);
    const toHex = (c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0");
    return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
  } catch { return hex; }
}

/** Builds a banner theme `{ grad, glow }` from a single admin-picked hex color. */
function buildThemeFromColor(hex) {
  const base = hex.trim();
  const dark = shadeColor(base, -0.45);
  const light = shadeColor(base, 0.28);
  const { r, g, b } = hexToRgb(base);
  return {
    grad: `linear-gradient(135deg, ${dark} 0%, ${base} 55%, ${light} 100%)`,
    glow: `rgba(${r},${g},${b},.35)`,
  };
}

/**
 * Resolves a colour theme `{ grad, glow }` for any category — known or brand-new.
 * Accepts a category name and/or its stored icon value, and an optional
 * Admin-configured `bannerColor` (hex). When a valid bannerColor is supplied
 * it always takes precedence — this is the single source of truth set from
 * the Admin Panel's Category Management screen. Categories without a
 * configured colour fall back to the existing hand-tuned/derived themes so
 * older data keeps working exactly as before.
 */
export function getCategoryTheme(name, icon, bannerColor) {
  if (isValidHexColor(bannerColor)) {
    return buildThemeFromColor(bannerColor);
  }
  const matchedKey = getCategoryIcon(icon || name);
  if (matchedKey !== "cat-default" && BANNER_THEMES[matchedKey]) {
    return BANNER_THEMES[matchedKey];
  }
  const seed = String(name || icon || "general").toLowerCase().trim();
  return FALLBACK_THEMES[hashString(seed) % FALLBACK_THEMES.length];
}

/**
 * CategoryBanner – large, colourful, fully dynamic profession banner.
 * Shown behind/alongside the existing initials-based avatar wherever a
 * worker's profile is displayed. New categories automatically receive a
 * themed banner with zero additional code.
 *
 * size: "sm" (worker cards / list rows) · "md" (booking summaries) · "lg" (profile hero)
 */
export function CategoryBanner({
  name, icon, bannerColor, size = "md", rounded, className = "", style = {},
  showLabel = true,   // set false on profile heroes to move label below avatar
}) {
  const { t } = useTranslation();
  const hasCategory = !!(name || icon);
  const label = hasCategory
    ? t(`categoryNames.${name}`, { defaultValue: name || "" })
    : t("workerCard.serviceProfessional", { defaultValue: "Service Professional" });
  const theme = getCategoryTheme(name, icon, bannerColor);
  const iconKey = getCategoryIcon(icon || name);
  // The single source of truth for the banner's right-side visual: the
  // Admin-uploaded category image. If the Admin hasn't uploaded one, we fall
  // back to the decorative line-icon watermark — never to a hardcoded photo.
  const hasImage = isImageIcon(icon);

  const DIMS = {
    sm: { height: 76,  font: 14, iconSize: 60,  pad: 16 },
    md: { height: 120, font: 18, iconSize: 92,  pad: 22 },
    lg: { height: 180, font: 26, iconSize: 150, pad: 30 },
  };
  const d = DIMS[size] || DIMS.md;
  const radius = rounded ?? (size === "lg" ? 0 : 16);
  const imgBadgeSize = Math.round(d.height * 0.66);

  return (
    <div
      className={`gs-cat-banner ${className}`}
      style={{
        position: "relative", overflow: "hidden", isolation: "isolate",
        height: d.height, borderRadius: radius,
        background: theme.grad,
        boxShadow: `0 8px 28px ${theme.glow}`,
        ...style,
      }}
    >
      {/* decorative glows */}
      <div aria-hidden="true" style={{
        position: "absolute", top: -d.height * 0.35, right: -d.height * 0.22,
        width: d.height * 1.1, height: d.height * 1.1, borderRadius: "50%",
        background: "rgba(255,255,255,.10)", pointerEvents: "none",
      }} />
      <div aria-hidden="true" style={{
        position: "absolute", bottom: -d.height * 0.45, left: d.height * 0.25,
        width: d.height * 0.85, height: d.height * 0.85, borderRadius: "50%",
        background: "rgba(255,255,255,.06)", pointerEvents: "none",
      }} />
      {/* right-side category visual — the Admin-uploaded image when one
          exists (always kept in sync, since it's read straight from the
          category record), otherwise a decorative watermark icon. */}
      {hasImage ? (
        <img
          src={resolveIconUrl(icon)}
          alt={label}
          width={imgBadgeSize}
          height={imgBadgeSize}
          style={{
            position: "absolute", top: "50%", right: d.pad,
            transform: "translateY(-50%)",
            width: imgBadgeSize, height: imgBadgeSize,
            borderRadius: Math.round(imgBadgeSize * 0.26),
            objectFit: "cover",
            border: "3px solid rgba(255,255,255,.85)",
            boxShadow: "0 6px 18px rgba(0,0,0,.25)",
            background: "rgba(255,255,255,.15)",
          }}
          onError={e => { e.currentTarget.style.display = "none"; }}
        />
      ) : (
        <div aria-hidden="true" style={{
          position: "absolute", right: -d.pad * 0.3, bottom: -d.pad * 0.6,
          opacity: 0.18, transform: "rotate(-10deg)", pointerEvents: "none",
        }}>
          <Icon name={iconKey} size={d.iconSize} color="#ffffff" strokeWidth={1.1} />
        </div>
      )}
      {/* category label — hidden when showLabel=false (e.g. profile hero pages
          where the avatar sits over the banner).
          Label is anchored to the RIGHT side so it is always fully visible
          regardless of a left-side profile picture that may overlap the banner.
          When a real category image is shown, the label shifts further left
          so it never overlaps the image badge. */}
      {showLabel && (
        <div
          data-role="banner-label"
          style={{
            position: "absolute",
            top: "50%", transform: "translateY(-50%)",
            right: hasImage ? d.pad + imgBadgeSize + 14 : d.pad,
            maxWidth: hasImage ? "44%" : "60%",
            color: "#fff", fontWeight: 900, letterSpacing: ".04em",
            fontSize: d.font, fontFamily: "'Bricolage Grotesque',sans-serif",
            textTransform: "uppercase", textShadow: "0 2px 14px rgba(0,0,0,.45)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            textAlign: "right",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

/**
 * CategoryListItem – horizontal row layout for lists (admin tables, profiles).
 */
export function CategoryListItem({
  name, icon, subtitle, size = 22,
  color = "var(--primary)", style = {},
}) {
  const { t } = useTranslation();
  const translatedName = t(`categoryNames.${name}`, { defaultValue: name });
  const hasImage = isImageIcon(icon);
  const bubbleSize = hasImage ? 52 : size + 20;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, ...style,
    }}>
      <div style={{
        width: bubbleSize, height: bubbleSize,
        borderRadius: hasImage ? 14 : 12,
        background: hasImage ? "transparent" : "var(--primary-bg)",
        border: hasImage ? "none" : "1.5px solid var(--primary-border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,.08)",
      }}>
        {hasImage ? (
          <img
            src={resolveIconUrl(icon)} alt=""
            width={bubbleSize} height={bubbleSize}
            style={{ objectFit: "cover", borderRadius: 14, display: "block" }}
          />
        ) : (
          <Icon name={getCategoryIcon(icon || name)} size={size} color={color} strokeWidth={1.9} />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "'Manrope',sans-serif", color: "var(--text)" }}>
          {translatedName}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{subtitle}</div>
        )}
      </div>
    </div>
  );
}
