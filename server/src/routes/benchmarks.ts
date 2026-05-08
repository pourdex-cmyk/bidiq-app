import { Router } from 'express';
import { authenticateUser, loadOrgContext } from '../middleware';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

router.get('/', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('cost_benchmarks')
      .select('*')
      .eq('org_id', req.orgId!)
      .order('category');
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data });
  } catch (err) { next(err); }
});

router.post('/recompute', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const categories = [
      'demolition','framing','roofing','electrical','plumbing','hvac','insulation',
      'drywall','flooring','tile','painting','cabinets','appliances','windows_doors',
      'landscaping','permits','general_conditions','contingency'
    ];
    for (const cat of categories) {
      await supabaseAdmin.rpc('recompute_benchmarks', { p_org_id: req.orgId!, p_category: cat });
    }
    const { data } = await supabaseAdmin.from('cost_benchmarks').select('*').eq('org_id', req.orgId!);
    res.json({ data });
  } catch (err) { next(err); }
});

export default router;
