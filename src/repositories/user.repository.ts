import { PrismaClient, User, RefreshToken } from '@prisma/client';

const prisma = new PrismaClient();

export class UserRepository {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async createWithRefreshToken(
    data: { id: string; email: string; passwordHash: string },
    expiresAt: Date,
  ): Promise<{ user: User; refreshToken: RefreshToken }> {
    const { v4: uuidv4 } = await import('uuid');
    const token = uuidv4();

    const [user, refreshToken] = await prisma.$transaction([
      prisma.user.create({ data }),
      prisma.refreshToken.create({ data: { token, userId: data.id, expiresAt } }),
    ]);
    return { user, refreshToken };
  }

  createRefreshToken(userId: string, expiresAt: Date): Promise<RefreshToken> {
    const { v4: uuidv4 } = require('uuid') as typeof import('uuid');
    return prisma.refreshToken.create({
      data: { token: uuidv4(), userId, expiresAt },
    });
  }

  findRefreshToken(token: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { token } });
  }

  revokeRefreshToken(token: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({ where: { token }, data: { revoked: true } });
  }
}
