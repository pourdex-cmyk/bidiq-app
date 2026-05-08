import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from './authenticateUser';

export async function loadOrgContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('org_id, role')
    .eq('id', req.userId)
    .single();

  if (error || !data) {
    return res.status(403).json({ error: 'User not found in organization' });
  }

  req.orgId = data.org_id;
  req.userRole = data.role;
  next();
}
