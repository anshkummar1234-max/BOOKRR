import { db } from 'hatchable';

export async function scanBookrrAutomation(triggerSource = 'scheduled') {
  const checks = [
    {
      key: 'stale_booking_requests',
      title: 'Booking requests awaiting review',
      severity: 'warning',
      sql: "SELECT count(*)::int AS n FROM bookings WHERE status = 'requested' AND created_at < now() - interval '30 minutes'",
      message: n => n ? n + ' booking request(s) have been waiting over 30 minutes. Review them before the slot is lost.' : 'No booking requests are overdue for review.'
    },
    {
      key: 'owner_applications_overdue',
      title: 'Owner applications awaiting review',
      severity: 'warning',
      sql: "SELECT count(*)::int AS n FROM venue_owner_applications WHERE status = 'pending' AND created_at < now() - interval '24 hours'",
      message: n => n ? n + ' owner application(s) have been pending for over 24 hours. Review verification details.' : 'No owner applications are overdue for review.'
    },
    {
      key: 'active_unverified_venues',
      title: 'Public listings not verified',
      severity: 'critical',
      sql: "SELECT count(*)::int AS n FROM venues WHERE is_active = true AND verification_status <> 'verified'",
      message: n => n ? n + ' active venue listing(s) are not marked verified. Check these before relying on listing accuracy.' : 'All active listings are marked verified.'
    },
    {
      key: 'active_venues_without_owner',
      title: 'Active listings without a linked owner',
      severity: 'warning',
      sql: "SELECT count(*)::int AS n FROM venues WHERE is_active = true AND (owner_user_id IS NULL OR owner_user_id = '')",
      message: n => n ? n + ' active venue listing(s) have no linked owner account. Confirm ownership and availability.' : 'Every active listing has a linked owner account.'
    }
  ];

  const results = [];
  for (const check of checks) {
    const q = await db.query(check.sql);
    const count = Number(q.rows?.[0]?.n || 0);
    const message = check.message(count);
    const status = count > 0 ? 'open' : 'resolved';
    await db.query(
      "INSERT INTO admin_automation_alerts (rule_key, title, severity, status, open_count, message, first_seen_at, last_seen_at, resolved_at, updated_at) " +
      "VALUES ($1,$2,$3,$4,$5,$6,CASE WHEN $4 = 'open' THEN now() ELSE NULL END,CASE WHEN $4 = 'open' THEN now() ELSE NULL END,CASE WHEN $4 = 'resolved' THEN now() ELSE NULL END,now()) " +
      "ON CONFLICT (rule_key) DO UPDATE SET title = EXCLUDED.title, severity = EXCLUDED.severity, " +
      "status = EXCLUDED.status, open_count = EXCLUDED.open_count, message = EXCLUDED.message, " +
      "first_seen_at = CASE WHEN EXCLUDED.status = 'open' AND admin_automation_alerts.status <> 'open' THEN now() WHEN EXCLUDED.status = 'open' THEN COALESCE(admin_automation_alerts.first_seen_at, now()) ELSE admin_automation_alerts.first_seen_at END, " +
      "last_seen_at = CASE WHEN EXCLUDED.status = 'open' THEN now() ELSE admin_automation_alerts.last_seen_at END, " +
      "resolved_at = CASE WHEN EXCLUDED.status = 'resolved' THEN now() ELSE NULL END, updated_at = now()",
      [check.key, check.title, check.severity, status, count, message]
    );
    results.push({ rule_key: check.key, title: check.title, severity: check.severity, status, count, message });
  }
  const summary = { checked: results.length, open: results.filter(x => x.status === 'open').length, critical: results.filter(x => x.status === 'open' && x.severity === 'critical').length, results };
  await db.query(
    'INSERT INTO admin_automation_runs (trigger_source, result) VALUES ($1, $2::jsonb)',
    [triggerSource, JSON.stringify(summary)]
  );
  return summary;
}