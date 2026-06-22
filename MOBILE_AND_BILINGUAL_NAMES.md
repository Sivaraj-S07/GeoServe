# GeoServe — Technical Notes: Mobile Number Display + Bilingual (English/Tamil) Names

Full file-by-file detail for the v21 changes summarized at the top of
`CHANGES.md`. Read that first for the high-level overview; this doc is the
exhaustive reference.

---

## 1. Display User Mobile Number in Admin Panel

### Problem found
The `users` table already had a `phone` column, but it was **never collected
or saved** for the `user` role at signup — only `worker` signup required and
stored a phone number. The admin Users page also had no dedicated, explicit
"Mobile Number" field (phone was only shown as small grey text under the
name).

### Backend changes
- **`backend/routes/auth.js`**
  - `POST /signup` — now accepts an optional `phone` for the `user` role
    (still required for `worker`), validates it as a 10-digit number when
    present, and saves it to `users.phone`.
  - `PUT /profile` — now accepts and validates `phone` so users/workers can
    add or update their mobile number after registration.
  - `safeUser()` — now returns `phone` (and the new bilingual name fields,
    see below) on login/signup/me/profile responses.
- **`backend/routes/users.js`** — admin `GET /api/users` `safe()` mapper
  already returned `phone`; confirmed it flows through.
- **`backend/routes/workers.js`** — unaffected (workers already required a
  phone number at signup).

### Frontend changes
- **`frontend/src/pages/LoginPage.jsx`** (the **live** signup form — see
  note below) — added an optional "Mobile Number" field to the **User**
  signup step, with the same 10-digit live-formatting/validation pattern
  already used for the Worker step.
- **`frontend/src/pages/SignupPage.jsx`** — mirrored the same change for
  consistency (see "Note on SignupPage.jsx" below).
- **`frontend/src/pages/ProfilePage.jsx`** — added an editable "Mobile
  Number" field to the user's own profile info tab, with validation and a
  clear placeholder.

### Admin Panel changes
- **`admin-panel/src/pages/UsersPage.jsx`**
  - Added a dedicated **"Mobile Number"** column to the users table (next to
    Email), with `"Not provided"` styling for users with no phone.
  - Added **"Mobile Number"**, **"Name (English)"**, **"Name (Tamil)"** rows
    to the expanded user-detail view.
  - Search now also matches against `phone` and both name languages.

### Important note: `LoginPage.jsx` vs `SignupPage.jsx`
The codebase contains **two** signup implementations:
- `frontend/src/pages/SignupPage.jsx` — a full, self-contained signup page.
- `frontend/src/pages/LoginPage.jsx` — a tab-based login/signup combo page.

`App.jsx` routes `/signup` to **`LoginPage.jsx`** (with a code comment
confirming this is intentional: *"SignupPage is handled by LoginPage (tab
switch) — no separate route needed"*). `SignupPage.jsx` is **not imported or
routed anywhere** — it's effectively dead code today (confirmed: it does not
appear in the production build's chunk list).

Both files were updated identically so behavior stays consistent regardless
of which one is wired up, and so a future developer who re-enables
`SignupPage.jsx` doesn't end up with a regressed, English-only signup form.
A code comment was added to the top of `SignupPage.jsx` documenting this.

---

## 2. Bilingual (English/Tamil) Name Display

### Design
Two new nullable text columns were added everywhere a person's display name
is stored: **`name_en`** and **`name_ta`**. The pre-existing `name` column
is kept as the **legacy/canonical** field (always mirrors the English name)
so every existing query, JWT payload, export, or downstream feature that
reads `.name` keeps working completely unchanged — this satisfies the
"maintain backward compatibility" requirement without having to touch every
non-UI call site in the codebase.

**Resolution rule** (`utils/localizedName.js`, duplicated once in the user
app and once in the admin panel, since they're separate Vite bundles with no
shared package):
```
Tamil UI   → nameTa → name (legacy) → nameEn
English UI → nameEn → name (legacy) → nameTa
```
Fully null-safe: any field can be missing/blank (e.g. accounts created
before this feature existed only have `name`) and a sensible value is
always returned.

