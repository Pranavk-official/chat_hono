# Chat Hono - AI Coding Instructions

## Architecture Overview

This is a **Hono + Bun + Prisma + PostgreSQL** chat application backend with OTP-based authentication. The architecture follows a modular pattern with clear separation of concerns.

### Core Stack

- **Runtime**: Bun (not Node.js) - use `bun run` commands, not `npm`
- **Framework**: Hono (lightweight Express alternative)
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
auth/
├── models/        # Zod schemas for validation
├── routes/        # Hono route handlers
├── services/      # Business logic (database operations)
└── utils/         # Module-specific utilities
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

1. Generate OTP with scope (`SIGNUP` or `LOGIN`)
2. Verify OTP to get access/refresh tokens
3. Use Bearer tokens for protected routes

### Middleware Pattern

```typescript
// Global auth middleware applied after /api/ routes
app.route("/api/", auth_routes); // Unprotected auth endpoints
app.use(authMiddleware); // Protects all routes below
app.route("/api/users", user_routes);
app.route("/api/groups", group_routes);
```

### Rate Limiting

Uses Redis for sophisticated rate limiting:

- Per-user OTP limits (5/minute, 10min block)
- Per-IP limits (15/minute, 1hr block)
- Check `@shared/constants.ts` for current limits

## Error Handling Conventions

### Custom Error Classes

Always throw typed errors, never generic `Error`:

```typescript
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@shared/error";

// Bad
throw new Error("User not found");

// Good
throw new NotFoundError("User not found");
```

### Response Format

All successful responses use the `responder` utility:

```typescript
import responder from "@shared/responder";

return c.json(
  responder(data, {
    message: "Group created",
    path: c.req.path,
  })
);
```

## Database Schema Notes

### Multi-Schema Setup

All models use `@@schema("user")` - this is intentional for the multi-tenant architecture.

### Key Relationships

- `User` → `Session` (1:many, cascade delete)
- `Group` → `GroupMember` (1:many with role-based access)
- `Message` → `Message` (self-referencing for replies)
- `Message` → `Attachment` (1:many, cascade delete)

### Enum Usage

```typescript
// Always use Prisma enums, not string literals
role: GroupMemberRole.ADMIN; // Not "ADMIN"
type: MessageType.IMAGE; // Not "IMAGE"
```

## Development Environment

### Environment Variables

- Uses development OTP (`123456`) when `NODE_ENV=development`
- Requires Redis and PostgreSQL connections
- Cloudinary for image uploads (optional)

### Hot Reload

`bun run dev` includes Prisma generation + hot reload. Always use this for development, not `bun run src/index.ts`.

## Testing Philosophy

Tests are **integration tests** that verify complete workflows:

- Auth tests: OTP generation → signup → login → token refresh → logout
- Group tests: Auth setup → CRUD operations → cleanup
- Use the test scripts in `/scripts/` as API documentation examples

## Common Patterns to Follow

1. **Validation**: Always use Zod schemas from `/models/` files
2. **Services**: Keep route handlers thin, business logic in `/services/`
3. **Error responses**: Use typed error classes + global error handler
4. **Success responses**: Always use `responder()` utility for consistency
5. **Authentication**: Check `c.get("user")` for authenticated user context
