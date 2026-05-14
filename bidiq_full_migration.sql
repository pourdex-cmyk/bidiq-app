-- BidIQ: Missing migrations + demo seed
-- Paste this entire file into your Supabase SQL editor and click Run

-- ============================================================
-- MIGRATIONS
-- ============================================================

-- migrations/021_equity_rent_model.sql
-- Switch equity_analyses to support the income capitalization model.
-- purchase_price is not used in the rent-based formula; make it optional.
ALTER TABLE equity_analyses ALTER COLUMN purchase_price DROP NOT NULL;
ALTER TABLE equity_analyses ALTER COLUMN purchase_price SET DEFAULT 0;

-- migrations/022_project_loan_fields.sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS loan_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS lender_name TEXT,
  ADD COLUMN IF NOT EXISTS loan_interest_rate NUMERIC(6,4);

-- migrations/023_contractor_rate_type.sql
ALTER TABLE contractors DROP CONSTRAINT IF EXISTS contractors_rate_type_check;
ALTER TABLE contractors ADD CONSTRAINT contractors_rate_type_check
  CHECK (rate_type IN ('hourly', 'daily', 'fixed', 'per_sqft', 'per_unit'));

UPDATE contractors SET rate_type = 'per_sqft' WHERE rate_type = 'sq_ft';

-- migrations/100_organization_module_access.sql
-- 100_organization_module_access.sql
-- Per-org module access configuration for Phase 1+ modules.
-- Also inserts default rows when a new organization is created (via trigger).

CREATE TABLE IF NOT EXISTS organization_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL CHECK (module_key IN (
    'deal_intelligence',
    'budget_lifecycle',
    'scenario_modeling',
    'cost_intelligence_extended',
    'portfolio_intelligence'
  )),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['admin'],
  configured_by UUID REFERENCES users(id),
  configured_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, module_key)
);

ALTER TABLE organization_module_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON organization_module_access
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE INDEX idx_module_access_org ON organization_module_access(org_id);

-- Auto-insert default module access rows for every new organization.
CREATE OR REPLACE FUNCTION insert_default_module_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_module_access (org_id, module_key, enabled, allowed_roles)
  VALUES
    (NEW.id, 'deal_intelligence',           TRUE, ARRAY['admin']),
    (NEW.id, 'budget_lifecycle',            TRUE, ARRAY['admin']),
    (NEW.id, 'scenario_modeling',           TRUE, ARRAY['admin']),
    (NEW.id, 'cost_intelligence_extended',  TRUE, ARRAY['admin']),
    (NEW.id, 'portfolio_intelligence',      TRUE, ARRAY['admin'])
  ON CONFLICT (org_id, module_key) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_default_module_access ON organizations;
CREATE TRIGGER trg_default_module_access
AFTER INSERT ON organizations
FOR EACH ROW EXECUTE FUNCTION insert_default_module_access();

-- Helper function for downstream phases to gate feature access.
CREATE OR REPLACE FUNCTION user_has_module_access(p_user_id UUID, p_module_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_org  UUID;
  user_role TEXT;
  module_enabled BOOLEAN;
  module_roles   TEXT[];
BEGIN
  SELECT org_id, role INTO user_org, user_role FROM users WHERE id = p_user_id;
  IF user_org IS NULL THEN RETURN FALSE; END IF;

  SELECT enabled, allowed_roles INTO module_enabled, module_roles
  FROM organization_module_access
  WHERE org_id = user_org AND module_key = p_module_key;

  IF module_enabled IS NULL OR module_enabled = FALSE THEN RETURN FALSE; END IF;
  RETURN user_role = ANY(module_roles);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- migrations/101_acquisition_deals.sql
-- 101_acquisition_deals.sql
-- Deal pipeline for pre-purchase underwriting.
-- A deal is NOT a property; it becomes one only when promoted via closed_won action.

CREATE TABLE IF NOT EXISTS acquisition_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  deal_name TEXT NOT NULL,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  property_type TEXT CHECK (property_type IN ('residential','commercial','mixed_use')),
  total_units INTEGER,
  total_sqft NUMERIC(12,2),
  asking_price NUMERIC(14,2),
  source TEXT CHECK (source IN ('broker_om','off_market','referral','public_listing','other')),
  source_contact_name TEXT,
  source_contact_email TEXT,
  source_contact_phone TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'prospecting',
    'underwriting',
    'loi_submitted',
    'under_negotiation',
    'due_diligence',
    'closed_won',
    'closed_lost',
    'passed'
  )) DEFAULT 'prospecting',
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  expected_close_date DATE,
  actual_close_date DATE,
  closed_lost_reason TEXT,
  promoted_to_property_id UUID REFERENCES properties(id),
  promoted_at TIMESTAMPTZ,
  promoted_by UUID REFERENCES users(id),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deals_org_status  ON acquisition_deals(org_id, status);
CREATE INDEX idx_deals_org_created ON acquisition_deals(org_id, created_at DESC);

ALTER TABLE acquisition_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON acquisition_deals
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- migrations/102_deal_underwriting_models.sql
-- 102_deal_underwriting_models.sql
-- Versioned underwriting models per deal. Exactly one version per deal is is_active_version = TRUE.
-- Computed output columns (IRR, NPV, etc.) are populated by Phase 2 calculation service.

CREATE TABLE IF NOT EXISTS deal_underwriting_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES acquisition_deals(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  version INTEGER NOT NULL,
  model_name TEXT,
  is_active_version BOOLEAN NOT NULL DEFAULT FALSE,

  -- Capital Stack
  proposed_purchase_price NUMERIC(14,2) NOT NULL,
  down_payment_pct NUMERIC(5,4) NOT NULL,
  senior_debt_amount NUMERIC(14,2),
  senior_debt_rate NUMERIC(6,4),
  senior_debt_term_months INTEGER,
  senior_debt_amortization_months INTEGER,
  has_construction_loan BOOLEAN DEFAULT FALSE,
  construction_loan_amount NUMERIC(14,2),
  construction_loan_rate NUMERIC(6,4),
  construction_loan_term_months INTEGER,
  estimated_renovation_cost NUMERIC(14,2),
  estimated_closing_costs NUMERIC(14,2),
  estimated_carry_costs NUMERIC(14,2),

  -- Income & Operations
  current_rent_roll_monthly NUMERIC(14,2),
  projected_post_reno_rent_monthly NUMERIC(14,2),
  current_other_income_monthly NUMERIC(14,2),
  projected_other_income_monthly NUMERIC(14,2),
  current_operating_expenses_monthly NUMERIC(14,2),
  projected_operating_expenses_monthly NUMERIC(14,2),
  vacancy_factor_pct NUMERIC(5,4) DEFAULT 0.05,

  -- Exit & Hurdle
  exit_cap_rate NUMERIC(5,4) DEFAULT 0.06,
  hold_period_months INTEGER DEFAULT 36,
  hurdle_rate NUMERIC(5,4) DEFAULT 0.15,
  discount_rate NUMERIC(5,4) DEFAULT 0.10,

  -- Computed Outputs (cached; populated by Phase 2 calc service — NULL until then)
  total_capital_required NUMERIC(14,2),
  projected_noi_year_1 NUMERIC(14,2),
  projected_noi_stabilized NUMERIC(14,2),
  projected_exit_value NUMERIC(14,2),
  projected_equity_at_exit NUMERIC(14,2),
  equity_multiple NUMERIC(8,4),
  irr NUMERIC(8,4),
  npv NUMERIC(14,2),
  cash_on_cash_year_1 NUMERIC(8,4),
  recommended_max_bid NUMERIC(14,2),
  meets_hurdle BOOLEAN,

  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, version)
);

-- Exactly one active version per deal
CREATE UNIQUE INDEX one_active_underwriting_per_deal
  ON deal_underwriting_models(deal_id)
  WHERE is_active_version = TRUE;

CREATE INDEX idx_underwriting_deal ON deal_underwriting_models(deal_id, version DESC);

ALTER TABLE deal_underwriting_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON deal_underwriting_models
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- migrations/103_project_budget_snapshots.sql
-- 103_project_budget_snapshots.sql
-- Canonical record of every budget state at every meaningful checkpoint.
-- projects.current_budget and projects.actual_spend become a denormalized cache;
-- the trigger in 104 keeps them in sync with the is_current = TRUE snapshot.

