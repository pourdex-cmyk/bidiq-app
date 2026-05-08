import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { listHandler, getHandler, createHandler, updateHandler, deleteHandler } from '../utils/crud';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const CreateSchema = z.object({
  projectId: z.string().uuid(),
  propertyId: z.string().uuid(),
  permitType: z.enum(['building', 'electrical', 'plumbing', 'mechanical', 'demolition', 'certificate_of_occupancy']),
  permitNumber: z.string().optional(),
  issuingAuthority: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['not_started', 'applied', 'under_review', 'approved', 'active', 'inspection_required', 'expired', 'denied', 'closed']).optional(),
  appliedDate: z.string().optional(),
  approvedDate: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  feeAmount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

const UpdateSchema = CreateSchema.partial();

router.get('/', ...auth, listHandler('permits', (sb, orgId, filters) => {
  let q = sb.from('permits').select('*, projects(name)', { count: 'exact' }).eq('org_id', orgId);
  if (filters.projectId) q = q.eq('project_id', filters.projectId);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.expiringSoon) q = q.lte('expiry_date', new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  return q.order('expiry_date');
}));

router.get('/:id', ...auth, getHandler('permits'));
router.post('/', ...auth, requireRole('project_manager'), validateBody(CreateSchema), auditLog('create', 'permits'), createHandler('permits'));
router.patch('/:id', ...auth, requireRole('project_manager'), validateBody(UpdateSchema), auditLog('update', 'permits'), updateHandler('permits'));
router.delete('/:id', ...auth, requireRole('admin'), auditLog('delete', 'permits'), deleteHandler('permits'));

export default router;
