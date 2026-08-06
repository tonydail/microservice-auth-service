/**
 * Integration test — requires a running Postgres instance.
 * Run with: npm run test:integration
 * Ensure DATABASE_URL points to a test database before running.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../../src/services/auth.service.js';

const prisma = new PrismaClient();
const authService = new AuthService();

beforeAll(async () => {
  await prisma.$connect();
  // Clean up test data
  await prisma.outboxEvent.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('AuthService integration', () => {
  it('registers a user and returns token pair', async () => {
    const result = await authService.register({
      email: 'integration@test.com',
      password: 'securepassword',
    });
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it('creates an outbox event on registration', async () => {
    const events = await prisma.outboxEvent.findMany({
      where: { eventType: 'user.registered' },
    });
    expect(events.length).toBeGreaterThan(0);
  });
});
