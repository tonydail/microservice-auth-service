import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../../src/services/auth.service.js';
import { AppError } from '../../../src/middleware/errorHandler.js';

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  createWithRefreshToken: vi.fn(),
  createRefreshToken: vi.fn(),
  findRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
}));

vi.mock('../../../src/config/index.js', () => ({
  config: {
    JWT_SECRET: 'test-secret-key-at-least-16-chars',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
    KAFKA_BROKERS: 'localhost:29092',
  },
}));

vi.mock('../../../src/repositories/user.repository.js', () => ({
  UserRepository: class {
    findByEmail = mocks.findByEmail;
    createWithRefreshToken = mocks.createWithRefreshToken;
    createRefreshToken = mocks.createRefreshToken;
    findRefreshToken = mocks.findRefreshToken;
    revokeRefreshToken = mocks.revokeRefreshToken;
  },
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.resetAllMocks();
    authService = new AuthService();
  });

  describe('register', () => {
    it('throws 409 when email already exists', async () => {
      mocks.findByEmail.mockResolvedValue({ id: '1', email: 'test@test.com' });
      await expect(
        authService.register({ email: 'test@test.com', password: 'password123' }),
      ).rejects.toThrow(new AppError(409, 'Email already in use'));
    });

    it('returns token pair on successful registration', async () => {
      mocks.findByEmail.mockResolvedValue(null);
      mocks.createWithRefreshToken.mockResolvedValue({
        user: { id: 'user-1', email: 'new@test.com' },
        refreshToken: { token: 'refresh-token-value' },
      });

      const result = await authService.register({ email: 'new@test.com', password: 'password123' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.refreshToken).toBe('refresh-token-value');
    });

    it('passes outbox event data to repository for transactional write', async () => {
      mocks.findByEmail.mockResolvedValue(null);
      mocks.createWithRefreshToken.mockResolvedValue({
        user: { id: 'user-123', email: 'new@test.com' },
        refreshToken: { token: 'refresh-token-value' },
      });

      await authService.register({ email: 'new@test.com', password: 'password123' });

      // Verify createWithRefreshToken was called with outbox event data
      expect(mocks.createWithRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@test.com',
          passwordHash: expect.any(String),
        }),
        expect.any(Date), // expiresAt
        expect.objectContaining({
          eventType: 'user.registered',
          aggregateId: expect.any(String),
          payload: expect.objectContaining({
            userId: expect.any(String),
            email: 'new@test.com',
          }),
        }),
      );
    });
  });

  describe('login', () => {
    it('throws 401 when user not found', async () => {
      mocks.findByEmail.mockResolvedValue(null);
      await expect(
        authService.login({ email: 'missing@test.com', password: 'pass' }),
      ).rejects.toThrow(new AppError(401, 'Invalid credentials'));
    });
  });
});
