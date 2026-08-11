import { PrismaClient, User, RefreshToken, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface OutboxEventData {
  aggregateId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
}

export class UserRepository {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  /**
   * Creates a user with refresh token and optional outbox event in a single transaction.
   * Implements the Transactional Outbox pattern: all operations succeed or fail together.
   */
  async createWithRefreshToken(
    data: { id: string; email: string; passwordHash: string },
    expiresAt: Date,
    outboxEvent?: OutboxEventData,
  ): Promise<{ user: User; refreshToken: RefreshToken }> {
    const { v4: uuidv4 } = await import('uuid');
    const token = uuidv4();

    if (outboxEvent) {
      // Include outbox event in the transaction
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data });
        const refreshToken = await tx.refreshToken.create({
          data: { token, userId: data.id, expiresAt },
        });
        await tx.outboxEvent.create({
          data: {
            aggregateId: outboxEvent.aggregateId,
            eventType: outboxEvent.eventType,
            payload: outboxEvent.payload,
          },
        });
        return { user, refreshToken };
      });
      return result;
    } else {
      // No outbox event, just create user and refresh token
      const [user, refreshToken] = await prisma.$transaction([
        prisma.user.create({ data }),
        prisma.refreshToken.create({ data: { token, userId: data.id, expiresAt } }),
      ]);
      return { user, refreshToken };
    }
  }

  async createRefreshToken(userId: string, expiresAt: Date): Promise<RefreshToken> {
    const { v4: uuidv4 } = await import('uuid');
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
