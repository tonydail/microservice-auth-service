import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../../src/services/auth.service.js';
import { AppError } from '../../../src/middleware/errorHandler.js';

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  createWithRefreshToken: vi.fn(),
  createRefreshToken: vi.fn(),
  findRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  publishUserRegistered: vi.fn(),
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
vi.mock('../../../src/events/outbox/outbox.writer.js', () => ({
  writeOutboxEvent: vi.fn(),
}));
vi.mock('../../../src/events/kafka.producer.js', () => ({
  publishUserRegistered: mocks.publishUserRegistered,
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
      expect(mocks.publishUserRegistered).toHaveBeenCalledWith('user-1');
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
