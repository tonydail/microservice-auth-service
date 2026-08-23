import { PrismaClient, User, RefreshToken, Prisma, Role } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

interface OutboxEventData {
  aggregateId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
}

// User with roles included
export type UserWithRoles = User & {
  userRoles: Array<{
    role: Role;
  }>;
};

export class UserRepository {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  findByEmailWithRoles(email: string): Promise<UserWithRoles | null> {
    return prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * Creates a user add assigns the default role in a single transaction.
   */
  async createUser(data: {
    id: string;
    email: string;
    passwordHash: string;
  }): Promise<{ user: User }> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data });

        // Assign default role
        const defaultRole = await tx.role.findUnique({ where: { name: 'user' } });
        if (defaultRole) {
          await tx.userRole.create({
            data: {
              userId: user.id,
              roleId: defaultRole.id,
            },
          });
        }
        const eventId = uuidv4();
        await tx.outboxEvent.create({
          data: {
            aggregateId: user.id,
            eventType: 'user.registered',
            payload: { eventId, userId: user.id, email: user.email },
          },
        });

        return { user };
      });

      return result;
    } catch (error) {
      throw new AppError(500, 'Failed to create user', { cause: error });
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

  async findRefreshTokenWithUser(
    token: string,
  ): Promise<(RefreshToken & { user: UserWithRoles }) | null> {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });
  }

  revokeRefreshToken(token: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({ where: { token }, data: { revoked: true } });
  }

  async assignRole(userId: string, roleName: string): Promise<void> {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new Error(`Role "${roleName}" not found`);

    await prisma.userRole.create({
      data: {
        userId,
        roleId: role.id,
      },
    });
  }

  async removeRole(userId: string, roleName: string): Promise<void> {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new Error(`Role "${roleName}" not found`);

    await prisma.userRole.deleteMany({
      where: {
        userId,
        roleId: role.id,
      },
    });
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return userRoles.map((ur) => ur.role.name);
  }

  async createOutboxEvent(event: OutboxEventData): Promise<void> {
    await prisma.outboxEvent.create({
      data: {
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
      },
    });
  }
}