CREATE TABLE IF NOT EXISTS project_budget_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN (
    'underwriting',
    'bank_declared',
    'project_created',
    'break_ground',
    'revision',
    'completion',
    'manual'
  )),
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  budget_total NUMERIC(14,2) NOT NULL,
  actual_spend_at_snapshot NUMERIC(14,2) NOT NULL DEFAULT 0,
  change_order_total_at_snapshot NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_items_snapshot JSONB,
  triggered_by_event TEXT,
  triggered_by_user UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- At most one current snapshot per project at any time.
-- The service layer demotes the previous current before inserting the new one.
CREATE UNIQUE INDEX one_current_snapshot_per_project
  ON project_budget_snapshots(project_id)
  WHERE is_current = TRUE;

CREATE INDEX idx_snapshots_project_type_date
  ON project_budget_snapshots(project_id, snapshot_type, effective_date DESC);

ALTER TABLE project_budget_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON project_budget_snapshots
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- migrations/104_snapshot_sync_trigger.sql
-- 104_snapshot_sync_trigger.sql
-- Trigger: when a snapshot becomes current, sync projects flat budget columns.
-- The service layer must demote any existing current snapshot BEFORE inserting the new one
-- to avoid violating the one_current_snapshot_per_project unique index.

CREATE OR REPLACE FUNCTION sync_project_flat_budget_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE THEN
    -- Demote any other current snapshot for this project (defensive; service should pre-demote)
    UPDATE project_budget_snapshots
       SET is_current = FALSE
     WHERE project_id = NEW.project_id
       AND id != NEW.id
       AND is_current = TRUE;

    -- Sync flat columns on projects
    -- lint-forbidden-writes: allowed in trigger function
    UPDATE projects
       SET current_budget = NEW.budget_total,
           actual_spend   = NEW.actual_spend_at_snapshot,
           updated_at     = NOW()
     WHERE id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_flat_budget ON project_budget_snapshots;
CREATE TRIGGER trg_sync_flat_budget
AFTER INSERT OR UPDATE OF is_current
ON project_budget_snapshots
FOR EACH ROW
EXECUTE FUNCTION sync_project_flat_budget_columns();

-- migrations/105_budget_reconciliation_log.sql
-- 105_budget_reconciliation_log.sql
-- Audit log for the nightly reconciliation job.
-- Records any drift detected between projects flat columns and the current snapshot.

CREATE TABLE IF NOT EXISTS budget_reconciliation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  flat_current_budget NUMERIC(14,2),
  snapshot_current_budget NUMERIC(14,2),
  flat_actual_spend NUMERIC(14,2),
  snapshot_actual_spend NUMERIC(14,2),
  drift_detected BOOLEAN NOT NULL,
  drift_amount NUMERIC(14,2),
  auto_corrected BOOLEAN DEFAULT FALSE,
  notes TEXT
);

CREATE INDEX idx_reconciliation_drift
  ON budget_reconciliation_log(org_id, drift_detected, ran_at DESC);

ALTER TABLE budget_reconciliation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON budget_reconciliation_log
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- migrations/106_backfill_budget_snapshots.sql
-- 106_backfill_budget_snapshots.sql
-- One-time backfill: creates a project_created snapshot for every existing project
-- that does not yet have a current snapshot.
-- After this runs, the reconciliation job should report zero drift on its first pass.
-- lint-forbidden-writes: migration file — allowed

INSERT INTO project_budget_snapshots (
  project_id,
  org_id,
  snapshot_type,
  is_current,
  effective_date,
  budget_total,
  actual_spend_at_snapshot,
  change_order_total_at_snapshot,
  triggered_by_event,
  notes
)
SELECT
  p.id,
  p.org_id,
  'project_created',
  TRUE,
  COALESCE(p.start_date, p.created_at::DATE),
  COALESCE(p.current_budget, p.initial_budget, 0),
  COALESCE(p.actual_spend, 0),
  0,
  'phase_1_backfill',
  'Auto-generated snapshot during Phase 1 schema migration. Represents the budget state at the time of the foundation upgrade.'
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_budget_snapshots s
   WHERE s.project_id = p.id AND s.is_current = TRUE
);

-- migrations/107_regulatory_constraints.sql
-- 107_regulatory_constraints.sql
-- Code and regulatory constraints as first-class inputs for scenario modeling.
-- A constraint must be attached to either a property or a deal (or both).

CREATE TABLE IF NOT EXISTS regulatory_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES acquisition_deals(id) ON DELETE CASCADE,
  constraint_type TEXT NOT NULL CHECK (constraint_type IN (
    'zoning_use',
    'unit_count_cap',
    'bedroom_count_cap',
    'fire_code_trigger',
    'historic_district',
    'parking_minimum',
    'height_limit',
    'setback',
    'other'
  )),
  description TEXT NOT NULL,
  trigger_threshold TEXT,
  triggered_cost_estimate NUMERIC(14,2),
  source TEXT,
  source_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (property_id IS NOT NULL OR deal_id IS NOT NULL)
);

CREATE INDEX idx_constraints_property ON regulatory_constraints(property_id)
  WHERE property_id IS NOT NULL;
CREATE INDEX idx_constraints_deal ON regulatory_constraints(deal_id)
  WHERE deal_id IS NOT NULL;

ALTER TABLE regulatory_constraints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON regulatory_constraints
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- migrations/108_scenario_models.sql
-- 108_scenario_models.sql
-- What-if scenario models for deal or property decisions.
-- Computed return columns (NPV, IRR) are populated by Phase 4 calc service.

CREATE TABLE IF NOT EXISTS scenario_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES acquisition_deals(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL,
  description TEXT,

  -- Scope
  units_affected INTEGER,
  scope_summary JSONB,

  -- Costs
  estimated_renovation_cost NUMERIC(14,2),
  triggered_constraint_costs NUMERIC(14,2) DEFAULT 0,
  total_capital_required NUMERIC(14,2),

  -- Income deltas
  pre_scenario_rent_monthly NUMERIC(14,2),
  post_scenario_rent_monthly NUMERIC(14,2),
  monthly_income_delta NUMERIC(14,2),
  annual_income_delta NUMERIC(14,2),

  -- Returns (populated by Phase 4 — NULL until then)
  cap_rate NUMERIC(5,4) DEFAULT 0.06,
  discount_rate NUMERIC(5,4) DEFAULT 0.10,
  hold_period_months INTEGER DEFAULT 36,
  value_created NUMERIC(14,2),
  npv NUMERIC(14,2),
  irr NUMERIC(8,4),
  payback_months NUMERIC(8,2),
  meets_hurdle BOOLEAN,

  -- Decision support
  triggered_constraints UUID[] DEFAULT '{}',
  is_baseline BOOLEAN DEFAULT FALSE,
  is_recommended BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (property_id IS NOT NULL OR deal_id IS NOT NULL)
);

CREATE INDEX idx_scenarios_property ON scenario_models(property_id)
  WHERE property_id IS NOT NULL;
CREATE INDEX idx_scenarios_deal ON scenario_models(deal_id)
  WHERE deal_id IS NOT NULL;

ALTER TABLE scenario_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON scenario_models
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- migrations/109_scenario_path_comparisons.sql
-- 109_scenario_path_comparisons.sql
-- Groups multiple scenario_models as alternative paths for a single decision.
-- selected_scenario_id records which path was chosen and when.

CREATE TABLE IF NOT EXISTS scenario_path_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  comparison_name TEXT NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES acquisition_deals(id) ON DELETE CASCADE,
  scenario_ids UUID[] NOT NULL,
  selected_scenario_id UUID REFERENCES scenario_models(id),
  decision_made_at TIMESTAMPTZ,
  decision_made_by UUID REFERENCES users(id),
  decision_notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (property_id IS NOT NULL OR deal_id IS NOT NULL)
);

ALTER TABLE scenario_path_comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON scenario_path_comparisons
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- migrations/110_change_order_category.sql
-- 110_change_order_category.sql
-- Adds structured change_order_category alongside the existing free-text
-- change_order_reason column. Existing rows get NULL; Phase 5 UI prompts for it.

ALTER TABLE contractor_invoices
  ADD COLUMN IF NOT EXISTS change_order_category TEXT
    CHECK (change_order_category IN (
      'scope_addition',
      'missed_at_walkthrough',
      'code_requirement',
      'contractor_error',
      'hidden_condition',
      'client_request',
      'material_price_change',
      'other'
    ));

CREATE INDEX IF NOT EXISTS idx_invoices_change_order_category
  ON contractor_invoices(change_order_category)
  WHERE is_change_order = TRUE;

-- migrations/111_pricing_templates.sql
-- 111_pricing_templates.sql
-- Org-scoped user-curated pricing rules. Complement auto-derived cost_benchmarks.
-- Used by Phase 5 auto-budget wizard alongside benchmark data.

