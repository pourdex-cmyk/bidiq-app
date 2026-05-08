import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { listHandler, getHandler, createHandler, updateHandler, deleteHandler } from '../utils/crud';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const CreateSchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  projectType: z.enum(['renovation', 'new_construction', 'repair', 'capital_improvement', 'unit_turn']),
  initialBudget: z.number().nonnegative(),
  hasConstructionLoan: z.boolean().optional(),
  startDate: z.string().optional(),
  targetCompletion: z.string().optional(),
  projectManagerId: z.string().uuid().optional(),
  primaryContractorId: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const UpdateSchema = CreateSchema.partial();

router.get('/', ...auth, listHandler('projects', (sb, orgId, filters) => {
  let q = sb.from('projects').select('*, properties(name, address, city)', { count: 'exact' }).eq('org_id', orgId);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.propertyId) q = q.eq('property_id', filters.propertyId);
  if (filters.priority) q = q.eq('priority', filters.priority);
  return q.order('created_at', { ascending: false });
}));

router.get('/:id', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        properties(name, address, city, state),
        budget_line_items(*),
        contractor_invoices(*, contractors(company_name)),
        permits(*),
        loan_draws(*)
      `)
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

router.post('/', ...auth, requireRole('project_manager'), validateBody(CreateSchema), auditLog('create', 'projects'), createHandler('projects'));
router.patch('/:id', ...auth, requireRole('project_manager'), validateBody(UpdateSchema), auditLog('update', 'projects'), updateHandler('projects'));
router.delete('/:id', ...auth, requireRole('admin'), auditLog('delete', 'projects'), deleteHandler('projects'));

export default router;
