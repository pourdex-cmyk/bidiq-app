-- BidIQ Demo Seed Data — Beantown Companies (Boston, MA)
-- Run after all migrations. Uses fixed UUIDs for reproducibility.

DO $$
DECLARE
  v_org_id UUID := 'a1b2c3d4-0001-0001-0001-000000000001';
  v_admin_id UUID := 'a1b2c3d4-0002-0002-0002-000000000002';
  v_pm_id UUID := 'a1b2c3d4-0003-0003-0003-000000000003';
  v_analyst_id UUID := 'a1b2c3d4-0004-0004-0004-000000000004';

  v_prop1 UUID := 'a1b2c3d4-0010-0010-0010-000000000010';
  v_prop2 UUID := 'a1b2c3d4-0011-0011-0011-000000000011';
  v_prop3 UUID := 'a1b2c3d4-0012-0012-0012-000000000012';

  v_proj1 UUID := 'a1b2c3d4-0020-0020-0020-000000000020';
  v_proj2 UUID := 'a1b2c3d4-0021-0021-0021-000000000021';
  v_proj3 UUID := 'a1b2c3d4-0022-0022-0022-000000000022';

  v_cont1 UUID := 'a1b2c3d4-0030-0030-0030-000000000030';
  v_cont2 UUID := 'a1b2c3d4-0031-0031-0031-000000000031';
  v_cont3 UUID := 'a1b2c3d4-0032-0032-0032-000000000032';

  v_account1 UUID := 'a1b2c3d4-0040-0040-0040-000000000040';
  v_account2 UUID := 'a1b2c3d4-0041-0041-0041-000000000041';
BEGIN

-- Organization
INSERT INTO organizations (id, name, slug, plan) VALUES
  (v_org_id, 'Beantown Companies', 'beantown', 'growth');

-- Users (auth.users must exist separately via Supabase Auth)
INSERT INTO users (id, org_id, email, full_name, role) VALUES
  (v_admin_id, v_org_id, 'admin@beantown.demo', 'Chris Callahan', 'admin'),
  (v_pm_id, v_org_id, 'pm@beantown.demo', 'Maria Santos', 'project_manager'),
  (v_analyst_id, v_org_id, 'analyst@beantown.demo', 'James Wu', 'analyst');

-- Properties
INSERT INTO properties (id, org_id, name, address, city, state, zip, property_type, status, unit_count, purchase_price, purchase_date, current_value, yardi_property_id, created_by) VALUES
  (v_prop1, v_org_id, 'South End Triplex', '142 Tremont St', 'Boston', 'MA', '02111', 'multi_family', 'under_renovation', 3, 1200000, '2024-03-15', 1650000, 'YRD-P001', v_admin_id),
  (v_prop2, v_org_id, 'Dorchester 6-Unit', '89 Bowdoin Ave', 'Boston', 'MA', '02121', 'multi_family', 'active', 6, 950000, '2023-08-01', 1150000, 'YRD-P002', v_admin_id),
  (v_prop3, v_org_id, 'Somerville Mixed Use', '401 Highland Ave', 'Somerville', 'MA', '02144', 'mixed_use', 'planning', 4, 1450000, '2025-01-10', 1450000, 'YRD-P003', v_admin_id);

-- Units for South End Triplex
INSERT INTO units (org_id, property_id, unit_number, bedrooms, bathrooms, square_feet, status, current_rent, market_rent, yardi_unit_id) VALUES
  (v_org_id, v_prop1, '1', 2, 1, 850, 'vacant', NULL, 2800, 'YRD-U001'),
  (v_org_id, v_prop1, '2', 2, 1, 850, 'renovation', NULL, 2800, 'YRD-U002'),
  (v_org_id, v_prop1, '3', 3, 2, 1100, 'occupied', 2600, 3200, 'YRD-U003');

