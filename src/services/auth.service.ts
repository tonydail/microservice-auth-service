import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index';
import { AppError } from '../middleware/errorHandler';
import { UserRepository } from '../repositories/user.repository';
import type {
  RegisterDto,
  LoginDto,
  TokenPair,
  AuthServiceRegisterResponse,
} from '../types/auth.types';

export class AuthService {
  private readonly userRepo = new UserRepository();

  /**
   * Registers a new user with transactional outbox pattern.
   * User creation, refresh token, and outbox event are written atomically.
   * Debezium will publish the event from the outbox table to Kafka.
   */
  async register(dto: RegisterDto): Promise<AuthServiceRegisterResponse> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) throw new AppError(409, 'Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const userId = uuidv4();

    const newUser = await this.userRepo.createUser({
      id: userId,
      email: dto.email,
      passwordHash,
    });

    return {
      email: newUser.user.email,
    } as AuthServiceRegisterResponse;
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) throw new AppError(404, 'User not found');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new AppError(401, 'invalid_grant');

    const roles = await this.userRepo.getUserRoles(user.id);
    const refreshToken = await this.userRepo.createRefreshToken(user.id, this.buildRefreshExpiry());

    const tokenPair: TokenPair = {
      accessToken: this.signAccessToken(user.id, user.email, roles),
      refreshToken: refreshToken.token,
      tokenType: 'Bearer',
      expiresIn: parseInt(config.JWT_ACCESS_EXPIRES_IN.replace('s', ''), 10),
    };
    return tokenPair;
  }

  async refresh(token: string): Promise<TokenPair> {
    const existing = await this.userRepo.findRefreshTokenWithUser(token);
    if (!existing || existing.revoked || existing.expiresAt < new Date()) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }
    await this.userRepo.revokeRefreshToken(token);

    // Extract roles from user
    const roles = existing.user.userRoles.map((ur) => ur.role.name);

    const newRefresh = await this.userRepo.createRefreshToken(
      existing.userId,
      this.buildRefreshExpiry(),
    );

    const tokenPair: TokenPair = {
      accessToken: this.signAccessToken(existing.userId, existing.user.email, roles),
      refreshToken: newRefresh.token,
      tokenType: 'Bearer',
      expiresIn: parseInt(config.JWT_ACCESS_EXPIRES_IN.replace('s', ''), 10),
    };
    return tokenPair;
  }

  validate(token: string): boolean {
    const existing = this.verifyAccessToken(token);
    if (!existing) {
      return false;
    }
    return true;
  }

  async logout(token: string): Promise<void> {
    await this.userRepo.revokeRefreshToken(token);
  }

  private signAccessToken(userId: string, email: string, roles: string[]): string {
    return jwt.sign(
      {
        sub: userId,
        email,
        roles,
      },
      config.JWT_SECRET,
      {
        expiresIn: config.JWT_ACCESS_EXPIRES_IN,
      } as jwt.SignOptions,
    );
  }

  private verifyAccessToken(token: string): { sub: string; email: string; roles: string[] } {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as {
        sub: string;
        email: string;
        roles: string[];
      };
      return decoded;
    } catch (err) {
      throw new AppError(401, 'Invalid access token', err as ErrorOptions);
    }
  }

  private buildRefreshExpiry(): Date {
    const days = parseInt(config.JWT_REFRESH_EXPIRES_IN.replace('d', ''), 10);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    return expiry;
  }
}
