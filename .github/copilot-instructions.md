# Chat Hono - AI Coding Instructions

## Architecture Overview

This is a **Hono + Bun + Prisma + PostgreSQL** chat application backend with real-time capabilities via Socket.IO and OTP-based authentication. The architecture follows a modular pattern with clear separation of concerns.

### Core Stack

- **Runtime**: Bun (not Node.js) - use `bun run` commands, not `npm`
- **Framework**: Hono (lightweight Express alternative)
- **Real-time**: Socket.IO for WebSocket communication
- **Database**: PostgreSQL via Prisma ORM with multi-schema setup
- **Cache**: Redis for rate limiting and session management
- **Auth**: Custom JWT + OTP system (no third-party auth library)

## Critical Development Workflows

### Database Management

```bash
# Generate Prisma client after schema changes
bun run dev                # Auto-generates client + starts hot reload
bunx prisma db push        # Apply schema changes without migrations
bunx prisma studio         # Visual database browser
```

### Testing

The test scripts in `/scripts/` are the best way to understand API workflows.

```bash
bun run test:auth          # Comprehensive auth flow testing
bun run test:groups        # Groups CRUD with auth setup
bun run test:all           # Run all test suites
```

### Docker Services

- PostgreSQL on port **5433** (not 5432)
- Redis on port **6380** (not 6379)
- Use `docker compose up` to start dependencies

## Project Structure Patterns

### Module Organization (`src/module/*/`)

Each feature module follows this pattern:

```
group/
├── models/        # Zod schemas for API validation
├── routes/        # Hono route handlers (REST API)
├── services/      # Business logic (database operations)
└── utils/         # Module-specific utilities (e.g., socket.handlers.ts)
```

### Path Aliases (tsconfig.json)

```typescript
import responder from "@shared/responder"; // Standard API responses
import { authMiddleware } from "@middleware/auth";
import prisma from "@shared/primsa"; // Note: typo in actual file
import { BadRequestError } from "@shared/error";
```

## Authentication & Authorization

### OTP-Based Flow

1.  Generate OTP with scope (`SIGNUP` or `LOGIN`) via `POST /api/auth/generate-otp`.
2.  Verify OTP to get access/refresh tokens via `POST /api/auth/signup` or `POST /api/auth/login`.
3.  Use Bearer tokens for protected REST routes.
4.  For Socket.IO, the token is sent in the `auth.token` payload during connection.

### Middleware Pattern

- **REST API**: Global auth middleware `authMiddleware` is applied after the public `/api/auth` routes. See `src/server.ts`.
- **Socket.IO**: Socket authentication is handled by `socketAuthMiddleware` in `src/middleware/socket.auth.ts`, which runs on every new connection.

## Real-time & Socket.IO

- **Server Setup**: The core Socket.IO server is initialized in `src/shared/socket.ts`.
- **Authentication**: New socket connections are authenticated using the JWT token via `socketAuthMiddleware`.
- **Event Handlers**: Business logic for socket events is organized by feature in module `utils` directories. For example, group-related events are in `src/module/group/utils/socket.handlers.ts`.
- **Room Management**: The application uses Socket.IO rooms for group chats.

## Error Handling Conventions

### Custom Error Classes

Always throw typed errors from `@shared/error`, never generic `Error`. The global error handler in `src/server.ts` will format the response.

```typescript
import { NotFoundError } from "@shared/error";
throw new NotFoundError("User not found");
```

### Response Format

All successful REST responses use the `responder` utility for a consistent structure.

```typescript
import responder from "@shared/responder";
return c.json(responder(data, { message: "Group created" }));
```

## Development Environment

### Environment Variables

- Uses a development OTP (`123456`) when `NODE_ENV=development`.
- Requires Redis and PostgreSQL connections.
- Cloudinary for image uploads is optional.

### Hot Reload

`bun run dev` includes Prisma generation + hot reload. Always use this for development.

### Frontend Demo Client

Use `whatsapp-demo.html` in the root directory to manually test the full application flow, including authentication, group management, and real-time chat, in a browser.

## Common Patterns to Follow

1.  **Validation**: Always use Zod schemas from `/models/` files for all API inputs.
2.  **Services**: Keep route handlers thin. All business logic and database interaction goes in `/services/`.
3.  **Error Responses**: Use typed error classes.
4.  **Success Responses**: Use the `responder()` utility for all successful REST responses.
5.  **Authentication**: Access the authenticated user in Hono contexts via `c.get("user")` and in socket instances via `socket.user`.
