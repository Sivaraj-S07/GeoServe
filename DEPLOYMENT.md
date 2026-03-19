# GeoServe — Deployment Guide

This guide covers how to deploy GeoServe correctly so that all features
(login, pincode validation, etc.) work in production.

---

## Architecture Overview

```
┌────────────────────────┐     ┌──────────────────────────┐
│  Frontend (Vercel)     │     │  Admin Panel (Vercel)    │
│  frontend/             │     │  admin-panel/            │
│  VITE_API_URL=https://…│     │  VITE_API_URL=https://…  │
└──────────┬─────────────┘     └──────────┬───────────────┘
           │  HTTPS API calls             │  HTTPS API calls
           └──────────────────┬───────────┘
                              ▼
               ┌──────────────────────────┐
               │  Backend (Render)        │
               │  backend/               │
               │  CORS_ORIGIN=https://…  │
               └──────────────────────────┘
```

---

## Step 1 — Deploy the Backend (Render)

1. Go to https://render.com and create a **New Web Service**
2. Connect your GitHub repository
3. Set these fields:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Node Version:** `20` (required for native fetch used by pincode API)

4. Under **Environment Variables**, add:

   | Key | Value |
   |-----|-------|
   | `JWT_SECRET` | Click "Generate" for a secure random value |
   | `CORS_ORIGIN` | Leave blank for now — fill in after Step 2 & 3 |
   | `NODE_VERSION` | `20` |

5. Deploy and copy the Render URL (e.g. `https://geoserve-backend.onrender.com`)

---

## Step 2 — Deploy the Frontend (Vercel)

1. Go to https://vercel.com → New Project → Import your repo
2. Set **Root Directory** to `frontend`
3. Under **Environment Variables**, add:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://geoserve-backend.onrender.com/api` |

   ⚠️ This value is **baked into the build**. It must point to your live backend URL,
   not localhost. If left blank or set to localhost, login will fail in production.

4. Deploy and copy the Vercel URL (e.g. `https://geoserve.vercel.app`)

---

## Step 3 — Deploy the Admin Panel (Vercel)

1. In Vercel → New Project → Import same repo
2. Set **Root Directory** to `admin-panel`
3. Under **Environment Variables**, add:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://geoserve-backend.onrender.com/api` |

4. Deploy and copy the Admin Vercel URL (e.g. `https://geoserve-admin.vercel.app`)

---

## Step 4 — Update Backend CORS

Now that you have both frontend URLs, go back to Render → your backend service:

1. Open **Environment Variables**
2. Set `CORS_ORIGIN` to **both** frontend URLs, comma-separated:

   ```
   https://geoserve.vercel.app,https://geoserve-admin.vercel.app
   ```

   ⚠️ No trailing slashes. No spaces around the comma.

3. Render will automatically redeploy the backend.

---

## Common Deployment Failures & Fixes

### ❌ Login returns 401 or CORS error
**Cause:** `CORS_ORIGIN` on the backend is still set to localhost, or not set at all.  
**Fix:** Set `CORS_ORIGIN` in Render to your Vercel frontend URLs (Step 4 above).

### ❌ Login works locally but not in production
**Cause:** `VITE_API_URL` is blank or set to localhost in the Vercel build.  
**Fix:** In Vercel → Project Settings → Environment Variables, set `VITE_API_URL`
to `https://your-backend.onrender.com/api`. Then **redeploy** (Vite bakes the URL
at build time — just changing the env var does not update an existing build).

### ❌ Pincode lookup returns 404 for valid pincodes
**Cause:** The backend cannot reach `api.postalpincode.in` (outbound network issue),
OR the pincode format is wrong (starts with 0, non-6-digit, etc.).  
**Fix:** 
- Make sure your Render plan allows outbound HTTP requests (all plans do by default).
- The pincode API now returns `{ retryable: true }` on network errors — the frontend
  will display "try again" instead of silently accepting fake data.

