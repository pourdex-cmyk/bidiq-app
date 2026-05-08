CREATE TABLE yardi_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('manual_upload', 'sftp_scheduled', 'api_trigger')),
  data_type TEXT NOT NULL CHECK (data_type IN ('properties', 'units', 'vendors', 'work_orders', 'invoices', 'transactions', 'tenants')),
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'partial')),
  file_name TEXT,
  storage_path TEXT,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  records_conflicted INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  initiated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_yardi_sync_log_org_id ON yardi_sync_log(org_id);
CREATE INDEX idx_yardi_sync_log_started ON yardi_sync_log(org_id, started_at DESC);

ALTER TABLE yardi_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON yardi_sync_log
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);
