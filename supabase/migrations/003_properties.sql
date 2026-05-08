CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('single_family', 'multi_family', 'commercial', 'mixed_use', 'land')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'under_renovation', 'for_sale', 'sold', 'inactive')),
  unit_count INTEGER NOT NULL DEFAULT 1,
  purchase_price NUMERIC(14,2),
  purchase_date DATE,
  current_value NUMERIC(14,2),
  yardi_property_id TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, yardi_property_id)
);

CREATE INDEX idx_properties_org_id ON properties(org_id);
CREATE INDEX idx_properties_status ON properties(org_id, status);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON properties
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
