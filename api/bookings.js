import { db } from 'hatchable';

export const access = 'user';
export const methods = ['POST'];

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
function validTime(value) { return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value); }
function indiaToday() { const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const p = Object.fromEntries(parts.map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}`; }

export default async function (req, res) {
  const body = req.body || {};
  const venueId = Number(body.venue_id);
  const name = typeof body.customer_name === 'string' ? body.customer_name.trim() : '';
  const phone = typeof body.contact_phone === 'string' ? body.contact_phone.replace(/[\s()-]/g, '') : '';
  const sport = typeof body.sport === 'string' ? body.sport.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : '';
  const matchToken = typeof body.match_token === 'string' ? body.match_token.trim() : '';
  const duration = Number(body.duration_hours || 1);
  if (!Number.isSafeInteger(venueId) || venueId < 1) return res.status(400).json({ error: 'Choose a valid turf.' });
  if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Enter your name (2–80 characters).' });
  if (!/^\+?\d{10,15}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid phone number including country code if needed.' });
  if (!validDate(body.booking_date)) return res.status(400).json({ error: 'Choose a valid date.' });
  const today = indiaToday();
  if (body.booking_date < today) return res.status(400).json({ error: 'Booking date cannot be in the past.' });
  if (!validTime(body.start_time)) return res.status(400).json({ error: 'Choose a valid start time.' });
  if (!Number.isInteger(duration) || duration < 1 || duration > 4) return res.status(400).json({ error: 'Duration must be 1–4 hours.' });
  // Operating-hours validation is performed after loading the venue below.
  if (!['Football','Cricket','Badminton','Other sports'].includes(sport)) return res.status(400).json({ error: 'Choose a listed sport.' });
  if (matchToken && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(matchToken)) return res.status(400).json({ error: 'This match invite link is invalid. Open the invite again and retry.' });

  try {
    let matchPlanId = null;
    if (matchToken) {
      const matchPlan = await db.query('SELECT id, sport, match_date::text AS match_date, status FROM match_plans WHERE invite_token = $1::uuid AND expires_at > now()', [matchToken]);
      if (!matchPlan.rows.length) return res.status(404).json({ error: 'This match invite has expired or is no longer available.' });
      const plan = matchPlan.rows[0];
      if (!['planned','booking_requested'].includes(plan.status)) return res.status(409).json({ error: 'This match plan is already confirmed, completed or cancelled.' });
      if (String(plan.match_date) !== body.booking_date || plan.sport !== sport) return res.status(400).json({ error: 'Keep the sport and date from the shared match plan, or start a new plan before booking.' });
      const pendingForPlan = await db.query("SELECT id FROM bookings WHERE match_plan_id = $1 AND status IN ('requested','confirmed') LIMIT 1", [plan.id]);
      if (pendingForPlan.rows.length) return res.status(409).json({ error: 'This match already has a pending or confirmed booking request.' });
      matchPlanId = plan.id;
    }
    const venue = await db.query('SELECT id, sports, opening_time::text AS opening_time, closing_time::text AS closing_time FROM venues WHERE id = $1 AND is_active = true', [venueId]);
    if (!venue.rows.length) return res.status(404).json({ error: 'That turf is no longer listed.' });
    if (!venue.rows[0].sports.includes(sport) && sport !== 'Other sports') return res.status(400).json({ error: 'That sport is not listed for this venue. Please contact the venue to confirm.' });
    const startHour = Number(body.start_time.slice(0, 2));
    const startMinute = Number(body.start_time.slice(3, 5));
    const openingParts = String(venue.rows[0].opening_time).slice(0, 5).split(':').map(Number);
    const closingParts = String(venue.rows[0].closing_time).slice(0, 5).split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const openingMinutes = openingParts[0] * 60 + openingParts[1];
    const closingMinutes = closingParts[0] * 60 + closingParts[1];
    if (startMinute !== 0 || startMinutes < openingMinutes || startMinutes + duration * 60 > closingMinutes) return res.status(400).json({ error: 'Choose an hourly start within this venue’s listed opening hours.' });
    const recent = await db.query(
      "SELECT count(*)::int AS total FROM bookings WHERE user_id = $1 AND created_at > now() - interval '1 hour'",
      [String(req.user.id)]
    );
    if (recent.rows[0].total >= 5) return res.status(429).json({ error: 'You have reached the request limit. Please try again later.' });

    // Lock the venue row and check conflicts in the SAME transaction. The row lock
    // serializes competing booking requests for this venue before the insert query.
    const tx = await db.transaction([
      { sql: 'SELECT id FROM venues WHERE id = $1 AND is_active = true FOR UPDATE', params: [venueId] },
      { sql: 'SELECT id FROM match_plans WHERE id = $1::bigint FOR UPDATE', params: [matchPlanId] },
      {
        sql: "INSERT INTO bookings (user_id, venue_id, customer_name, contact_phone, booking_date, start_time, duration_hours, sport, notes, match_plan_id) " +
          "SELECT $1,$2,$3,$4,$5::date,$6::time,$7,$8,$9,$10::bigint " +
          "WHERE EXISTS (SELECT 1 FROM venues WHERE id = $2 AND is_active = true) " +
          "AND ($10::bigint IS NULL OR (EXISTS (SELECT 1 FROM match_plans mp WHERE mp.id = $10::bigint AND mp.status IN ('planned','booking_requested') AND mp.expires_at > now()) " +
          "AND NOT EXISTS (SELECT 1 FROM bookings mb WHERE mb.match_plan_id = $10::bigint AND mb.status IN ('requested','confirmed'))) ) " +
          "AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.venue_id = $2 AND b.booking_date = $5::date " +
          "AND b.status IN ('requested','confirmed') " +
          "AND b.start_time < ($6::time + ($7::text || ' hours')::interval) " +
          "AND (b.start_time + (b.duration_hours::text || ' hours')::interval) > $6::time) " +
          "RETURNING id, venue_id, booking_date, start_time, duration_hours, sport, status, match_plan_id, created_at",
        params: [String(req.user.id), venueId, name, phone, body.booking_date, body.start_time, duration, sport, notes, matchPlanId]
      }
    ]);
    const inserted = tx?.results?.[2]?.rows || tx?.result?.results?.[2]?.rows || [];
    if (!inserted.length) {
      const stillActive = await db.query('SELECT id FROM venues WHERE id = $1 AND is_active = true', [venueId]);
      if (!stillActive.rows.length) return res.status(404).json({ error: 'That turf is no longer listed.' });
      return res.status(409).json({ error: 'That time overlaps an existing request or confirmed booking. Please choose another slot.' });
    }
    if (inserted[0].match_plan_id) {
      try {
        await db.transaction([
          { sql: "UPDATE match_plans SET status = 'booking_requested', venue_id = $1, start_time = $2::time, updated_at = now() WHERE id = $3 AND status IN ('planned','booking_requested')", params: [venueId, body.start_time, inserted[0].match_plan_id] },
          { sql: "INSERT INTO match_events (match_id, event_type, event_key) VALUES ($1, 'booking_requested', $2) ON CONFLICT DO NOTHING", params: [inserted[0].match_plan_id, String(inserted[0].id)] }
        ]);
      } catch (syncError) { console.error('match growth status sync failed', syncError); }
    }
    return res.status(201).json({
      booking: inserted[0],
      message: 'Booking request received. The venue must confirm availability and price; online payment is not enabled yet.'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Could not submit your request. Please try again.' });
  }
}