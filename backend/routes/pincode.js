/**
 * routes/pincode.js
 *
 * Pincode-based location identification API for Indian pincodes ONLY.
 * Validates that pincodes are real Indian pincodes using the India Post API.
 * Invalid, non-existent, or non-Indian pincodes are strictly rejected.
 *
 * Indian pincode rules:
 *  - Exactly 6 digits
 *  - First digit 1–9 (never 0)
 *  - Must resolve via India Post API to be accepted
 *
 * The lat/lng system is kept fully intact — pincode is an additional filter only.
 */

const express = require("express");
const router  = express.Router();

// In-memory cache so repeated lookups for same pincode don't re-fetch
// Cache stores { result, valid } — invalid pincodes are also cached to avoid repeat API hammering
const pincodeCache = new Map();

// Cache TTL: 1 hour for valid, 10 minutes for invalid
const VALID_TTL   = 60 * 60 * 1000;
const INVALID_TTL = 10 * 60 * 1000;

/**
 * Validates the format of a potential Indian pincode.
 * Returns an error string if invalid, or null if format is OK.
 */
function validatePincodeFormat(pincode) {
  if (!/^\d{6}$/.test(pincode)) {
    return "Pincode must be exactly 6 digits.";
  }
  if (pincode[0] === "0") {
    return "Invalid pincode: Indian pincodes never start with 0.";
  }
  return null; // format OK
}

/**
 * GET /api/pincode/:pincode
 * Returns location details for a valid Indian pincode.
 * Returns 400 for malformed, 404 for non-existent/non-Indian pincodes.
 */
router.get("/:pincode", async (req, res) => {
  const { pincode } = req.params;

  // Step 1: Format validation
  const formatError = validatePincodeFormat(pincode);
  if (formatError) {
    return res.status(400).json({ error: formatError, valid: false });
  }

  // Step 2: Check cache
  if (pincodeCache.has(pincode)) {
    const cached = pincodeCache.get(pincode);
    if (Date.now() < cached.expiresAt) {
      if (!cached.valid) {
        return res.status(404).json({ error: "Invalid or non-Indian pincode. Please enter a valid Indian pincode.", valid: false });
      }
      return res.json(cached.result);
    }
    // Expired — remove from cache and re-fetch
    pincodeCache.delete(pincode);
  }

  // Step 3: Live lookup via India Post API (Node 18+ native fetch)
  try {
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pincode}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) {
      throw new Error(`India Post API returned HTTP ${response.status}`);
    }

    const data = await response.json();

    // India Post returns Status "Success" only for valid, real Indian pincodes
    if (
      data &&
      Array.isArray(data) &&
      data[0]?.Status === "Success" &&
      Array.isArray(data[0]?.PostOffice) &&
      data[0].PostOffice.length > 0
    ) {
      const offices = data[0].PostOffice;
      const result = {
        pincode,
        valid:    true,
        district: offices[0].District,
        state:    offices[0].State,
        country:  "India",
        offices:  offices.map(o => ({
          officename:   o.Name,
          pincode,
          taluk:        o.Taluk     || "",
          districtName: o.District  || "",
          stateName:    o.State     || "",
          country:      "India",
          deliveryStatus: o.DeliveryStatus || "",
          latitude:     null,
          longitude:    null,
        })),
        source: "live",
      };
      pincodeCache.set(pincode, { valid: true, result, expiresAt: Date.now() + VALID_TTL });
      return res.json(result);
    }

    // India Post returned "Error" or empty PostOffice → pincode does not exist in India
    pincodeCache.set(pincode, { valid: false, expiresAt: Date.now() + INVALID_TTL });
    return res.status(404).json({
      error: "Invalid or non-Indian pincode. Please enter a valid Indian pincode.",
      valid: false,
    });

  } catch (err) {
    // Network/timeout error — do NOT fall back to fake data; return a retriable error
    console.error(`[Pincode] Lookup failed for ${pincode}:`, err.message);
    return res.status(503).json({
      error: "Pincode lookup service is temporarily unavailable. Please try again in a moment.",
      retryable: true,
    });
  }
});

