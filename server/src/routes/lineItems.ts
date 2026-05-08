import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { listHandler, getHandler, createHandler, updateHandler, deleteHandler } from '../utils/crud';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const CATEGORIES = ['demolition','framing','roofing','electrical','plumbing','hvac','insulation',
  'drywall','flooring','tile','painting','cabinets','appliances','windows_doors',
  'landscaping','permits','general_conditions','contingency'] as const;

const CreateSchema = z.object({
  projectId: z.string().uuid(),
  unitId: z.string().uuid().optional(),
  category: z.enum(CATEGORIES),
  description: z.string().min(1),
  quantity: z.number().positive().optional(),
  unitOfMeasure: z.string().optional(),
  unitCost: z.number().nonnegative().optional(),
  budgetedAmount: z.number().nonnegative(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  contractorId: z.string().uuid().optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const UpdateSchema = CreateSchema.partial().omit({ projectId: true });

router.get('/', ...auth, listHandler('budget_line_items', (sb, orgId, filters) => {
  let q = sb.from('budget_line_items').select('*, contractors(company_name)', { count: 'exact' }).eq('org_id', orgId);
  if (filters.projectId) q = q.eq('project_id', filters.projectId);
  if (filters.category) q = q.eq('category', filters.category);
  if (filters.status) q = q.eq('status', filters.status);
  return q.order('sort_order').order('created_at');
}));

router.get('/:id', ...auth, getHandler('budget_line_items'));
router.post('/', ...auth, requireRole('project_manager'), validateBody(CreateSchema), auditLog('create', 'budget_line_items'), createHandler('budget_line_items'));
router.patch('/:id', ...auth, requireRole('project_manager'), validateBody(UpdateSchema), auditLog('update', 'budget_line_items'), updateHandler('budget_line_items'));
router.delete('/:id', ...auth, requireRole('admin'), auditLog('delete', 'budget_line_items'), deleteHandler('budget_line_items'));

export default router;
