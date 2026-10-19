import { db } from 'hatchable';

export const access = 'user';
export const methods = ['GET', 'POST'];

const allowedSports = ['Football', 'Cricket', 'Badminton', 'Other sports'];
function validTime(value) { return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value); }
function clean(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }

export default async function (req, res) {
  const userId = String(req.user.id);
  try {
    if (req.method === 'GET') {
      const result = await db.query(
        'SELECT id, applicant_name, venue_name, area, sports, hourly_rate, opening_time::text AS opening_time, closing_time::text AS closing_time, status, venue_id, created_at FROM venue_owner_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
        [userId]
      );
      return res.json({ applications: result.rows });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
    const body = req.body || {};
    const applicant = clean(body.applicant_name, 80);
    const phone = clean(body.contact_phone, 24).replace(/[\s()-]/g, '');
    const venueName = clean(body.venue_name, 120);
    const area = clean(body.area, 160);
    const mapQuery = clean(body.map_query, 250);
    const sports = Array.isArray(body.sports) ? [...new Set(body.sports.filter(s => allowedSports.includes(s)))] : [];
    const rate = body.hourly_rate === '' || body.hourly_rate == null ? null : Number(body.hourly_rate);
    const opening = body.opening_time || '06:00';
    const closing = body.closing_time || '23:00';
    if (applicant.length < 2 || venueName.length < 3 || area.length < 3 || mapQuery.length < 3) return res.status(400).json({ error: 'Complete your name, venue name, area and map search text.' });
    if (!/^\+?\d{10,15}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid contact phone number.' });
    if (!sports.length) return res.status(400).json({ error: 'Choose at least one sport.' });
    if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 50000)) return res.status(400).json({ error: 'Enter a valid hourly price or leave it blank.' });
    if (!validTime(opening) || !validTime(closing) || opening >= closing) return res.status(400).json({ error: 'Opening time must be earlier than closing time.' });
    const recentApplications = await db.query(
      "SELECT count(*)::int AS total FROM venue_owner_applications WHERE user_id = $1 AND created_at > now() - interval '24 hours'",
      [userId]
    );
    if (Number(recentApplications.rows[0]?.total || 0) >= 3) {
      return res.status(429).json({ error: 'You have reached the venue application limit. Please try again tomorrow.' });
    }
    const duplicate = await db.query(
      "SELECT id FROM venue_owner_applications WHERE user_id = $1 AND lower(venue_name) = lower($2) AND area = $3 AND status = 'pending' LIMIT 1",
      [userId, venueName, area]
    );
    if (duplicate.rows.length) return res.status(409).json({ error: 'You already have a pending application for this venue.' });
    const result = await db.query(
      'INSERT INTO venue_owner_applications (user_id, applicant_name, contact_phone, venue_name, area, sports, map_query, hourly_rate, opening_time, closing_time) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::time,$10::time) RETURNING id, venue_name, status, created_at',
      [userId, applicant, phone, venueName, area, sports, mapQuery, rate, opening, closing]
    );
    return res.status(201).json({ application: result.rows[0], message: 'Application submitted for BOOKRR admin verification. Your turf will not be listed until it is approved.' });
  } catch (error) {
    return res.status(500).json({ error: 'Could not process your venue application.' });
  }
}