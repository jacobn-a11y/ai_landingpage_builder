# @replica-pages/api

Express backend API for Replica Pages.

## Tech Stack

- **Express** - Web framework
- **TypeScript** - Type safety
- **Prisma** - ORM for PostgreSQL
- **cookie-parser** - Cookie parsing
- **express-session** - Session management
- **cors** - CORS middleware

## Setup

1. From the monorepo root, install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` in the project root (copy from `.env.example`):

   ```bash
   cp .env.example .env
   ```

   Required variables:

   - `DATABASE_URL` - PostgreSQL connection string
   - `SESSION_SECRET` - Secret for session signing
   - `WEB_URL` - Frontend URL for CORS (default: `http://localhost:5173`)

3. Initialize the database:

   ```bash
   npm run db:push
   # or for migrations:
   npm run db:migrate
   ```

4. Generate Prisma client:

   ```bash
   npm run db:generate
   ```

## Development

```bash
# From monorepo root
npm run dev

# Or from packages/api
cd packages/api && npm run dev
```

The API runs at [http://localhost:3001](http://localhost:3001).

## Testing

```bash
# From packages/api
cd packages/api && npm run test

# Watch mode
npm run test:watch
```

Tests use Vitest and supertest. Prisma is mocked in tests; no database is required.

## Endpoints

- `GET /api/health` - Health check
- `GET /api/v1/auth/me` - Current user (placeholder)
- `GET /api/v1/workspaces` - List workspaces (placeholder)

## Project Structure

```
src/
  modules/       # Domain modules (auth, workspace, health, etc.)
    health/      # Health check routes
    auth/        # Auth routes
    workspace/   # Workspace routes
  shared/        # Shared utilities, DB client
prisma/
  schema.prisma  # Database schema
```