CREATE TABLE IF NOT EXISTS pricing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, template_name)
);

CREATE TABLE IF NOT EXISTS pricing_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES pricing_templates(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  category TEXT NOT NULL CHECK (category IN (
    'kitchen','bathroom','bedroom_addition','flooring','hvac',
    'electrical','plumbing','painting','roofing','windows',
    'exterior','common_area','basement','other'
  )),
  subcategory TEXT,
  description TEXT,
  unit_basis TEXT NOT NULL CHECK (unit_basis IN ('per_sqft','per_unit','per_linear_ft','flat')),
  unit_cost NUMERIC(14,2) NOT NULL,
  applicable_property_types TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_template_items_template  ON pricing_template_items(template_id);
CREATE INDEX idx_template_items_category  ON pricing_template_items(org_id, category);

ALTER TABLE pricing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON pricing_templates
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);
CREATE POLICY "org_isolation" ON pricing_template_items
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- migrations/112_equity_analysis_npv_extension.sql
-- 112_equity_analysis_npv_extension.sql
-- Adds NPV-grade decision columns to equity_analyses without disturbing existing rows.
-- Existing rows retain NULL in these columns; Phase 4 UI populates them on new analyses.

ALTER TABLE equity_analyses
  ADD COLUMN IF NOT EXISTS discount_rate    NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS hurdle_rate      NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS npv              NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS irr              NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS hold_period_months INTEGER,
  ADD COLUMN IF NOT EXISTS meets_hurdle     BOOLEAN;

-- migrations/200_backfill_underwriting_calculations.sql
-- 200_backfill_underwriting_calculations.sql
-- Records that the Phase 2 underwriting backfill has been applied.
-- The actual backfill is performed by the Node script:
--   node server/src/scripts/backfill-underwriting.js (compiled from .ts)
-- Run as part of Phase 2 deployment before any UI goes live.
-- This migration is intentionally a no-op on the SQL side.
DO $$ BEGIN
  RAISE NOTICE 'Phase 2 underwriting backfill must be run via: npx tsx server/src/scripts/backfill-underwriting.ts';
END $$;

-- migrations/201_property_documents_deal_id.sql
-- 201_property_documents_deal_id.sql
-- Extends property_documents to support deal-scoped documents.
-- deal_id is nullable; existing rows are unaffected (property_id stays as-is).
-- When a deal is promoted to a property, all documents are bulk-updated
-- to set property_id while preserving deal_id for historical reference.

ALTER TABLE property_documents
  ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES acquisition_deals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_property_documents_deal
  ON property_documents(deal_id)
  WHERE deal_id IS NOT NULL;

-- migrations/300_project_status_changed_at.sql
-- Migration 300: Add status_changed_at to projects
-- Records when project status last changed; required by Phase 3 break_ground / completion snapshot hooks.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- Backfill: treat current updated_at as the last status change time for existing rows.
UPDATE projects
SET status_changed_at = updated_at
WHERE status_changed_at IS NULL;

-- migrations/400_scenario_recalc_queue.sql
-- 400_scenario_recalc_queue.sql
-- Queue table for async scenario recalculation triggered by constraint changes.
-- Processed by the scenario-recalc-job cron every 5 minutes.

CREATE TABLE IF NOT EXISTS scenario_recalc_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES scenario_models(id) ON DELETE CASCADE,
  triggered_by_constraint_id UUID REFERENCES regulatory_constraints(id),
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'processing', 'complete', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  UNIQUE (scenario_id, triggered_by_constraint_id, status)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_recalc_queue_pending ON scenario_recalc_queue(status, queued_at)
  WHERE status = 'pending';

ALTER TABLE scenario_recalc_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON scenario_recalc_queue
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- migrations/500_pricing_template_uses.sql
-- 500_pricing_template_uses.sql
-- Tracks which projects and scenarios applied a pricing template.
-- Powers the "Last Used" column on the template library page.

CREATE TABLE IF NOT EXISTS pricing_template_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES pricing_templates(id) ON DELETE CASCADE,
  used_in_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  used_in_scenario_id UUID REFERENCES scenario_models(id) ON DELETE SET NULL,
  used_by UUID REFERENCES users(id),
  used_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (used_in_project_id IS NOT NULL OR used_in_scenario_id IS NOT NULL)
);

CREATE INDEX idx_template_uses_template ON pricing_template_uses(template_id, used_at DESC);

ALTER TABLE pricing_template_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON pricing_template_uses
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- migrations/501_scope_factors.sql
-- 501_scope_factors.sql
-- Org-configurable scope factors used to normalize contractor rates.
-- Each factor captures how unusual scope (floor leveling, MEP rough-in, structural)
-- inflates the apparent cost of a category, so comparisons are apples-to-apples.

CREATE TABLE IF NOT EXISTS scope_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factor_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  applicable_categories TEXT[] DEFAULT '{}',
  adjustment_pct NUMERIC(5,4),   -- e.g., 0.15 = +15% cost increase when present
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, factor_key)
);

ALTER TABLE scope_factors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON scope_factors
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- migrations/502_budget_line_item_scope_factors.sql
-- 502_budget_line_item_scope_factors.sql
-- Adds scope_factors UUID array to budget_line_items.
-- When users create or edit a line item, they can tag which scope factors were present,
-- giving the normalization service the data it needs to adjust contractor rates.

ALTER TABLE budget_line_items
  ADD COLUMN IF NOT EXISTS scope_factors UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_line_items_scope_factors
  ON budget_line_items USING GIN (scope_factors);

-- migrations/600_cross_tenant_participation.sql
-- 600_cross_tenant_participation.sql
-- Tracks each org's opt-in/opt-out state for cross-tenant benchmark aggregation.
-- Default: all existing orgs opt in on deployment.

CREATE TABLE IF NOT EXISTS cross_tenant_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_participating BOOLEAN NOT NULL DEFAULT TRUE,
  consent_version TEXT NOT NULL DEFAULT 'v1',
  toggled_by UUID REFERENCES users(id),
  toggled_at TIMESTAMPTZ DEFAULT NOW(),
  prior_state BOOLEAN,
  reason_for_change TEXT,
  UNIQUE(org_id)
);

ALTER TABLE cross_tenant_participation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON cross_tenant_participation
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- Default opt-in for every existing org
INSERT INTO cross_tenant_participation (org_id, is_participating, consent_version, reason_for_change)
SELECT id, TRUE, 'v1', 'Default opt-in at Phase 6 deployment'
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM cross_tenant_participation cp WHERE cp.org_id = organizations.id
);

-- migrations/601_cross_tenant_aggregates.sql
-- 601_cross_tenant_aggregates.sql
-- Stores pre-computed anonymized aggregates from the nightly aggregation job.
-- No RLS — contains only aggregate statistics, never identifiable org data.
-- Aggregates suppressed when sample_org_count < 5 (k-anonymity).

CREATE TABLE IF NOT EXISTS cross_tenant_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key TEXT NOT NULL,
  property_type TEXT,
  unit_type TEXT,
  city_bucket TEXT,
  sample_org_count INTEGER NOT NULL,
  sample_record_count INTEGER NOT NULL,
  value_p25 NUMERIC(14,2),
  value_p50 NUMERIC(14,2),
  value_p75 NUMERIC(14,2),
  value_mean NUMERIC(14,2),
  std_dev NUMERIC(14,2),
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_key, property_type, unit_type, city_bucket)
);

CREATE INDEX idx_aggregates_metric ON cross_tenant_aggregates(metric_key, property_type, unit_type, city_bucket);

-- migrations/602_decision_hub_cache.sql
-- 602_decision_hub_cache.sql
-- Per-org per-user cache of decision hub triage items (15-minute TTL).

CREATE TABLE IF NOT EXISTS decision_hub_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  items JSONB NOT NULL,
  UNIQUE(org_id, user_id)
);

ALTER TABLE decision_hub_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON decision_hub_cache
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE INDEX idx_decision_hub_expires ON decision_hub_cache(expires_at);

-- ============================================================
-- DEMO SEED (phase 2 — tables created above)
-- ============================================================
INSERT INTO organization_module_access (org_id, module_key, enabled, allowed_roles)
VALUES
  (v_org_id, 'deal_intelligence',          TRUE, ARRAY['admin', 'project_manager']),
  (v_org_id, 'budget_lifecycle',           TRUE, ARRAY['admin', 'project_manager', 'analyst']),
  (v_org_id, 'scenario_modeling',          TRUE, ARRAY['admin', 'project_manager', 'analyst']),
  (v_org_id, 'cost_intelligence_extended', TRUE, ARRAY['admin', 'project_manager', 'analyst']),
  (v_org_id, 'portfolio_intelligence',     TRUE, ARRAY['admin', 'project_manager', 'analyst'])
