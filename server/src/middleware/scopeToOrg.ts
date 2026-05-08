import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticateUser';

export function scopeToOrg(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.orgId) return res.status(403).json({ error: 'No org context' });
  (req as any).filter = { org_id: req.orgId };
  next();
}
