CREATE TABLE permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id),
  permit_type TEXT NOT NULL CHECK (permit_type IN ('building', 'electrical', 'plumbing', 'mechanical', 'demolition', 'certificate_of_occupancy')),
  permit_number TEXT,
  issuing_authority TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'applied', 'under_review', 'approved', 'active', 'inspection_required', 'expired', 'denied', 'closed')),
  applied_date DATE,
  approved_date DATE,
  issue_date DATE,
  expiry_date DATE,
  final_inspection_date DATE,
  fee_amount NUMERIC(10,2),
  document_path TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_permits_org_id ON permits(org_id);
CREATE INDEX idx_permits_project_id ON permits(project_id);
CREATE INDEX idx_permits_expiry ON permits(org_id, expiry_date) WHERE status NOT IN ('closed', 'denied');

ALTER TABLE permits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON permits
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON permits
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
