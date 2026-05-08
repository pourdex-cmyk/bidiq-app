import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { listHandler, getHandler, updateHandler } from '../utils/crud';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const InviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  role: z.enum(['project_manager', 'analyst', 'viewer']),
});

const UpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  role: z.enum(['admin', 'project_manager', 'analyst', 'viewer']).optional(),
  isActive: z.boolean().optional(),
});

router.get('/', ...auth, listHandler('users'));
router.get('/:id', ...auth, getHandler('users'));

router.post('/invite', ...auth, requireRole('admin'), validateBody(InviteSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { email, fullName, role } = req.body;
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { org_id: req.orgId, full_name: fullName, role },
    });
    if (error) return res.status(400).json({ error: error.message });

    await supabaseAdmin.from('users').insert({
      id: data.user.id,
      org_id: req.orgId,
      email,
      full_name: fullName,
      role,
      invited_by: req.userId,
    });

    res.status(201).json({ data: { message: 'Invite sent', userId: data.user.id } });
  } catch (err) { next(err); }
});

router.patch('/:id', ...auth, requireRole('admin'), validateBody(UpdateSchema), auditLog('update', 'users'), updateHandler('users'));

export default router;