ON CONFLICT (org_id, module_key) DO UPDATE
  SET enabled = EXCLUDED.enabled,
      allowed_roles = EXCLUDED.allowed_roles;

-- Budget Snapshots for existing projects (seeded here since backfill migration
-- runs on an empty DB before seed data is inserted).
-- The sync trigger will keep projects.current_budget and actual_spend in sync.
INSERT INTO project_budget_snapshots (project_id, org_id, snapshot_type, is_current, effective_date, budget_total, actual_spend_at_snapshot, change_order_total_at_snapshot, triggered_by_event, notes)
VALUES
  (v_proj1, v_org_id, 'project_created', TRUE,  '2025-01-15', 295000, 187400, 15000, 'seed', 'South End Full Gut Reno — baseline snapshot'),
  (v_proj2, v_org_id, 'project_created', TRUE,  '2025-04-01',  28000,  12600,     0, 'seed', 'Dorchester Unit Turns — baseline snapshot'),
  (v_proj3, v_org_id, 'project_created', TRUE,  '2025-05-01',  45000,   8200,     0, 'seed', 'Somerville Planning Phase — baseline snapshot');

-- Acquisition Deal — "Eastie 60-Unit" prospective acquisition
INSERT INTO acquisition_deals (id, org_id, deal_name, street_address, city, state, zip, property_type, total_units, total_sqft, asking_price, source, source_contact_name, source_contact_email, status, expected_close_date, notes, created_by)
VALUES (
  v_deal1, v_org_id,
  'Eastie 60-Unit Portfolio',
  '880 Saratoga St', 'East Boston', 'MA', '02128',
  'residential', 60, 52000, 14500000,
  'broker_om', 'Phil Gomes', 'pgomes@bostonrealty.demo',
  'under_negotiation', '2025-09-15',
  'Off-market approach via Phil at Boston Realty Advisors. 60 units across 4 buildings on Saratoga. Asking $14.5M — Mark targeting $13.4M based on v2 underwriting. LOI submitted at $13.8M, countered at $14.1M.',
  v_admin_id
);

-- Underwriting Models — 3 versions showing Mark''s iterative analysis
-- v1: at ask
INSERT INTO deal_underwriting_models (id, deal_id, org_id, version, model_name, is_active_version, proposed_purchase_price, down_payment_pct, senior_debt_amount, senior_debt_rate, senior_debt_term_months, senior_debt_amortization_months, has_construction_loan, construction_loan_amount, construction_loan_rate, construction_loan_term_months, estimated_renovation_cost, estimated_closing_costs, estimated_carry_costs, current_rent_roll_monthly, projected_post_reno_rent_monthly, current_operating_expenses_monthly, projected_operating_expenses_monthly, vacancy_factor_pct, exit_cap_rate, hold_period_months, hurdle_rate, discount_rate, notes, created_by)
VALUES (
  v_uwm1, v_deal1, v_org_id, 1, 'At Ask — $14.5M', FALSE,
  14500000, 0.25, 10875000, 0.0725, 120, 360,
  TRUE, 3200000, 0.0850, 24,
  3500000, 435000, 280000,
  82000, 118000, 28000, 34000,
  0.05, 0.055, 48, 0.15, 0.10,
  'Baseline at asking price. Fails hurdle at 5.5% exit cap. IRR estimated ~11% — below 15% target.',
  v_admin_id
);

-- v2: Mark''s target bid
INSERT INTO deal_underwriting_models (id, deal_id, org_id, version, model_name, is_active_version, proposed_purchase_price, down_payment_pct, senior_debt_amount, senior_debt_rate, senior_debt_term_months, senior_debt_amortization_months, has_construction_loan, construction_loan_amount, construction_loan_rate, construction_loan_term_months, estimated_renovation_cost, estimated_closing_costs, estimated_carry_costs, current_rent_roll_monthly, projected_post_reno_rent_monthly, current_operating_expenses_monthly, projected_operating_expenses_monthly, vacancy_factor_pct, exit_cap_rate, hold_period_months, hurdle_rate, discount_rate, notes, created_by)
VALUES (
  v_uwm2, v_deal1, v_org_id, 2, 'Mark''s Bid — $13.4M', FALSE,
  13400000, 0.25, 10050000, 0.0725, 120, 360,
  TRUE, 3200000, 0.0850, 24,
  3500000, 402000, 270000,
  82000, 118000, 28000, 34000,
  0.05, 0.055, 48, 0.15, 0.10,
  'Target bid. Passes hurdle at 5.5% exit cap. Submitted LOI at $13.8M as negotiating midpoint.',
  v_admin_id
);

-- v3: stress-test (construction costs 10% higher, active version)
INSERT INTO deal_underwriting_models (id, deal_id, org_id, version, model_name, is_active_version, proposed_purchase_price, down_payment_pct, senior_debt_amount, senior_debt_rate, senior_debt_term_months, senior_debt_amortization_months, has_construction_loan, construction_loan_amount, construction_loan_rate, construction_loan_term_months, estimated_renovation_cost, estimated_closing_costs, estimated_carry_costs, current_rent_roll_monthly, projected_post_reno_rent_monthly, current_operating_expenses_monthly, projected_operating_expenses_monthly, vacancy_factor_pct, exit_cap_rate, hold_period_months, hurdle_rate, discount_rate, notes, created_by)
VALUES (
  v_uwm3, v_deal1, v_org_id, 3, 'Stress — Reno +10%, $13.4M Bid', TRUE,
  13400000, 0.25, 10050000, 0.0725, 120, 360,
  TRUE, 3520000, 0.0850, 24,
  3850000, 402000, 285000,
  82000, 118000, 28000, 34000,
  0.05, 0.055, 48, 0.15, 0.10,
  'Active working model. Stress-tests reno cost at +10% ($3.85M). Still clears hurdle at $13.4M bid — Mark''s go/no-go threshold confirmed.',
  v_admin_id
);

-- Regulatory Constraint — Bowden Street fire code sprinkler trigger
INSERT INTO regulatory_constraints (id, org_id, property_id, constraint_type, description, trigger_threshold, triggered_cost_estimate, source, source_date, is_active, notes, created_by)
VALUES (
  v_rc1, v_org_id, v_prop2,
  'fire_code_trigger',
  'Boston ISD fire code: adding ≥2 bedrooms to any unit in a 6+ unit building triggers full-building sprinkler retrofit.',
  'Add ≥2 bedrooms to any unit in a 6+ unit building',
  150000,
  'Boston ISD Pre-Application Meeting Notes', '2025-03-18',
  TRUE,
  'Confirmed with ISD inspector at pre-application meeting March 18. Retrofit would cover all common areas and 6 units. Estimate from Mass Plumbing & HVAC ($150K). This constraint is the key decision driver for the Dorchester bedroom-addition scenario.',
  v_admin_id
);

-- Scenario Models — Bowden Street decision (3 paths)
-- Scenario A: Sprinkler + bedroom additions (highest cost, highest upside)
INSERT INTO scenario_models (id, org_id, property_id, scenario_name, description, units_affected, estimated_renovation_cost, triggered_constraint_costs, total_capital_required, pre_scenario_rent_monthly, post_scenario_rent_monthly, monthly_income_delta, annual_income_delta, cap_rate, hold_period_months, is_baseline, is_recommended, triggered_constraints, notes, created_by)
VALUES (
  v_sc1, v_org_id, v_prop2,
  'Path A — Sprinkler + Bedroom Additions',
  'Add 1 bedroom to units 2A, 2B, 3A, 3B. Triggers sprinkler retrofit ($150K). Net rent increase $600/unit/mo across 4 units.',
  4, 280000, 150000, 430000,
  10800, 13200, 2400, 28800,
  0.06, 36,
  FALSE, FALSE,
  ARRAY[v_rc1],
  'High-cost, high-upside path. Adds $480K value at 6% cap rate. ROI multiple ~1.12× on total capital. Only viable if bank financing covers the sprinkler cost.',
  v_analyst_id
);

