# GeoServe — Test Login Credentials

> These are the **seeded demo accounts** for local development and testing.
> Passwords are stored as plaintext in the JSON files and are **auto-upgraded to bcrypt** on first successful login.

## 🔴 Admin Account
| Field    | Value                |
|----------|----------------------|
| Email    | admin@gmail.com      |
| Password | admin123             |
| Role     | admin                |
| Login at | **Admin Panel** — http://localhost:5174 |

> ⚠️ The Admin login is only available via the **Admin Panel** (port 5174).

---

## 👤 User Accounts
| Email                        | Password | Name          |
|------------------------------|----------|---------------|
| alice@gmail.com              | User@123 | Alice Johnson |
| kavya@gmail.com              | User@123 | Kavya Reddy   |
| ravi@gmail.com               | User@123 | Ravi Kumar    |
| sivaraj96006653@gmail.com    | User@123 | Sivaraj .S    |

> Login at: **User Dashboard** — http://localhost:5173 → select **User** role

---

## 🔧 Worker Accounts
| Email               | Password  | Name            | Category         |
|---------------------|-----------|-----------------|------------------|
| rajesh@gmail.com    | Worker@123 | Rajesh Kumar   | Plumber          |
| priya@gmail.com     | Worker@123 | Priya Sharma   | House Cleaner    |
| arjun@gmail.com     | Worker@123 | Arjun Patel    | Electrician      |
| sunita@gmail.com    | Worker@123 | Sunita Verma   | Painter          |
| vikram@gmail.com    | Worker@123 | Vikram Singh   | Carpenter        |
| suresh@gmail.com    | Worker@123 | Suresh Babu    | AC Technician    |

> Login at: **User Frontend** — http://localhost:5173 → select **Worker** role

---

## 🐛 Bug Fixes Applied (v12-fixed)

### Worker Login Fix
- **Root Cause**: `users.json` had mismatched emails/names vs `workers.json` (Western placeholder names linked to Indian worker profiles). Workers could not log in because the auth system searches `users.json` by email.
- **Fix**: Updated all 5 mismatched worker user records in `users.json` to use the same email and name as their corresponding `workers.json` entries. Reset all passwords to known values.

### Worker Signup Category Translation Fix  
- **Root Cause**: `SignupPage.jsx` and `LoginPage.jsx` rendered category names directly as `{c.name}` without going through the i18n translation system.
- **Fix**: Updated both files to use `t(\`categoryNames.\${c.name}\`, { defaultValue: c.name })` so categories translate correctly to Tamil.

### Complete Bilingual Translation
- All User Portal and Worker Portal text now translates between English ↔ Tamil in real time.
- 768 translation keys in both `en.json` and `ta.json` with perfect parity.

---

## 🚀 How to Start the App

```bash
# 1. Start the backend
cd backend && npm install && node server.js

# 2. Start the user frontend (new terminal)
cd frontend && npm install && npm run dev
# → http://localhost:5173

# 3. Start the admin panel (new terminal)
cd admin-panel && npm install && npm run dev
# → http://localhost:5174
```

## 🔐 Environment Files
- `backend/.env` — JWT secret, PORT, CORS origins
- `frontend/.env` — VITE_API_URL (blank = use Vite proxy to localhost:5000)
- `admin-panel/.env` — VITE_API_URL (blank = use Vite proxy to localhost:5000)
