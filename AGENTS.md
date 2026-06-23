# Moving Buddy - Agent Conventions

## Package Manager

Use **pnpm** exclusively. Never npm or yarn.

## Framework

React Router v8 in **framework mode** (SSR with loaders/actions). All server-side logic goes in:

- Route `loader` and `action` functions
- Files with `.server.ts` suffix (stripped from client bundles)

## Runtime

Cloudflare Workers with `nodejs_compat`. No Node.js-only APIs at module scope — use the Web Platform APIs (Web Crypto, `fetch`, `btoa`, etc.).

## Environment Variables

- **Non-secret vars** (`NOTION_CLIENT_ID`, `NOTION_REDIRECT_URI`): defined in `wrangler.json` under `vars`
- **Secrets** (`SESSION_SECRET`, `NOTION_CLIENT_SECRET`): set via `wrangler secret put` for production, `.dev.vars` for local dev
- **Never use `process.env`** for secrets in route code. Access env through the typed context system.

## Context Pattern

Env and cookies are passed to loaders/actions via React Router's typed context system (`createContext` / `RouterContextProvider`):

```ts
import { cookiesContext } from "~/lib/context.server";
import { cloudflareContext } from "~/lib/context.server";

export async function loader({ context }: Route.LoaderArgs) {
  const cookies = context.get(cookiesContext);
  const { env } = context.get(cloudflareContext);
}
```

Context keys are defined in `app/lib/context.server.ts`. The `RouterContextProvider` is wired up in `workers/app.ts`.

## Styling

Tailwind CSS v4 with the `@tailwindcss/vite` plugin. CSS-first configuration in `app/app.css` — there is no `tailwind.config.ts`.

## TypeScript

Strict mode enabled. Avoid `any` types. Project uses composite TypeScript with project references (`tsconfig.cloudflare.json` for app/workers, `tsconfig.node.json` for Vite config).

Run `pnpm typecheck` to regenerate Cloudflare types, React Router route types, and run `tsc -b`.

## Design

Mobile-first. Design for phone screens, then scale up. Use large touch targets (`min-h-14`), generous spacing, and readable fonts.

## Project Structure

```
app/
  routes/          # Route modules (loaders, actions, components)
  components/      # Shared React components
  lib/             # Server utilities (*.server.ts)
workers/
  app.ts           # Cloudflare Worker entry point
```

## Key Files

- `workers/app.ts` — Worker entry, context setup
- `app/lib/context.server.ts` — Typed context keys (cookies, cloudflare env)
- `app/lib/cookies.server.ts` — Cookie factory and helpers
- `app/lib/notion.server.ts` — All Notion API interactions
- `app/routes/_index.tsx` — Setup/database selection
- `app/routes/scan.tsx` — Barcode scanner (camera)
- `app/routes/status.$code.tsx` — Status view and update
- `app/routes/auth.login.tsx` — OAuth login redirect
- `app/routes/auth.callback.tsx` — OAuth callback handler
- `app/routes/auth.logout.tsx` — Logout (clears cookies)

## Deploy

```bash
pnpm build && pnpm deploy    # manual
git push origin main         # CI/CD via GitHub Actions
```

## Public Documentation

README.md is user-facing. Write it in a warm, human tone — not robotic or template-like.
