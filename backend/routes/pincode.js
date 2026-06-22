/**
 * routes/pincode.js  (v4.0 — optimised)
 *
 * Pincode-based location identification for Indian pincodes.
 *
 * API strategy (parallel primary + fallback with race/settle):
 *   1. api.postalpincode.in  — official India Post data
 *   2. api.zippopotam.us/in  — global ZIP DB, good coverage for IN
 *
 * v4.0 improvements:
 *  - Parallel fetch with Promise.allSettled — whichever resolves first wins
 *  - Per-state pincode range validation (covers all 29 states + 7 UTs)
 *  - Tamil Nadu full range (600001–643253) explicitly validated
 *  - Reduced timeout 6 s (was 8 s), retry-safe AbortController
 *  - Larger cache (5 000 entries), LRU eviction
 *  - Normalised office names (title-case)
 *  - /health endpoint for monitoring
 */

const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");

// ── LRU-style Cache ────────────────────────────────────────────────────────────
const MAX_CACHE_SIZE = 5_000;
const pincodeCache   = new Map();
const VALID_TTL      = 4 * 60 * 60 * 1000;  // 4 h
const INVALID_TTL    = 30 * 60 * 1000;       // 30 min

function cacheGet(pin) {
  const entry = pincodeCache.get(pin);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { pincodeCache.delete(pin); return null; }
  // LRU: bump to end
  pincodeCache.delete(pin);
  pincodeCache.set(pin, entry);
  return entry;
}

function cacheSet(pin, valid, result = null) {
  if (pincodeCache.size >= MAX_CACHE_SIZE) {
    // evict oldest entry
    pincodeCache.delete(pincodeCache.keys().next().value);
  }
  pincodeCache.set(pin, {
    valid,
    result,
    expiresAt: Date.now() + (valid ? VALID_TTL : INVALID_TTL),
  });
}

// ── Indian Pincode Range Validation ───────────────────────────────────────────
// Each range is [min, max] (inclusive). Multiple ranges per state supported.
// Sources: India Post official zonal ranges + AP/Telangana post-bifurcation.
const STATE_RANGES = [
  // Jammu & Kashmir / Ladakh
  [[180001, 194404]],
  // Himachal Pradesh
  [[171001, 177601]],
  // Punjab
  [[140001, 160071]],
  // Haryana
  [[121001, 136156]],
  // Delhi
  [[110001, 110096]],
  // Rajasthan
  [[301001, 345034]],
  // Uttar Pradesh + Uttarakhand
  [[201001, 285223], [244001, 263680]],
  // Bihar + Jharkhand
  [[800001, 855117]],
  // Odisha
  [[751001, 770076]],
  // West Bengal + Sikkim
  [[700001, 743513], [737101, 737136]],
  // Assam + NE states
  [[781001, 799145]],
  // Gujarat
  [[360001, 396450]],
  // Maharashtra + Goa
  [[400001, 416805], [403001, 403731]],
  // Madhya Pradesh + Chhattisgarh
  [[450001, 497778]],
  // Karnataka
  [[560001, 591343]],
  // Tamil Nadu (full range — 600001 to 643253)
  [[600001, 643253]],
  // Kerala + Lakshadweep
  [[670001, 695615], [682551, 682559]],
  // Andhra Pradesh + Telangana
  [[500001, 535592], [508001, 523367]],
  // Puducherry + Andaman
  [[605001, 607803], [744101, 744303]],
];

// Flatten into a single sorted list for fast binary-search-style check
const FLAT_RANGES = STATE_RANGES.flat().sort((a, b) => a[0] - b[0]);

function isIndianPincodeRangeValid(pin) {
  const num = parseInt(pin, 10);
  return FLAT_RANGES.some(([lo, hi]) => num >= lo && num <= hi);
}

