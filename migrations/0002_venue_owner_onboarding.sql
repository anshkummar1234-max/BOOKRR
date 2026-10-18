ALTER TABLE venues ADD COLUMN IF NOT EXISTS owner_user_id text;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS owner_contact_phone text;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS opening_time time NOT NULL DEFAULT '06:00';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS closing_time time NOT NULL DEFAULT '23:00';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified';

CREATE TABLE IF NOT EXISTS venue_owner_applications (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL,
  applicant_name text NOT NULL,
  contact_phone text NOT NULL,
  venue_name text NOT NULL,
  area text NOT NULL,
  sports text[] NOT NULL DEFAULT '{}',
  map_query text NOT NULL,
  hourly_rate numeric(10,2),
  opening_time time NOT NULL DEFAULT '06:00',
  closing_time time NOT NULL DEFAULT '23:00',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  venue_id bigint REFERENCES venues(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_owner_apps_user_created ON venue_owner_applications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_apps_status_created ON venue_owner_applications(status, created_at DESC);