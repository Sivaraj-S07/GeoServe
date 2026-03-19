# GeoServe — Changelog

## [Fixes v2] — 2026-03-17 (This Release)

### 🐛 Critical Bug Fixes

#### 1. Pincode validation accepts any 6-digit number — invalid/non-Indian pincodes silently accepted (`routes/pincode.js`)
- **Root cause:** Old code had a fallback that generated fake placeholder data (`Area-XXX`, `District-XXX`) for any unrecognised pincode. This meant `000000`, `999999`, or foreign pincodes were silently "accepted" with fabricated district/state data.
- **Fix:** Removed the fake fallback entirely. The API now:
  - Rejects pincodes starting with `0` (no valid Indian pincode starts with 0)
  - Calls the India Post API and only accepts pincodes where `Status === "Success"`
  - Returns HTTP 404 `{ valid: false }` for non-existent/non-Indian pincodes
  - Returns HTTP 503 `{ retryable: true }` on network timeouts — never fake data
- **Impact:** Fixes all 5 pincode requirements — only real, valid Indian pincodes are accepted.

#### 2. Mock data table bypassed real validation (`routes/pincode.js`)
- **Root cause:** A hardcoded `MOCK_PINCODES` table short-circuited the live India Post check. The mock pincodes were returned without TTL so they stayed cached forever. Other pincodes triggered the fake fallback (Bug #1).
- **Fix:** Removed the mock table. All lookups go through India Post API. Cache now has 1-hour TTL for valid and 10-minute TTL for invalid pincodes.

#### 3. New `POST /api/pincode/validate` endpoint added (`routes/pincode.js`)
- **Added:** A dedicated validation endpoint for pre-submission form checks.
- Returns `{ valid: true, district, state, country: "India" }` or `{ valid: false, error }`.

#### 4. Workers-by-pincode endpoint had no input validation (`routes/pincode.js`)
- **Fix:** Added `validatePincodeFormat()` check before querying workers; returns 400 for bad pincodes.
- Also now filters workers by `verification_status === "verified"` (was missing from this endpoint).

#### 5. Default lat/lng on signup was New York City, USA (`routes/auth.js`)
- **Root cause:** Fallback coordinates were `40.7128, -74.006` (New York).
- **Fix:** Changed defaults to India's geographic center: `20.5937, 78.9629`.

#### 6. Worker pincode & street not synced on profile update (`routes/auth.js`)
- **Root cause:** `PUT /api/auth/profile` updated the users table but the worker sync block only mirrored `name`, `email`, `avatar`, `lat`, `lng` — not `pincode` or `street`.
- **Fix:** Added `pincode` and `street` to the worker sync block.
- **Impact:** Workers' service area (pincode) now stays accurate in the workers table when they edit their profile. Pincode-based worker search works correctly.

#### 7. PincodeSelector showed generic error for all failures (`frontend/src/components/PincodeSelector.jsx`)
- **Fix:** Error handling now distinguishes HTTP 400 (bad format) / 404 (not found in India) / 503 (service down, retryable). Client-side also rejects pincodes starting with `0` before calling the API.

#### 8. Missing `validatePincode` export in frontend API (`frontend/src/api/index.js`)
- **Added:** `export const validatePincode = (pincode) => api.post("/pincode/validate", { pincode }).then(r => r.data);`

---

## [Fixes v1] — 2026-03-17

### 🐛 Backend Bug Fixes

#### 9. Pincode lookup failing for all non-mock pincodes (`routes/pincode.js`)
- **Root cause:** Dynamic `import('node-fetch')` call failed silently because `node-fetch` was not in `package.json`.
- **Fix:** Replaced with Node 18's built-in global `fetch`.

#### 10. Route shadowing in verification endpoints (`routes/verification.js`)
- **Root cause:** `/stats` and `/file/:filename` defined after `/:workerId/*` routes so Express matched the string against the param first.
- **Fix:** Moved static routes above parameterised ones.

#### 11. Payment bypass in booking confirmation (`routes/bookings.js`)
- **Root cause:** `PATCH /:id/status` allowed direct `status=confirmed`, skipping the split-payment pipeline.
- **Fix:** Removed the user shortcut; all confirmations must go through `POST /:id/confirm`.

---

### 🚀 Deployment Checklist

**On Render (Backend):**
1. Set `CORS_ORIGIN` = `https://your-frontend.vercel.app,https://your-admin.vercel.app` (no trailing slashes, comma-separated)
2. Set `JWT_SECRET` to a strong random string (use Render's "Generate Value")
3. Node version is automatically set to 20 via `render.yaml`

**On Vercel (Frontend project):**
1. Set environment variable `VITE_API_URL` = `https://your-backend.onrender.com/api`
2. Root directory: `frontend`

**On Vercel (Admin panel project):**
1. Set environment variable `VITE_API_URL` = `https://your-backend.onrender.com/api`
2. Root directory: `admin-panel`

> **Most common cause of login failing after deployment:** `VITE_API_URL` not set in Vercel, or `CORS_ORIGIN` not updated in Render to include the Vercel frontend URLs.

---

## [History Feature] — 2026-03-18 (This Release)

### ✨ New Features

#### 1. Activity History System
- **New:** `backend/services/historyService.js` — standalone service (no circular deps) that handles all read/write/CSV operations on `backend/data/history.json`
- **New:** `backend/routes/history.js` — three admin-only endpoints:
  - `GET /api/history` — fetch all entries, filterable by `?type=` and `?limit=`
  - `GET /api/history/download` — streams a dated `.csv` file to the browser
  - `DELETE /api/history` — wipes all history and resets to empty

#### 2. User & Worker Login Tracking
- `backend/routes/auth.js` now calls `addHistoryEntry()` on every successful login for `user` and `worker` roles (admin logins are intentionally excluded)
- Records: type, actor name, email, role, timestamp

#### 3. Booking Creation Tracking
- `backend/routes/bookings.js` now calls `addHistoryEntry()` after every new booking is saved
- Records: type, user info, worker name, category, date, cost, status

#### 4. Admin Panel — History Page (`admin-panel/src/pages/HistoryPage.jsx`)
- Summary pills showing total counts for User Logins, Worker Logins, Bookings
- Filter tabs: All / User Logins / Worker Logins / Bookings
- Live search across name, email, details fields
- Paginated table (25 per page) with type badges, role badges, timestamps, time-ago
- **Download CSV** — fetches `/api/history/download` and triggers a native browser download
- **Clear History** — confirmation modal before permanently wiping entries
- Tip bar reminding admin to download before clearing

#### 5. Dashboard Login Activity Widget
- Dashboard now loads the 6 most recent login events from history and displays them in a "Recent Login Activity" panel at the bottom
- "View All →" button uses `useNavigate` (React Router) — no raw `pushState` hacks

#### 6. Sidebar updated
- Added **📋 History** nav item (7th item, after Analytics)

### 🐛 Bug Fixes

#### 7. Circular dependency eliminated
- Previous version had `routes/history.js` export `addHistoryEntry`, which was imported by `routes/auth.js` and `routes/bookings.js`
- Fixed by moving all data logic to `services/historyService.js`; route files now import from the service, not each other

#### 8. Dashboard navigation fix
- "View All" link on Dashboard's login panel was using raw `window.history.pushState` + `PopStateEvent` which bypasses React Router and causes a blank render
- Fixed to use `useNavigate` from `react-router-dom`

#### 9. Descriptive 404 error messages
- `HistoryPage` now shows specific, actionable error messages for 404 (backend not restarted), 401/403 (auth), 500 (server error) instead of a generic "failed" toast

### 📁 Files Changed

| File | Change |
|------|--------|
| `backend/data/history.json` | New — empty `[]` seed file |
| `backend/services/historyService.js` | New — standalone data service |
| `backend/routes/history.js` | New — REST endpoints (rewrote from scratch) |
| `backend/routes/auth.js` | Added login event recording |
| `backend/routes/bookings.js` | Added booking event recording |
| `backend/server.js` | Registered `/api/history` route + updated startup log |
| `admin-panel/src/pages/HistoryPage.jsx` | New — full History page component |
| `admin-panel/src/api/index.js` | Added `getHistory`, `clearHistory`, `addHistoryEntry` |
| `admin-panel/src/App.jsx` | Added `HistoryPage` import + `/history` route |
| `admin-panel/src/components/Sidebar.jsx` | Added History nav item |
| `admin-panel/src/pages/Dashboard.jsx` | Added history load + recent logins panel + nav fix |
