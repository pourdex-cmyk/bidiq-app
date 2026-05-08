CREATE TABLE contractor_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  content TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'general' CHECK (note_type IN ('general', 'performance', 'issue', 'recommendation', 'reference')),
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contractor_notes_org_id ON contractor_notes(org_id);
CREATE INDEX idx_contractor_notes_contractor_id ON contractor_notes(contractor_id);

ALTER TABLE contractor_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON contractor_notes
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON contractor_notes
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
