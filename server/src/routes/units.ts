import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { listHandler, getHandler, createHandler, updateHandler, deleteHandler } from '../utils/crud';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const CreateSchema = z.object({
  propertyId: z.string().uuid(),
  unitNumber: z.string().min(1),
  floorPlan: z.string().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  squareFeet: z.number().int().positive().optional(),
  status: z.enum(['occupied', 'vacant', 'renovation', 'offline']).optional(),
  currentRent: z.number().nonnegative().optional(),
  marketRent: z.number().nonnegative().optional(),
  tenantName: z.string().optional(),
  leaseStart: z.string().optional(),
  leaseEnd: z.string().optional(),
  yardiUnitId: z.string().optional(),
});

const UpdateSchema = CreateSchema.partial().omit({ propertyId: true });

router.get('/', ...auth, listHandler('units', (sb, orgId, filters) => {
  let q = sb.from('units').select('*', { count: 'exact' }).eq('org_id', orgId);
  if (filters.propertyId) q = q.eq('property_id', filters.propertyId);
  if (filters.status) q = q.eq('status', filters.status);
  return q.order('unit_number');
}));

router.get('/:id', ...auth, getHandler('units'));
router.post('/', ...auth, requireRole('project_manager'), validateBody(CreateSchema), auditLog('create', 'units'), createHandler('units'));
router.patch('/:id', ...auth, requireRole('project_manager'), validateBody(UpdateSchema), auditLog('update', 'units'), updateHandler('units'));
router.delete('/:id', ...auth, requireRole('admin'), auditLog('delete', 'units'), deleteHandler('units'));

export default router;
