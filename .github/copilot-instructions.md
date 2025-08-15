# Copilot Instructions for chat_hono

## Project Overview

- **Framework:** [Hono](https://hono.dev/) (minimal, fast web framework for Bun/Node.js)
- **Language:** TypeScript
- **Runtime:** Bun
- **Database:** PostgreSQL (via Prisma ORM)
- **Authentication:** [better-auth](https://github.com/ajayyy/better-auth) with Prisma adapter

## Architecture & Structure

- **Modular by Feature:**
  - `src/module/{auth,chat,group}/` — Each feature is split into `models/`, `routes/`, `services/`, `utils/` for clear separation of concerns.
  - `src/shared/` — Shared resources (e.g., `primsa.ts` for Prisma client, `auth.ts` for shared auth logic).
  - `src/config/` — App-wide config (e.g., CORS in `cors.ts`).
  - `src/utils/` — General utilities.
- **Routing:**
  - Each module exposes its own router (see `src/module/auth/route.ts`).
  - Routers are composed in the main app entry (`src/index.ts`).
  - Middleware (e.g., CORS) is registered before routes.
- **TypeScript Path Aliases:**
  - Set in `tsconfig.json` (e.g., `@module/*`, `@shared/*`). Always use these for imports.

## Developer Workflows

- **Install dependencies:**
  ```fish
  bun install
  ```
- **Run dev server:**
  ```fish
  bun run dev
  # App runs at http://localhost:3000
  ```
- **Start database (Docker):**
  ```fish
  docker compose -f docker-compose.yml up
  ```
- **Prisma migrations:**
  ```fish
  bunx prisma migrate dev --name <desc>
  ```
- **Prisma Studio:**
  ```fish
  bunx prisma studio
  ```
- **Environment:**
  - All secrets/config in `.env` (see example in repo). `DATABASE_URL` is required.

## Conventions & Patterns

- **File Naming:**
  - Use `index.ts` for module entry points, `route.ts` for Hono routers.
- **Imports:**
  - Always use path aliases (e.g., `@module/auth/routes`).
- **Middleware:**
  - Register before routes (see `src/config/cors.ts`).
- **Prisma Client:**
  - Import from `@shared/primsa`.
- **Authentication:**
  - Configured in `src/shared/auth.ts` using better-auth and Prisma adapter. Social providers are commented but can be enabled.

## Integration Points

- **Prisma:**
  - Managed via `@prisma/client` and `prisma` CLI. Schema in `prisma/schema.prisma`.
- **better-auth:**
  - Handles session/user management. Config in `src/shared/auth.ts`.
- **Docker:**
  - Postgres runs via `docker-compose.yml`.

## Examples

- **Add a new route:**
  - Create in `src/module/{feature}/routes/` and register in the module's `index.ts`.
- **Use Prisma:**
  - `import prisma from '@shared/primsa'`
- **Add middleware:**
  - `app.use()` before routes in `src/index.ts` or module router.

---

For more on structure or patterns, see `README.md` and the `src/` directory. If unclear, ask for clarification or check module examples.
