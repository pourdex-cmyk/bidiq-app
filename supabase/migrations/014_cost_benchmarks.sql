CREATE TABLE cost_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'demolition', 'framing', 'roofing', 'electrical', 'plumbing',
    'hvac', 'insulation', 'drywall', 'flooring', 'tile',
    'painting', 'cabinets', 'appliances', 'windows_doors',
    'landscaping', 'permits', 'general_conditions', 'contingency'
  )),
  region TEXT,
  unit_of_measure TEXT NOT NULL DEFAULT 'sq_ft',
  p25_cost NUMERIC(10,2),
  avg_cost NUMERIC(10,2),
  p75_cost NUMERIC(10,2),
  sample_count INTEGER NOT NULL DEFAULT 0,
  last_computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, category, unit_of_measure)
);

CREATE INDEX idx_cost_benchmarks_org_id ON cost_benchmarks(org_id);

ALTER TABLE cost_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON cost_benchmarks
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE OR REPLACE FUNCTION recompute_benchmarks(p_org_id UUID, p_category TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM budget_line_items
  WHERE org_id = p_org_id AND category = p_category AND actual_amount > 0 AND status = 'completed';

  IF v_count < 3 THEN RETURN; END IF;

  INSERT INTO cost_benchmarks (org_id, category, unit_of_measure, p25_cost, avg_cost, p75_cost, sample_count, last_computed_at)
  SELECT
    p_org_id,
    p_category,
    COALESCE(unit_of_measure, 'sq_ft'),
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY actual_amount / NULLIF(quantity, 0)),
    AVG(actual_amount / NULLIF(quantity, 0)),
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY actual_amount / NULLIF(quantity, 0)),
    COUNT(*),
    NOW()
  FROM budget_line_items
  WHERE org_id = p_org_id AND category = p_category AND actual_amount > 0 AND status = 'completed' AND quantity > 0
  ON CONFLICT (org_id, category, unit_of_measure)
  DO UPDATE SET
    p25_cost = EXCLUDED.p25_cost,
    avg_cost = EXCLUDED.avg_cost,
    p75_cost = EXCLUDED.p75_cost,
    sample_count = EXCLUDED.sample_count,
    last_computed_at = NOW();
END;
$$;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON cost_benchmarks
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