-- Scenario B: Cosmetic-only (recommended — avoids sprinkler trigger)
INSERT INTO scenario_models (id, org_id, property_id, scenario_name, description, units_affected, estimated_renovation_cost, triggered_constraint_costs, total_capital_required, pre_scenario_rent_monthly, post_scenario_rent_monthly, monthly_income_delta, annual_income_delta, cap_rate, hold_period_months, is_baseline, is_recommended, triggered_constraints, notes, created_by)
VALUES (
  v_sc2, v_org_id, v_prop2,
  'Path B — Cosmetic Renovation Only',
  'Kitchen refresh, new flooring, paint across 4 units. No bedroom additions — sprinkler trigger avoided. Rent increase $300/unit/mo across 4 units.',
  4, 92000, 0, 92000,
  10800, 12000, 1200, 14400,
  0.06, 36,
  FALSE, TRUE,
  '{}',
  'Recommended path. $240K value at 6% cap rate. 2.6× ROI multiple on $92K capital. Avoids $150K sprinkler trigger entirely. Mark signed off 2025-04-22.',
  v_analyst_id
);

-- Scenario C: Do nothing (baseline)
INSERT INTO scenario_models (id, org_id, property_id, scenario_name, description, units_affected, estimated_renovation_cost, triggered_constraint_costs, total_capital_required, pre_scenario_rent_monthly, post_scenario_rent_monthly, monthly_income_delta, annual_income_delta, cap_rate, hold_period_months, is_baseline, is_recommended, triggered_constraints, notes, created_by)
VALUES (
  v_sc3, v_org_id, v_prop2,
  'Path C — Status Quo (Baseline)',
  'No renovation. Hold current rents. Opportunity cost of foregone rent growth.',
  0, 0, 0, 0,
  10800, 10800, 0, 0,
  0.06, 36,
  TRUE, FALSE,
  '{}',
  'Do-nothing baseline. $0 capital deployed, $0 value created. Used as NPV discount-rate reference for the other two paths.',
  v_analyst_id
);

-- Scenario Path Comparison — Bowden Street decision
INSERT INTO scenario_path_comparisons (id, org_id, comparison_name, property_id, scenario_ids, selected_scenario_id, decision_made_at, decision_made_by, decision_notes, created_by)
VALUES (
  v_spc1, v_org_id,
  'Dorchester 6-Unit — Renovation Path Decision',
  v_prop2,
  ARRAY[v_sc1, v_sc2, v_sc3],
  v_sc2,
  '2025-04-22 14:30:00+00',
  v_admin_id,
  'Selected cosmetic-only path. Sprinkler cost ($150K) makes Path A unattractive at current rents. Revisit if rents move above $3,200/unit in next cycle.',
  v_admin_id
);

-- Pricing Template — Beantown Standard Renovation
INSERT INTO pricing_templates (id, org_id, template_name, description, is_active, created_by)
VALUES (
  v_pt1, v_org_id,
  'Beantown Standard Renovation',
  'Theo''s standard pricing assumptions for Boston-area multi-family renovations. Updated Q1 2025.',
  TRUE, v_admin_id
);

INSERT INTO pricing_template_items (template_id, org_id, category, description, unit_basis, unit_cost, applicable_property_types, notes)
VALUES
  (v_pt1, v_org_id, 'kitchen',     'Full kitchen renovation — semi-custom cabinets, new appliances, tile backsplash', 'per_unit', 18000, ARRAY['multi_family', 'mixed_use'], 'Based on South End actuals. Includes labor.'),
  (v_pt1, v_org_id, 'bathroom',    'Full bathroom renovation — new tile, vanity, fixtures', 'per_unit', 9500, ARRAY['multi_family', 'mixed_use'], 'Single bath. Add $3,500 for each additional bath.'),
  (v_pt1, v_org_id, 'painting',    'Interior paint — walls, ceilings, trim', 'per_sqft', 4.50, ARRAY['multi_family', 'mixed_use', 'residential'], 'Boston Metro avg per benchmarks.'),
  (v_pt1, v_org_id, 'common_area', 'Common hallway refresh — paint, lighting, flooring', 'per_sqft', 28.00, ARRAY['multi_family'], 'Covers hallway paint, LED upgrade, and LVP flooring.'),
  (v_pt1, v_org_id, 'basement',    'Basement finishing — framing, insulation, drywall, concrete seal', 'per_sqft', 38.00, ARRAY['multi_family', 'residential'], 'Unfinished to livable. Excludes HVAC and electrical panel work.');

END $$;

-- ============================================================
-- PHASE 2 ADDITIONS — Additional deal pipeline examples
-- ============================================================

DO $$
DECLARE
  v_org_id  UUID := 'a1b2c3d4-0001-0001-0001-000000000001';
  v_admin_id UUID := 'a1b2c3d4-0002-0002-0002-000000000002';
  v_pm_id   UUID := 'a1b2c3d4-0003-0003-0003-000000000003';

  -- Phase 2 deal UUIDs
  v_prop4   UUID := 'a1b2c3d4-0013-0013-0013-000000000013';
  v_deal2   UUID := 'a1b2c3d4-0060-0060-0060-000000000060';
  v_deal3   UUID := 'a1b2c3d4-0061-0061-0061-000000000061';
  v_deal4   UUID := 'a1b2c3d4-0062-0062-0062-000000000062';
  v_uwm4    UUID := 'a1b2c3d4-0063-0063-0063-000000000063';
BEGIN

-- Property record for the promoted closed_won deal
INSERT INTO properties (id, org_id, name, address, city, state, zip, property_type, status, unit_count, purchase_price, purchase_date, created_by)
VALUES (
  v_prop4, v_org_id,
  'Cambridge 24-Unit',
  '215 Prospect St', 'Cambridge', 'MA', '02139',
  'multi_family', 'active', 24, 8200000, '2025-03-01',
  v_admin_id
);

-- Closed-won deal — Cambridge 24-Unit (promoted to v_prop4)
INSERT INTO acquisition_deals (
  id, org_id, deal_name, street_address, city, state, zip,
  property_type, total_units, total_sqft, asking_price,
  source, source_contact_name, source_contact_email,
  status, actual_close_date, status_changed_at,
  promoted_to_property_id, promoted_at, promoted_by,
  notes, created_by
)
VALUES (
  v_deal2, v_org_id,
  'Cambridge 24-Unit Acquisition',
  '215 Prospect St', 'Cambridge', 'MA', '02139',
  'residential', 24, 21600, 8500000,
  'broker_om', 'Sarah Kwan', 'sarah@cambridgerealty.demo',
  'closed_won', '2025-03-01', '2025-03-01 09:00:00+00',
  v_prop4, '2025-03-03 11:00:00+00', v_admin_id,
  'Acquired Cambridge 24-unit at $8.2M (negotiated from $8.5M ask). Strong in-place rents, light cosmetic renovation needed. Promoted to portfolio March 3.',
  v_admin_id
);

-- Underwriting model for the closed-won deal
INSERT INTO deal_underwriting_models (
  id, deal_id, org_id, version, model_name, is_active_version,
  proposed_purchase_price, down_payment_pct,
  senior_debt_rate, senior_debt_amortization_months,
  has_construction_loan, estimated_renovation_cost,
  estimated_closing_costs, estimated_carry_costs,
  current_rent_roll_monthly, projected_post_reno_rent_monthly,
  current_other_income_monthly, projected_other_income_monthly,
  current_operating_expenses_monthly, projected_operating_expenses_monthly,
  vacancy_factor_pct, exit_cap_rate, hold_period_months,
  hurdle_rate, discount_rate,
  notes, created_by
)
VALUES (
  v_uwm4, v_deal2, v_org_id, 1, 'Acquisition Model', TRUE,
  8200000, 0.25,
  0.0675, 360,
  FALSE, 480000,
  246000, 120000,
  54000, 68000,
  2000, 3000,
  18000, 20000,
  0.05, 0.055, 48,
  0.15, 0.10,
  'Final model used for go/no-go. IRR clears 15% hurdle at $8.2M bid price.',
  v_admin_id
);

-- Passed deal — Watertown office complex (doesn''t fit residential strategy)
INSERT INTO acquisition_deals (
  id, org_id, deal_name, street_address, city, state, zip,
  property_type, total_sqft, asking_price,
  source, source_contact_name,
  status, status_changed_at,
  notes, created_by
)
VALUES (
  v_deal3, v_org_id,
  'Watertown Office Complex',
  '550 Arsenal St', 'Watertown', 'MA', '02472',
  'commercial', 42000, 6800000,
  'public_listing', 'JLL Boston Team',
  'passed', '2025-02-15 16:00:00+00',
  'Passed on this deal — office exposure doesn''t align with residential-focused strategy. Cap rate too compressed for the risk profile. Flagged for revisit if price drops below $5.5M.',
  v_admin_id
);

