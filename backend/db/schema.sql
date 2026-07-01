BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password      TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',
  avatar        TEXT NOT NULL DEFAULT '',
  lat           DOUBLE PRECISION NOT NULL DEFAULT 0,
  lng           DOUBLE PRECISION NOT NULL DEFAULT 0,
  pincode       TEXT NOT NULL DEFAULT '',
  street        TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  referral_code TEXT NOT NULL DEFAULT '',
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ,
  name_en       TEXT NOT NULL DEFAULT '',
  name_ta       TEXT NOT NULL DEFAULT ''
);

-- Backward-compatible for databases that already ran the CREATE TABLE above
-- in a prior deploy (before name_en/name_ta existed).
ALTER TABLE users ADD COLUMN IF NOT EXISTS name_en TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS name_ta TEXT NOT NULL DEFAULT '';
-- Backfill: any existing user without an English name gets their legacy
-- `name` value copied in, so the bilingual display logic never sees a blank.
UPDATE users SET name_en = name WHERE name_en = '' OR name_en IS NULL;

CREATE TABLE IF NOT EXISTS categories (
  id           BIGINT PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  icon         TEXT NOT NULL DEFAULT 'cat-default',
  icon_type    TEXT NOT NULL DEFAULT 'preset',
  banner_color TEXT,
  enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  custom       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backward-compatible for databases that already ran the CREATE TABLE above
-- in a prior deploy (before banner_color existed).
ALTER TABLE categories ADD COLUMN IF NOT EXISTS banner_color TEXT;

CREATE TABLE IF NOT EXISTS workers (
  id                        BIGINT PRIMARY KEY,
  user_id                   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                      TEXT NOT NULL,
  name_en                   TEXT NOT NULL DEFAULT '',
  name_ta                   TEXT NOT NULL DEFAULT '',
  email                     TEXT NOT NULL DEFAULT '',
  category_id               BIGINT REFERENCES categories(id),
  phone                     TEXT NOT NULL DEFAULT '',
  aadhaar_number            TEXT NOT NULL DEFAULT '',
  bio                       TEXT NOT NULL DEFAULT '',
  specialization            TEXT NOT NULL DEFAULT '',
  experience                TEXT NOT NULL DEFAULT '',
  years_of_exp              INTEGER NOT NULL DEFAULT 0,
  skills                    JSONB NOT NULL DEFAULT '[]',
  lat                       DOUBLE PRECISION NOT NULL DEFAULT 0,
  lng                       DOUBLE PRECISION NOT NULL DEFAULT 0,
  pincode                   TEXT NOT NULL DEFAULT '',
  street                    TEXT NOT NULL DEFAULT '',
  avatar                    TEXT NOT NULL DEFAULT '',
  availability              BOOLEAN NOT NULL DEFAULT TRUE,
  approved                  BOOLEAN NOT NULL DEFAULT FALSE,
  rating                    DOUBLE PRECISION NOT NULL DEFAULT 0,
  jobs_completed            INTEGER NOT NULL DEFAULT 0,
  hourly_rate               DOUBLE PRECISION NOT NULL DEFAULT 500,
  payout_account            JSONB NOT NULL DEFAULT '{}',
  verification_status       TEXT NOT NULL DEFAULT 'unverified',
  admin_approval_status     TEXT NOT NULL DEFAULT 'none',
  verification_submitted_at TIMESTAMPTZ,
  last_seen_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bookings (
  id                   BIGINT PRIMARY KEY,
  user_id              BIGINT NOT NULL,
  user_name            TEXT NOT NULL DEFAULT '',
  worker_id            BIGINT NOT NULL,
  worker_user_id       BIGINT,
  worker_name          TEXT NOT NULL DEFAULT '',
  category             TEXT NOT NULL DEFAULT '',
  date                 TEXT NOT NULL DEFAULT '',
  notes                TEXT NOT NULL DEFAULT '',
  status               TEXT NOT NULL DEFAULT 'pending',
  duration             DOUBLE PRECISION NOT NULL DEFAULT 1,
  hourly_rate          DOUBLE PRECISION NOT NULL DEFAULT 0,
  service_cost         DOUBLE PRECISION NOT NULL DEFAULT 0,
  distance_cost        DOUBLE PRECISION NOT NULL DEFAULT 0,
  distance_km          DOUBLE PRECISION NOT NULL DEFAULT 0,
  distance_rate        DOUBLE PRECISION NOT NULL DEFAULT 0,
  platform_fee         DOUBLE PRECISION NOT NULL DEFAULT 0,
  cost                 DOUBLE PRECISION NOT NULL DEFAULT 0,
  worker_payout        DOUBLE PRECISION NOT NULL DEFAULT 0,
  admin_commission     DOUBLE PRECISION NOT NULL DEFAULT 0,
  admin_transaction_id TEXT,
  commission_status    TEXT NOT NULL DEFAULT 'pending',
  split_details        JSONB NOT NULL DEFAULT '{}',
  payment_status       TEXT NOT NULL DEFAULT 'unpaid',
  payment_mode         TEXT NOT NULL DEFAULT 'pending',
  transaction_id       TEXT,
  paid_at              TIMESTAMPTZ,
  user_lat             DOUBLE PRECISION,
  user_lng             DOUBLE PRECISION,
  user_phone           TEXT NOT NULL DEFAULT '',
  user_address         TEXT NOT NULL DEFAULT '',
  work_started_at      TIMESTAMPTZ,
  status_history       JSONB NOT NULL DEFAULT '[]',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add payment_mode column to existing deployments (idempotent)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'pending';

-- Customer-entered UPI transaction reference (UTR) for QR/UPI payments.
-- Captured client-side after the customer completes payment in their UPI app,
-- since static UPI-intent QR codes have no server-side payment callback.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_payment_ref TEXT NOT NULL DEFAULT '';

-- ── Permanent image storage (Neon PostgreSQL) ───────────────────────────────
-- All admin/worker uploaded images (category icons, verification documents,
-- etc.) are stored here as BYTEA so they survive page refreshes, redeploys,
-- and server restarts — never in local/temporary disk storage.
CREATE TABLE IF NOT EXISTS app_images (
  id            BIGSERIAL PRIMARY KEY,
  owner_type    TEXT NOT NULL DEFAULT '',   -- e.g. 'category_icon', 'verification_certificate', 'verification_video'
  owner_id      TEXT NOT NULL DEFAULT '',   -- id of the owning record, if any
  mime_type     TEXT NOT NULL,
  original_name TEXT NOT NULL DEFAULT '',
  size_bytes    INTEGER NOT NULL DEFAULT 0,
  data          BYTEA NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_app_images_owner ON app_images(owner_type, owner_id);

-- Add pricing column to workers for worker-controlled service pricing
ALTER TABLE workers ADD COLUMN IF NOT EXISTS pricing JSONB NOT NULL DEFAULT '{}';

-- ── Bilingual (English/Tamil) name support ──────────────────────────────────
-- workers.name_en / workers.name_ta: backward-compatible for databases that
-- already ran CREATE TABLE workers above in a prior deploy.
ALTER TABLE workers ADD COLUMN IF NOT EXISTS name_en TEXT NOT NULL DEFAULT '';
ALTER TABLE workers ADD COLUMN IF NOT EXISTS name_ta TEXT NOT NULL DEFAULT '';
UPDATE workers SET name_en = name WHERE name_en = '' OR name_en IS NULL;

-- bookings: bilingual SNAPSHOT of the user/worker display name at the time
-- the booking was created. Snapshots (not live joins) so historical bookings
-- keep showing the name as it was when the service was booked — consistent
-- with how user_name/worker_name already behave today.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_name_en   TEXT NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_name_ta   TEXT NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS worker_name_en TEXT NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS worker_name_ta TEXT NOT NULL DEFAULT '';
-- Backfill existing bookings: fall back to the legacy single-language
-- snapshot for both languages so old bookings still render correctly.
UPDATE bookings SET user_name_en   = user_name   WHERE user_name_en   = '' OR user_name_en   IS NULL;
UPDATE bookings SET worker_name_en = worker_name WHERE worker_name_en = '' OR worker_name_en IS NULL;

CREATE TABLE IF NOT EXISTS messages (
  id          BIGINT PRIMARY KEY,
  booking_id  BIGINT NOT NULL,
  sender_id   BIGINT NOT NULL,
  sender_name TEXT NOT NULL DEFAULT '',
  sender_role TEXT NOT NULL DEFAULT 'user',
  text        TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verifications (
  id                        BIGINT PRIMARY KEY,
  worker_id                 BIGINT NOT NULL,
  worker_name               TEXT NOT NULL DEFAULT '',
  worker_email              TEXT NOT NULL DEFAULT '',
  worker_phone              TEXT NOT NULL DEFAULT '',
  category_id               BIGINT,
  certificate_file          TEXT,
  certificate_mimetype      TEXT,
  certificate_originalname  TEXT,
  work_video                TEXT,
  video_mimetype            TEXT,
  video_originalname        TEXT,
  verification_status       TEXT NOT NULL DEFAULT 'pending',
  admin_approval_status     TEXT NOT NULL DEFAULT 'pending',
  admin_notes               TEXT NOT NULL DEFAULT '',
  reviewed_at               TIMESTAMPTZ,
  verification_submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id            TEXT PRIMARY KEY,
  user_id       BIGINT NOT NULL,
  user_name     TEXT NOT NULL DEFAULT '',
  user_email    TEXT NOT NULL DEFAULT '',
  text          TEXT NOT NULL,
  sender_role   TEXT NOT NULL DEFAULT 'user',
  sender_id     BIGINT,
  sender_name   TEXT NOT NULL DEFAULT '',
  read_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  read_by_user  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL DEFAULT 'info',
  title      TEXT NOT NULL DEFAULT '',
  message    TEXT NOT NULL DEFAULT '',
  link       TEXT,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_wallet (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  balance         DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_earned    DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_bookings  INTEGER NOT NULL DEFAULT 0,
  total_withdrawn DOUBLE PRECISION NOT NULL DEFAULT 0,
  payout_account  JSONB,
  updated_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL DEFAULT 'commission',
  booking_id      BIGINT,
  worker_id       BIGINT,
  worker_name     TEXT NOT NULL DEFAULT '',
  user_name       TEXT NOT NULL DEFAULT '',
  category        TEXT NOT NULL DEFAULT '',
  amount          DOUBLE PRECISION NOT NULL DEFAULT 0,
  worker_payout   DOUBLE PRECISION NOT NULL DEFAULT 0,
  service_cost    DOUBLE PRECISION NOT NULL DEFAULT 0,
  distance_cost   DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_cost      DOUBLE PRECISION NOT NULL DEFAULT 0,
  commission_rate DOUBLE PRECISION NOT NULL DEFAULT 0.05,
  status          TEXT NOT NULL DEFAULT 'credited',
  mode            TEXT NOT NULL DEFAULT 'simulation',
  credited_to     JSONB,
  sent_to         JSONB,
  note            TEXT NOT NULL DEFAULT '',
  reference       TEXT,
  recorded_by     BIGINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS history (
  id          TEXT PRIMARY KEY,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type        TEXT NOT NULL DEFAULT '',
  actor_id    BIGINT,
  actor_name  TEXT NOT NULL DEFAULT '',
  actor_email TEXT NOT NULL DEFAULT '',
  actor_role  TEXT NOT NULL DEFAULT '',
  booking_id  BIGINT,
  details     TEXT NOT NULL DEFAULT '',
  worker_name TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT '',
  date        TEXT NOT NULL DEFAULT '',
  cost        DOUBLE PRECISION,
  status      TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS idempotency (
  key          TEXT PRIMARY KEY,
  status       TEXT NOT NULL DEFAULT 'locked',
  result       JSONB,
  locked_at    TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Ensure admin_wallet always has exactly one row
INSERT INTO admin_wallet (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Clean up stale idempotency locks older than 10 minutes on every migration
DELETE FROM idempotency WHERE status = 'locked' AND locked_at < NOW() - INTERVAL '10 minutes';

COMMIT;

-- ── Worker Ratings ────────────────────────────────────────────────────────────
-- One rating per booking (enforced by UNIQUE constraint)
CREATE TABLE IF NOT EXISTS ratings (
  id          BIGINT PRIMARY KEY,
  booking_id  BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  worker_id   BIGINT NOT NULL REFERENCES workers(id)  ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  stars       SMALLINT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  review      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id)   -- one rating per booking, prevents duplicates
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS ratings_worker_id_idx ON ratings(worker_id);
CREATE INDEX IF NOT EXISTS ratings_user_id_idx   ON ratings(user_id);

-- Add total_ratings column to workers for quick denormalized count
ALTER TABLE workers ADD COLUMN IF NOT EXISTS total_ratings INTEGER NOT NULL DEFAULT 0;

-- Add rated flag to bookings so frontend can check without extra query
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_rated BOOLEAN NOT NULL DEFAULT FALSE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PERFORMANCE INDEXES  (added in optimization pass)
-- All use CREATE INDEX IF NOT EXISTS so they are safe to run on existing DBs.
-- ═══════════════════════════════════════════════════════════════════════════════

-- users
CREATE INDEX IF NOT EXISTS users_role_idx        ON users(role);
CREATE INDEX IF NOT EXISTS users_last_seen_idx   ON users(last_seen_at DESC NULLS LAST);

-- workers — most queried table
CREATE INDEX IF NOT EXISTS workers_user_id_idx           ON workers(user_id);
CREATE INDEX IF NOT EXISTS workers_category_id_idx       ON workers(category_id);
CREATE INDEX IF NOT EXISTS workers_approved_avail_idx    ON workers(approved, availability)
  WHERE approved = true AND availability = true;
CREATE INDEX IF NOT EXISTS workers_verification_idx      ON workers(verification_status);
CREATE INDEX IF NOT EXISTS workers_pincode_idx           ON workers(pincode);
CREATE INDEX IF NOT EXISTS workers_approval_status_idx   ON workers(admin_approval_status);

-- bookings — most write-heavy table
CREATE INDEX IF NOT EXISTS bookings_user_id_idx          ON bookings(user_id);
CREATE INDEX IF NOT EXISTS bookings_worker_id_idx        ON bookings(worker_id);
CREATE INDEX IF NOT EXISTS bookings_worker_user_id_idx   ON bookings(worker_user_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx           ON bookings(status);
CREATE INDEX IF NOT EXISTS bookings_created_at_idx       ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_commission_status_idx ON bookings(commission_status);

-- messages
CREATE INDEX IF NOT EXISTS messages_booking_id_idx       ON messages(booking_id, created_at ASC);
CREATE INDEX IF NOT EXISTS messages_unread_idx           ON messages(booking_id, sender_id, read)
  WHERE read = false;

-- verifications
CREATE INDEX IF NOT EXISTS verifications_worker_id_idx   ON verifications(worker_id);
CREATE INDEX IF NOT EXISTS verifications_status_idx      ON verifications(verification_status);

-- support_messages
CREATE INDEX IF NOT EXISTS support_user_id_idx           ON support_messages(user_id, created_at ASC);
CREATE INDEX IF NOT EXISTS support_unread_admin_idx      ON support_messages(read_by_admin)
  WHERE read_by_admin = false AND sender_role = 'user';

-- wallet_transactions
CREATE INDEX IF NOT EXISTS wallet_type_idx               ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS wallet_status_idx             ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS wallet_booking_id_idx         ON wallet_transactions(booking_id);
CREATE INDEX IF NOT EXISTS wallet_created_at_idx         ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS wallet_type_created_idx       ON wallet_transactions(type, created_at DESC);

-- history
CREATE INDEX IF NOT EXISTS history_timestamp_idx         ON history(timestamp DESC);
CREATE INDEX IF NOT EXISTS history_type_idx              ON history(type);
CREATE INDEX IF NOT EXISTS history_actor_id_idx          ON history(actor_id);
CREATE INDEX IF NOT EXISTS history_booking_id_idx        ON history(booking_id);

-- admin_notifications
CREATE INDEX IF NOT EXISTS admin_notif_read_idx          ON admin_notifications(read, created_at DESC);