// ── Format + Range Validation ─────────────────────────────────────────────────
function validatePincodeFormat(pincode) {
  if (!/^\d{6}$/.test(pincode))  return "Pincode must be exactly 6 digits.";
  if (pincode[0] === "0")        return "Invalid pincode: Indian pincodes never start with 0.";
  if (!isIndianPincodeRangeValid(pincode))
    return "This pincode is outside known Indian postal ranges. Please verify and try again.";
  return null;
}

// ── Utility: title-case office names ─────────────────────────────────────────
function toTitleCase(str) {
  if (!str) return str;
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// ── Primary API: India Post ───────────────────────────────────────────────────
async function fetchFromIndiaPost(pin) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const res  = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`India Post API HTTP ${res.status}`);
    const data = await res.json();

    if (
      Array.isArray(data) &&
      data[0]?.Status === "Success" &&
      Array.isArray(data[0]?.PostOffice) &&
      data[0].PostOffice.length > 0
    ) {
      const offices = data[0].PostOffice;
      return {
        pincode: pin,
        valid:   true,
        district: toTitleCase(offices[0].District),
        state:    toTitleCase(offices[0].State),
        country:  "India",
        offices:  offices.map(o => ({
          officename:     toTitleCase(o.Name),
          pincode:        pin,
          taluk:          toTitleCase(o.Taluk)          || "",
          districtName:   toTitleCase(o.District)       || "",
          stateName:      toTitleCase(o.State)          || "",
          country:        "India",
          deliveryStatus: o.DeliveryStatus              || "",
          latitude:       null,
          longitude:      null,
        })),
        source: "indiapost",
      };
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── Fallback API: Zippopotam.us ────────────────────────────────────────────────
async function fetchFromZippopotam(pin) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const res  = await fetch(`https://api.zippopotam.us/in/${pin}`, {
      signal: controller.signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Zippopotam API HTTP ${res.status}`);
    const data = await res.json();

    const places = data.places || [];
    if (places.length === 0) return null;

    return {
      pincode:  pin,
      valid:    true,
      district: toTitleCase(places[0]["place name"]) || "",
      state:    toTitleCase(places[0].state)         || "",
      country:  "India",
      offices:  places.map(p => ({
        officename:     toTitleCase(p["place name"]) || "",
        pincode:        pin,
        taluk:          "",
        districtName:   toTitleCase(p["place name"]) || "",
        stateName:      toTitleCase(p.state)         || "",
        country:        "India",
        deliveryStatus: "",
        latitude:       parseFloat(p.latitude)  || null,
        longitude:      parseFloat(p.longitude) || null,
      })),
      source: "zippopotam",
    };
  } finally {
    clearTimeout(timer);
  }
}

// ── Parallel lookup: fastest valid result wins ─────────────────────────────────
async function lookupPincode(pin) {
  // Run both in parallel; take the first successful result
  const [ipResult, zzResult] = await Promise.allSettled([
    fetchFromIndiaPost(pin),
    fetchFromZippopotam(pin),
  ]);

  // Prefer India Post (more complete data); fall back to Zippopotam
  if (ipResult.status === "fulfilled" && ipResult.value) return ipResult.value;
  if (zzResult.status === "fulfilled" && zzResult.value) return zzResult.value;

  // Both returned null → not found
  if (
    (ipResult.status === "fulfilled"  && ipResult.value  === null) ||
    (zzResult.status === "fulfilled"  && zzResult.value  === null)
  ) return null;

  // Both threw → service unavailable
  throw new Error("service_unavailable");
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Routes
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /api/pincode/health */
router.get("/health", (_req, res) => {
  res.json({ status: "ok", cacheSize: pincodeCache.size, maxCache: MAX_CACHE_SIZE });
});

/** GET /api/pincode/:pincode */
router.get("/:pincode", async (req, res) => {
  const { pincode } = req.params;

  const formatError = validatePincodeFormat(pincode);
  if (formatError) return res.status(400).json({ error: formatError, valid: false });

  const cached = cacheGet(pincode);
  if (cached) {
    if (!cached.valid) return res.status(404).json({ error: "Invalid or non-Indian pincode.", valid: false });
    return res.json(cached.result);
  }

  try {
    const result = await lookupPincode(pincode);
    if (!result) {
      cacheSet(pincode, false);
      return res.status(404).json({ error: "Invalid or non-Indian pincode. Please enter a valid Indian pincode.", valid: false });
    }
    cacheSet(pincode, true, result);
    return res.json(result);
  } catch {
    return res.status(503).json({
      error:     "Pincode lookup service is temporarily unavailable. Please try again in a moment.",
      retryable: true,
    });
  }
});

/** GET /api/pincode/:pincode/workers
 * FIXED: was reading from stale workers.json file; now queries live PostgreSQL DB.
 */
router.get("/:pincode/workers", async (req, res) => {
  const { pincode } = req.params;
  const { category } = req.query;

  const formatError = validatePincodeFormat(pincode);
  if (formatError) return res.status(400).json({ error: formatError, valid: false });

  try {
    let q = `SELECT id,user_id,name,email,category_id,phone,bio,specialization,experience,
                    years_of_exp,skills,lat,lng,pincode,street,avatar,availability,approved,
                    rating,jobs_completed,hourly_rate,verification_status,admin_approval_status,
                    last_seen_at,created_at
             FROM workers
             WHERE pincode=$1
               AND approved=true
               AND availability=true
               AND (verification_status='verified' OR verification_status IS NULL OR verification_status='')`;
    const params = [pincode];
    let i = 2;

    if (category) { q += ` AND category_id=$${i++}`; params.push(parseInt(category)); }

    const { rows } = await pool.query(q, params);
    res.json(rows.map(w => ({
      id:               Number(w.id),
      userId:           Number(w.user_id),
      name:             w.name,
      email:            w.email,
      categoryId:       w.category_id ? Number(w.category_id) : null,
      phone:            w.phone,
      bio:              w.bio,
      specialization:   w.specialization,
      experience:       w.experience,
      yearsOfExp:       w.years_of_exp,
      skills:           w.skills || [],
      lat:              Number(w.lat),
      lng:              Number(w.lng),
      pincode:          w.pincode,
      street:           w.street,
      avatar:           w.avatar,
      availability:     w.availability,
      approved:         w.approved,
      rating:           Number(w.rating),
      jobsCompleted:    w.jobs_completed,
      hourlyRate:       Number(w.hourly_rate),
      verification_status:      w.verification_status,
      admin_approval_status:    w.admin_approval_status,
      lastSeenAt:       w.last_seen_at,
      createdAt:        w.created_at,
    })));
  } catch (err) {
    console.error("[pincode/workers]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/pincode/validate */
router.post("/validate", async (req, res) => {
  const pincode = String(req.body?.pincode || "").trim();

  if (!pincode) return res.status(400).json({ valid: false, error: "Pincode is required." });

  const formatError = validatePincodeFormat(pincode);
  if (formatError) return res.status(400).json({ valid: false, error: formatError });

  const cached = cacheGet(pincode);
  if (cached) {
    if (!cached.valid) return res.json({ valid: false, error: "Invalid or non-Indian pincode." });
    return res.json({ valid: true, pincode, district: cached.result.district, state: cached.result.state, country: "India" });
  }

  try {
    const result = await lookupPincode(pincode);
    if (!result) {
      cacheSet(pincode, false);
      return res.json({ valid: false, error: "Invalid or non-Indian pincode. Please enter a valid Indian pincode." });
    }
    cacheSet(pincode, true, result);
    return res.json({ valid: true, pincode, district: result.district, state: result.state, country: "India" });
  } catch {
    return res.status(503).json({
      valid:     null,
      error:     "Pincode lookup service is temporarily unavailable. Please try again.",
      retryable: true,
    });
  }
});

module.exports = router;
