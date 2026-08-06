import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index';
import { AppError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function authGuard(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  // In production, JWT validation is done at the nginx gateway.
  // X-User-Id is injected by nginx after validation. Trust it here.
  const userId = req.headers['x-user-id'];
  if (typeof userId === 'string') {
    req.userId = userId;
    next();
    return;
  }

  // Fallback: validate Bearer token directly (useful for dev without gateway)
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Unauthorized'));
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}
