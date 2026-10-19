import { db } from 'hatchable';

export const access = 'admin';
export const methods = ['GET'];

export default async function (req, res) {
  try {
    const [totals, events, bookingStatuses, recent] = await Promise.all([
      db.query(
        "SELECT count(*)::int AS plans_created, count(*) FILTER (WHERE status = 'planned')::int AS planned, " +
        "count(*) FILTER (WHERE status = 'booking_requested')::int AS booking_requested, " +
        "count(*) FILTER (WHERE status = 'confirmed')::int AS confirmed, " +
        "count(*) FILTER (WHERE status = 'completed')::int AS completed, " +
        "count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled " +
        "FROM match_plans WHERE created_at >= now() - interval '90 days'"
      ),
      db.query(
        "SELECT event_type, count(*)::int AS total, count(DISTINCT match_id)::int AS matches " +
        "FROM match_events WHERE created_at >= now() - interval '90 days' GROUP BY event_type"
      ),
      db.query(
        "SELECT b.status, count(*)::int AS total FROM bookings b WHERE b.match_plan_id IS NOT NULL " +
        "AND b.created_at >= now() - interval '90 days' GROUP BY b.status"
      ),
      db.query(
        "SELECT m.id, m.invite_token::text AS invite_token, m.organizer_name, m.sport, m.match_date::text AS match_date, " +
        "m.start_time::text AS start_time, m.players_needed, m.area, m.status, m.created_at, " +
        "count(DISTINCT r.id)::int AS rsvp_count, count(DISTINCT e.id) FILTER (WHERE e.event_type = 'invite_opened')::int AS unique_opens, " +
        "count(DISTINCT b.id) FILTER (WHERE b.status IN ('requested','confirmed','completed'))::int AS linked_booking_count " +
        "FROM match_plans m LEFT JOIN match_rsvps r ON r.match_id = m.id " +
        "LEFT JOIN match_events e ON e.match_id = m.id " +
        "LEFT JOIN bookings b ON b.match_plan_id = m.id " +
        "WHERE m.created_at >= now() - interval '90 days' " +
        "GROUP BY m.id ORDER BY m.created_at DESC LIMIT 30"
      )
    ]);
    const eventTotals = Object.fromEntries(events.rows.map(row => [row.event_type, Number(row.total)]));
    const statusTotals = Object.fromEntries(bookingStatuses.rows.map(row => [row.status, Number(row.total)]));
    return res.json({
      window_days: 90,
      totals: totals.rows[0] || {},
      events: eventTotals,
      booking_statuses: statusTotals,
      recent_matches: recent.rows
    });
  } catch (error) {
    console.error('growth analytics failed', error);
    return res.status(500).json({ error: 'Could not load growth analytics.' });
  }
}