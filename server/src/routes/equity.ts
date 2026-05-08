import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { listHandler, getHandler, deleteHandler } from '../utils/crud';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const AnalysisSchema = z.object({
  propertyId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  name: z.string().min(1),
  purchasePrice: z.number().nonnegative(),
  renovationCost: z.number().nonnegative().default(0),
  closingCosts: z.number().nonnegative().default(0),
  holdingCosts: z.number().nonnegative().default(0),
  financingCosts: z.number().nonnegative().default(0),
  arv: z.number().nonnegative().optional(),
  currentValue: z.number().nonnegative().optional(),
  monthlyNoi: z.number().optional(),
  capRate: z.number().optional(),
  cashOnCash: z.number().optional(),
  assumptions: z.record(z.any()).optional(),
  isSaved: z.boolean().optional(),
});

function computeEquity(body: any) {
  const totalInvestment = body.purchasePrice + body.renovationCost + body.closingCosts + body.holdingCosts + body.financingCosts;
  const endValue = body.arv || body.currentValue || 0;
  const valueCreated = endValue - body.purchasePrice;
  const equityCaptured = endValue - totalInvestment;
  const roiMultiple = totalInvestment > 0 ? endValue / totalInvestment : 0;
  const roiPercentage = totalInvestment > 0 ? (equityCaptured / totalInvestment) * 100 : 0;
  const paybackMonths = body.monthlyNoi && body.monthlyNoi > 0 ? Math.ceil(totalInvestment / body.monthlyNoi) : null;
  return { totalInvestment, valueCreated, equityCaptured, roiMultiple, roiPercentage, paybackMonths };
}

router.get('/', ...auth, listHandler('equity_analyses', (sb, orgId, filters) => {
  let q = sb.from('equity_analyses').select('*, properties(name)', { count: 'exact' }).eq('org_id', orgId);
  if (filters.propertyId) q = q.eq('property_id', filters.propertyId);
  if (filters.isSaved) q = q.eq('is_saved', filters.isSaved === 'true');
  return q.order('created_at', { ascending: false });
}));

router.get('/:id', ...auth, getHandler('equity_analyses'));

router.post('/', ...auth, requireRole('analyst'), validateBody(AnalysisSchema), auditLog('create', 'equity_analyses'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const computed = computeEquity(req.body);
    const { data, error } = await supabaseAdmin
      .from('equity_analyses')
      .insert({ ...req.body, ...computed, org_id: req.orgId, created_by: req.userId })
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

router.patch('/:id', ...auth, requireRole('analyst'), validateBody(AnalysisSchema.partial()), auditLog('update', 'equity_analyses'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const computed = Object.keys(req.body).length > 0 ? computeEquity({ ...req.body }) : {};
    const { data, error } = await supabaseAdmin
      .from('equity_analyses')
      .update({ ...req.body, ...computed })
      .eq('id', req.params.id).eq('org_id', req.orgId!)
      .select().single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

router.delete('/:id', ...auth, requireRole('analyst'), auditLog('delete', 'equity_analyses'), deleteHandler('equity_analyses'));

export default router;
