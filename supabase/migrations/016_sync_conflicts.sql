CREATE TABLE sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sync_log_id UUID NOT NULL REFERENCES yardi_sync_log(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID,
  field_name TEXT NOT NULL,
  bidiq_value TEXT,
  yardi_value TEXT,
  resolution TEXT CHECK (resolution IN ('kept_bidiq', 'used_yardi', 'merged', 'deferred')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_conflicts_org_id ON sync_conflicts(org_id);
CREATE INDEX idx_sync_conflicts_unresolved ON sync_conflicts(org_id) WHERE resolution IS NULL;

ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON sync_conflicts
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);