-- Active prospecting deal — Roxbury 18-Unit (early stage)
INSERT INTO acquisition_deals (
  id, org_id, deal_name, street_address, city, state, zip,
  property_type, total_units, asking_price,
  source, source_contact_name, source_contact_email,
  status, expected_close_date,
  notes, created_by
)
VALUES (
  v_deal4, v_org_id,
  'Roxbury 18-Unit Portfolio',
  '72 Washington St', 'Roxbury', 'MA', '02119',
  'residential', 18, 5400000,
  'referral', 'Mike Torres', 'mtorres@bostonrealtygroup.demo',
  'prospecting', '2025-12-01',
  'Referral from Mike Torres. 18-unit portfolio in Roxbury — mix of 1BR and 2BR. Owner open to seller financing. Scheduling walkthrough in June.',
  v_admin_id
);

END $$;

-- ============================================================
-- PHASE 3 ADDITIONS — Budget Lifecycle snapshot history
-- ============================================================

DO $$
DECLARE
  v_org_id   UUID := 'a1b2c3d4-0001-0001-0001-000000000001';
  v_admin_id UUID := 'a1b2c3d4-0002-0002-0002-000000000002';
  v_pm_id    UUID := 'a1b2c3d4-0003-0003-0003-000000000003';

  v_proj1 UUID := 'a1b2c3d4-0020-0020-0020-000000000020'; -- South End Full Gut Reno
  v_proj2 UUID := 'a1b2c3d4-0021-0021-0021-000000000021'; -- Dorchester Unit Turns
  v_proj3 UUID := 'a1b2c3d4-0022-0022-0022-000000000022'; -- Somerville Planning Phase
BEGIN

  -- Demote Phase 1 project_created snapshots so Phase 3 can set proper is_current rows
  UPDATE project_budget_snapshots
  SET is_current = FALSE
  WHERE project_id IN (v_proj1, v_proj2, v_proj3)
    AND snapshot_type = 'project_created';

  -- ── South End Full Gut Reno (proj1) ──────────────────────────────────────────
  -- Full lifecycle: project_created → bank_declared → break_ground → revision
  -- Construction loan through Rockland Trust; $3K approved change order mid-project

  INSERT INTO project_budget_snapshots
    (project_id, org_id, snapshot_type, is_current, effective_date,
     budget_total, actual_spend_at_snapshot, change_order_total_at_snapshot,
     triggered_by_event, triggered_by_user, notes)
  VALUES
    (v_proj1, v_org_id, 'project_created', FALSE, '2025-01-15',
     295000, 0, 0,
     'project_created', v_admin_id,
     'South End Full Gut Reno — project created, initial budget set'),

    (v_proj1, v_org_id, 'bank_declared', FALSE, '2025-01-15',
     295000, 0, 0,
     'loan_configured_at_creation', v_admin_id,
     'Bank declared: Rockland Trust — $185,000 construction loan facility'),

    (v_proj1, v_org_id, 'break_ground', FALSE, '2025-01-28',
     295000, 13600, 0,
     'status_active', v_admin_id,
     'Break ground: South End Full Gut Reno moved to active — demo complete'),

    (v_proj1, v_org_id, 'revision', TRUE, '2025-03-15',
     295000, 90100, 3000,
     'change_order_approved', v_admin_id,
     'Change order approved: FGC-2025-003 — $3,000 framing scope adjustment');

  -- ── Dorchester Unit Turns (proj2) ────────────────────────────────────────────
  -- Unit turn reno: bank_declared at project open, then 4 revision snapshots
  -- tracking incremental spend as each trade completes

  INSERT INTO project_budget_snapshots
    (project_id, org_id, snapshot_type, is_current, effective_date,
     budget_total, actual_spend_at_snapshot, change_order_total_at_snapshot,
     triggered_by_event, triggered_by_user, notes)
  VALUES
    (v_proj2, v_org_id, 'project_created', FALSE, '2025-04-01',
     28000, 0, 0,
     'project_created', v_pm_id,
     'Dorchester Unit Turns — project created'),

    (v_proj2, v_org_id, 'bank_declared', FALSE, '2025-04-01',
     28000, 0, 0,
     'loan_configured_at_creation', v_admin_id,
     'Budget declared: $28,000 unit turn budget approved by ownership'),

    (v_proj2, v_org_id, 'revision', FALSE, '2025-04-08',
     28000, 4200, 0,
     'manual', v_pm_id,
     'Weekly review: painting complete — $4,200 spend captured'),

    (v_proj2, v_org_id, 'revision', FALSE, '2025-04-15',
     28000, 9800, 0,
     'manual', v_pm_id,
     'Weekly review: painting + flooring complete — $9,800 cumulative'),

    (v_proj2, v_org_id, 'revision', FALSE, '2025-04-22',
     28000, 12600, 0,
     'manual', v_pm_id,
     'Weekly review: cabinets paid, tile in progress — $12,600 cumulative'),

    (v_proj2, v_org_id, 'revision', TRUE, '2025-05-01',
     28000, 12600, 0,
     'manual', v_pm_id,
     'Month-end review: on track, tile + appliances pending — $12,600 cumulative');

  -- ── Somerville Planning Phase (proj3) ─────────────────────────────────────────
  -- Pre-construction planning: bank_declared showing budget commitment

  INSERT INTO project_budget_snapshots
    (project_id, org_id, snapshot_type, is_current, effective_date,
     budget_total, actual_spend_at_snapshot, change_order_total_at_snapshot,
     triggered_by_event, triggered_by_user, notes)
  VALUES
    (v_proj3, v_org_id, 'project_created', FALSE, '2025-05-01',
     45000, 0, 0,
     'project_created', v_pm_id,
     'Somerville Planning Phase — project created'),

    (v_proj3, v_org_id, 'bank_declared', TRUE, '2025-05-01',
     45000, 0, 0,
     'loan_configured_at_creation', v_admin_id,
     'Budget declared: $45,000 pre-construction planning budget approved by ownership');

  -- Backfill status_changed_at for Phase 3 column
  UPDATE projects SET status_changed_at = '2025-01-15 09:00:00+00' WHERE id = v_proj1;
  UPDATE projects SET status_changed_at = '2025-04-01 09:00:00+00' WHERE id = v_proj2;
  UPDATE projects SET status_changed_at = '2025-05-01 09:00:00+00' WHERE id = v_proj3;

END $$;

-- ============================================================
-- PHASE 4 ADDITIONS — Scenario Modeling seed data
-- ============================================================

DO $$
DECLARE
  v_org_id   UUID := 'a1b2c3d4-0001-0001-0001-000000000001';
  v_admin_id UUID := 'a1b2c3d4-0002-0002-0002-000000000002';
  v_pm_id    UUID := 'a1b2c3d4-0003-0003-0003-000000000003';
  v_analyst_id UUID := 'a1b2c3d4-0004-0004-0004-000000000004';

  -- Phase 1 Bowden scenario UUIDs (already inserted above)
  v_sc1  UUID := 'a1b2c3d4-0055-0055-0055-000000000055'; -- Path A: Sprinkler + Bedrooms
  v_sc2  UUID := 'a1b2c3d4-0056-0056-0056-000000000056'; -- Path B: Cosmetic (recommended)
  v_sc3  UUID := 'a1b2c3d4-0057-0057-0057-000000000057'; -- Path C: Status Quo (baseline)

  -- Phase 4 new UUIDs — Bennington 12-Unit
  v_prop5  UUID := 'a1b2c3d4-0014-0014-0014-000000000014';
  v_rc2    UUID := 'a1b2c3d4-0070-0070-0070-000000000070';
  v_sc4    UUID := 'a1b2c3d4-0071-0071-0071-000000000071';
  v_sc5    UUID := 'a1b2c3d4-0072-0072-0072-000000000072';
  v_spc2   UUID := 'a1b2c3d4-0073-0073-0073-000000000073';
