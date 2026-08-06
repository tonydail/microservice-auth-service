import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  publishUserRegistered,
  USER_REGISTERED_TOPIC,
} from '../../../src/events/kafka.producer.js';

const mocks = vi.hoisted(() => ({
  connect: vi.fn().mockResolvedValue(undefined),
  send: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('kafkajs', () => ({
  Kafka: class {
    producer() {
      return mocks;
    }
  },
}));
vi.mock('../../../src/config/index.js', () => ({
  config: { KAFKA_BROKERS: 'kafka-1:9092,kafka-2:9092' },
}));
vi.mock('../../../src/config/logger.js', () => ({
  logger: { info: vi.fn() },
}));

describe('Kafka producer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes the registered user ID to auth.user.registered', async () => {
    await publishUserRegistered('user-1');

    expect(mocks.connect).toHaveBeenCalledOnce();
    expect(mocks.send).toHaveBeenCalledWith({
      topic: USER_REGISTERED_TOPIC,
      messages: [
        {
          key: 'user-1',
          value: JSON.stringify({ userId: 'user-1' }),
        },
      ],
    });
  });
});
