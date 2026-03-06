# Replica Pages

Replica Pages is a landing page platform for importing HTML, editing with a drag-and-drop builder, mapping forms, and publishing to demo or custom domains.

## Quick start

```bash
# Install dependencies
npm install

# Set up environment (copy from .env.example)
cp .env.example .env

# Generate Prisma client and run migrations
npm run db:generate
npm run db:migrate

# Start dev server (API + web)
npm run dev
```

- **API**: http://localhost:3001
- **Web**: http://localhost:5173

## Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for session signing (required in production) |
| `WEB_URL` | Frontend URL (e.g. http://localhost:5173) |
| `API_URL` | API URL (e.g. http://localhost:3001) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `CNAME_TARGET` | CNAME target for custom domains (e.g. cname.replicapages.io) |
| `BYPASS_AUTH_LOCALHOST` | Set to `1` to skip Google OAuth on localhost (dev only) |

See `.env.example` for full list.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API and web in dev mode |
| `npm run build` | Build all packages |
| `npm run test` | Run tests in api and web packages |
| `npm run lint` | Type-check all packages |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema to database (dev) |

## Tests

```bash
# Run all tests
npm run test

# Run API tests only
npm run test -w @replica-pages/api

# Run web tests only
npm run test -w @replica-pages/web
```

## Documentation

See [docs/README.md](docs/README.md) for architecture, HTML import, UTM flow, and block library documentation.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the comprehensive product roadmap with implementation status for all features across Phase 1 (MVP), Phase 2 (Expanded Publishing & Integrations), and Phase 3 (Advanced Publishing & Packaging).

## PRD

See [docs/PRD.md](docs/PRD.md) for the full Product Requirements Document.
