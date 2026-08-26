# Authentication Service

> **Part of the microservices-ops authentication and user management system**

This service provides authentication and authorization functionality for the microservices platform. It's designed to be **forked and customized** for your specific authentication needs while maintaining production-ready patterns and best practices.

## 🎯 Purpose

The Authentication Service handles:
- **User Registration**: Create new user accounts with secure password hashing
- **Login**: Authenticate users and issue JWT tokens
- **Token Management**: Issue access tokens (15min) and refresh tokens (7 days)
- **Token Validation**: gRPC and REST endpoints for token validation
- **Token Refresh**: Exchange refresh tokens for new access tokens
- **Logout/Revocation**: Invalidate refresh tokens
- **Role-Based Authorization**: JWT tokens include user roles for fine-grained access control

## 🏗️ Architecture Overview

### Communication
- **REST API** (port 3001): External client authentication endpoints
- **gRPC Server** (port 50051): Internal `ValidateToken` RPC for service-to-service auth
- **Kafka Events**: Publishes `auth.user.registered` events via transactional outbox

### Event-Driven Integration
When a user registers, the service:
1. Creates user in PostgreSQL within a transaction
2. Writes `auth.user.registered` event to `outbox_events` table in same transaction
3. Debezium CDC publishes event to Kafka topic `auth.user.registered`
4. Users service consumes event and creates corresponding user profile

### Layered Architecture
Strict separation of concerns with **no layer skipping**:
```
routes/          → Express Router wiring (no logic)
controllers/     → Request parsing, Zod validation, error handling
services/        → Business logic, orchestration, transaction management
repositories/    → All Prisma queries (zero business logic)
events/
  producers/     → Kafka producer wrappers
  consumers/     → Kafka consumer handlers (idempotent)
  outbox/        → outbox.writer.ts (ONLY in prisma.$transaction)
grpc/
  server.ts      → ValidateToken RPC implementation
  proto/         → Protocol Buffer definitions
```

## 🛠️ Tech Stack

### Core
- **Node.js** + **TypeScript**: Runtime and type safety
- **Express**: REST API framework
- **Prisma ORM**: Type-safe database access
- **PostgreSQL** (port 5433): Primary data store

### Authentication
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT token generation and validation

### Communication
- **@grpc/grpc-js**: gRPC server for inter-service calls
- **KafkaJS**: Event publishing (via transactional outbox)

### Development & Quality
- **Vitest**: Unit and integration testing
- **ESLint + Prettier**: Code quality and formatting
- **Zod**: Schema validation
- **Pino**: Structured logging
- **ts-node-dev**: Development hot reload

### Infrastructure
- **Docker + Dev Containers**: Isolated development environment
- **Debezium**: CDC for transactional outbox pattern

## 🔑 Key Patterns

### Transactional Outbox
The service **never** publishes to Kafka directly. All events are written within database transactions:

```typescript
await prisma.$transaction([
  prisma.user.create({ data: userPayload }),
  prisma.outboxEvent.create({
    data: {
      aggregateId: userId,
      eventType: 'user.registered',
      payload: { userId, email, createdAt }
    }
  })
]);
```

Debezium watches the PostgreSQL WAL and publishes events to Kafka, ensuring exactly-once semantics.

### JWT Token Strategy
- **Access Token**: Short-lived (15 minutes), contains user ID and roles array
- **Refresh Token**: Long-lived (7 days), stored in database for revocation support
- **Validation**: 
  - REST endpoint (`GET /validate`) for nginx gateway integration
  - gRPC endpoint (`ValidateToken`) for direct service-to-service calls
  - Returns user ID and roles in response headers

### Configuration
Only `src/config/index.ts` reads `process.env` (Zod-validated at startup). Configuration is type-safe throughout the application.

### Error Handling
All errors flow through `AppError` class and centralized `errorHandler` middleware. No stack traces in production.

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (if running outside container)
- VS Code (recommended for Dev Container support)

### Development Setup (Dev Container)

1. **Ensure shared infrastructure is running**:
   ```bash
   # From microservices-ops root
   cd microservice-core-services
   ./start.sh
   ```

2. **Open in VS Code**:
   ```bash
   # From microservices-ops root
   code microservice-auth-service
   ```

3. **Reopen in Container**:
   - Press `Cmd/Ctrl+Shift+P`
   - Select "Dev Containers: Reopen in Container"
   - Wait for container to build and start

4. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

The service will be available at:
- REST API: http://localhost:3001
- gRPC: localhost:50051
- Postgres: localhost:5433

### Manual Setup (Without Dev Container)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

## 📝 Available Commands

