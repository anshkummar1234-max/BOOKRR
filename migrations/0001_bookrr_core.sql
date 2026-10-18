CREATE TABLE venues (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  area TEXT NOT NULL,
  sports TEXT[] NOT NULL DEFAULT '{}',
  map_query TEXT NOT NULL,
  listing_source TEXT NOT NULL DEFAULT 'public directory listing; verify with venue',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_venues_active_name ON venues(is_active, name);

CREATE TABLE bookings (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  venue_id BIGINT NOT NULL REFERENCES venues(id),
  customer_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_hours SMALLINT NOT NULL DEFAULT 1 CHECK (duration_hours BETWEEN 1 AND 4),
  sport TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','rejected','cancelled','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_user_created ON bookings(user_id, created_at DESC);
CREATE INDEX idx_bookings_venue_date ON bookings(venue_id, booking_date, start_time);

INSERT INTO venues (name, area, sports, map_query) VALUES
('T3 Multisports Turf', 'Ranidiha Road, Sahara Estate', ARRAY['Football','Cricket'], 'T3 Multisports Turf Gorakhpur'),
('Boundary Box', 'Behind LIC Office, Taramandal', ARRAY['Cricket','Football'], 'Boundary Box Taramandal Gorakhpur'),
('Hattrick Turf & Cafe', 'Buddha Vihar Colony, Taramandal', ARRAY['Football','Cricket'], 'Hattrick Turf and Cafe Gorakhpur'),
('The OG Club', 'Water Sports Complex, Nauka Vihar Road', ARRAY['Football','Cricket','Other sports'], 'The OG Club Multi Sports Arena Gorakhpur'),
('Gorakhpur Cricket Turf', 'Behind BRD Medical College, Jhungia Bazar', ARRAY['Cricket'], 'Gorakhpur Cricket Turf BRD Medical College'),
('Legends Arena Turf', 'Behind Fatima Hospital, Shatabdipuram', ARRAY['Football'], 'Legends Arena Turf Gorakhpur'),
('Powerplay Turf', 'Near Harhwa Fatak Road, Ashok Nagar', ARRAY['Cricket'], 'Powerplay Turf Gorakhpur'),
('PLAYX Sports Club', 'Near AIIMS, Mahadev Jharkhandi', ARRAY['Cricket','Badminton','Other sports'], 'PLAYX Sports Club Gorakhpur'),
('Velocity Arena', 'Khajanchi Chowk, Medical College Road', ARRAY['Football','Cricket'], 'Velocity Arena Gorakhpur')
ON CONFLICT (name) DO NOTHING;