-- Units for Dorchester 6-Unit
INSERT INTO units (org_id, property_id, unit_number, bedrooms, bathrooms, square_feet, status, current_rent, market_rent, yardi_unit_id) VALUES
  (v_org_id, v_prop2, '1A', 1, 1, 600, 'occupied', 1800, 2000, 'YRD-U010'),
  (v_org_id, v_prop2, '1B', 1, 1, 600, 'occupied', 1800, 2000, 'YRD-U011'),
  (v_org_id, v_prop2, '2A', 2, 1, 850, 'occupied', 2200, 2400, 'YRD-U012'),
  (v_org_id, v_prop2, '2B', 2, 1, 850, 'occupied', 2200, 2400, 'YRD-U013'),
  (v_org_id, v_prop2, '3A', 3, 2, 1050, 'occupied', 2800, 3000, 'YRD-U014'),
  (v_org_id, v_prop2, '3B', 3, 2, 1050, 'vacant', NULL, 3000, 'YRD-U015');

-- Contractors
INSERT INTO contractors (id, org_id, company_name, contact_name, email, phone, specialties, is_preferred, default_rate, rate_type, yardi_vendor_id, rating) VALUES
  (v_cont1, v_org_id, 'Fenway General Contracting', 'Tony Ferrara', 'tony@fenwaygc.demo', '617-555-0101', ARRAY['framing','drywall','general_conditions'], TRUE, 85, 'hourly', 'YRD-V001', 5),
  (v_cont2, v_org_id, 'Hub Electrical Services', 'Dana Lee', 'dana@hubelectric.demo', '617-555-0202', ARRAY['electrical'], TRUE, 110, 'hourly', 'YRD-V002', 4),
  (v_cont3, v_org_id, 'Mass Plumbing & HVAC', 'Rick Souza', 'rick@massphvac.demo', '617-555-0303', ARRAY['plumbing','hvac'], FALSE, 120, 'hourly', 'YRD-V003', 4);

-- Projects
INSERT INTO projects (id, org_id, property_id, name, description, status, project_type, initial_budget, current_budget, actual_spend, has_construction_loan, start_date, target_completion, project_manager_id, primary_contractor_id, priority, created_by) VALUES
  (v_proj1, v_org_id, v_prop1, 'South End Full Gut Reno', 'Complete gut renovation of units 1 and 2 — kitchens, baths, flooring, electrical, plumbing', 'active', 'renovation', 280000, 295000, 187400, TRUE, '2025-01-15', '2025-07-30', v_pm_id, v_cont1, 'high', v_admin_id),
  (v_proj2, v_org_id, v_prop2, 'Dorchester Unit Turns', 'Unit 3B renovation for new tenant — kitchen update, bath refresh, paint, floors', 'active', 'unit_turn', 28000, 28000, 12600, FALSE, '2025-04-01', '2025-05-31', v_pm_id, v_cont1, 'medium', v_admin_id),
  (v_proj3, v_org_id, v_prop3, 'Somerville Planning Phase', 'Pre-construction planning, permits, architectural drawings for mixed-use conversion', 'planning', 'renovation', 45000, 45000, 8200, FALSE, '2025-05-01', '2025-12-31', v_pm_id, NULL, 'medium', v_admin_id);

-- Budget Line Items — South End Reno
INSERT INTO budget_line_items (org_id, project_id, category, description, quantity, unit_of_measure, unit_cost, budgeted_amount, committed_amount, actual_amount, status, contractor_id, sort_order) VALUES
  (v_org_id, v_proj1, 'demolition', 'Demo existing kitchens and baths, remove flooring', 1700, 'sq_ft', 8, 13600, 13600, 13600, 'completed', v_cont1, 1),
  (v_org_id, v_proj1, 'electrical', 'Full rewire units 1&2, panel upgrade to 200A', 1, 'fixed', 42000, 42000, 42000, 38500, 'in_progress', v_cont2, 2),
  (v_org_id, v_proj1, 'plumbing', 'Rough-in plumbing both units, new water heater', 1, 'fixed', 28000, 28000, 28000, 26200, 'in_progress', v_cont3, 3),
  (v_org_id, v_proj1, 'framing', 'Wall layout changes, blocking for cabinets', 1700, 'sq_ft', 12, 20400, 20400, 19800, 'completed', v_cont1, 4),
  (v_org_id, v_proj1, 'drywall', 'Hang and finish drywall both units', 1700, 'sq_ft', 9, 15300, 15300, 0, 'pending', v_cont1, 5),
  (v_org_id, v_proj1, 'flooring', 'White oak hardwood, sand and finish', 1700, 'sq_ft', 18, 30600, 30600, 0, 'pending', NULL, 6),
  (v_org_id, v_proj1, 'cabinets', 'Semi-custom kitchen cabinets both units', 2, 'fixed', 18000, 36000, 36000, 0, 'pending', NULL, 7),
  (v_org_id, v_proj1, 'tile', 'Tile baths and kitchen backsplash', 400, 'sq_ft', 22, 8800, 8800, 0, 'pending', NULL, 8),
  (v_org_id, v_proj1, 'painting', 'Full interior paint both units', 1700, 'sq_ft', 4.5, 7650, 7650, 0, 'pending', NULL, 9),
  (v_org_id, v_proj1, 'permits', 'Building, electrical, plumbing permits', 1, 'fixed', 4800, 4800, 4800, 4800, 'completed', NULL, 10),
  (v_org_id, v_proj1, 'general_conditions', 'Dumpsters, temp utilities, site management', 1, 'fixed', 8500, 8500, 8500, 7400, 'in_progress', v_cont1, 11),
  (v_org_id, v_proj1, 'contingency', '10% contingency', 1, 'fixed', 18000, 18000, 18000, 0, 'pending', NULL, 12);