/**
 * GET /api/pincode/:pincode/workers
 * Returns approved+verified workers in the same pincode area.
 * Pincode format is validated before querying; only valid 6-digit non-zero-start pincodes accepted.
 */
router.get("/:pincode/workers", (req, res) => {
  const { pincode } = req.params;
  const { category } = req.query;

  // Validate pincode format before querying workers
  const formatError = validatePincodeFormat(pincode);
  if (formatError) {
    return res.status(400).json({ error: formatError, valid: false });
  }

  const fs   = require("fs");
  const path = require("path");

  const WORKERS_FILE = path.join(__dirname, "../data/workers.json");
  let workers = JSON.parse(fs.readFileSync(WORKERS_FILE, "utf-8"));

  // Filter: approved + verified + same pincode (exact match)
  workers = workers.filter(w =>
    w.approved &&
    w.availability === true &&
    w.pincode === pincode &&
    (w.verification_status === "verified" || w.verification_status === undefined || w.verification_status === null)
  );

  if (category) {
    workers = workers.filter(w => w.categoryId === parseInt(category));
  }

  // Strip sensitive fields
  res.json(workers.map(w => {
    const { payoutAccount, ...safe } = w;
    return safe;
  }));
});

/**
 * POST /api/pincode/validate
 * Body: { pincode: "600001" }
 * Validates a pincode format + live existence check.
 * Returns { valid: true/false, district, state } or an error.
 * Use this for form-level validation before submitting signup/profile updates.
 */
router.post("/validate", async (req, res) => {
  const { pincode } = req.body;

  if (!pincode) {
    return res.status(400).json({ valid: false, error: "Pincode is required." });
  }

  const pin = String(pincode).trim();

  const formatError = validatePincodeFormat(pin);
  if (formatError) {
    return res.status(400).json({ valid: false, error: formatError });
  }

  // Check cache first
  if (pincodeCache.has(pin)) {
    const cached = pincodeCache.get(pin);
    if (Date.now() < cached.expiresAt) {
      if (!cached.valid) {
        return res.json({ valid: false, error: "Invalid or non-Indian pincode." });
      }
      return res.json({
        valid:    true,
        pincode:  pin,
        district: cached.result.district,
        state:    cached.result.state,
        country:  "India",
      });
    }
    pincodeCache.delete(pin);
  }

  // Live check
  try {
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pin}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await response.json();

    if (
      data &&
      Array.isArray(data) &&
      data[0]?.Status === "Success" &&
      Array.isArray(data[0]?.PostOffice) &&
      data[0].PostOffice.length > 0
    ) {
      const offices = data[0].PostOffice;
      const result = {
        pincode: pin,
        valid:    true,
        district: offices[0].District,
        state:    offices[0].State,
        country:  "India",
        offices:  offices.map(o => ({
          officename:   o.Name,
          pincode:      pin,
          taluk:        o.Taluk     || "",
          districtName: o.District  || "",
          stateName:    o.State     || "",
          country:      "India",
          deliveryStatus: o.DeliveryStatus || "",
          latitude:     null,
          longitude:    null,
        })),
        source: "live",
      };
      pincodeCache.set(pin, { valid: true, result, expiresAt: Date.now() + VALID_TTL });
      return res.json({ valid: true, pincode: pin, district: offices[0].District, state: offices[0].State, country: "India" });
    }

    pincodeCache.set(pin, { valid: false, expiresAt: Date.now() + INVALID_TTL });
    return res.json({ valid: false, error: "Invalid or non-Indian pincode. Please enter a valid Indian pincode." });

  } catch (err) {
    console.error(`[Pincode/validate] Lookup failed for ${pin}:`, err.message);
    return res.status(503).json({
      valid:     null, // null = unknown due to service error
      error:     "Pincode lookup service is temporarily unavailable. Please try again.",
      retryable: true,
    });
  }
});

module.exports = router;