```bash
# Development
npm run dev                    # Start with hot reload (ts-node-dev)
npm run build                  # Compile TypeScript to dist/
npm run start                  # Run compiled JavaScript (production)

# Testing
npm run test                   # Run all tests (Vitest)
npm run test:unit             # Run unit tests only
npm run test:integration      # Run integration tests only
npm run test:watch            # Run tests in watch mode

# Code Quality
npm run lint                   # Lint with ESLint
npm run lint:fix              # Fix linting issues
npm run format                 # Format with Prettier

# Database
npm run db:migrate            # Run migrations (development)
npm run db:migrate:prod       # Run migrations (production)
npm run db:seed               # Seed database
npm run db:studio             # Open Prisma Studio
npm run db:generate           # Generate Prisma Client
```

## 📁 Project Structure

```
microservice-auth-service/
├── src/
│   ├── routes/              # Express route definitions
│   ├── controllers/         # Request handlers with validation
│   ├── services/           # Business logic layer
│   ├── repositories/       # Database access layer (Prisma)
│   ├── events/
│   │   ├── producers/      # Kafka producer wrappers
│   │   ├── consumers/      # Kafka consumer handlers
│   │   └── outbox/         # Transactional outbox writer
│   ├── grpc/
│   │   ├── server.ts       # gRPC server implementation
│   │   ├── client.ts       # gRPC client stubs (if needed)
│   │   └── proto/          # Protocol Buffer definitions
│   ├── middleware/         # Express middleware (auth, errors)
│   ├── config/            # Configuration (Zod-validated env)
│   ├── types/             # Zod schemas + TypeScript types
│   └── index.ts           # Application entry point
├── prisma/
│   ├── schema.prisma       # Database schema + OutboxEvent model
│   ├── migrations/         # Database migrations
│   └── seed.ts            # Database seeding script
├── tests/
│   ├── unit/              # Unit tests (mocked repositories)
│   └── integration/       # Integration tests (real database)
├── .devcontainer/         # Dev Container configuration
├── register-outbox-connector.sh  # Debezium connector registration
└── package.json
```

## 🔌 API Endpoints

### REST API (Port 3001)

```bash
POST /auth/register          # Register new user
POST /auth/login            # Login and get tokens
POST /auth/refresh          # Refresh access token
POST /auth/logout           # Logout (revoke refresh token)
GET  /validate              # Validate token (used by nginx gateway)
```

### gRPC API (Port 50051)

```protobuf
service AuthService {
  rpc ValidateToken (ValidateTokenRequest) returns (ValidateTokenResponse);
}
```

Called by other services to validate JWT tokens without REST overhead.

**Response includes**:
- `userId`: User's unique identifier
- `roles`: Array of role names assigned to the user
- `valid`: Boolean indicating token validity

## 🔄 Events Published

| Event Type | Topic | Payload | Trigger |
|------------|-------|---------|---------|
| `user.registered` | `auth.user.registered` | `{ userId, email, createdAt }` | User registration |

## 🧪 Testing

### Unit Tests
Mock all repositories using `vi.mock()`. No real database required.

```bash
npm run test:unit
```

### Integration Tests
Require PostgreSQL. Tests run against a real database.

```bash
npm run test:integration
```

### Test Coverage
Generate coverage reports:

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory with HTML and JSON formats.

### CI/CD
Automated testing runs on:
- Pull requests to `develop` or `main`
- Pushes to `develop` or `main`

GitHub Actions workflow includes:
- PostgreSQL service container
- All tests (unit + integration)
- Coverage reporting

**Local workflow testing** with `act`:
```bash
./run-tests-with-act.sh
```

### Test Structure
- `tests/unit/`: Isolated business logic tests
- `tests/integration/`: End-to-end API tests with real database

## 🔗 Related Repositories

Part of the microservices-ops ecosystem:
- [microservices-ops](https://github.com/tonydail/microservices-ops) - Central orchestrator
- [microservice-users-service](https://github.com/tonydail/microservice-users-service) - User profile management
- [microservice-core-services](https://github.com/tonydail/microservice-core-services) - Shared infrastructure

## 🐛 Issue Tracking

**Issues are tracked centrally** in the [microservices-ops repository](https://github.com/tonydail/microservices-ops/issues). This repository has issues disabled.

## 🤝 Contributing

1. Fork this repository
2. Create a feature branch
3. Follow the layered architecture patterns
4. Write unit and integration tests
5. Ensure all tests pass: `npm test`
6. Run linting: `npm run lint:fix`
7. Submit a pull request
8. Track the PR in the central microservices-ops issue tracker

## 📄 License

[Your License Here]
