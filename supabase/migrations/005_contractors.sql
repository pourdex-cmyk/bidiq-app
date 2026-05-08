CREATE TABLE contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  license_number TEXT,
  license_expiry DATE,
  insurance_expiry DATE,
  specialties TEXT[] DEFAULT '{}',
  is_preferred BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  default_rate NUMERIC(10,2),
  rate_type TEXT CHECK (rate_type IN ('hourly', 'daily', 'fixed', 'sq_ft')),
  yardi_vendor_id TEXT,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contractors_org_id ON contractors(org_id);
CREATE INDEX idx_contractors_preferred ON contractors(org_id, is_preferred);

ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON contractors
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON contractors
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
