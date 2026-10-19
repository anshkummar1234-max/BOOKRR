import { db } from 'hatchable';

export const access = 'public';
export const methods = ['POST'];

const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const visitorPattern = /^[a-zA-Z0-9_-]{16,80}$/;
const allowedResponses = ['going', 'maybe', 'not_going'];
function clean(value, max) { return typeof value === 'string' ? value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max) : ''; }
async function withinRsvpRateLimit(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  const rawIp = String(req.ip || req.headers?.['x-real-ip'] || (typeof forwarded === 'string' ? forwarded.split(',')[0] : '') || '').trim().slice(0, 100);
  if (!rawIp) return true; // Never put every visitor behind one shared "unknown IP" bucket.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawIp));
  const ipHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  const result = await db.query(
    "INSERT INTO growth_rate_limits (ip_hash, action_key, window_start, request_count) VALUES ($1, 'match_rsvp', date_trunc('hour', now()), 1) " +
    "ON CONFLICT (ip_hash, action_key) DO UPDATE SET " +
    "request_count = CASE WHEN growth_rate_limits.window_start < date_trunc('hour', now()) THEN 1 ELSE growth_rate_limits.request_count + 1 END, " +
    "window_start = date_trunc('hour', now()), updated_at = now() RETURNING request_count",
    [ipHash]
  );
  return Number(result.rows[0]?.request_count || 0) <= 60;
}

export default async function (req, res) {
  const body = req.body || {};
  const token = String(body.token || '').trim();
  const visitorKey = String(body.visitor_key || '');
  const response = String(body.response || '');
  const displayName = clean(body.display_name, 40) || 'A player';
  if (!tokenPattern.test(token)) return res.status(400).json({ error: 'This match invite link is invalid.' });
  if (!visitorPattern.test(visitorKey)) return res.status(400).json({ error: 'Refresh the page and try again.' });
  if (!allowedResponses.includes(response)) return res.status(400).json({ error: 'Choose a valid RSVP response.' });
  try {
    if (!(await withinRsvpRateLimit(req))) return res.status(429).json({ error: 'Too many responses from this connection. Please try again later.' });
    const found = await db.query(
      "SELECT id FROM match_plans WHERE invite_token = $1::uuid AND expires_at > now() " +
      "AND status IN ('planned','booking_requested') AND match_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date",
      [token]
    );
    if (!found.rows.length) return res.status(404).json({ error: 'This match invite has expired or is no longer available.' });
    const matchId = found.rows[0].id;
    const existing = await db.query('SELECT id FROM match_rsvps WHERE match_id = $1 AND visitor_key = $2', [matchId, visitorKey]);
    if (!existing.rows.length) {
      const total = await db.query('SELECT count(*)::int AS total FROM match_rsvps WHERE match_id = $1', [matchId]);
      if (Number(total.rows[0]?.total || 0) >= 250) return res.status(429).json({ error: 'This invite has reached its response limit.' });
    }
    await db.query(
      "INSERT INTO match_rsvps (match_id, visitor_key, display_name, response) VALUES ($1,$2,$3,$4) " +
      "ON CONFLICT (match_id, visitor_key) DO UPDATE SET display_name = EXCLUDED.display_name, response = EXCLUDED.response, updated_at = now()",
      [matchId, visitorKey, displayName, response]
    );
    try {
      await db.query(
        "INSERT INTO match_events (match_id, event_type, event_key) VALUES ($1, 'rsvp_submitted', $2) ON CONFLICT DO NOTHING",
        [matchId, visitorKey]
      );
    } catch (trackingError) { console.error('RSVP tracking skipped', trackingError); }
    const counts = await db.query('SELECT response, count(*)::int AS total FROM match_rsvps WHERE match_id = $1 GROUP BY response', [matchId]);
    const summary = { going: 0, maybe: 0, not_going: 0 };
    for (const row of counts.rows) summary[row.response] = Number(row.total);
    return res.json({ ok: true, counts: summary, message: 'Your response is saved. You can change it while this browser tab remains open.' });
  } catch (error) {
    console.error('match RSVP failed', error);
    return res.status(500).json({ error: 'Could not save your response. Please try again.' });
  }
}