-- Budget Line Items — Dorchester Unit Turn
INSERT INTO budget_line_items (org_id, project_id, category, description, quantity, unit_of_measure, unit_cost, budgeted_amount, committed_amount, actual_amount, status, contractor_id, sort_order) VALUES
  (v_org_id, v_proj2, 'painting', 'Interior paint full unit', 1050, 'sq_ft', 4, 4200, 4200, 4200, 'completed', NULL, 1),
  (v_org_id, v_proj2, 'flooring', 'LVP flooring living areas', 800, 'sq_ft', 7, 5600, 5600, 5600, 'completed', NULL, 2),
  (v_org_id, v_proj2, 'tile', 'Bathroom tile refresh', 120, 'sq_ft', 18, 2160, 2160, 0, 'in_progress', NULL, 3),
  (v_org_id, v_proj2, 'cabinets', 'Kitchen cabinet refinish and new hardware', 1, 'fixed', 3200, 3200, 3200, 2800, 'completed', v_cont1, 4),
  (v_org_id, v_proj2, 'appliances', 'Refrigerator, stove, dishwasher', 1, 'fixed', 4200, 4200, 4200, 0, 'pending', NULL, 5),
  (v_org_id, v_proj2, 'general_conditions', 'Dumpster, cleanup', 1, 'fixed', 1400, 1400, 1400, 0, 'pending', v_cont1, 6),
  (v_org_id, v_proj2, 'contingency', 'Contingency', 1, 'fixed', 7240, 7240, 7240, 0, 'pending', NULL, 7);

-- Invoices
INSERT INTO contractor_invoices (org_id, project_id, contractor_id, invoice_number, invoice_date, due_date, amount, total_amount, status, is_change_order, payment_date, payment_method, yardi_po_number, created_by) VALUES
  (v_org_id, v_proj1, v_cont1, 'FGC-2025-001', '2025-01-28', '2025-02-12', 13600, 13600, 'paid', FALSE, '2025-02-10', 'ach', 'YRD-PO-001', v_admin_id),
  (v_org_id, v_proj1, v_cont2, 'HES-2025-001', '2025-02-15', '2025-03-01', 18000, 18000, 'paid', FALSE, '2025-02-28', 'ach', 'YRD-PO-002', v_admin_id),
  (v_org_id, v_proj1, v_cont2, 'HES-2025-002', '2025-03-20', '2025-04-04', 20500, 20500, 'approved', FALSE, NULL, NULL, 'YRD-PO-003', v_admin_id),
  (v_org_id, v_proj1, v_cont3, 'MPH-2025-001', '2025-02-20', '2025-03-07', 26200, 26200, 'paid', FALSE, '2025-03-05', 'check', 'YRD-PO-004', v_admin_id),
  (v_org_id, v_proj1, v_cont1, 'FGC-2025-002', '2025-03-10', '2025-03-25', 7400, 7400, 'paid', FALSE, '2025-03-22', 'ach', 'YRD-PO-005', v_admin_id),
  (v_org_id, v_proj1, v_cont1, 'FGC-2025-003', '2025-03-15', '2025-03-30', 3000, 3000, 'paid', TRUE, '2025-03-28', 'ach', 'YRD-PO-006', v_admin_id),
  (v_org_id, v_proj2, v_cont1, 'FGC-2025-004', '2025-04-08', '2025-04-23', 12600, 12600, 'paid', FALSE, '2025-04-20', 'ach', 'YRD-PO-007', v_admin_id);

