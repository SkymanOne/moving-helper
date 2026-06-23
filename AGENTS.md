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

- **Non-secret vars** (`NOTION_CLIENT_ID`, `NOTION_REDIRECT_URI`, `MAX_CODES_PER_OWNER`): defined in `wrangler.json` under `vars`. Env vars arrive as strings — parse them (e.g. `maxCodesFromEnv`)
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

## Data Model

Notion OAuth is the account — there's no separate user store. State lives in a single KV
namespace bound as **`WORKSPACES`**:

- `workspace:<botId>` — the source of truth per connected workspace: `accessToken`,
  `refreshToken`, `tokenExpiresAt`, `workspaceName`, `workspaceIcon`, `selectedDb`, timestamps.
  Has a sliding TTL (refreshed on active use). The access token is **refreshed centrally** here
  when near expiry, so rotation never breaks share codes. **The `accessToken`/`refreshToken`
  fields are AES-GCM encrypted at rest** (`app/lib/crypto.server.ts`, key derived from
  `SESSION_SECRET`) — workspace CRUD takes the secret and encrypts/decrypts transparently.
- `share:<code>` — a **reference** `{ ownerId, createdAt }` (no token copy). 30-day TTL.
- `codes:<ownerId>` — the owner's list of active share codes.

Share-code redemption is throttled by the Cloudflare **Rate Limiting binding** (`JOIN_RATE_LIMITER`
in `wrangler.json`, `env.JOIN_RATE_LIMITER.limit({ key })`), not a KV counter — only failed
attempts count toward the limit. KV reads are untyped, so records are runtime-validated before use.

Cookies carry only identifiers: the `auth` cookie holds `{ ownerId }` (owner) or
`{ shareCode }` (guest). The `selectedDb` cookie is used **only by guests** — owners' selection
lives in the workspace record (so it persists across devices); a guest's selection is seeded
from the owner's at join time and editable per-device. All session resolution goes through
`resolveAuth` / `resolveSession` in `app/lib/share.server.ts`.

## Key Files

- `workers/app.ts` — Worker entry, context setup
- `app/lib/context.server.ts` — Typed context keys (cookies, cloudflare env)
- `app/lib/cookies.server.ts` — Cookie factory and helpers
- `app/lib/notion.server.ts` — All Notion API interactions, OAuth exchange + token refresh
- `app/lib/share.server.ts` — Workspace records, share codes, session resolution, rate limiting
- `app/routes/_index.tsx` — Setup/database selection (role-aware: owner → record, guest → cookie)
- `app/routes/scan.tsx` — Barcode scanner (camera)
- `app/routes/status.$code.tsx` — Status view and update
- `app/routes/join.tsx` — Guest share-code redemption
- `app/routes/share.tsx` — Owner share-code management + Disconnect
- `app/routes/auth.login.tsx` — OAuth login redirect
- `app/routes/auth.callback.tsx` — OAuth callback handler (writes the workspace record)
- `app/routes/auth.logout.tsx` — Logout (clears device cookies; record persists)

## Deploy

```bash
pnpm build && pnpm deploy    # manual
git push origin main         # CI/CD via GitHub Actions
```

## Public Documentation

README.md is user-facing. Write it in a warm, human tone — not robotic or template-like.
