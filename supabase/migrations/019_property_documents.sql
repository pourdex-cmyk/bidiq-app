CREATE TABLE property_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'deed', 'survey', 'appraisal', 'inspection', 'insurance',
    'permit', 'contract', 'invoice', 'photo', 'plan', 'other'
  )),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_property_documents_org_id ON property_documents(org_id);
CREATE INDEX idx_property_documents_property_id ON property_documents(property_id);

ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON property_documents
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON property_documents
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
