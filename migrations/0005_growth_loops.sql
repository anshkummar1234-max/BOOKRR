CREATE TABLE IF NOT EXISTS match_plans (
  id BIGSERIAL PRIMARY KEY,
  invite_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  -- Organizer identity is intentionally not stored on public invite records.
  organizer_name TEXT NOT NULL DEFAULT 'A teammate',
  sport TEXT NOT NULL CHECK (sport IN ('Football','Cricket','Badminton','Other sports')),
  match_date DATE NOT NULL,
  start_time TIME NOT NULL,
  players_needed SMALLINT NOT NULL DEFAULT 10 CHECK (players_needed BETWEEN 2 AND 22),
  area TEXT NOT NULL DEFAULT '',
  venue_id BIGINT REFERENCES venues(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','booking_requested','confirmed','completed','cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(organizer_name) BETWEEN 1 AND 50),
  CHECK (char_length(area) <= 100)
);
CREATE INDEX IF NOT EXISTS idx_match_plans_date_status ON match_plans(match_date, status);
-- No organizer identity index: shared match plans are guest-friendly and data-minimal.

CREATE TABLE IF NOT EXISTS match_rsvps (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL REFERENCES match_plans(id) ON DELETE CASCADE,
  visitor_key TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'A player',
  response TEXT NOT NULL CHECK (response IN ('going','maybe','not_going')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, visitor_key),
  CHECK (char_length(visitor_key) BETWEEN 16 AND 80),
  CHECK (char_length(display_name) BETWEEN 1 AND 40)
);
CREATE INDEX IF NOT EXISTS idx_match_rsvps_match_response ON match_rsvps(match_id, response);

CREATE TABLE IF NOT EXISTS match_events (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL REFERENCES match_plans(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('invite_created','invite_opened','rsvp_submitted','booking_requested','booking_confirmed','booking_completed')),
  event_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, event_type, event_key)
);
CREATE INDEX IF NOT EXISTS idx_match_events_type_created ON match_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_events_match ON match_events(match_id, event_type);

CREATE TABLE IF NOT EXISTS growth_rate_limits (
  ip_hash TEXT NOT NULL,
  action_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ip_hash, action_key)
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS match_plan_id BIGINT REFERENCES match_plans(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_match_plan_status ON bookings(match_plan_id, status) WHERE match_plan_id IS NOT NULL;