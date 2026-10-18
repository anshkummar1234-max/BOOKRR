CREATE TABLE IF NOT EXISTS admin_automation_alerts (
  id bigserial PRIMARY KEY,
  rule_key text NOT NULL UNIQUE,
  title text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info','warning','critical')),
  status text NOT NULL DEFAULT 'resolved' CHECK (status IN ('open','resolved')),
  open_count integer NOT NULL DEFAULT 0,
  message text NOT NULL,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_automation_runs (
  id bigserial PRIMARY KEY,
  trigger_source text NOT NULL DEFAULT 'scheduled',
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_automation_alerts_status ON admin_automation_alerts(status, severity);
CREATE INDEX IF NOT EXISTS idx_admin_automation_runs_created ON admin_automation_runs(created_at DESC);