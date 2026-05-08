import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { listHandler, getHandler, createHandler, updateHandler } from '../utils/crud';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const CreateSchema = z.object({
  projectId: z.string().uuid(),
  drawNumber: z.number().int().positive(),
  title: z.string().optional(),
  requestedAmount: z.number().positive(),
  submittedDate: z.string().optional(),
  completionPercentage: z.number().min(0).max(100).optional(),
  lenderContact: z.string().optional(),
  notes: z.string().optional(),
});

const UpdateSchema = CreateSchema.partial();

router.get('/', ...auth, listHandler('loan_draws', (sb, orgId, filters) => {
  let q = sb.from('loan_draws').select('*, projects(name, property_id)', { count: 'exact' }).eq('org_id', orgId);
  if (filters.projectId) q = q.eq('project_id', filters.projectId);
  if (filters.status) q = q.eq('status', filters.status);
  return q.order('draw_number');
}));

router.get('/:id', ...auth, getHandler('loan_draws'));
router.post('/', ...auth, requireRole('project_manager'), validateBody(CreateSchema), auditLog('create', 'loan_draws'), createHandler('loan_draws'));
router.patch('/:id', ...auth, requireRole('project_manager'), validateBody(UpdateSchema), auditLog('update', 'loan_draws'), updateHandler('loan_draws'));

router.post('/:id/submit', ...auth, requireRole('project_manager'), auditLog('update', 'loan_draws'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('loan_draws')
      .update({ status: 'submitted', submitted_date: new Date().toISOString().split('T')[0], submitted_by: req.userId })
      .eq('id', req.params.id).eq('org_id', req.orgId!).eq('status', 'pending')
      .select().single();
    if (error || !data) return res.status(404).json({ error: 'Not found or already submitted' });
    res.json({ data });
  } catch (err) { next(err); }
});

router.post('/:id/approve', ...auth, requireRole('admin'), auditLog('approve', 'loan_draws'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const ApproveSchema = z.object({ approvedAmount: z.number().positive() });
    const { approvedAmount } = ApproveSchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('loan_draws')
      .update({ status: 'approved', approved_amount: approvedAmount, approved_date: new Date().toISOString().split('T')[0] })
      .eq('id', req.params.id).eq('org_id', req.orgId!)
      .select().single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

export default router;
