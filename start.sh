#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "================================================"
echo "  Starting microservice-auth-service"
echo "================================================"

cd "$SCRIPT_DIR"

# Detect compose command
if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE="docker-compose"
else
  echo "Error: neither 'docker compose' nor 'docker-compose' found."
  exit 1
fi

$COMPOSE --project-name microservice-auth-service_devcontainer -f .devcontainer/docker-compose.yml up -d

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Auth service started!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
$COMPOSE --project-name microservice-auth-service_devcontainer -f .devcontainer/docker-compose.yml ps

docker logs -f microservice-auth-service-app

