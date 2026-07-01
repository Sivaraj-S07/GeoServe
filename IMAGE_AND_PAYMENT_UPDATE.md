# GeoServe — Permanent Image Storage & UPI QR Payment Update

## 1. Permanent Image Storage (fixed — highest priority)

**Root cause found:** category icon uploads (and worker verification
certificate/work-video uploads) were saved with `multer.diskStorage(...)`
into local folders (`backend/uploads/categories`, `backend/uploads/verifications`).
Render (and most PaaS hosts) use an **ephemeral filesystem** — anything
written to disk is wiped on every restart/redeploy, which is exactly why
images kept reverting to the default placeholder.

**Fix:** every upload now goes straight into memory (`multer.memoryStorage()`)
and is written permanently as a `BYTEA` row in a new PostgreSQL table,
`app_images`, via `backend/services/imageStore.js`. Images are served back
from the database by `backend/routes/images.js`, mounted at `/uploads/img/:id`
(chosen so all existing frontend/admin-panel code that already recognizes
the `/uploads/...` URL prefix keeps working with zero UI changes).

Changed:
- `backend/db/schema.sql` — new `app_images` table (+ index).
- `backend/services/imageStore.js` — new (save/get/delete helpers).
- `backend/routes/images.js` — new (`GET /uploads/img/:id`).
- `backend/routes/categories.js` — icon upload/delete now DB-backed.
- `backend/routes/verification.js` — certificate/work-video upload,
  file-serving, and delete now DB-backed (same auth-gated URL pattern
  as before, so no frontend changes were needed).
- `backend/server.js` — mounts the new image route.

Images now survive page refresh, logout/login, server restart, and
redeployment, because they live in Neon PostgreSQL, not on local disk.

## 2. Dynamic UPI QR Payment (upgraded)

The worker Payment Method module (bank accounts + UPI IDs) already existed
from a prior update. This pass improves the actual QR/payment experience:

- The UPI QR now encodes a **locked, non-editable amount** plus a
  **booking reference** (`tr=GEOSERVEbookingId`) and a transaction note, so
  a worker can always match an incoming payment to the right booking.
- Added one-tap deep links for **Google Pay, PhonePe, Paytm, and any other
  UPI app** (all pre-filled with the same locked amount/reference — the
  customer only enters their UPI PIN).
- The customer can optionally enter the **UPI transaction/UTR number**
  after paying; it's stored on the booking (`customer_payment_ref` column)
  and shown to the worker and in the Admin Panel's booking detail view,
  alongside the existing Transaction ID, Payment Mode, and Paid At fields
  (the admin panel previously read the wrong field name for payment
  method — fixed).
- Booking status is still only ever set to `confirmed`/`paid` after the
  split-payment step succeeds; on failure it's marked `failed` and the
  customer can safely retry (unchanged, already correct).

**Important limitation, please read:** a static UPI-intent QR code (the
`upi://pay?...` link any GeoServe-style app uses) has **no server-side
payment callback** — UPI doesn't notify your backend when a customer
completes payment in Google Pay/PhonePe/etc. There is no way to make the
system 100% "auto-detect success/failure" without integrating a real
payment gateway (Razorpay/Cashfree/PhonePe Payment Gateway, etc.) that
issues its own dynamic order + webhook. What's implemented here is the
correct, honest version of a P2P UPI QR flow: locked amount, booking
reference embedded in the QR, optional UTR capture, and a manual
customer "I've paid" confirmation — the same pattern used by most
marketplace apps that don't hold funds themselves.

Changed:
- `backend/db/schema.sql` — new `bookings.customer_payment_ref` column.
- `backend/routes/bookings.js` — accepts/stores/returns `customerPaymentRef`.
- `frontend/src/components/BookingCard.jsx` — QR booking ref, app deep
  links, UTR input.
- `frontend/src/api/index.js` — `confirmBooking` sends the UTR.
- `frontend/src/pages/UserDashboard.jsx` — threads the UTR through.
- `admin-panel/src/pages/BookingsPage.jsx` — fixed Pay Method field,
  added Paid At + Customer UPI Ref to the booking detail view.

## Deploying this update

No manual steps needed — `npm start` runs `node db/migrate.js` first,
which applies the new table/column additions idempotently (safe to run
against your existing Neon database).
