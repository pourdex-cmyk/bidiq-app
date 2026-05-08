CREATE TABLE budget_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id),
  category TEXT NOT NULL CHECK (category IN (
    'demolition', 'framing', 'roofing', 'electrical', 'plumbing',
    'hvac', 'insulation', 'drywall', 'flooring', 'tile',
    'painting', 'cabinets', 'appliances', 'windows_doors',
    'landscaping', 'permits', 'general_conditions', 'contingency'
  )),
  description TEXT NOT NULL,
  quantity NUMERIC(10,3) DEFAULT 1,
  unit_of_measure TEXT,
  unit_cost NUMERIC(10,2),
  budgeted_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  committed_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  actual_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  contractor_id UUID REFERENCES contractors(id),
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_budget_line_items_org_id ON budget_line_items(org_id);
CREATE INDEX idx_budget_line_items_project_id ON budget_line_items(project_id);
CREATE INDEX idx_budget_line_items_category ON budget_line_items(project_id, category);

ALTER TABLE budget_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON budget_line_items
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON budget_line_items
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
