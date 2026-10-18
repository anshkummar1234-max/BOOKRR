import { db } from 'hatchable';

export const access = 'admin';
export const methods = ['GET', 'PUT', 'DELETE'];

export default async function (req, res) {
  try {
    if (req.method === 'GET') {
      const result = await db.query(
        'SELECT id, name, area, sports, owner_user_id, owner_contact_phone, hourly_rate, opening_time::text AS opening_time, closing_time::text AS closing_time, verification_status, is_active FROM venues ORDER BY is_active DESC, name ASC LIMIT 300'
      );
      return res.json({ venues: result.rows });
    }
    if (req.method === 'DELETE') {
      const id = Number(req.body?.id);
      if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Provide a valid venue ID.' });
      const venue = await db.query('SELECT id, is_active FROM venues WHERE id = $1', [id]);
      if (!venue.rows.length) return res.status(404).json({ error: 'Venue not found.' });
      if (venue.rows[0].is_active) return res.status(409).json({ error: 'Hide the listing before deleting it.' });
      const bookings = await db.query('SELECT count(*)::int AS total FROM bookings WHERE venue_id = $1', [id]);
      if (bookings.rows[0].total > 0) return res.status(409).json({ error: 'This venue has booking history; keep it hidden instead of deleting it.' });
      const removed = await db.query('DELETE FROM venues WHERE id = $1 RETURNING id, name', [id]);
      if (!removed.rows.length) return res.status(404).json({ error: 'Venue not found.' });
      return res.json({ deleted: removed.rows[0] });
    }
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed.' });
    const id = Number(req.body?.id);
    const isActive = req.body?.is_active;
    const verification = req.body?.verification_status;
    if (!Number.isSafeInteger(id) || id < 1 || typeof isActive !== 'boolean') return res.status(400).json({ error: 'Provide a valid venue ID and active status.' });
    if (verification !== undefined && !['verified','unverified','rejected'].includes(verification)) return res.status(400).json({ error: 'Invalid verification status.' });
    const result = await db.query(
      'UPDATE venues SET is_active = $1, verification_status = COALESCE($2, verification_status), updated_at = now() WHERE id = $3 RETURNING id, name, is_active, verification_status',
      [isActive, verification ?? null, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Venue not found.' });
    return res.json({ venue: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Venue moderation failed.' });
  }
}