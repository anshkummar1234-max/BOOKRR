import { db } from 'hatchable';

export const access = 'user';
export const methods = ['GET'];

export default async function (req, res) {
  try {
    const result = await db.query(
      'SELECT b.id, b.booking_date, b.start_time, b.duration_hours, b.sport, b.status, b.created_at, v.name AS venue_name, v.area AS venue_area FROM bookings b JOIN venues v ON v.id = b.venue_id WHERE b.user_id = $1 ORDER BY b.created_at DESC LIMIT 50',
      [String(req.user.id)]
    );
    return res.json({ bookings: result.rows });
  } catch (error) {
    return res.status(500).json({ error: 'Could not load your booking requests.' });
  }
}