# GeoServe v5.0 — Setup & Run Guide

## Quick Start (3 terminals)

### Terminal 1 — Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env: set JWT_SECRET to a long random string
npm run dev
# Server runs at http://localhost:5000
```

### Terminal 2 — Frontend (User & Worker portal)
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### Terminal 3 — Admin Panel
```bash
cd admin-panel
npm install
npm run dev
# Opens at http://localhost:5174
```

---

## Login Credentials

| Role   | Email                        | Password      |
|--------|------------------------------|---------------|
| Admin  | admin@gmail.com              | admin123      |
| Worker | john@gmail.com               | worker123     |
| Worker | mary@gmail.com               | worker123     |
| User   | alice@gmail.com              | user123       |
| User   | david@gmail.com              | user123       |

---

## What Was Fixed (v5.0)

### 1. Admin Login Fixed
- **Root cause:** `LoginPage.jsx` caught errors as `e.response?.data?.error`
  (axios pattern) but the API uses native `fetch`, which throws plain `Error`
  objects. Fixed to use `e.message` throughout.
- **Second cause:** `AuthContext.jsx` called `setAdmin()` before `api.syncToken()`,
  so the very first API request after login had no token. Fixed order.
- Also added JWT expiry check before restoring saved session from localStorage.

### 2. Frontend Errors Fixed
- All 10 page files that used the old axios error pattern (`e.response?.data?.error`)
  have been updated to use `e.message`.
- Frontend API (`frontend/src/api/index.js`) now:
  - Auto-logs out on 401 (expired token → redirect to `/login`)
  - Normalizes all errors to `new Error(message)` for consistent catching
  - Retries on 503/429 with exponential back-off
  - 15s request timeout via AbortController

### 3. Toast Auto-Dismiss
- Both `admin-panel` and `frontend` Toast components now auto-dismiss after
  3.5 seconds with a smooth slide animation. Previously they never closed.

### 4. Complete Payment System (NEW)
- **`admin-panel/src/pages/PaymentPage.jsx`** — Full payment dashboard with:
  - Live wallet balance, total earned, today/month earnings, total withdrawn
  - Bar chart of monthly commission earnings (last 6 months)
  - Top earning service categories
  - Full transaction ledger with pagination + type filter
  - Withdraw funds modal (records deduction from admin wallet)
  - Payment configuration tab (Razorpay setup guide)
- **`backend/services/commissionService.js`** — 5% commission auto-calculated
  on every confirmed booking, credited to admin wallet immediately
- **`backend/routes/commission.js`** — Full REST API:
  - `GET /api/commission/wallet` — balance + stats
  - `GET /api/commission/transactions` — paginated ledger
  - `GET /api/commission/summary` — dashboard aggregate
  - `POST /api/commission/withdraw` — record withdrawal
- **`backend/data/adminWallet.json`** — Persistent wallet storage
- Commission rate: **5% per booking** (worker gets 95%)
- Payment gateway: **Razorpay** (simulation mode by default, live with API keys)

### 5. Payment Gateway — Live Mode
To switch from simulation to live Razorpay payments, add to `backend/.env`:
```
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_here
RAZORPAY_ACCOUNT_NUMBER=your_account_number
```

---

## Project Structure

```
geoserve-v5/
├── backend/                    Node.js + Express API
│   ├── data/                   JSON data store (replace with DB in production)
│   ├── middleware/             JWT auth + role guards
│   ├── routes/                 All API endpoints
│   │   └── commission.js       Wallet + payment API ← NEW
│   ├── services/
│   │   ├── commissionService.js  5% auto-commission ← FIXED
│   │   └── paymentService.js     Razorpay integration
│   └── server.js               Express app entry point
│
├── frontend/                   React user + worker portal (port 5173)
│   └── src/
│       ├── api/index.js        Fixed: 401 logout, err.message, retry
│       └── pages/              Fixed: all error catch blocks
│
└── admin-panel/                React admin dashboard (port 5174)
    └── src/
        ├── api/index.js        Fixed: syncToken, error handling
        ├── context/AuthContext.jsx  Fixed: token sync order
        ├── pages/
        │   ├── LoginPage.jsx   Fixed: e.message error display
        │   ├── PaymentPage.jsx Complete payment dashboard ← NEW
        │   └── ProfilePage.jsx Fixed: error catch
        └── components/
            └── Toast.jsx       Fixed: auto-dismiss after 3.5s
```