BEGIN

  -- ── Backfill computed returns on Phase 1 Bowden scenarios ──────────────────
  -- Path A: Sprinkler + Bedroom Additions
  --   capital=$430K, delta=$2,400/mo, hold=36mo, cap=6%, disc=10%
  --   value_created=$480K, NPV≈$807, IRR≈10.1%, payback=36mo (terminal mo)
  UPDATE scenario_models SET
    value_created     = 480000,
    npv               = 807,
    irr               = 0.1013,
    payback_months    = 36,
    meets_hurdle      = FALSE   -- IRR 10.1% < typical 15% hurdle
  WHERE id = v_sc1;

  -- Path B: Cosmetic Renovation Only (Recommended)
  --   capital=$92K, delta=$1,200/mo, hold=36mo, cap=6%, disc=10%
  --   value_created=$240K, NPV≈$123K, IRR≈43%, payback=36mo (terminal mo)
  UPDATE scenario_models SET
    value_created     = 240000,
    npv               = 123402,
    irr               = 0.4280,
    payback_months    = 36,
    meets_hurdle      = TRUE   -- IRR 43% >> 15% hurdle
  WHERE id = v_sc2;

  -- Path C: Status Quo (Baseline)
  --   zero capital, zero delta — NPV=0, IRR undefined
  UPDATE scenario_models SET
    value_created     = 0,
    npv               = 0,
    irr               = NULL,
    payback_months    = NULL,
    meets_hurdle      = FALSE
  WHERE id = v_sc3;

  -- ── New property: Bennington 12-Unit ───────────────────────────────────────
  INSERT INTO properties (id, org_id, name, address, city, state, zip, property_type, status, unit_count, purchase_price, purchase_date, current_value, created_by)
  VALUES (
    v_prop5, v_org_id,
    'Bennington 12-Unit', '14 Bennington St', 'East Boston', 'MA', '02128',
    'multi_family', 'active', 12, 2800000, '2025-02-01', 2800000,
    v_admin_id
  );

  -- ── Regulatory constraint: parking minimum for ADU additions ───────────────
  INSERT INTO regulatory_constraints (id, org_id, property_id, constraint_type, description, trigger_threshold, triggered_cost_estimate, source, source_date, is_active, notes, created_by)
  VALUES (
    v_rc2, v_org_id, v_prop5,
    'parking_minimum',
    'East Boston zoning requires 1 off-street parking space per new ADU when 3+ ADUs are added to a multi-family building.',
    'Adding ≥3 ADUs to existing multi-family',
    45000,
    'City of Boston Zoning Board Pre-Application Review', '2025-03-05',
    TRUE,
    'Garage ramp + 3 parking spaces estimated at $45K by Fenway GC. Triggered only by the full ADU conversion path.',
    v_admin_id
  );

  -- ── Bennington Scenario A: Full ADU Conversion (triggers parking) ──────────
  --   capital=$365K ($320K reno + $45K parking), delta=$3,600/mo, hold=48mo
  --   value_created=$720K, NPV≈$263K, IRR≈29%, payback=48mo, meets_hurdle=TRUE
  INSERT INTO scenario_models (id, org_id, property_id, scenario_name, description, units_affected, estimated_renovation_cost, triggered_constraint_costs, total_capital_required, pre_scenario_rent_monthly, post_scenario_rent_monthly, monthly_income_delta, annual_income_delta, cap_rate, discount_rate, hold_period_months, value_created, npv, irr, payback_months, meets_hurdle, is_baseline, is_recommended, triggered_constraints, notes, created_by)
  VALUES (
    v_sc4, v_org_id, v_prop5,
    'Path A — Full ADU Conversion',
    'Convert basement + attic to 3 new ADUs. Requires parking compliance ($45K). Net rent increase $3,600/mo across 3 new units at $1,200/unit.',
    3, 320000, 45000, 365000,
    18000, 21600, 3600, 43200,
    0.06, 0.10, 48,
    720000, 263042, 0.2850, 48,
    TRUE,
    FALSE, FALSE,
    ARRAY[v_rc2],
    'Higher absolute NPV but $365K capital required. Parking constraint adds complexity and cost. Decision pending — compare to light renovation path.',
    v_analyst_id
  );

  -- ── Bennington Scenario B: Light Renovation (avoids parking trigger) ───────
  --   capital=$120K, delta=$1,800/mo, hold=48mo
  --   value_created=$360K, NPV≈$192K, IRR≈40%, payback=48mo, meets_hurdle=TRUE
  INSERT INTO scenario_models (id, org_id, property_id, scenario_name, description, units_affected, estimated_renovation_cost, triggered_constraint_costs, total_capital_required, pre_scenario_rent_monthly, post_scenario_rent_monthly, monthly_income_delta, annual_income_delta, cap_rate, discount_rate, hold_period_months, value_created, npv, irr, payback_months, meets_hurdle, is_baseline, is_recommended, triggered_constraints, notes, created_by)
  VALUES (
    v_sc5, v_org_id, v_prop5,
    'Path B — Light Renovation',
    'Kitchen and bath refresh across 6 under-market units. No new ADUs — parking trigger avoided. $1,800/mo rent uplift from higher rents on renewed leases.',
    6, 120000, 0, 120000,
    18000, 19800, 1800, 21600,
    0.06, 0.10, 48,
    360000, 192500, 0.4120, 48,
    TRUE,
    FALSE, FALSE,
    '{}',
    'Better capital efficiency (IRR 41%) and lower risk. Avoids $45K parking constraint entirely. Management prefers this path but Board wants full NPV comparison before deciding.',
    v_analyst_id
  );

  -- ── Bennington open comparison (no decision yet) ───────────────────────────
  INSERT INTO scenario_path_comparisons (id, org_id, comparison_name, property_id, scenario_ids, created_by)
  VALUES (
    v_spc2, v_org_id,
    'Bennington 12-Unit — ADU vs. Light Renovation',
    v_prop5,
    ARRAY[v_sc4, v_sc5],
    v_admin_id
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 5 ADDITIONS — Cost Intelligence Extensions
-- ═══════════════════════════════════════════════════════════════════════════

  -- ── Scope factors ──────────────────────────────────────────────────────────
  INSERT INTO scope_factors (id, org_id, factor_key, display_name, applicable_categories, adjustment_pct, notes, is_active, created_by)
  VALUES
    (v_sf1, v_org_id, 'occupied_building', 'Occupied Building',
      ARRAY['electrical','plumbing','hvac','drywall'], 0.18,
      'Work in occupied buildings adds ~18% to costs due to scheduling constraints, dust containment, and tenant coordination.',
      TRUE, v_admin_id),
    (v_sf2, v_org_id, 'historic_district', 'Historic District',
      ARRAY['roofing','windows_doors','framing','painting'], 0.25,
      'Boston Landmarks Commission review + approved-materials requirement adds ~25% to exterior and facade work.',
      TRUE, v_admin_id);

  -- ── Pricing templates ──────────────────────────────────────────────────────
  INSERT INTO pricing_templates (id, org_id, name, description, property_type, renovation_scope, is_active, created_by)
  VALUES
    (v_tmpl1, v_org_id,
      'Standard Multifamily Light Renovation',
      'Kitchen and bath refresh + flooring for occupied multifamily. No structural work.',
      'Multifamily', 'light', TRUE, v_admin_id),
    (v_tmpl2, v_org_id,
      'Gut Rehab — Boston Multi-Family',
      'Complete gut renovation including electrical, plumbing, HVAC, drywall, and finishes. Boston market rates.',
      'Multifamily', 'gut_rehab', TRUE, v_admin_id);

  INSERT INTO pricing_template_items (org_id, template_id, category, description, unit_basis, unit_cost, sort_order)
  VALUES
    -- Light renovation template
    (v_org_id, v_tmpl1, 'painting',         'Interior paint — walls, trim, ceilings',      'per_unit',  3200,  1),
    (v_org_id, v_tmpl1, 'flooring',         'LVP flooring install including subfloor prep', 'per_sqft',  8,     2),
    (v_org_id, v_tmpl1, 'cabinets',         'Kitchen cabinet refresh/reface',               'per_unit',  4500,  3),
    (v_org_id, v_tmpl1, 'appliances',       'Range, dishwasher, microwave package',         'per_unit',  2800,  4),
    (v_org_id, v_tmpl1, 'tile',             'Bath tile — floor and tub surround',           'per_unit',  2200,  5),
    (v_org_id, v_tmpl1, 'general_conditions','Dumpster, cleanup, supervision',              'per_unit',  1200,  6),
    -- Gut rehab template
    (v_org_id, v_tmpl2, 'demolition',       'Full demo — kitchens, baths, flooring',        'per_sqft',  8,     1),
    (v_org_id, v_tmpl2, 'electrical',       'Full rewire + panel upgrade to 200A',          'per_unit',  18000, 2),
    (v_org_id, v_tmpl2, 'plumbing',         'Rough-in plumbing + fixtures',                 'per_unit',  14000, 3),
    (v_org_id, v_tmpl2, 'hvac',             'Mini-split system — 2-ton per unit',           'per_unit',  8500,  4),
    (v_org_id, v_tmpl2, 'framing',          'Wall layout changes + blocking',               'per_sqft',  12,    5),
    (v_org_id, v_tmpl2, 'drywall',          'Hang and finish drywall',                      'per_sqft',  9,     6),
    (v_org_id, v_tmpl2, 'flooring',         'LVP flooring — full unit',                     'per_sqft',  10,    7),
    (v_org_id, v_tmpl2, 'cabinets',         'Semi-custom kitchen + bath vanity',            'per_unit',  9500,  8),
    (v_org_id, v_tmpl2, 'painting',         'Full interior paint',                          'per_unit',  4200,  9),
    (v_org_id, v_tmpl2, 'general_conditions','GC fee + dumpster + cleanup',                 'per_unit',  3500,  10);

  -- ── Template uses — record that templates were used in scenarios ────────────
  INSERT INTO pricing_template_uses (org_id, template_id, used_in_scenario_id, used_by)
  VALUES
    (v_org_id, v_tmpl1, v_sc5,  v_analyst_id),   -- Light reno template used for Bennington Path B
    (v_org_id, v_tmpl2, v_sc4,  v_analyst_id);   -- Gut rehab template used for Bennington Path A

  -- ── CO categorizations on existing Fenway GC invoices ─────────────────────
  -- Tag the South End invoice over-runs with change-order categories
  UPDATE contractor_invoices SET
    change_order_category = 'unforeseen_conditions',
    category_notes        = 'Knob-and-tube wiring discovered behind walls — full rewire scope expanded.',
    categorized_by        = v_pm_id,
    categorized_at        = NOW()
  WHERE is_change_order = TRUE
    AND org_id = v_org_id
    AND contractor_id = v_cont2;   -- Hub Electrical's CO invoices

  UPDATE contractor_invoices SET
    change_order_category = 'scope_creep',
    category_notes        = 'Owner requested in-unit laundry hookups not in original scope.',
    categorized_by        = v_pm_id,
    categorized_at        = NOW()
  WHERE is_change_order = TRUE
    AND org_id = v_org_id
    AND contractor_id = v_cont3;   -- Mass Plumbing CO invoices

  -- ── Scope factors on existing approved line items ──────────────────────────
  UPDATE budget_line_items SET
    scope_factors = ARRAY[v_sf1]
  WHERE org_id = v_org_id
    AND category IN ('electrical', 'plumbing', 'drywall')
    AND project_id = v_proj1;   -- South End was occupied during renovation

END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 6 ADDITIONS — Portfolio Intelligence Module
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ DECLARE
  v_org_id   UUID := 'a1b2c3d4-0001-0001-0001-000000000001';
  v_admin_id UUID := 'a1b2c3d4-0002-0002-0002-000000000002';

  -- Demo aggregation contributor orgs (no real users — benchmarks only)
  v_demo_org1 UUID := 'a1b2c3d4-ff01-ff01-ff01-000000000001';
  v_demo_org2 UUID := 'a1b2c3d4-ff02-ff02-ff02-000000000002';
  v_demo_org3 UUID := 'a1b2c3d4-ff03-ff03-ff03-000000000003';
  v_demo_org4 UUID := 'a1b2c3d4-ff04-ff04-ff04-000000000004';
  v_demo_org5 UUID := 'a1b2c3d4-ff05-ff05-ff05-000000000005';

  -- Permit ID for decision hub "expiring permit" scenario
  v_permit_expiring UUID := 'a1b2c3d4-0090-0090-0090-000000000090';

  -- Project references (already exist from Phase 1)
  v_proj1 UUID := 'a1b2c3d4-0031-0031-0031-000000000031'; -- South End Brownstone

BEGIN

  -- ── Cross-tenant participation — default opt-in for Beantown org ────────────
  INSERT INTO cross_tenant_participation (org_id, is_participating, consent_version, reason_for_change)
  VALUES (v_org_id, TRUE, 'v1', 'Default opt-in at Phase 6 deployment')
  ON CONFLICT (org_id) DO NOTHING;

  -- ── Demo aggregation contributor orgs ──────────────────────────────────────
  -- These orgs exist only to provide benchmark data. No auth records, no real users.
  -- Labeled clearly: Demo aggregation contributors — not real organizations.

  INSERT INTO organizations (id, name, plan_tier, created_at)
  VALUES
    (v_demo_org1, '[DEMO] Harbor Hill Development',    'pro', NOW()),
    (v_demo_org2, '[DEMO] Eastside Residential Group', 'pro', NOW()),
    (v_demo_org3, '[DEMO] Metro Realty Partners',      'pro', NOW()),
    (v_demo_org4, '[DEMO] Fenway Capital Residential', 'pro', NOW()),
    (v_demo_org5, '[DEMO] Baystate Housing LLC',       'pro', NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO cross_tenant_participation (org_id, is_participating, consent_version, reason_for_change)
  VALUES
    (v_demo_org1, TRUE, 'v1', 'Demo seed contributor'),
    (v_demo_org2, TRUE, 'v1', 'Demo seed contributor'),
    (v_demo_org3, TRUE, 'v1', 'Demo seed contributor'),
    (v_demo_org4, TRUE, 'v1', 'Demo seed contributor'),
    (v_demo_org5, TRUE, 'v1', 'Demo seed contributor')
  ON CONFLICT (org_id) DO NOTHING;

  -- Seed aggregate data directly so the benchmarks page renders without waiting for the nightly job.
  -- Values represent realistic Boston-area multifamily renovation costs.
  INSERT INTO cross_tenant_aggregates
    (metric_key, property_type, unit_type, city_bucket, sample_org_count, sample_record_count, value_p25, value_p50, value_p75, value_mean, std_dev, computed_at)
  VALUES
    ('cost_per_unit_painting_residential',           'residential', NULL, 'greater_boston', 6, 48, 2800,  3200,  3800,  3267,  380, NOW()),
    ('cost_per_unit_flooring_residential',           'residential', NULL, 'greater_boston', 6, 48, 6800,  8000,  9500,  8100,  1050, NOW()),
    ('cost_per_unit_electrical_residential',         'residential', NULL, 'greater_boston', 6, 44, 14000, 17500, 22000, 17800, 2800, NOW()),
    ('cost_per_unit_plumbing_residential',           'residential', NULL, 'greater_boston', 6, 44, 10000, 13500, 17000, 13600, 2400, NOW()),
    ('cost_per_unit_hvac_residential',               'residential', NULL, 'greater_boston', 6, 40, 6500,  8200,  10500, 8300,  1300, NOW()),
    ('cost_per_unit_drywall_residential',            'residential', NULL, 'greater_boston', 6, 36, 5500,  7000,  9000,  7100,  1100, NOW()),
    ('cost_per_unit_cabinets_residential',           'residential', NULL, 'greater_boston', 6, 36, 4200,  5800,  8500,  5900,  1600, NOW()),
    ('cost_per_unit_tile_residential',               'residential', NULL, 'greater_boston', 6, 32, 1800,  2400,  3200,  2430,  500, NOW()),
    ('cost_per_unit_general_conditions_residential', 'residential', NULL, 'greater_boston', 6, 48, 1000,  1400,  2000,  1420,  340, NOW()),
    ('change_order_rate_overall',                    NULL,          NULL, 'greater_boston', 6, 300, 0.08, 0.12,  0.17,  0.122, 0.03, NOW()),
    ('change_order_rate_scope_creep',                NULL,          NULL, 'greater_boston', 6, 120, 0.08, 0.12,  0.18,  0.125, 0.03, NOW()),
    ('change_order_rate_unforeseen_conditions',      NULL,          NULL, 'greater_boston', 6, 100, 0.04, 0.07,  0.12,  0.072, 0.025, NOW()),
    ('change_order_rate_design_change',              NULL,          NULL, 'greater_boston', 6, 80,  0.03, 0.05,  0.09,  0.053, 0.02, NOW())
  ON CONFLICT (metric_key, property_type, unit_type, city_bucket) DO NOTHING;

  -- ── Expiring permit — surfaces in Decision Hub ──────────────────────────────
  -- Adds a permit expiring in ~20 days on the Dorchester Ave project for demo purposes.
  INSERT INTO permits (id, org_id, project_id, permit_type, status, issue_date, expiry_date, notes)
  SELECT
    v_permit_expiring, v_org_id, id,
    'Building Permit',
    'approved',
    (NOW() - INTERVAL '10 months')::DATE,
    (NOW() + INTERVAL '20 days')::DATE,
    'Annual renewal required — Demo Phase 6 decision hub item'
  FROM projects
  WHERE org_id = v_org_id AND name ILIKE '%dorchester%'
  LIMIT 1
  ON CONFLICT (id) DO NOTHING;

END $$;
