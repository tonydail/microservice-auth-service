import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index';
import { AppError } from '../middleware/errorHandler';
import { UserRepository } from '../repositories/user.repository';
import type { RegisterDto, LoginDto, TokenPair } from '../types/auth.types';

export class AuthService {
  private readonly userRepo = new UserRepository();

  /**
   * Registers a new user with transactional outbox pattern.
   * User creation, refresh token, and outbox event are written atomically.
   * Debezium will publish the event from the outbox table to Kafka.
   */
  async register(dto: RegisterDto): Promise<TokenPair> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) throw new AppError(409, 'Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const userId = uuidv4();
    const eventId = uuidv4();

    // Create user, refresh token, and outbox event in a single transaction
    const { user, refreshToken } = await this.userRepo.createWithRefreshToken(
      { id: userId, email: dto.email, passwordHash },
      this.buildRefreshExpiry(),
      {
        aggregateId: userId,
        eventType: 'user.registered',
        payload: { eventId, userId, email: dto.email },
      },
    );

    return {
      accessToken: this.signAccessToken(user.id),
      refreshToken: refreshToken.token,
    };
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) throw new AppError(401, 'Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Invalid credentials');

    const refreshToken = await this.userRepo.createRefreshToken(user.id, this.buildRefreshExpiry());
    return {
      accessToken: this.signAccessToken(user.id),
      refreshToken: refreshToken.token,
    };
  }

  async refresh(token: string): Promise<TokenPair> {
    const existing = await this.userRepo.findRefreshToken(token);
    if (!existing || existing.revoked || existing.expiresAt < new Date()) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }
    await this.userRepo.revokeRefreshToken(token);
    const newRefresh = await this.userRepo.createRefreshToken(
      existing.userId,
      this.buildRefreshExpiry(),
    );
    return {
      accessToken: this.signAccessToken(existing.userId),
      refreshToken: newRefresh.token,
    };
  }

  async logout(token: string): Promise<void> {
    await this.userRepo.revokeRefreshToken(token);
  }

  private signAccessToken(userId: string): string {
    return jwt.sign({ sub: userId }, config.JWT_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  private buildRefreshExpiry(): Date {
    const days = parseInt(config.JWT_REFRESH_EXPIRES_IN.replace('d', ''), 10);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    return expiry;
  }
}
