import { db } from 'hatchable';

export const access = 'public';
export const methods = ['GET'];

function indiaDateTime() { const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()); return Object.fromEntries(parts.map(x => [x.type, x.value])); }
function validDate(value) {
  if (typeof value !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export default async function (req, res) {
  const venueId = Number(req.query?.venue_id);
  const date = req.query?.date;
  const duration = Number(req.query?.duration_hours || 1);
  if (!Number.isSafeInteger(venueId) || venueId < 1) return res.status(400).json({ error: 'Choose a valid turf.' });
  if (!validDate(date)) return res.status(400).json({ error: 'Choose a valid date.' });
  if (!Number.isInteger(duration) || duration < 1 || duration > 4) return res.status(400).json({ error: 'Duration must be 1–4 hours.' });
  try {
    const venue = await db.query('SELECT id FROM venues WHERE id = $1 AND is_active = true', [venueId]);
    if (!venue.rows.length) return res.status(404).json({ error: 'That turf is no longer listed.' });
    const occupied = await db.query(
      "SELECT start_time::text AS start_time, duration_hours FROM bookings " +
      "WHERE venue_id = $1 AND booking_date = $2::date AND status IN ('requested','confirmed')",
      [venueId, date]
    );
    const busy = occupied.rows.map(row => {
      const t = String(row.start_time).slice(0, 5).split(':').map(Number);
      const start = t[0] * 60 + t[1];
      return { start, end: start + Number(row.duration_hours) * 60 };
    });
    const times = [];
    const localNow = indiaDateTime();
    const today = `${localNow.year}-${localNow.month}-${localNow.day}`;
    const currentMinute = Number(localNow.hour) * 60 + Number(localNow.minute);
    for (let hour = 6; hour + duration <= 23; hour++) {
      const start = hour * 60;
      const end = start + duration * 60;
      if (date === today && start <= currentMinute) continue;
      if (!busy.some(slot => start < slot.end && end > slot.start)) times.push(String(hour).padStart(2, '0') + ':00');
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      venue_id: venueId,
      date,
      duration_hours: duration,
      available_times: times,
      note: 'Availability reflects BOOKRR requests and confirmations only. Venue operating hours, walk-in bookings, and live owner calendars are not yet connected; confirm the slot with the venue.'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Could not load slot availability.' });
  }
}