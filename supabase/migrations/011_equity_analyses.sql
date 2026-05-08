CREATE TABLE equity_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  purchase_price NUMERIC(14,2) NOT NULL,
  renovation_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  closing_costs NUMERIC(14,2) NOT NULL DEFAULT 0,
  holding_costs NUMERIC(14,2) NOT NULL DEFAULT 0,
  financing_costs NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_investment NUMERIC(14,2) NOT NULL DEFAULT 0,
  arv NUMERIC(14,2),
  current_value NUMERIC(14,2),
  value_created NUMERIC(14,2),
  equity_captured NUMERIC(14,2),
  roi_multiple NUMERIC(8,4),
  roi_percentage NUMERIC(8,4),
  payback_months INTEGER,
  monthly_noi NUMERIC(10,2),
  cap_rate NUMERIC(6,4),
  cash_on_cash NUMERIC(6,4),
  assumptions JSONB DEFAULT '{}',
  is_saved BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_equity_analyses_org_id ON equity_analyses(org_id);
CREATE INDEX idx_equity_analyses_property_id ON equity_analyses(property_id);

ALTER TABLE equity_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON equity_analyses
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON equity_analyses
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