-- Permits
INSERT INTO permits (org_id, project_id, property_id, permit_type, permit_number, issuing_authority, description, status, applied_date, approved_date, issue_date, expiry_date, fee_amount, created_by) VALUES
  (v_org_id, v_proj1, v_prop1, 'building', 'BLD-2025-04821', 'City of Boston ISD', 'Full renovation permit units 1&2', 'active', '2024-12-20', '2025-01-08', '2025-01-10', '2026-01-10', 1800, v_admin_id),
  (v_org_id, v_proj1, v_prop1, 'electrical', 'ELE-2025-01234', 'City of Boston ISD', 'Electrical permit 200A panel and rewire', 'active', '2024-12-20', '2025-01-09', '2025-01-10', '2025-07-10', 1400, v_admin_id),
  (v_org_id, v_proj1, v_prop1, 'plumbing', 'PLM-2025-00876', 'City of Boston ISD', 'Plumbing rough-in permit', 'active', '2024-12-22', '2025-01-11', '2025-01-12', '2025-07-12', 950, v_admin_id),
  (v_org_id, v_proj3, v_prop3, 'building', NULL, 'City of Somerville ISD', 'Mixed-use conversion — pre-application', 'not_started', NULL, NULL, NULL, NULL, NULL, v_admin_id);

-- Loan Draws — South End Reno
INSERT INTO loan_draws (org_id, project_id, draw_number, title, status, requested_amount, approved_amount, funded_amount, submitted_date, approved_date, funded_date, completion_percentage, created_by) VALUES
  (v_org_id, v_proj1, 1, 'Draw 1 — Demo & Rough-In', 'funded', 75000, 72000, 72000, '2025-02-01', '2025-02-10', '2025-02-14', 25, v_pm_id),
  (v_org_id, v_proj1, 2, 'Draw 2 — MEP Progress', 'funded', 85000, 85000, 85000, '2025-03-15', '2025-03-22', '2025-03-26', 52, v_pm_id),
  (v_org_id, v_proj1, 3, 'Draw 3 — Drywall & Finishes', 'submitted', 90000, NULL, NULL, '2025-04-28', NULL, NULL, 68, v_pm_id);

-- Equity Analysis
INSERT INTO equity_analyses (org_id, property_id, project_id, name, purchase_price, renovation_cost, closing_costs, holding_costs, financing_costs, total_investment, arv, current_value, value_created, equity_captured, roi_multiple, roi_percentage, payback_months, monthly_noi, cap_rate, cash_on_cash, is_saved, created_by) VALUES
  (v_org_id, v_prop1, v_proj1, 'South End Reno — Full Scenario', 1200000, 295000, 36000, 24000, 18000, 1573000, 1650000, 1650000, 450000, 77000, 1.049, 4.89, 14, 8400, 0.061, 0.082, TRUE, v_analyst_id),
  (v_org_id, v_prop2, NULL, 'Dorchester Stabilized Hold', 950000, 28000, 28500, 0, 0, 1006500, 1150000, 1150000, 200000, 143500, 1.142, 14.21, 8, 7200, 0.075, 0.094, TRUE, v_analyst_id);

-- Cash Accounts
INSERT INTO cash_accounts (id, org_id, name, account_type, institution, account_number_last4, current_balance, is_active, created_by) VALUES
  (v_account1, v_org_id, 'Beantown Operating', 'checking', 'Eastern Bank', '4821', 284500, TRUE, v_admin_id),
  (v_account2, v_org_id, 'South End Construction Loan', 'construction_loan', 'Rockland Trust', '9203', 152000, TRUE, v_admin_id);

