import { db } from 'hatchable';

export const access = 'user';
export const methods = ['POST'];

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
function validTime(value) { return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value); }

export default async function (req, res) {
  const body = req.body || {};
  const venueId = Number(body.venue_id);
  const name = typeof body.customer_name === 'string' ? body.customer_name.trim() : '';
  const phone = typeof body.contact_phone === 'string' ? body.contact_phone.replace(/[\s()-]/g, '') : '';
  const sport = typeof body.sport === 'string' ? body.sport.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : '';
  const duration = Number(body.duration_hours || 1);
  if (!Number.isSafeInteger(venueId) || venueId < 1) return res.status(400).json({ error: 'Choose a valid turf.' });
  if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Enter your name (2–80 characters).' });
  if (!/^\+?\d{10,15}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid phone number including country code if needed.' });
  if (!validDate(body.booking_date)) return res.status(400).json({ error: 'Choose a valid date.' });
  const today = new Date().toISOString().slice(0, 10);
  if (body.booking_date < today) return res.status(400).json({ error: 'Booking date cannot be in the past.' });
  if (!validTime(body.start_time)) return res.status(400).json({ error: 'Choose a valid start time.' });
  if (!Number.isInteger(duration) || duration < 1 || duration > 4) return res.status(400).json({ error: 'Duration must be 1–4 hours.' });
  if (!['Football','Cricket','Badminton','Other sports'].includes(sport)) return res.status(400).json({ error: 'Choose a listed sport.' });
  try {
    const venue = await db.query('SELECT id, sports FROM venues WHERE id = $1 AND is_active = true', [venueId]);
    if (!venue.rows.length) return res.status(404).json({ error: 'That turf is no longer listed.' });
    if (!venue.rows[0].sports.includes(sport) && sport !== 'Other sports') return res.status(400).json({ error: 'That sport is not listed for this venue. Please contact the venue to confirm.' });
    const recent = await db.query(
      "SELECT count(*)::int AS total FROM bookings WHERE user_id = $1 AND created_at > now() - interval '1 hour'",
      [String(req.user.id)]
    );
    if (recent.rows[0].total >= 5) return res.status(429).json({ error: 'You have reached the request limit. Please try again later.' });
    const result = await db.query(
      'INSERT INTO bookings (user_id, venue_id, customer_name, contact_phone, booking_date, start_time, duration_hours, sport, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, venue_id, booking_date, start_time, duration_hours, sport, status, created_at',
      [String(req.user.id), venueId, name, phone, body.booking_date, body.start_time, duration, sport, notes]
    );
    return res.status(201).json({ booking: result.rows[0], message: 'Booking request received. The venue must confirm availability and price.' });
  } catch (error) {
    return res.status(500).json({ error: 'Could not submit your request. Please try again.' });
  }
}