import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { listHandler, getHandler, createHandler, updateHandler, deleteHandler } from '../utils/crud';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const CreateSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  isPreferred: z.boolean().optional(),
  defaultRate: z.number().nonnegative().optional(),
  rateType: z.enum(['hourly', 'daily', 'fixed', 'sq_ft']).optional(),
  yardiVendorId: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
});

const UpdateSchema = CreateSchema.partial();

router.get('/', ...auth, listHandler('contractors', (sb, orgId, filters) => {
  let q = sb.from('contractors').select('*', { count: 'exact' }).eq('org_id', orgId);
  if (filters.isPreferred) q = q.eq('is_preferred', filters.isPreferred === 'true');
  if (filters.specialty) q = q.contains('specialties', [filters.specialty]);
  if (filters.search) q = q.ilike('company_name', `%${filters.search}%`);
  return q.order('is_preferred', { ascending: false }).order('company_name');
}));

router.get('/:id', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('contractors')
      .select('*, contractor_notes(*), contractor_invoices(id, total_amount, status, invoice_date, projects(name))')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

router.post('/', ...auth, requireRole('project_manager'), validateBody(CreateSchema), auditLog('create', 'contractors'), createHandler('contractors'));
router.patch('/:id', ...auth, requireRole('project_manager'), validateBody(UpdateSchema), auditLog('update', 'contractors'), updateHandler('contractors'));
router.delete('/:id', ...auth, requireRole('admin'), auditLog('delete', 'contractors'), deleteHandler('contractors'));

router.post('/:id/notes', ...auth, requireRole('analyst'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const NoteSchema = z.object({
      content: z.string().min(1),
      noteType: z.enum(['general', 'performance', 'issue', 'recommendation', 'reference']).optional(),
      isPrivate: z.boolean().optional(),
      projectId: z.string().uuid().optional(),
    });
    const body = NoteSchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('contractor_notes')
      .insert({ ...body, contractor_id: req.params.id, org_id: req.orgId, created_by: req.userId })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

export default router;