### Database
**`backend/db/schema.sql`**
- `users.name_en`, `users.name_ta`
- `workers.name_en`, `workers.name_ta`
- `bookings.user_name_en`, `bookings.user_name_ta`,
  `bookings.worker_name_en`, `bookings.worker_name_ta` — **bilingual
  snapshots** captured at booking-creation time (mirrors how
  `user_name`/`worker_name` already worked — a point-in-time record, not a
  live join, so historical bookings don't retroactively change when a
  profile name is later edited).

**`backend/server.js`** (`runAutoMigrations()`) — the same columns are added
via idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, with a one-time
backfill (`UPDATE ... SET name_en = name WHERE name_en = ''`), so this runs
on every server start against already-deployed databases — matching the
project's existing migration pattern (see the neighboring "Ratings system
migrations" block this was added next to).

**`backend/db/migrate.js`** — the JSON→Postgres bootstrap script was updated
to carry `nameEn`/`nameTa` through for users, workers, and bookings, with
fallbacks for older JSON exports that predate this feature.

### Backend route changes
- **`backend/routes/auth.js`**
  - `POST /signup` — accepts `nameEn` / `nameTa`. English name is required
    (canonical, mirrors the legacy `name` field); Tamil is optional. Both
    are saved to `users` and, for worker signups, mirrored onto the new
    `workers` row.
  - `PUT /profile` — accepts `nameEn` / `nameTa` edits, keeps the legacy
    `name` column in sync, and mirrors changes to the linked `workers` row.
  - `safeUser()` — returns `nameEn` / `nameTa` on every auth response.
- **`backend/routes/users.js`** — admin `safe()` mapper now returns
  `nameEn` / `nameTa`.
