import { db } from 'hatchable';

export const access = 'admin';
export const methods = ['GET', 'PUT'];
const allowed = ['confirmed', 'rejected', 'cancelled', 'completed'];

export default async function (req, res) {
  try {
    if (req.method === 'GET') {
      const result = await db.query(
        'SELECT b.id, b.customer_name, b.contact_phone, b.booking_date, b.start_time, b.duration_hours, b.sport, b.status, b.notes, b.created_at, v.name AS venue_name, v.area AS venue_area FROM bookings b JOIN venues v ON v.id = b.venue_id ORDER BY b.created_at DESC LIMIT 200'
      );
      return res.json({ bookings: result.rows });
    }
    const id = Number(req.body && req.body.id);
    const status = req.body && req.body.status;
    if (!Number.isSafeInteger(id) || id < 1 || !allowed.includes(status)) {
      return res.status(400).json({ error: 'Provide a valid booking ID and status.' });
    }
    const result = await db.query(
      'UPDATE bookings SET status = $1, updated_at = now() WHERE id = $2 RETURNING id, status',
      [status, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Booking not found.' });
    return res.json({ booking: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Admin booking operation failed.' });
  }
}