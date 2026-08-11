import { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '../../config/logger';

const prisma = new PrismaClient();

export interface OutboxEventData {
  aggregateId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
}

/**
 * TRANSACTIONAL OUTBOX PATTERN
 *
 * This module provides utilities for the transactional outbox pattern.
 * The outbox pattern ensures that domain events are reliably published by:
 * 1. Writing events to the outbox_events table in the SAME transaction as domain changes
 * 2. Using Debezium to read the outbox table via PostgreSQL WAL (pgoutput)
 * 3. Publishing events to Kafka asynchronously and reliably
 *
 * IMPORTANT: Never call writeOutboxEvent standalone. Always include outbox writes
 * in your Prisma transaction using prisma.$transaction() to ensure atomicity.
 *
 * For user registration, use UserRepository.createWithRefreshToken() which handles
 * the transaction internally.
 */

/**
 * Write an outbox event row.
 * MUST be called inside a prisma.$transaction — never standalone.
 *
 * @deprecated Prefer passing outbox data to repository methods that handle transactions.
 * Only use this directly when you're already managing a custom transaction.
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

/**
 * Helper to format outbox event data.
 * Use this to prepare event data before passing to repository methods.
 */
export function formatOutboxEvent(
  aggregateId: string,
  eventType: string,
  payload: Prisma.InputJsonValue,
): OutboxEventData {
  return { aggregateId, eventType, payload };
}
