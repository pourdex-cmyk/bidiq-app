import { Router } from 'express';
import { authenticateUser, loadOrgContext, requireRole } from '../middleware';
import { listHandler } from '../utils/crud';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

router.get('/', ...auth, requireRole('admin'), listHandler('audit_log', (sb, orgId, filters) => {
  let q = sb.from('audit_log').select('*, users(full_name, email)', { count: 'exact' }).eq('org_id', orgId);
  if (filters.userId) q = q.eq('user_id', filters.userId);
  if (filters.tableName) q = q.eq('table_name', filters.tableName);
  if (filters.action) q = q.eq('action', filters.action);
  if (filters.from) q = q.gte('created_at', filters.from);
  if (filters.to) q = q.lte('created_at', filters.to);
  return q.order('created_at', { ascending: false });
}));

export default router;
