import { Kafka } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config/index';
import { logger } from '../../config/logger';

export const USER_REGISTERED_TOPIC = 'auth.user.registered';

const kafka = new Kafka({
  clientId: 'auth-service',
  brokers: config.KAFKA_BROKERS.split(',').map((broker) => broker.trim()),
});
const producer = kafka.producer();

let connection: Promise<void> | undefined;

async function ensureConnected(): Promise<void> {
  if (!connection) {
    connection = producer.connect().catch((error: unknown) => {
      connection = undefined;
      throw error;
    });
  }

  await connection;
}

export async function publishUserRegistered(userId: string): Promise<void> {
  await ensureConnected();
  const eventId = uuidv4();
  await producer.send({
    topic: USER_REGISTERED_TOPIC,
    messages: [
      {
        key: userId,
        value: JSON.stringify({
          id: eventId,
          payload: { userId },
        }),
      },
    ],
  });

  logger.info(
    { topic: USER_REGISTERED_TOPIC, eventId, userId },
    `Event topic ${USER_REGISTERED_TOPIC} published`,
  );
}

export async function disconnectKafkaProducer(): Promise<void> {
  if (!connection) return;

  await connection;
  await producer.disconnect();
  connection = undefined;
}
