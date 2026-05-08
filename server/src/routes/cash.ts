import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { listHandler, getHandler, createHandler, updateHandler, deleteHandler } from '../utils/crud';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const AccountSchema = z.object({
  name: z.string().min(1),
  accountType: z.enum(['checking', 'savings', 'construction_loan', 'escrow', 'reserve']),
  institution: z.string().optional(),
  accountNumberLast4: z.string().max(4).optional(),
  currentBalance: z.number().default(0),
  availableBalance: z.number().optional(),
  creditLimit: z.number().optional(),
  propertyId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const TRANSACTION_CATEGORIES = ['mortgage','rent_income','contractor_payment','permit_fee',
  'insurance','tax','utility','management_fee','loan_draw','equity_injection','sale_proceeds',
  'deposit','refund','other'] as const;

const TransactionSchema = z.object({
  accountId: z.string().uuid(),
  propertyId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  category: z.enum(TRANSACTION_CATEGORIES),
  description: z.string().min(1),
  amount: z.number().positive(),
  transactionType: z.enum(['debit', 'credit']),
  transactionDate: z.string(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

router.get('/accounts', ...auth, listHandler('cash_accounts', (sb, orgId, filters) => {
  let q = sb.from('cash_accounts').select('*', { count: 'exact' }).eq('org_id', orgId);
  if (filters.accountType) q = q.eq('account_type', filters.accountType);
  return q.order('name');
}));

router.get('/accounts/:id', ...auth, getHandler('cash_accounts'));
router.post('/accounts', ...auth, requireRole('admin'), validateBody(AccountSchema), auditLog('create', 'cash_accounts'), createHandler('cash_accounts'));
router.patch('/accounts/:id', ...auth, requireRole('admin'), validateBody(AccountSchema.partial()), auditLog('update', 'cash_accounts'), updateHandler('cash_accounts'));
router.delete('/accounts/:id', ...auth, requireRole('admin'), auditLog('delete', 'cash_accounts'), deleteHandler('cash_accounts'));

router.get('/transactions', ...auth, listHandler('cash_transactions', (sb, orgId, filters) => {
  let q = sb.from('cash_transactions').select('*, cash_accounts(name), properties(name)', { count: 'exact' }).eq('org_id', orgId);
  if (filters.accountId) q = q.eq('account_id', filters.accountId);
  if (filters.propertyId) q = q.eq('property_id', filters.propertyId);
  if (filters.category) q = q.eq('category', filters.category);
  if (filters.from) q = q.gte('transaction_date', filters.from);
  if (filters.to) q = q.lte('transaction_date', filters.to);
  return q.order('transaction_date', { ascending: false });
}));

router.get('/transactions/:id', ...auth, getHandler('cash_transactions'));
router.post('/transactions', ...auth, requireRole('analyst'), validateBody(TransactionSchema), auditLog('create', 'cash_transactions'), createHandler('cash_transactions'));
router.patch('/transactions/:id', ...auth, requireRole('analyst'), validateBody(TransactionSchema.partial()), auditLog('update', 'cash_transactions'), updateHandler('cash_transactions'));
router.delete('/transactions/:id', ...auth, requireRole('admin'), auditLog('delete', 'cash_transactions'), deleteHandler('cash_transactions'));

export default router;
