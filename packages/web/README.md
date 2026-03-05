# @replica-pages/web

React SPA admin application for Replica Pages.

## Tech Stack

- **Vite** - Build tool
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **React Router** - Client-side routing

## Setup

1. From the monorepo root, install dependencies:

   ```bash
   npm install
   ```

2. Initialize shadcn/ui (run from `packages/web`):

   ```bash
   cd packages/web && npx shadcn@latest init
   ```

   Follow the prompts. The project is pre-configured with `components.json`. Add components as needed:

   ```bash
   npx shadcn@latest add button
   npx shadcn@latest add card
   ```

3. Create `.env` in the project root (copy from `.env.example`) and set `API_URL` if the API runs on a different port.

## Development

```bash
# From monorepo root
npm run dev

# Or from packages/web
cd packages/web && npm run dev
```

The app runs at [http://localhost:5173](http://localhost:5173). API requests to `/api/*` are proxied to the backend (default: `http://localhost:3001`).

## Build

```bash
npm run build
```

Output is written to `packages/web/dist`.

## Testing

```bash
# From packages/web
cd packages/web && npm run test

# Watch mode
npm run test:watch
```

Tests use Vitest and React Testing Library. The API client is mocked in tests.

## Project Structure

```
src/
  features/       # Feature-based modules (pages, forms, etc.)
  components/    # Shared layout and UI components
  lib/           # Utilities, API client
```
