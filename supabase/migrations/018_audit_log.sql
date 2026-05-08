CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'login', 'logout', 'export', 'import', 'approve', 'deny')),
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_org_id ON audit_log(org_id, created_at DESC);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_record ON audit_log(table_name, record_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON audit_log
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);
