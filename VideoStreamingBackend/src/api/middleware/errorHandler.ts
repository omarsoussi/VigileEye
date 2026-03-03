/**
 * Global error handler middleware.
 */
import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../../domain/errors';
import { logger } from '../../infrastructure/logging/logger';

const STATUS_MAP: Record<string, number> = {
  CAMERA_NOT_FOUND: 404,
  STREAM_NOT_FOUND: 404,
  STREAM_ALREADY_ACTIVE: 409,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  STREAM_CONNECTION_ERROR: 502,
};

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof DomainError) {
    const status = STATUS_MAP[err.code] ?? 400;
    res.status(status).json({
      detail: { message: err.message, error_code: err.code },
    });
    return;
  }

  logger.error('Unhandled error', err);
  res.status(500).json({
    detail: { message: 'Internal server error', error_code: 'INTERNAL_SERVER_ERROR' },
  });
}