- **`backend/routes/workers.js`**
  - `toJS()` returns `nameEn` / `nameTa`.
  - `POST /` and `PUT /:id` (used by the worker's "Edit Profile" modal)
    accept and persist `nameEn` / `nameTa`.
  - Worker text search (`GET /api/workers?search=`) now matches against
    both language names in addition to the legacy name.
- **`backend/routes/bookings.js`**
  - `POST /` now looks up the booking user's and worker's bilingual names
    (one extra `SELECT` for the user; the worker row is already fetched)
    and stores them as a snapshot (`userNameEn/Ta`, `workerNameEn/Ta`) on
    the new booking row.
  - `toJS()` returns the new fields with the same fallback chain.

### Frontend (user/worker app) — `frontend/src/utils/localizedName.js`
Applied across:
- **Registration** — `LoginPage.jsx` (live) and `SignupPage.jsx` (currently
  unrouted, kept in sync) now collect **Name (English)** and **Name
  (Tamil)** as two separate fields instead of one "Full Name" field.
  Updated: form state, validation, submit payload, i18n strings
  (`frontend/src/i18n/locales/en.json` + `ta.json`, `login.*` namespace).
- **Profile editing** — `ProfilePage.jsx` has separate English/Tamil name
  fields and displays the resolved name in the sidebar header. i18n strings
  added under `profilePage.*`.
- **Navbar** — `Navbar.jsx` greeting, dropdown header, and mobile menu now
  show the localized name.
- **User Dashboard** — `UserDashboard.jsx` greeting + worker search now
  matches/displays bilingual names.
- **Worker Dashboard** — `WorkerDashboard.jsx` greeting, sidebar, and the
  "my profile" preview cards all resolve the localized name (preferring the
  worker-profile record, falling back to the account record). The UPI QR
  payee name (`pn=` parameter) intentionally continues to use the
  canonical/English name — UPI deep links / banking apps aren't guaranteed
  to render non-Latin scripts correctly, so this was deliberately left
  as-is for payment reliability.
- **Search results** — `WorkerCard.jsx`, `SearchAutocomplete.jsx` (search
  also now matches both languages; dropdown items dedupe by worker `id`
  instead of by name string, which also fixes a pre-existing edge case
  where two different workers sharing an English name could be
  incorrectly deduped).
- **Worker profile page** — `WorkerDetailPage.jsx` (heading, avatar alt
  text, "Ready to book {name}?" CTA).
- **Worker profile edit modal** — `WorkerModal.jsx` now has separate
  English/Tamil name inputs, replacing the single "Full Name" field.
- **Booking flow** — `BookingPage.jsx` (review/confirm screens) and
  `BookingCard.jsx` (booking list items, cash-payment modal) resolve the
  bilingual snapshot captured at booking time.
- **In-app chat** — `ChatModal.jsx` header now shows the other party's
  localized name (from the booking's bilingual snapshot).
- **Map view** — `MapView.jsx` marker initials and popup cards (Leaflet,
  built via raw HTML strings since Leaflet doesn't render React) are now
  language-aware via a `lang` parameter threaded through `workerMarkerHTML`
  and `popupHTML`, and markers re-render when the app language changes.

### Admin Panel — `admin-panel/src/utils/localizedName.js`
- **`UsersPage.jsx`** — name column, expanded detail (adds "Name (English)"
  / "Name (Tamil)" rows), search.
- **`WorkersPage.jsx`** — grid card view, table view, delete-confirmation
  text, search.
- **`Dashboard.jsx`** — "Recently Active" rows and the worker status chips.
- **`BookingsPage.jsx`** — table display resolves the bilingual booking
  snapshot; search matches both languages. CSV/Excel/print exports
  intentionally keep the canonical English snapshot for spreadsheet-tool
  compatibility.
- **`HistoryPage.jsx`** — the activity feed (built client-side from live
  users/workers/bookings data, not a stored history table) now carries and
  resolves bilingual names; search matches both languages. CSV/Excel
  exports again intentionally stay in canonical English.

### Deliberate scope boundaries (and why)
A few screens were **not** changed, applying the same principle already used
elsewhere in this codebase for point-in-time records:
- **Worker verification review** (`admin-panel/src/pages/VerificationPage.jsx`)
  reads from the `verifications` table, which stores a one-time `worker_name`
  *snapshot* at submission time — the same pattern `bookings.worker_name`
  used before this feature. This is an internal admin/audit screen, not
  customer-facing, so it continues to show the name as it was at submission.
- **Support chat** (`admin-panel/src/pages/SupportPage.jsx`) and **in-app
  chat sender names** beyond the header (already localized) work off similar
  conversation-level snapshots.
- **CSV / Excel / print exports** everywhere intentionally keep the
  canonical English name — exporting bilingual/mixed-script data well is a
  separate, larger feature (column choice, font/encoding concerns in
  generated PDFs, etc.) outside this request's scope.
- **The admin's own profile** (`admin-panel/src/pages/ProfilePage.jsx`) was
  left untouched — the feature request is about *user*/*worker* names, and
  admin accounts are internal staff, not part of the bilingual-name surface
  area described in the request.

---

## Verification performed
- `node --check` on every modified backend file — no syntax errors.
- `npm run build` for **both** `frontend/` and `admin-panel/` — both build
  successfully with no errors or new warnings (run twice, after the initial
  pass and again after the final `LoginPage.jsx`/`SignupPage.jsx` polish
  pass).
- Manually traced every `.name` reference touching a user/worker object in
  both codebases (`grep -rn "worker\.name\b\|user\.name\b"` etc.) to confirm
  it was either updated or deliberately left as a documented
  snapshot/export/admin-only case.
- Confirmed backward compatibility: every new column has a safe default and
  a backfill step, so accounts/bookings created before this change continue
  to display correctly (falling back to the legacy `name` value) without
  any manual data migration step required from the developer.

## Files touched
```
backend/db/schema.sql
backend/db/migrate.js
backend/server.js
backend/routes/auth.js
backend/routes/users.js
backend/routes/workers.js
backend/routes/bookings.js

frontend/src/utils/localizedName.js                 (new)
frontend/src/i18n/locales/en.json
frontend/src/i18n/locales/ta.json
frontend/src/pages/LoginPage.jsx
frontend/src/pages/SignupPage.jsx
frontend/src/pages/ProfilePage.jsx
frontend/src/pages/UserDashboard.jsx
frontend/src/pages/WorkerDashboard.jsx
frontend/src/pages/WorkerDetailPage.jsx
frontend/src/pages/BookingPage.jsx
frontend/src/components/Navbar.jsx
frontend/src/components/WorkerCard.jsx
frontend/src/components/WorkerModal.jsx
frontend/src/components/SearchAutocomplete.jsx
frontend/src/components/BookingCard.jsx
frontend/src/components/ChatModal.jsx
frontend/src/components/MapView.jsx

admin-panel/src/utils/localizedName.js               (new)
admin-panel/src/pages/UsersPage.jsx
admin-panel/src/pages/WorkersPage.jsx
admin-panel/src/pages/Dashboard.jsx
admin-panel/src/pages/BookingsPage.jsx
admin-panel/src/pages/HistoryPage.jsx
```
