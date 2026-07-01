# GeoServe — Payment Method Module Upgrade (v2)

This update upgrades the worker **Payment Method** section with:

1. **Bank Accounts** — searchable dropdown covering all major RBI-scheduled
   banks (Public Sector, Private Sector, Small Finance, Payments, and
   Foreign banks), grouped by category. Workers can add up to 5 bank
   accounts, edit them, delete them, and mark one as **Primary**
   (shown to customers / used for the payment QR code).
2. **UPI IDs** — workers can add up to 5 UPI IDs, validate the
   `name@bank` format in real time, remove any UPI ID, and mark one as
   **Primary/Active**.
3. Duplicate prevention, full client + server validation, and a
   responsive, mobile-friendly UI with loading states, confirmation
   dialogs, and toast notifications.

No database migration is required — both bank accounts and UPI IDs are
stored inside the existing `workers.payout_account` JSONB column as
`payout_account.accounts[]` and `payout_account.upiIds[]`. The "primary"
entries are mirrored onto the legacy `bankName` / `accountNumber` /
`ifscCode` / `upiId` fields so the existing payment-info endpoint,
booking QR code, and BookingCard UPI display keep working unchanged.

---

## What's new in this ZIP

```
backend/config/banks.js                       NEW  — bank list + server-side validators
backend/routes/workers.js                      EDITED — bank-account & UPI CRUD routes
frontend/src/config/banks.js                   NEW  — bank list + client-side validators
frontend/src/components/BankSelect.jsx         NEW  — searchable categorized bank dropdown
frontend/src/components/PaymentMethodManager.jsx NEW — bank account CRUD UI
frontend/src/components/UpiManager.jsx         NEW  — UPI ID CRUD UI
frontend/src/pages/WorkerDashboard.jsx         EDITED — wires the two managers into the Payout tab
frontend/src/api/index.js                      EDITED — new API helper functions
```

## New API endpoints (all require a logged-in worker/admin, owner-only)

```
GET    /api/workers/:id/bank-accounts
POST   /api/workers/:id/bank-accounts
PUT    /api/workers/:id/bank-accounts/:accountId
DELETE /api/workers/:id/bank-accounts/:accountId
PATCH  /api/workers/:id/bank-accounts/:accountId/primary

GET    /api/workers/:id/upi-ids
POST   /api/workers/:id/upi-ids
DELETE /api/workers/:id/upi-ids/:upiRecordId
PATCH  /api/workers/:id/upi-ids/:upiRecordId/primary
```

---

## Setup instructions

### Prerequisites
- Node.js 18+ and npm
- A PostgreSQL database (e.g. Neon, Render, or local Postgres) — same as
  before; no schema change is required for this update.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # if present — otherwise create .env with:
#   DATABASE_URL=postgres://user:password@host:5432/dbname
#   JWT_SECRET=<a-strong-random-32+-character-secret>
#   PORT=5000
npm run dev             # or: npm start
```

The backend automatically runs its migration/bootstrap on startup
(existing behavior, unchanged). No new tables or columns are needed —
the new bank/UPI lists live inside the existing `payout_account` JSONB
column.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev      # local development, served by Vite
# or
npm run build    # production build, output in frontend/dist
```

Make sure `frontend/.env` (or your existing config) points
`VITE_API_URL` (or equivalent) at your running backend.

### 3. Admin panel (unchanged, optional)

```bash
cd admin-panel
npm install
npm run dev
```

---

## Verifying the new Payment Method module

1. Log in as a **worker**.
2. Go to **Dashboard → Payout Account** tab.
3. Under **UPI IDs**: add a UPI ID (e.g. `name@okhdfcbank`), confirm
   the format validation rejects an invalid one (e.g. `name@@bad`),
   add a second one, mark it Primary, then remove the first.
4. Under **Saved Bank Accounts**: click **Add Bank Account**, search
   for a bank (try "Karur" or "SBI" or "Bandhan"), pick one, fill in
   the account holder name, account number (notice the live digit-range
   hint per bank), and IFSC code, then save. Try adding the exact same
   account again — it should be rejected as a duplicate. Edit an
   account, set a different account as Primary, then delete one.
5. Confirm no console errors appear in the browser dev tools while
   doing the above.

---

## Notes / design decisions

- **Why JSONB arrays instead of a new SQL table?** It avoids a schema
  migration and keeps this a drop-in upgrade; the data is still fully
  relational from the application's point of view (each account/UPI ID
  has a stable `id`, owner = `workers.user_id`, and is only ever
  reachable through the worker's own row). If you later want a
  dedicated `bank_accounts` / `upi_ids` SQL table for reporting or
  admin tooling, the route handlers are isolated enough to swap the
  storage layer without touching the frontend.
- **Duplicate prevention**: a bank account is considered a duplicate
  if the same bank + account number is already saved; a UPI ID is
  considered a duplicate by case-insensitive exact match.
- **Validation is enforced twice**: once in the React form (instant
  feedback) and again in the Express route (so a tampered request can
  never bypass it).
