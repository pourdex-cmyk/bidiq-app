CREATE TABLE contractor_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  budget_line_item_id UUID REFERENCES budget_line_items(id),
  invoice_number TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE,
  amount NUMERIC(14,2) NOT NULL,
  tax_amount NUMERIC(14,2) DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'disputed', 'voided')),
  is_change_order BOOLEAN NOT NULL DEFAULT FALSE,
  change_order_reason TEXT,
  payment_date DATE,
  payment_method TEXT CHECK (payment_method IN ('check', 'ach', 'wire', 'credit_card', 'cash')),
  yardi_po_number TEXT,
  document_path TEXT,
  notes TEXT,
  approved_by UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, yardi_po_number)
);

CREATE INDEX idx_contractor_invoices_org_id ON contractor_invoices(org_id);
CREATE INDEX idx_contractor_invoices_project_id ON contractor_invoices(project_id);
CREATE INDEX idx_contractor_invoices_status ON contractor_invoices(org_id, status);

ALTER TABLE contractor_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON contractor_invoices
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON contractor_invoices
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
