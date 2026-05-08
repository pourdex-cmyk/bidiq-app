import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { listHandler, getHandler, createHandler, updateHandler, deleteHandler } from '../utils/crud';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const CreateSchema = z.object({
  projectId: z.string().uuid(),
  contractorId: z.string().uuid(),
  budgetLineItemId: z.string().uuid().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string(),
  dueDate: z.string().optional(),
  amount: z.number().positive(),
  taxAmount: z.number().nonnegative().optional(),
  totalAmount: z.number().positive(),
  isChangeOrder: z.boolean().optional(),
  changeOrderReason: z.string().optional(),
  yardiPoNumber: z.string().optional(),
  notes: z.string().optional(),
});

const UpdateSchema = CreateSchema.partial();

const ApproveSchema = z.object({
  paymentMethod: z.enum(['check', 'ach', 'wire', 'credit_card', 'cash']).optional(),
});

router.get('/', ...auth, listHandler('contractor_invoices', (sb, orgId, filters) => {
  let q = sb.from('contractor_invoices').select('*, contractors(company_name), projects(name)', { count: 'exact' }).eq('org_id', orgId);
  if (filters.projectId) q = q.eq('project_id', filters.projectId);
  if (filters.contractorId) q = q.eq('contractor_id', filters.contractorId);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.isChangeOrder) q = q.eq('is_change_order', filters.isChangeOrder === 'true');
  return q.order('invoice_date', { ascending: false });
}));

router.get('/:id', ...auth, getHandler('contractor_invoices'));
router.post('/', ...auth, requireRole('project_manager'), validateBody(CreateSchema), auditLog('create', 'contractor_invoices'), createHandler('contractor_invoices'));
router.patch('/:id', ...auth, requireRole('project_manager'), validateBody(UpdateSchema), auditLog('update', 'contractor_invoices'), updateHandler('contractor_invoices'));

router.post('/:id/approve', ...auth, requireRole('project_manager'), validateBody(ApproveSchema), auditLog('approve', 'contractor_invoices'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('contractor_invoices')
      .update({ status: 'approved', approved_by: req.userId, payment_method: req.body.paymentMethod })
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .select()
      .single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

router.post('/:id/mark-paid', ...auth, requireRole('project_manager'), auditLog('update', 'contractor_invoices'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('contractor_invoices')
      .update({ status: 'paid', payment_date: new Date().toISOString().split('T')[0] })
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .select()
      .single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

router.delete('/:id', ...auth, requireRole('admin'), auditLog('delete', 'contractor_invoices'), deleteHandler('contractor_invoices'));

export default router;
