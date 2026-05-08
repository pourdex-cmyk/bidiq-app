CREATE TABLE cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES cash_accounts(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id),
  project_id UUID REFERENCES projects(id),
  category TEXT NOT NULL CHECK (category IN (
    'mortgage', 'rent_income', 'contractor_payment', 'permit_fee',
    'insurance', 'tax', 'utility', 'management_fee', 'loan_draw',
    'equity_injection', 'sale_proceeds', 'deposit', 'refund', 'other'
  )),
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
  transaction_date DATE NOT NULL,
  posted_date DATE,
  reference_number TEXT,
  is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_transactions_org_id ON cash_transactions(org_id);
CREATE INDEX idx_cash_transactions_account_id ON cash_transactions(account_id);
CREATE INDEX idx_cash_transactions_date ON cash_transactions(org_id, transaction_date DESC);

ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON cash_transactions
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON cash_transactions
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
