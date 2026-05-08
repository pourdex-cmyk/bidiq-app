CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  floor_plan TEXT,
  bedrooms SMALLINT,
  bathrooms NUMERIC(3,1),
  square_feet INTEGER,
  status TEXT NOT NULL DEFAULT 'occupied' CHECK (status IN ('occupied', 'vacant', 'renovation', 'offline')),
  current_rent NUMERIC(10,2),
  market_rent NUMERIC(10,2),
  tenant_name TEXT,
  lease_start DATE,
  lease_end DATE,
  yardi_unit_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id, unit_number)
);

CREATE INDEX idx_units_org_id ON units(org_id);
CREATE INDEX idx_units_property_id ON units(property_id);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON units
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
