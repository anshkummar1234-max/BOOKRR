import { db } from 'hatchable';

export const access = 'user';
export const methods = ['GET', 'PUT', 'DELETE'];

const sports = ['', 'Football', 'Cricket', 'Badminton', 'Other sports'];
function clean(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }

export default async function (req, res) {
  const userId = String(req.user.id);
  try {
    if (req.method === 'GET') {
      const result = await db.query(
        'SELECT display_name, preferred_sport, home_area, favourite_venue_id, personalization_consent, updated_at FROM customer_preferences WHERE user_id = $1',
        [userId]
      );
      return res.json({ preferences: result.rows[0] || { display_name: '', preferred_sport: '', home_area: '', favourite_venue_id: null, personalization_consent: false } });
    }
    if (req.method === 'DELETE') {
      await db.query('DELETE FROM customer_preferences WHERE user_id = $1', [userId]);
      return res.json({ ok: true, message: 'Saved profile preferences removed.' });
    }
    const body = req.body || {};
    const displayName = clean(body.display_name, 80);
    const sport = clean(body.preferred_sport, 30);
    const area = clean(body.home_area, 100);
    const consent = body.personalization_consent === true;
    const venueId = body.favourite_venue_id == null || body.favourite_venue_id === '' ? null : Number(body.favourite_venue_id);
    if (!sports.includes(sport)) return res.status(400).json({ error: 'Choose a valid preferred sport.' });
    if (venueId !== null && (!Number.isSafeInteger(venueId) || venueId < 1)) return res.status(400).json({ error: 'Choose a valid favourite venue.' });
    if (!consent) {
      await db.query('DELETE FROM customer_preferences WHERE user_id = $1', [userId]);
      return res.json({ ok: true, message: 'Personalization is off and saved profile preferences were removed.' });
    }
    if (venueId !== null) {
      const venue = await db.query('SELECT id FROM venues WHERE id = $1 AND is_active = true', [venueId]);
      if (!venue.rows.length) return res.status(400).json({ error: 'Choose a currently listed venue.' });
    }
    await db.query(
      'INSERT INTO customer_preferences (user_id, display_name, preferred_sport, home_area, favourite_venue_id, personalization_consent, updated_at) VALUES ($1,$2,$3,$4,$5,true,now()) ON CONFLICT (user_id) DO UPDATE SET display_name=EXCLUDED.display_name, preferred_sport=EXCLUDED.preferred_sport, home_area=EXCLUDED.home_area, favourite_venue_id=EXCLUDED.favourite_venue_id, personalization_consent=true, updated_at=now()',
      [userId, displayName, sport, area, venueId]
    );
    return res.json({ ok: true, message: 'Your preferences have been saved.' });
  } catch (error) {
    return res.status(500).json({ error: 'Could not update your preferences. Please try again.' });
  }
}