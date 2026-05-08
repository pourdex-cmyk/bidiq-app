CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'budget_overrun', 'permit_expiring', 'invoice_due', 'draw_approved',
    'draw_denied', 'yardi_sync_complete', 'yardi_conflict', 'project_milestone',
    'contractor_insurance_expiring', 'system'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_org_id ON notifications(org_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_notifications" ON notifications
  USING (user_id = auth.uid());
