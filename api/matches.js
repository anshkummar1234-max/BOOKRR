import { db } from 'hatchable';

export const access = 'public';
export const methods = ['GET', 'POST'];

const sports = ['Football', 'Cricket', 'Badminton', 'Other sports'];
const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const visitorPattern = /^[a-zA-Z0-9_-]{16,80}$/;

function indiaToday() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
function parseTime(value) {
  if (typeof value !== 'string') return null;
  const m = value.trim().match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i);
  if (!m) return null;
  let hour = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') hour += 12;
  return String(hour).padStart(2, '0') + ':' + m[2];
}
function clean(value, max) { return typeof value === 'string' ? value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max) : ''; }
function jsonError(res, status, error) { return res.status(status).json({ error }); }

async function rateLimitCreate(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  const rawIp = String(req.ip || req.headers?.['x-real-ip'] || (typeof forwarded === 'string' ? forwarded.split(',')[0] : '') || 'unknown').trim().slice(0, 100);
  const bytes = new TextEncoder().encode(rawIp);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const ipHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  const result = await db.query(
    "INSERT INTO growth_rate_limits (ip_hash, action_key, window_start, request_count) VALUES ($1, 'match_create', date_trunc('hour', now()), 1) " +
    "ON CONFLICT (ip_hash, action_key) DO UPDATE SET " +
    "request_count = CASE WHEN growth_rate_limits.window_start < date_trunc('hour', now()) THEN 1 ELSE growth_rate_limits.request_count + 1 END, " +
    "window_start = date_trunc('hour', now()), updated_at = now() RETURNING request_count",
    [ipHash]
  );
  await db.query("DELETE FROM growth_rate_limits WHERE updated_at < now() - interval '48 hours'");
  return Number(result.rows[0]?.request_count || 0) <= 10;
}

export default async function (req, res) {
  try {
    if (req.method === 'GET') {
      const token = String(req.query?.token || '').trim();
      if (!tokenPattern.test(token)) return jsonError(res, 400, 'This match invite link is invalid.');
      const result = await db.query(
        "SELECT m.id, m.invite_token::text AS invite_token, m.organizer_name, m.sport, m.match_date::text AS match_date, " +
        "m.start_time::text AS start_time, m.players_needed, m.area, m.status, m.expires_at, m.venue_id, v.name AS venue_name, v.area AS venue_area " +
        "FROM match_plans m LEFT JOIN venues v ON v.id = m.venue_id " +
        "WHERE m.invite_token = $1::uuid AND m.expires_at > now()",
        [token]
      );
      if (!result.rows.length) return jsonError(res, 404, 'This invite has expired or is no longer available.');
      const match = result.rows[0];
      const visitorKey = String(req.query?.visitor_key || '');
      if (visitorPattern.test(visitorKey)) {
        try {
          await db.query(
            "INSERT INTO match_events (match_id, event_type, event_key) VALUES ($1, 'invite_opened', $2) ON CONFLICT DO NOTHING",
            [match.id, visitorKey]
          );
        } catch (trackingError) { console.error('invite-open tracking skipped', trackingError); }
      }
      const [counts, rsvps] = await Promise.all([
        db.query("SELECT response, count(*)::int AS total FROM match_rsvps WHERE match_id = $1 GROUP BY response", [match.id]),
        db.query("SELECT display_name, response, updated_at FROM match_rsvps WHERE match_id = $1 ORDER BY updated_at DESC LIMIT 30", [match.id])
      ]);
      const summary = { going: 0, maybe: 0, not_going: 0 };
      for (const row of counts.rows) summary[row.response] = Number(row.total);
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ match, counts: summary, rsvps: rsvps.rows });
    }

    const body = req.body || {};
    if (clean(body.website, 120)) return jsonError(res, 400, 'Could not create this match plan.');
    const visitorHint = String(body.visitor_key || '');
    if (visitorHint && !visitorPattern.test(visitorHint)) return jsonError(res, 400, 'Refresh the page and try again.');
    const allowed = await rateLimitCreate(req);
    if (!allowed) return jsonError(res, 429, 'Too many match plans were created from this connection. Please try again later.');

    const sport = clean(body.sport, 30);
    const date = body.match_date;
    const time = parseTime(body.start_time);
    const players = Number(body.players_needed);
    const area = clean(body.area, 100);
    const organizerName = clean(body.organizer_name, 50) || 'A teammate';
    if (!sports.includes(sport)) return jsonError(res, 400, 'Choose a valid sport.');
    if (!validDate(date) || date < indiaToday()) return jsonError(res, 400, 'Choose a date today or in the future.');
    if (new Date(date + 'T00:00:00Z').getTime() > Date.now() + 120 * 86400000) return jsonError(res, 400, 'Choose a date within the next 120 days.');
    if (!time) return jsonError(res, 400, 'Choose a valid match start time.');
    if (!Number.isInteger(players) || players < 2 || players > 22) return jsonError(res, 400, 'Choose between 2 and 22 players.');
    if (area.length > 100) return jsonError(res, 400, 'Area must be 100 characters or fewer.');

    const inserted = await db.query(
      "INSERT INTO match_plans (organizer_name, sport, match_date, start_time, players_needed, area, expires_at) " +
      "VALUES ($1,$2,$3::date,$4::time,$5,$6,GREATEST(now() + interval '30 days', $3::date + interval '7 days')) " +
      "RETURNING id, invite_token::text AS invite_token, organizer_name, sport, match_date::text AS match_date, start_time::text AS start_time, players_needed, area, status, expires_at",
      [organizerName, sport, date, time, players, area]
    );
    const match = inserted.rows[0];
    try {
      await db.query(
        "INSERT INTO match_events (match_id, event_type, event_key) VALUES ($1, 'invite_created', $2) ON CONFLICT DO NOTHING",
        [match.id, match.invite_token]
      );
    } catch (trackingError) { console.error('invite-created tracking skipped', trackingError); }
    return res.status(201).json({ match, invite_url: `/match.html?token=${match.invite_token}` });
  } catch (error) {
    console.error('match endpoint failed', error);
    return res.status(500).json({ error: 'Could not load or create this match. Please try again.' });
  }
}