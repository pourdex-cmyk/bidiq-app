import { Router } from 'express';
import { authenticateUser, loadOrgContext } from '../middleware';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

router.get('/', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data });
  } catch (err) { next(err); }
});

router.post('/mark-read', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const ids: string[] = req.body.ids || [];
    let q = supabaseAdmin
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', req.userId!);
    if (ids.length > 0) q = q.in('id', ids);
    const { error } = await q;
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: { ok: true } });
  } catch (err) { next(err); }
});

router.delete('/:id', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await supabaseAdmin.from('notifications').delete().eq('id', req.params.id).eq('user_id', req.userId!);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
