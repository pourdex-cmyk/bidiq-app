import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticateUser';

type Role = 'admin' | 'project_manager' | 'analyst' | 'viewer';

const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 4,
  project_manager: 3,
  analyst: 2,
  viewer: 1,
};

export function requireRole(...roles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.userRole as Role;
    if (!userRole || !roles.some(r => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[r])) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
