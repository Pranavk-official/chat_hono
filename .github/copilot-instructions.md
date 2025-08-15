## Quick reception

You will be helping implement and maintain a Hono-based TypeScript backend (Bun runtime) with Prisma (Postgres), Redis, and Resend email integration. Below is a compact, actionable orientation to be immediately productive in this repo.

## Checklist (what this file covers)

- Big-picture architecture and major folders
- Critical dev workflows and commands (dev/build/db)
- Project-specific conventions (paths, responder shape, middleware patterns)
- Integration points and important env vars
- Concrete examples to copy/paste from the codebase

## Big picture (why / how)

- Server: Hono app at `src/index.ts`. Auth routes are mounted at `/api/` (`src/module/auth/routes/auth.route.ts`). Middleware (auth, pagination) lives under `src/middleware` and is applied globally after mounting `/api/`.
- Data: Prisma with a single logical `user` schema (`prisma/schema.prisma`). Prisma client is exported from `src/shared/primsa.ts` (note: file name is `primsa.ts` and is used throughout the codebase).
- Caching & rate-limiting: Redis is used for OTP rate limiting and caching (`src/shared/redis.ts`, `src/middleware/auth.ts`). OTP constants are in `src/shared/constants.ts`.
- Auth: JWTs use RS256 and keys are read from filesystem paths (env: `PRIVATE_KEY_PATH`, `PUBLIC_KEY_PATH`) via `src/utils/jwt.ts`. Sessions are persisted in the DB (`src/module/auth/services/session.service.ts`).
- Emails: Resend SDK is wrapped at `src/shared/resend.ts`. Email utilities in `src/utils/otp.ts`, `src/utils/welcome.ts`, and `src/utils/email.ts` send OTP/welcome messages.

## Developer workflows (commands you will run)

- Install: `bun install` (repo uses Bun). See `README.md`.
- Dev: `bun run dev` (script runs `bunx prisma generate && bun run --hot src/index.ts`). This regenerates Prisma client and starts the hot server.
- Build: `bunx prisma generate && bun build src/index.ts --outdir=dist --target=bun` (see `package.json` scripts).
- Prisma: `bunx prisma generate`, `bunx prisma studio`, `bunx prisma db push`, and migrations live in `prisma/migrations`.
- Docker (local DB + redis): `docker compose -f docker-compose.yml up` — DB exposed on host port 5433 and Redis on 6379.

## Project-specific conventions & important notes

- Path aliases are defined in `tsconfig.json`: `@config/*`, `@middleware/*`, `@module/*`, `@shared/*`, `@utils/*`. Use them in new files.
- Validation: Zod schemas live next to models (`src/module/*/models/*`) and `@hono/zod-validator` is used in routes (example: `auth.route.ts`). Prefer existing Zod schemas for request validation.
- Response shape: Use the `responder` helper in `src/shared/responder.ts` to produce the standard API shape ({ success, message, data, timestamp?, pagination? }). Copy this pattern rather than returning raw objects.
- Middleware: Hono middlewares use `createMiddleware` and set context vars (see `src/middleware/auth.ts` and `src/middleware/pagination.ts`). When reading/writing context variables, follow the existing `c.set('user', ...)` and `c.get('user')` patterns.
- Error handling: Centralized in `src/error.ts`—map thrown Error subclasses (e.g., `BadRequestError`, `UnauthorizedError`) to HTTP codes. Throw these custom errors instead of generic Error when appropriate.
- OTP flow: OTP generation, storage and verification use `src/module/auth/services/auth.service.ts` + `prisma.verification` table. Dev OTP is `DEFAULT_DEV_OTP` (value: `123456`) and is used when NODE_ENV=development.
- JWT: tokens use RS256 and strict issuer/audience checks (`issuer: 'decidr-backend'`, `audience: 'decidr-client'`). Ensure private/public keys exist at the configured paths before running auth flows.

## Integration points & env variables (must-check)

- DATABASE_URL — Prisma Postgres connection
- REDIS_URL — ioredis connection (defaults to `redis://localhost:6379`)
- RESEND_API_KEY — used in `src/shared/resend.ts`
- PRIVATE_KEY_PATH / PUBLIC_KEY_PATH — JWT key files read synchronously by `src/utils/jwt.ts`
- FROM_EMAIL — override the default email sender
- NODE_ENV — affects OTP behavior and logging

## Concrete examples (copy these patterns)

- Adding a validated route: use Zod schema + `zValidator('json', schema)` and `c.req.valid('json')` (see `src/module/auth/routes/auth.route.ts`).
- Producing API output: `return c.json(responder({ user, tokens }, { path: c.req.path, message: '...' }), 200)`
- Rate limiting: reuse `otpRateLimiter` middleware for endpoints that accept email and must be protected (see `src/middleware/auth.ts`). Note it reassigns `c.req.json` after consuming the body.

## When editing DB model or Prisma schema

- Update `prisma/schema.prisma` and add a migration under `prisma/migrations` or run `bunx prisma db push` for fast sync. Run `bunx prisma generate` after schema changes.
- Don't rename `src/shared/primsa.ts` without updating imports (the misspelling is used across the codebase).

## Helpful pointers for AI edits

- Keep changes small and idiomatic: follow Hono patterns, Zod validation, and the `responder` format.
- Prefer adding new utilities under `src/utils` and new routes under `src/module/<area>/routes`.
- Use existing context keys (`user`, `pagination`) and path aliases.
- For any change that affects runtime (new env var, DB schema change, keys), add an explicit note in the PR description about required local setup.

If any section is unclear or you'd like more examples (route, service, or migration examples), tell me which area to expand and I will iterate.
