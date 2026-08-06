import { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '../../config/logger';

const prisma = new PrismaClient();

interface OutboxEventData {
  aggregateId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
}

/**
 * Write an outbox event row.
 * MUST be called inside a prisma.$transaction — never standalone.
 */
export async function writeOutboxEvent(data: OutboxEventData): Promise<void> {
  await prisma.outboxEvent.create({
    data: {
      aggregateId: data.aggregateId,
      eventType: data.eventType,
      payload: data.payload,
    },
  });
  logger.info({ eventType: data.eventType, aggregateId: data.aggregateId }, 'Outbox event written');
}
