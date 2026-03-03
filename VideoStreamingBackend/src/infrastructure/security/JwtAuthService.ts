/**
 * JWT validation service – validates tokens issued by the Auth service.
 */
import jwt from 'jsonwebtoken';
import { IAuthService, AuthPayload } from '../../domain/services';
import { UnauthorizedError } from '../../domain/errors';
import { config } from '../config';
import { logger } from '../logging/logger';

export class JwtAuthService implements IAuthService {
  validateToken(token: string): AuthPayload {
    try {
      const payload = jwt.verify(token, config.jwtSecret, {
        algorithms: [config.jwtAlgorithm as jwt.Algorithm],
      }) as Record<string, unknown>;

      if (payload.type !== 'access') {
        throw new UnauthorizedError('Invalid token type');
      }

      const sub = payload.sub as string;
      const email = payload.email as string;

      if (!sub || !email) {
        throw new UnauthorizedError('Incomplete token payload');
      }

      return { sub, email, type: 'access' };
    } catch (err: unknown) {
      if (err instanceof UnauthorizedError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`JWT validation failed: ${message}`);
      throw new UnauthorizedError(`Invalid token: ${message}`);
    }
  }
}
