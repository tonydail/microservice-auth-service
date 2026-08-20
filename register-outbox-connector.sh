#!/bin/sh
# Register this service's outbox connector with Kafka Connect
# Run after the service starts to ensure event publishing works

KAFKA_CONNECT_URL="${KAFKA_CONNECT_URL:-http://kafka-connect:8083}"
MAX_RETRIES=30
RETRY_DELAY=2

echo "Waiting for Kafka Connect to be ready at $KAFKA_CONNECT_URL..."

# Wait for Kafka Connect
retries=0
until curl -s "$KAFKA_CONNECT_URL" > /dev/null 2>&1; do
  retries=$((retries + 1))
  if [ $retries -ge $MAX_RETRIES ]; then
    echo "ERROR: Kafka Connect not available after $MAX_RETRIES attempts"
    exit 1
  fi
  sleep $RETRY_DELAY
done

echo "Kafka Connect is ready. Registering auth-service outbox connector..."

# Register the connector
response=$(curl -s -X POST "$KAFKA_CONNECT_URL/connectors" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "microservice-auth-outbox-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "'"${DB_HOST}"'",
    "database.port": "'"${POSTGRES_PORT}"'",
    "database.user": "'"${POSTGRES_USER}"'",
    "database.password": "'"${POSTGRES_PASSWORD}"'",
    "database.dbname": "'"${POSTGRES_DB}"'",
    "topic.prefix": "auth",
    "table.include.list": "public.outbox_events",
    "plugin.name": "pgoutput",
    "publication.autocreate.mode": "filtered",
    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.table.field.event.id": "id",
    "transforms.outbox.table.field.event.key": "aggregate_id",
    "transforms.outbox.table.field.event.type": "event_type",
    "transforms.outbox.table.field.event.payload": "payload",
    "transforms.outbox.table.field.event.timestamp": "created_at",
    "transforms.outbox.route.by.field": "event_type",
    "transforms.outbox.route.topic.replacement": "${routedByValue}",
    "key.converter": "org.apache.kafka.connect.storage.StringConverter",
    "value.converter": "org.apache.kafka.connect.storage.StringConverter"
  }
}')

# Check response
if echo "$response" | grep -q '"name"'; then
  echo "✓ Auth outbox connector registered successfully"
  exit 0
elif echo "$response" | grep -q "already exists"; then
  echo "✓ Auth outbox connector already exists"
  # Restart it to ensure it's working with current database
  curl -s -X POST "$KAFKA_CONNECT_URL/connectors/microservice-auth-outbox-connector/restart" > /dev/null 2>&1
  echo "✓ Connector restarted"
  exit 0
else
  echo "✗ Failed to register connector:"
  echo "$response"
  exit 1
fi
