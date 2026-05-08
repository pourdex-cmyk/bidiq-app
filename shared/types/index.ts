export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'growth' | 'enterprise';
  is_active: boolean;
  yardi_integration_enabled: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'project_manager' | 'analyst' | 'viewer';
  avatar_url: string | null;
  is_active: boolean;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  org_id: string;
  yardi_property_id: string | null;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string | null;
  property_type: 'single_family' | 'multi_family' | 'mixed_use' | 'commercial' | 'land';
  status: 'active' | 'under_renovation' | 'for_sale' | 'sold' | 'inactive';
  unit_count: number;
  purchase_price: number | null;
  current_value: number | null;
  purchase_date: string | null;
  yardi_synced_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  org_id: string;
  property_id: string;
  yardi_unit_id: string | null;
  unit_number: string;
  floor: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  status: 'vacant' | 'occupied' | 'renovation' | 'offline';
  monthly_rent: number | null;
  tenant_name: string | null;
  lease_start: string | null;
  lease_end: string | null;
  yardi_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contractor {
  id: string;
  org_id: string;
  yardi_vendor_id: string | null;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  license_number: string | null;
  license_expiry: string | null;
  insurance_expiry: string | null;
  specialties: string[];
  default_rate: number | null;
  rate_type: 'hourly' | 'fixed' | 'per_sqft' | 'per_unit' | null;
  rating: number | null;
  is_preferred: boolean;
  city: string | null;
  state: string | null;
  yardi_synced_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectType = 'renovation' | 'new_construction' | 'repair' | 'capital_improvement' | 'unit_turn';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Project {
  id: string;
  org_id: string;
  property_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  project_type: ProjectType;
  priority: ProjectPriority;
  initial_budget: number;
  current_budget: number;
  actual_spend: number;
  committed_spend: number;
  has_construction_loan: boolean;
  start_date: string | null;
  target_completion: string | null;
  actual_completion: string | null;
  project_manager_id: string | null;
  primary_contractor_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type LineItemCategory =
  | 'foundation' | 'framing' | 'roofing' | 'electrical' | 'plumbing' | 'hvac'
  | 'insulation' | 'drywall' | 'flooring' | 'painting' | 'windows_doors'
  | 'kitchen' | 'bathrooms' | 'exterior' | 'landscaping' | 'permits_fees'
  | 'architect_engineering' | 'contingency' | 'other';

export interface BudgetLineItem {
  id: string;
  org_id: string;
  project_id: string;
  contractor_id: string | null;
  category: LineItemCategory;
  description: string;
  budgeted_amount: number;
  committed_amount: number;
  actual_amount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  yardi_account_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractorInvoice {
  id: string;
  org_id: string;
  project_id: string;
  contractor_id: string;
  line_item_id: string | null;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string | null;
  description: string | null;
  labor_amount: number;
  materials_amount: number;
  total_amount: number;
  status: 'submitted' | 'approved' | 'paid' | 'disputed' | 'voided';
  is_change_order: boolean;
  change_order_reason: string | null;
  payment_date: string | null;
  document_url: string | null;
  yardi_po_number: string | null;
  yardi_synced_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Permit {
  id: string;
  org_id: string;
  project_id: string;
  permit_type: 'building' | 'electrical' | 'plumbing' | 'mechanical' | 'demolition' | 'certificate_of_occupancy' | 'zoning' | 'other';
  permit_number: string | null;
  issuing_authority: string | null;
  status: 'pending_application' | 'submitted' | 'approved' | 'active' | 'inspection_required' | 'passed_inspection' | 'expired' | 'closed';
  applied_date: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  fee_amount: number | null;
  description: string | null;
  document_url: string | null;
  inspector_name: string | null;
  inspection_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanDraw {
  id: string;
  org_id: string;
  project_id: string;
  draw_number: number;
  title: string | null;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'funded' | 'denied';
  requested_amount: number;
  approved_amount: number | null;
  funded_amount: number | null;
  completion_percentage: number;
  submitted_date: string | null;
  approved_date: string | null;
  funded_date: string | null;
  lender_name: string | null;
  notes: string | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquityAnalysis {
  id: string;
  org_id: string;
  property_id: string;
  name: string;
  purchase_price: number;
  renovation_cost: number;
  closing_costs: number;
  holding_costs: number;
  financing_costs: number;
  arv: number;
  monthly_noi: number;
  total_investment: number;
  value_created: number;
  equity_captured: number;
  roi_multiple: number;
  roi_percentage: number;
  payback_months: number | null;
  is_saved: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AccountType = 'checking' | 'savings' | 'money_market' | 'escrow' | 'draw_account' | 'reserve';

export interface CashAccount {
  id: string;
  org_id: string;
  name: string;
  institution: string | null;
  account_type: AccountType;
  account_number_last4: string | null;
  current_balance: number;
  as_of_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CashTransaction {
  id: string;
  org_id: string;
  account_id: string;
  project_id: string | null;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: 'debit' | 'credit';
  category: string;
  reference_number: string | null;
  is_reconciled: boolean;
  yardi_transaction_id: string | null;
  yardi_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CostBenchmark {
  id: string;
  org_id: string;
  category: LineItemCategory;
  unit_of_measure: string;
  region: string | null;
  avg_cost: number | null;
  p25_cost: number | null;
  p75_cost: number | null;
  sample_count: number;
  last_computed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface YardiSyncLog {
  id: string;
  org_id: string;
  data_type: 'properties' | 'units' | 'vendors' | 'invoices' | 'transactions' | 'tenants';
  file_name: string | null;
  storage_path: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_conflicted: number;
  records_skipped: number;
  error_message: string | null;
  column_mappings: Record<string, string>;
  started_at: string;
  completed_at: string | null;
  triggered_by: string | null;
}

export interface SyncConflict {
  id: string;
  org_id: string;
  sync_log_id: string;
  table_name: string;
  record_id: string;
  field_name: string;
  bidiq_value: string | null;
  yardi_value: string | null;
  resolution: 'kept_bidiq' | 'used_yardi' | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  org_id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: 'budget_alert' | 'permit_expiry' | 'invoice_due' | 'draw_status' | 'yardi_sync' | 'system';
  severity: 'info' | 'warning' | 'critical';
  is_read: boolean;
  link: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  org_id: string;
  user_id: string | null;
  action: 'create' | 'update' | 'delete' | 'export' | 'import' | 'login' | 'logout';
  resource_type: string;
  resource_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface PropertyDocument {
  id: string;
  org_id: string;
  property_id: string;
  project_id: string | null;
  name: string;
  document_type: 'deed' | 'survey' | 'permit' | 'contract' | 'invoice' | 'insurance' | 'appraisal' | 'inspection' | 'other';
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface ContractorNote {
  id: string;
  org_id: string;
  contractor_id: string;
  project_id: string | null;
  note_type: 'general' | 'performance' | 'issue' | 'commendation';
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}
