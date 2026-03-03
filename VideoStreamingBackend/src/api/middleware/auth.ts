/**
 * Express middleware: JWT authentication.
 * Extracts Bearer token and validates via IAuthService.
 */
import { Request, Response, NextFunction } from 'express';
import { IAuthService, AuthPayload } from '../../domain/services';

// Augment Express Request to carry authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      token?: string;
    }
  }
}

export function authMiddleware(authService: IAuthService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ detail: { message: 'Missing or invalid authorization header', error_code: 'UNAUTHORIZED' } });
      return;
    }

    const token = header.slice(7);
    try {
      const payload = authService.validateToken(token);
      req.user = payload;
      req.token = token;
      next();
    } catch {
      res.status(401).json({ detail: { message: 'Invalid or expired token', error_code: 'UNAUTHORIZED' } });
    }
  };
}
