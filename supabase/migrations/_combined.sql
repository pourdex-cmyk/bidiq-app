-- Switch equity_analyses to support the income capitalization model.
-- purchase_price is not used in the rent-based formula; make it optional.
ALTER TABLE equity_analyses ALTER COLUMN purchase_price DROP NOT NULL;
ALTER TABLE equity_analyses ALTER COLUMN purchase_price SET DEFAULT 0;
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS loan_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS lender_name TEXT,
  ADD COLUMN IF NOT EXISTS loan_interest_rate NUMERIC(6,4);
ALTER TABLE contractors DROP CONSTRAINT IF EXISTS contractors_rate_type_check;
ALTER TABLE contractors ADD CONSTRAINT contractors_rate_type_check
  CHECK (rate_type IN ('hourly', 'daily', 'fixed', 'per_sqft', 'per_unit'));

UPDATE contractors SET rate_type = 'per_sqft' WHERE rate_type = 'sq_ft';
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
-- 200_backfill_underwriting_calculations.sql
-- Records that the Phase 2 underwriting backfill has been applied.
-- The actual backfill is performed by the Node script:
--   node server/src/scripts/backfill-underwriting.js (compiled from .ts)
-- Run as part of Phase 2 deployment before any UI goes live.
-- This migration is intentionally a no-op on the SQL side.
DO $$ BEGIN
  RAISE NOTICE 'Phase 2 underwriting backfill must be run via: npx tsx server/src/scripts/backfill-underwriting.ts';
END $$;
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
-- Migration 300: Add status_changed_at to projects
-- Records when project status last changed; required by Phase 3 break_ground / completion snapshot hooks.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- Backfill: treat current updated_at as the last status change time for existing rows.
UPDATE projects
SET status_changed_at = updated_at
WHERE status_changed_at IS NULL;
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
-- 502_budget_line_item_scope_factors.sql
-- Adds scope_factors UUID array to budget_line_items.
-- When users create or edit a line item, they can tag which scope factors were present,
-- giving the normalization service the data it needs to adjust contractor rates.

ALTER TABLE budget_line_items
  ADD COLUMN IF NOT EXISTS scope_factors UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_line_items_scope_factors
  ON budget_line_items USING GIN (scope_factors);
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
