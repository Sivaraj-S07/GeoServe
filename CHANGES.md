# GeoServe v21 — User Mobile Number + Bilingual (English/Tamil) Name System

## 📱 User Mobile Number Capture & Admin Display
- Fixed a gap where the `user` role's mobile number was never collected or saved at signup (only `worker` signup required/stored a phone) — `users.phone` is now populated for users too, with optional collection on signup and a dedicated editable field on the profile page
- `POST /api/auth/signup` and `PUT /api/auth/profile` (`backend/routes/auth.js`) now validate and persist a 10-digit phone for both roles
- Admin → Users (`admin-panel/src/pages/UsersPage.jsx`) gained a dedicated **Mobile Number** table column and detail-row field, with `"Not provided"` fallback for users with no phone on file, plus phone-aware search
- Live signup form (`frontend/src/pages/LoginPage.jsx`, the page actually routed at `/signup`) and `ProfilePage.jsx` both gained a Mobile Number input for the user role

## 🇮🇳🇬🇧 Bilingual (English/Tamil) Name System
- New `name_en` / `name_ta` columns on `users` and `workers`, plus bilingual *snapshot* columns on `bookings` (`user_name_en/ta`, `worker_name_en/ta`) captured at booking time — added via idempotent auto-migration with full backfill from the legacy `name` column, so no existing account or booking ever shows a blank name
- Legacy `name` column is preserved as the canonical/English value everywhere, so all existing code paths, JWT payloads, and exports keep working unchanged
- New shared helper `utils/localizedName.js` (in both `frontend/src` and `admin-panel/src`) resolves the correct name for the app's current language with full null-safe fallbacks
- Registration (`LoginPage.jsx` signup tab + `SignupPage.jsx`) and profile editing (`ProfilePage.jsx`, `WorkerModal.jsx`) now collect **Name (English)** and **Name (Tamil)** as separate fields
- Applied across Navbar, User/Worker dashboards, worker search results & detail page, search autocomplete, booking pages & cards, in-app chat, the Leaflet map markers/popups, and the Admin Users/Workers/Dashboard/Bookings/History screens
- CSV/Excel/print exports and audit-style snapshots (worker verification review, support chat) intentionally retain the canonical English name — see `CHANGES.md` history / commit notes for the full rationale
- See full technical write-up below this entry's predecessor sections for file-by-file detail *(superseded — consult `git log` or the project's session notes for the complete file list of this change)*



## 🎨 Category Banner Color Management (Admin Panel)
- New **Banner Color** field on every category, set from Admin → Categories
- Color picker with curated presets, native swatch picker, and hex input, plus an "Use Automatic" reset to fall back to the built-in themed gradients
- Stored centrally on the `categories` table (`banner_color`); every screen that renders a worker's category banner (`CategoryBanner` in `frontend/src/components/Icon.jsx`) now reads this field as the single source of truth and reflects updates immediately on next load — no per-screen overrides
- Fully backward compatible: categories without a configured color keep their existing hand-tuned/auto-derived gradient theme exactly as before
- Validated server-side (`backend/routes/categories.js`) and client-side as a proper hex color (`#rgb` or `#rrggbb`)

## 🖼️ Global Category Image Synchronization
- The category's `icon` field (which holds the Admin-uploaded image URL when set) remains the single source of truth for the category's visual everywhere — category listings, search, worker cards, booking pages, dashboards, and the worker profile banner
- The worker profile banner's right-side visual now shows the actual Admin-uploaded category image (previously it only showed a generic decorative line-icon, regardless of any uploaded image)
- No hardcoded/default images can override an Admin-uploaded category image; categories with no uploaded image keep using the existing decorative icon system

# GeoServe v7.0 — UI/UX Redesign Changelog

## Theme: "Emerald Clarity"

### 🎨 Complete UI Redesign
- **New Color Palette**: Replaced orange/old-sage theme with vibrant **Emerald Green** (#059669 / #10b981)
  - Primary: `#059669` (emerald-600) → `#10b981` (emerald-500)
  - Dark mode: fully inverted dark teal surfaces
  - Semantic colors: blue, amber, red, purple all updated to Tailwind-inspired palette
- **New Fonts**:
  - Body: **Plus Jakarta Sans** (replaces DM Sans) — modern geometric grotesque
  - Display/headings: **Fraunces** (replaces Instrument Serif) — optical-size serif
  - Mono: **JetBrains Mono** (replaces DM Mono)
- **CSS Variables**: All design tokens updated across `frontend/src/index.css` and `admin-panel/src/index.css`

### 🧭 Navigation Bar
- Refreshed logo icon with updated emerald gradient and subtle rotation hover effect
- User pill badge upgraded with new color system
- Dropdown menus with `border-radius: 18px` and updated shadows
- Smooth backdrop blur effect

### 🏗️ Admin Panel Layout
- **Rebuilt `App.jsx`**: New `admin-shell` flex layout replacing old `admin-layout`
- **New `Sidebar.jsx`**: Sectioned navigation (Main / Reports / Tools), user footer card with ThemeToggle, sign-out button with hover effect
- **Top Bar**: Sticky, clean header with live status indicator and user display
- All pages wrapped with `anim-fade` + consistent `28px 32px` padding
- Mobile hamburger overlay support

### 📊 Components Updated
- **StatsCards**: Uses CSS variable color system, clean icon boxes, animated stagger
- **WorkerCard**: Updated accent bar, avatar with new primary border
- **Navbar**: Fully refreshed with Fraunces logo, updated dropdowns
- **Sidebar (admin)**: Brand new sectioned design

### 🛠 Bug Fixes
- Fixed `PaymentPage` lazy import (was missing — caused blank screen)
- Fixed `RoleGuard` initialization race condition (data loading without refresh)
- Fixed `admin-layout` → `admin-shell` CSS class mismatch
- Fixed all hardcoded hex colors (#2e7d52, #4aad72, etc.) replaced with CSS variables
- Fixed avatar fallback URLs updated to new primary color
- Removed all `admin-layout` CSS class references replaced with `admin-shell`
- Fixed VerificationPage missing `anim-fade` wrapper
- Fixed HistoryPage padding inconsistency

### 📱 Responsive Design
- Dashboard sidebar: fixed position on mobile with overlay
- All breakpoints preserved: 480px, 768px, 900px
- Toast notifications stack properly on mobile
- Support chat panel full-width on small screens

### ⚡ Performance
- Lazy-loaded pages with `Suspense` preserved
- `useCallback` + polling interval cleanup preserved
- Auth initialization guard prevents empty-state renders
