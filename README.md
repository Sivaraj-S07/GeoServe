# GeoServe — Production-Ready Service Platform v4.1

> Connect users with trusted, verified local service workers by pincode area.

---

## 📁 Project Structure

```
geoserve/
├── backend/          # Node.js + Express REST API
├── frontend/         # React user/worker portal (Vite)
├── admin-panel/      # React admin dashboard (Vite)
├── DEPLOYMENT.md     # Step-by-step deployment guide
├── SECURITY.md       # Security configuration guide
└── IMPROVEMENTS.md   # Full changelog of all fixes & upgrades
```

---

## 🚀 Quick Start (Local Development)

### 1. Backend
```bash
cd backend
cp .env.example .env       # fill in JWT_SECRET etc.
npm install
npm run dev                # starts on http://localhost:5000
```

### 2. Frontend (User/Worker Portal)
```bash
cd frontend
npm install
npm run dev                # starts on http://localhost:5173
```

### 3. Admin Panel
```bash
cd admin-panel
npm install
npm run dev                # starts on http://localhost:5174
```

> **Default admin credentials** are in `backend/data/users.json`.  
> Look for the entry with `"role": "admin"`.

---

## 🌐 Tech Stack

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Backend    | Node.js 18+, Express 4, JWT, Multer         |
| Security   | Helmet.js, express-rate-limit, cookie-parser|
| Frontend   | React 18, Vite 5, React Router 6, Axios     |
| Maps       | Leaflet (react-leaflet)                     |
| i18n       | i18next (English + Tamil)                   |
| Payments   | Razorpay (optional — simulation mode if unset)|
| Deploy     | Vercel (frontend + admin) + Render (backend)|

---

## 🔐 Environment Variables

### Backend (`backend/.env`)
| Variable          | Required | Description                          |
|-------------------|----------|--------------------------------------|
| `PORT`            | No       | Server port (default: 5000)          |
| `JWT_SECRET`      | ✅ Yes   | Min 32 random chars                  |
| `COOKIE_SECRET`   | Recommended | Separate from JWT_SECRET          |
| `CORS_ORIGIN`     | ✅ Yes in prod | Comma-separated frontend URLs  |
| `NODE_ENV`        | ✅ Yes in prod | Set to `production`            |
| `RAZORPAY_KEY_ID` | No       | Leave blank for simulation mode      |

### Frontend & Admin Panel (`.env`)
| Variable      | Description                                    |
|---------------|------------------------------------------------|
| `VITE_API_URL`| Backend URL e.g. `https://api.example.com/api` |

---

## 📦 Build for Production

```bash
# Backend — no build needed, just set NODE_ENV=production
# Frontend
cd frontend && npm run build    # outputs to frontend/dist/
# Admin
cd admin-panel && npm run build # outputs to admin-panel/dist/
```

---

## 🐛 Bugs Fixed in v4.1 (vs v4.0)

See **IMPROVEMENTS.md** for the complete list. Key fixes:
- Admin panel dark mode now works correctly
- Toast notifications now appear (CSS was missing)
- Mobile sidebar with hamburger menu added
- Token storage mismatch between AuthContext and API client fixed
- Duplicate `onClick` handler on worker delete button fixed
- Missing CSS classes (`data-table`, `.sidebar-profile-info`, `--bg-alt`) added
- All pages lazy-loaded for faster initial load
- Frontend toast CSS added

---

## 🗺️ API Reference

| Method | Endpoint                        | Auth  | Description              |
|--------|---------------------------------|-------|--------------------------|
| POST   | `/api/auth/login`               | ❌    | Login (role required)    |
| POST   | `/api/auth/signup`              | ❌    | Register user/worker     |
| GET    | `/api/auth/me`                  | ✅    | Get current user         |
| GET    | `/api/workers`                  | ❌    | List approved workers    |
| GET    | `/api/workers/all`              | Admin | All workers (admin)      |
| GET    | `/api/bookings`                 | ✅    | User/worker bookings     |
| GET    | `/api/pincode/:pin`             | ❌    | Pincode lookup           |
| GET    | `/api/verification/stats`       | Admin | Pending verif count      |
| GET    | `/api/history`                  | Admin | Activity log             |
| GET    | `/api/health`                   | ❌    | Health check             |