### ❌ "Pincode not found" for a real Indian pincode
**Cause:** `api.postalpincode.in` occasionally has downtime.  
**Fix:** Wait a minute and retry. The backend returns HTTP 503 with `retryable: true`
so the UI shows a retry prompt.

### ❌ Admin panel login fails
**Cause:** Admin panel's `VITE_API_URL` is still `http://localhost:5000/api` (baked
into the build from the old `.env.example`).  
**Fix:** In Vercel, set `VITE_API_URL` for the admin-panel project to your live
backend URL and trigger a redeploy.

### ❌ Data resets on every Render deploy
**Cause:** Render's free tier has an **ephemeral filesystem** — JSON files in
`backend/data/` are wiped on each deploy.  
**Fix (short-term):** Upgrade to a Render paid plan with a persistent disk, or
migrate data storage to a free database like MongoDB Atlas or PlanetScale.

---

## Pincode Validation — How It Works

The pincode system now strictly validates Indian pincodes:

| Scenario | Behavior |
|----------|----------|
| Non-6-digit input | Rejected immediately (format error) |
| Starts with 0 | Rejected immediately (invalid for India) |
| Valid format, real Indian pincode | ✅ Accepted, returns district/state/offices |
| Valid format, non-existent pincode | ❌ Rejected with "Invalid or non-Indian pincode" |
| Valid format, API temporarily down | Returns 503 with `retryable: true` — user sees "try again" |

**No fake/fallback data is ever returned.** The old behaviour where any 6-digit
number was silently accepted with placeholder data has been removed.

Workers can only serve within the area mapped to their registered pincode. If a
user searches for workers, only workers whose `pincode` exactly matches the search
pincode are returned (in addition to the existing lat/lng proximity filter).

---

## Environment Variable Summary

### Backend (set in Render)

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ Yes | Long random string for signing JWTs |
| `CORS_ORIGIN` | ✅ Yes | Comma-separated list of your Vercel frontend URLs |
| `NODE_VERSION` | ✅ Yes | Must be `20` for native fetch (pincode API) |
| `PORT` | Auto | Render sets this automatically |
| `RAZORPAY_KEY_ID` | Optional | Leave blank for simulation/demo mode |
| `RAZORPAY_KEY_SECRET` | Optional | Leave blank for simulation/demo mode |
| `RAZORPAY_ACCOUNT_NUMBER` | Optional | Leave blank for simulation/demo mode |

### Frontend & Admin Panel (set in Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ Yes | Full URL to backend `/api` (e.g. `https://…onrender.com/api`) |

---

## Local Development

```bash
# 1. Start the backend
cd backend
cp .env.example .env   # Edit JWT_SECRET; leave CORS_ORIGIN as localhost URLs
npm install
npm run dev            # Runs on http://localhost:5000

# 2. Start the frontend
cd frontend
# .env is already set up for local dev (VITE_API_URL is blank = uses Vite proxy)
npm install
npm run dev            # Runs on http://localhost:5173

# 3. Start the admin panel (optional)
cd admin-panel
cp .env.example .env   # VITE_API_URL should be blank for local dev
npm install
npm run dev            # Runs on http://localhost:5174
```

---

## History Feature — Deployment Notes

The Activity History system stores data in `backend/data/history.json`.

**After deploying the updated backend:**
1. Make sure `backend/data/history.json` exists (even as `[]`). The service auto-creates it if missing.
2. **Restart the backend** — the `/api/history` route only exists after a restart with the new code.
3. Confirm the route is live by visiting `https://your-backend.onrender.com/api/health` — if it returns `ok`, the backend is up. Then try `GET /api/history` with your admin token.

**If you see a 404 on `/api/history`:**
- The old backend is still running → trigger a redeploy on Render
- Or the `VITE_API_URL` in Vercel is pointing to the wrong backend → check Environment Variables in Vercel dashboard

**If history.json grows too large:**
- The service automatically caps entries at 10,000 (oldest are dropped)
- Admin can download + clear from the History page at any time
