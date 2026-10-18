import { db } from 'hatchable';

export const access = 'user';
export const methods = ['GET', 'PUT'];

const ownerStatuses = ['confirmed', 'rejected', 'completed', 'cancelled'];

export default async function (req, res) {
  const userId = String(req.user.id);
  try {
    if (req.method === 'GET') {
      const [profile, venues, bookings, applications] = await Promise.all([
        db.query('SELECT name, email FROM users WHERE id = $1 LIMIT 1', [userId]),
        db.query('SELECT id, name, area, sports, is_active, hourly_rate, opening_time::text AS opening_time, closing_time::text AS closing_time, verification_status FROM venues WHERE owner_user_id = $1 ORDER BY created_at DESC', [userId]),
        db.query('SELECT b.id, b.customer_name, b.contact_phone, b.booking_date, b.start_time::text AS start_time, b.duration_hours, b.sport, b.status, b.notes, v.id AS venue_id, v.name AS venue_name, v.area AS venue_area FROM bookings b JOIN venues v ON v.id = b.venue_id WHERE v.owner_user_id = $1 ORDER BY b.booking_date DESC, b.start_time DESC LIMIT 200', [userId]),
        db.query('SELECT id, venue_name, area, sports, hourly_rate, status, venue_id, created_at FROM venue_owner_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [userId])
      ]);
      return res.json({
        owner: profile.rows[0] || { name: null, email: null },
        venues: venues.rows,
        bookings: bookings.rows,
        applications: applications.rows
      });
    }
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed.' });
    const id = Number(req.body && req.body.id);
    const status = req.body && req.body.status;
    if (!Number.isSafeInteger(id) || id < 1 || !ownerStatuses.includes(status)) {
      return res.status(400).json({ error: 'Provide a valid booking ID and status.' });
    }
    const updated = await db.query(
      'UPDATE bookings b SET status = $1, updated_at = now() WHERE b.id = $2 AND EXISTS (SELECT 1 FROM venues v WHERE v.id = b.venue_id AND v.owner_user_id = $3) RETURNING b.id, b.status',
      [status, id, userId]
    );
    if (!updated.rows.length) return res.status(404).json({ error: 'Booking not found for a venue you manage.' });
    return res.json({ booking: updated.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Could not load or update your owner dashboard.' });
  }
}