import { Request, Response, NextFunction } from 'express';

const windowMs = 60 * 1000;
const max = 120;
const store = new Map<string, { count: number; reset: number }>();

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return next();
  }

  entry.count++;
  if (entry.count > max) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  next();
}
