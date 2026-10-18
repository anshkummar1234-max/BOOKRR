CREATE TABLE customer_preferences (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  preferred_sport TEXT NOT NULL DEFAULT '',
  home_area TEXT NOT NULL DEFAULT '',
  favourite_venue_id BIGINT REFERENCES venues(id) ON DELETE SET NULL,
  personalization_consent BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(display_name) <= 80),
  CHECK (char_length(preferred_sport) <= 30),
  CHECK (char_length(home_area) <= 100)
);