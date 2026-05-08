CREATE TABLE loan_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  draw_number INTEGER NOT NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'funded', 'denied')),
  requested_amount NUMERIC(14,2) NOT NULL,
  approved_amount NUMERIC(14,2),
  funded_amount NUMERIC(14,2),
  submitted_date DATE,
  approved_date DATE,
  funded_date DATE,
  denied_date DATE,
  denial_reason TEXT,
  lender_contact TEXT,
  inspection_date DATE,
  inspection_notes TEXT,
  completion_percentage NUMERIC(5,2),
  document_path TEXT,
  notes TEXT,
  submitted_by UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, draw_number)
);

CREATE INDEX idx_loan_draws_org_id ON loan_draws(org_id);
CREATE INDEX idx_loan_draws_project_id ON loan_draws(project_id);

ALTER TABLE loan_draws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON loan_draws
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON loan_draws
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
