import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../../src/services/auth.service.js';
import { AppError } from '../../../src/middleware/errorHandler.js';
import bcrypt from 'bcryptjs';

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  createWithRefreshToken: vi.fn(),
  createRefreshToken: vi.fn(),
  findRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  createUser: vi.fn(),
  createOutboxEvent: vi.fn(),
  getUserRoles: vi.fn(),
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
    getUserRoles = mocks.getUserRoles;
    createRefreshToken = mocks.createRefreshToken;
    findRefreshToken = mocks.findRefreshToken;
    revokeRefreshToken = mocks.revokeRefreshToken;
    createUser = mocks.createUser;
    createOutboxEvent = mocks.createOutboxEvent;
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

    it('returns user data on successful registration', async () => {
      mocks.findByEmail.mockResolvedValue(null);
      mocks.createUser.mockResolvedValue({ user: { id: 'user-1', email: 'new@test.com' } });
      const result = await authService.register({ email: 'new@test.com', password: 'password123' });
      expect(result).toHaveProperty('email', 'new@test.com');
    });
  });

  describe('login', () => {
    it('throws 404 when user not found', async () => {
      mocks.findByEmail.mockResolvedValue(null);
      await expect(
        authService.login({ email: 'missing@test.com', password: 'pass' }),
      ).rejects.toThrow(new AppError(404, 'User not found'));
    });

    it('throws 401 when password is invalid', async () => {
      mocks.findByEmail.mockResolvedValue({ id: '1', email: 'test@test.com', passwordHash: '$2a$12$KIXQ4G8Q8Q8Q8Q8Q8Q8Qe' });
      await expect(
        authService.login({ email: 'test@test.com', password: 'wrongpassword' }),
      ).rejects.toThrow(new AppError(401, 'invalid_grant'));
    });

    it('returns token pair on successful login', async () => {
      const password = 'password123';
      const passwordHash = await bcrypt.hash(password, 12);

      mocks.findByEmail.mockResolvedValue({ id: '1', email: 'test@test.com', passwordHash });
      mocks.getUserRoles.mockResolvedValue(['user']);
      mocks.createRefreshToken.mockResolvedValue({ token: 'refresh-token' });
      const result = await authService.login({ email: 'test@test.com', password: 'password123' });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result).toHaveProperty('tokenType', 'Bearer');
      expect(result).toHaveProperty('expiresIn');
    });
  });
});
