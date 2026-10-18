import { db } from 'hatchable';
import { scanBookrrAutomation } from 'lib/bookrr-automation.js';

export const access = 'admin';
export const methods = ['GET', 'POST'];

export default async function (req, res) {
  try {
    if (req.method === 'POST') {
      const result = await scanBookrrAutomation('manual');
      return res.json({ ok: true, result });
    }
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
    const [alerts, runs, counts] = await Promise.all([
      db.query("SELECT rule_key, title, severity, status, open_count, message, first_seen_at, last_seen_at, resolved_at, updated_at FROM admin_automation_alerts ORDER BY CASE WHEN status = 'open' THEN 0 ELSE 1 END, CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, updated_at DESC"),
      db.query('SELECT id, trigger_source, result, created_at FROM admin_automation_runs ORDER BY created_at DESC LIMIT 12'),
      db.query("SELECT (SELECT count(*)::int FROM bookings WHERE status = 'requested') AS pending_bookings, (SELECT count(*)::int FROM venue_owner_applications WHERE status = 'pending') AS pending_owners, (SELECT count(*)::int FROM venues WHERE is_active = true AND verification_status <> 'verified') AS unverified_venues")
    ]);
    return res.json({ alerts: alerts.rows, runs: runs.rows, counts: counts.rows[0] || {} });
  } catch (error) {
    console.error('Admin automation error', error);
    return res.status(500).json({ error: 'Could not load or run automation checks.' });
  }
}