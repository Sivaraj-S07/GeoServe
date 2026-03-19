# GeoServe — Professional Service Platform

## What's New in This Version

### Bug Fixes & Improvements

#### 1. ✅ Mobile Number Validation (Frontend + Backend)
- **10 digits only** — users cannot type more than 10 digits
- **Numeric input only** — non-numeric characters are automatically stripped
- Validated in: User Signup, Worker Signup, Worker Profile Edit, Booking Form
- Backend also validates: `auth.js` (signup), `workers.js` (create/update)

#### 2. ✅ Pincode Filtering for ALL Users
- Every user can now filter workers by pincode — not just the default user
- Added a **live pincode input field** in the filter bar (works for users with or without a saved pincode)
- Toggle button turns blue when filter is active
- Pincode filter updates results in real-time as you type

#### 3. ✅ Admin Panel — Worker Verification Media Preview
- Admin can now **view certificate images** and **play work videos** directly in the dashboard
- Uses authenticated token via query string (required for `<img>` and `<video>` src attributes)
- Graceful error fallback if media fails to load
- Tab-based view: switch between Certificate and Video

#### 4. ✅ UI / Design Improvements
- Redesigned admin dashboard with gradient hero header and improved stat cards
- Enhanced worker cards with hover effects
- Improved filter bar with inline pincode input
- Better color system with consistent tokens across frontend and admin panel
- New CSS utility classes: `.hero-banner`, `.metric-card`, `.stat-card-v2`, `.empty-state`, etc.
- Mobile-responsive improvements throughout

---

## Project Structure

```
geoserve/
├── backend/          # Node.js + Express API
│   ├── routes/
│   │   ├── auth.js          ← Phone validation added
│   │   ├── workers.js       ← Phone validation added
│   │   ├── verification.js  ← Token-in-query-string for media files
│   │   └── ...
│   └── data/         # JSON file-based storage
│
├── frontend/         # React (Vite) — User & Worker portal
│   └── src/
│       ├── pages/
│       │   ├── UserDashboard.jsx   ← Pincode filter for all users
│       │   ├── SignupPage.jsx      ← 10-digit phone validation
│       │   ├── BookingPage.jsx     ← 10-digit phone validation
│       │   └── ...
│       ├── components/
│       │   ├── WorkerModal.jsx     ← 10-digit phone validation
│       │   └── ...
│       └── index.css               ← Enhanced design tokens & utilities
│
└── admin-panel/      # React (Vite) — Admin dashboard
    └── src/
        ├── pages/
        │   ├── Dashboard.jsx       ← Redesigned with hero header + stats
        │   ├── VerificationPage.jsx← Media preview with auth fix
        │   └── ...
        └── index.css               ← Enhanced admin design system
```

---

## Running Locally

### 1. Start Backend
```bash
cd backend
npm install
node server.js
# Runs on http://localhost:5000
```

### 2. Start User/Worker Portal
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### 3. Start Admin Panel
```bash
cd admin-panel
npm install
npm run dev
# Runs on http://localhost:5174
```

---

## Demo Credentials

| Role   | Email             | Password |
|--------|-------------------|----------|
| Admin  | sivaraj@gmail.com | admin123 |
| User   | alice@gmail.com   | user123  |
| Worker | john@gmail.com    | worker123|