-- Cash Transactions (last 60 days)
INSERT INTO cash_transactions (org_id, account_id, property_id, project_id, category, description, amount, transaction_type, transaction_date, is_reconciled, created_by) VALUES
  (v_org_id, v_account1, v_prop2, NULL, 'rent_income', 'Dorchester 6-Unit — April rent collection', 12800, 'credit', '2025-04-01', TRUE, v_admin_id),
  (v_org_id, v_account1, v_prop1, NULL, 'rent_income', 'South End unit 3 — April rent', 2600, 'credit', '2025-04-01', TRUE, v_admin_id),
  (v_org_id, v_account1, v_prop1, v_proj1, 'contractor_payment', 'Fenway GC — Draw 2 balance payment', 19800, 'debit', '2025-04-05', TRUE, v_admin_id),
  (v_org_id, v_account1, NULL, NULL, 'mortgage', 'South End mortgage — April', 6800, 'debit', '2025-04-10', TRUE, v_admin_id),
  (v_org_id, v_account1, NULL, NULL, 'mortgage', 'Dorchester mortgage — April', 5200, 'debit', '2025-04-10', TRUE, v_admin_id),
  (v_org_id, v_account1, v_prop1, v_proj1, 'contractor_payment', 'Hub Electric — invoice HES-2025-002', 20500, 'debit', '2025-04-15', FALSE, v_admin_id),
  (v_org_id, v_account2, v_prop1, v_proj1, 'loan_draw', 'Construction loan Draw 2 funding received', 85000, 'credit', '2025-03-26', TRUE, v_admin_id),
  (v_org_id, v_account1, v_prop2, NULL, 'rent_income', 'Dorchester 6-Unit — May rent collection', 12800, 'credit', '2025-05-01', FALSE, v_admin_id);

-- Cost Benchmarks (seeded with Boston-area actuals)
INSERT INTO cost_benchmarks (org_id, category, region, unit_of_measure, p25_cost, avg_cost, p75_cost, sample_count) VALUES
  (v_org_id, 'demolition', 'Boston Metro', 'sq_ft', 6.50, 8.00, 10.00, 12),
  (v_org_id, 'electrical', 'Boston Metro', 'sq_ft', 28.00, 35.00, 45.00, 8),
  (v_org_id, 'plumbing', 'Boston Metro', 'sq_ft', 18.00, 24.00, 32.00, 8),
  (v_org_id, 'framing', 'Boston Metro', 'sq_ft', 10.00, 13.00, 17.00, 10),
  (v_org_id, 'drywall', 'Boston Metro', 'sq_ft', 7.00, 9.00, 12.00, 15),
  (v_org_id, 'flooring', 'Boston Metro', 'sq_ft', 12.00, 17.00, 24.00, 18),
  (v_org_id, 'tile', 'Boston Metro', 'sq_ft', 16.00, 22.00, 30.00, 14),
  (v_org_id, 'painting', 'Boston Metro', 'sq_ft', 3.50, 4.50, 6.00, 22),
  (v_org_id, 'cabinets', 'Boston Metro', 'fixed', 14000, 20000, 32000, 9),
  (v_org_id, 'permits', 'Boston Metro', 'fixed', 2500, 4200, 7500, 20);

-- Notifications
INSERT INTO notifications (org_id, user_id, type, title, message, link, is_read) VALUES
  (v_org_id, v_admin_id, 'budget_overrun', 'South End Reno Over Budget', 'Project is 5.4% over initial budget ($295k vs $280k). Review change orders.', '/projects/' || v_proj1, FALSE),
  (v_org_id, v_admin_id, 'permit_expiring', 'Electrical Permit Expiring', 'South End electrical permit ELE-2025-01234 expires July 10. Schedule final inspection.', '/projects/' || v_proj1 || '/permits', FALSE),
  (v_org_id, v_pm_id, 'draw_approved', 'Draw 3 Submitted', 'Construction loan Draw 3 ($90k) submitted to Rockland Trust on April 28.', '/projects/' || v_proj1 || '/draws', TRUE),
  (v_org_id, v_analyst_id, 'yardi_sync_complete', 'Yardi Import Complete', 'Dorchester units import completed. 5 records updated, 0 conflicts.', '/yardi', TRUE);

END $$;
