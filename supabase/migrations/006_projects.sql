CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  project_type TEXT NOT NULL CHECK (project_type IN ('renovation', 'new_construction', 'repair', 'capital_improvement', 'unit_turn')),
  initial_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  actual_spend NUMERIC(14,2) NOT NULL DEFAULT 0,
  has_construction_loan BOOLEAN NOT NULL DEFAULT FALSE,
  start_date DATE,
  target_completion DATE,
  actual_completion DATE,
  project_manager_id UUID REFERENCES users(id),
  primary_contractor_id UUID REFERENCES contractors(id),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_org_id ON projects(org_id);
CREATE INDEX idx_projects_property_id ON projects(property_id);
CREATE INDEX idx_projects_status ON projects(org_id, status);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON projects
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
