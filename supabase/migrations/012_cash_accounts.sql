CREATE TABLE cash_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id),
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings', 'construction_loan', 'escrow', 'reserve')),
  institution TEXT,
  account_number_last4 TEXT,
  routing_number TEXT,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  available_balance NUMERIC(14,2),
  credit_limit NUMERIC(14,2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_accounts_org_id ON cash_accounts(org_id);

ALTER TABLE cash_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON cash_accounts
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON cash_accounts
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
