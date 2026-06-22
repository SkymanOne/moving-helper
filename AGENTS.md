# Moving Buddy - Agent Conventions

## Package Manager

Use **pnpm** exclusively. Never npm or yarn.

## Framework

React Router v7 in **framework mode** (SSR with loaders/actions). All server-side logic goes in:

- Route `loader` and `action` functions
- Files with `.server.ts` suffix (stripped from client bundles)

## Styling

Tailwind CSS v4 with the `@tailwindcss/vite` plugin. CSS-first configuration in `app/app.css` — there is no `tailwind.config.ts`.

## TypeScript

Strict mode enabled. Avoid `any` types.

## Secrets

All secrets live in `.env` (git-ignored). Never hardcode tokens, keys, or credentials. The `.env.example` file documents required variables.

## Design

Mobile-first. Design for phone screens, then scale up. Use large touch targets (`min-h-14`), generous spacing, and readable fonts.

## Project Structure

```
app/
  routes/          # Route modules (loaders, actions, components)
  components/      # Shared React components
  lib/             # Server utilities (*.server.ts)
```

## Key Files

- `app/lib/notion.server.ts` — All Notion API interactions
- `app/lib/cookies.server.ts` — Cookie-based session for selected database
- `app/routes/_index.tsx` — Setup/database selection
- `app/routes/scan.tsx` — Barcode scanner (camera)
- `app/routes/status.$code.tsx` — Status view and update

## Public Documentation

README.md is user-facing. Write it in a warm, human tone — not robotic or template-like.
