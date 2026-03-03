/**
 * Unit tests for JwtAuthService.
 */
import jwt from 'jsonwebtoken';

// Mock config before importing the service
jest.mock('../../src/infrastructure/config', () => ({
  config: {
    jwtSecret: 'test-secret-key-for-unit-tests-32chars!',
    jwtAlgorithm: 'HS256',
  },
}));

jest.mock('../../src/infrastructure/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { JwtAuthService } from '../../src/infrastructure/security/JwtAuthService';

describe('JwtAuthService', () => {
  const authService = new JwtAuthService();
  const secret = 'test-secret-key-for-unit-tests-32chars!';

  it('should validate a correct access token', () => {
    const token = jwt.sign(
      { sub: 'user-123', email: 'test@example.com', type: 'access' },
      secret,
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    const payload = authService.validateToken(token);
    expect(payload.sub).toBe('user-123');
    expect(payload.email).toBe('test@example.com');
    expect(payload.type).toBe('access');
  });

  it('should reject a refresh token', () => {
    const token = jwt.sign(
      { sub: 'user-123', email: 'test@example.com', type: 'refresh' },
      secret,
      { algorithm: 'HS256' },
    );

    expect(() => authService.validateToken(token)).toThrow('Invalid token type');
  });

  it('should reject an invalid token', () => {
    expect(() => authService.validateToken('garbage')).toThrow();
  });

  it('should reject a token with wrong secret', () => {
    const token = jwt.sign(
      { sub: 'user-123', email: 'test@example.com', type: 'access' },
      'wrong-secret',
      { algorithm: 'HS256' },
    );

    expect(() => authService.validateToken(token)).toThrow();
  });

  it('should reject a token without sub', () => {
    const token = jwt.sign(
      { email: 'test@example.com', type: 'access' },
      secret,
      { algorithm: 'HS256' },
    );

    expect(() => authService.validateToken(token)).toThrow('Incomplete token payload');
  });
});
