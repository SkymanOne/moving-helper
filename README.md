# Moving Buddy

A simple app that takes the chaos out of moving day. Stick barcode labels on your boxes, scan them with your phone, and keep track of what's packed, in transit, or already at the new place — all synced with a Notion database.

Live at [moving-buddy.com](https://moving-buddy.com).

## How it works

1. **Connect your workspace** — Sign in with Notion and grant the app access to your databases. No tokens to copy, no integrations to configure.
2. **Pick your database** — The app finds databases with a Status field and an ID field automatically.
3. **Scan a box** — Point your phone camera at a barcode or QR code. The app looks up the matching entry in your Notion database (or creates a new one if it doesn't exist yet).
4. **Update the status** — Tap a status button to mark the box as "Packed", "In Transit", "Delivered", or whatever statuses you've set up in Notion. Done.

## Getting started

You'll need:

- [Node.js](https://nodejs.org/) (v22 or later)
- [pnpm](https://pnpm.io/) package manager
- A [Notion](https://www.notion.so/) account

### 1. Set up a Notion OAuth app

Head to [notion.so/profile/integrations](https://www.notion.so/profile/integrations) and create a new **public integration**. Set the redirect URI to `http://localhost:5173/auth/callback` for local development. Copy the **Client ID** and **Client Secret**.

Your database needs at least:

- A **Status** field (the built-in Status type or a Select field work fine)
- An **ID** field (this can be the auto-generated Unique ID, the title column, or a text property)

### 2. Install and configure

```bash
git clone <your-repo-url> moving-buddy
cd moving-buddy
pnpm install
```

Create a `.dev.vars` file for local secrets (see `.dev.vars.example`):

```text
SESSION_SECRET=generate-with-openssl-rand-base64-32
NOTION_CLIENT_SECRET=your-notion-client-secret
```

Non-secret config like `NOTION_CLIENT_ID` and `NOTION_REDIRECT_URI` lives in `wrangler.json` under `vars`.

### 3. Run locally

```bash
pnpm dev
```

This starts the Cloudflare Workers dev server via Vite. Open [localhost:5173](http://localhost:5173) on your phone or computer.

### 4. Testing on your phone

The barcode scanner needs camera access, which browsers only allow over HTTPS (or localhost). Use a tool like [ngrok](https://ngrok.com/) to get an HTTPS URL for local testing.

## Deploying

The app runs on [Cloudflare Workers](https://workers.cloudflare.com/) and deploys to a custom domain.

### Manual deploy

Set your production secrets first:

```bash
wrangler secret put SESSION_SECRET
wrangler secret put NOTION_CLIENT_SECRET
```

Update the non-secret vars in `wrangler.json` (`NOTION_CLIENT_ID`, `NOTION_REDIRECT_URI`) with your production values.

Then build and deploy:

```bash
pnpm build
pnpm deploy
```

### CI/CD

Pushes to `main` automatically deploy via GitHub Actions (`.github/workflows/deploy.yml`). You'll need these GitHub repo secrets:

- `CLOUDFLARE_API_TOKEN` — A Cloudflare API token with Workers permissions
- `CLOUDFLARE_ACCOUNT_ID` — Your Cloudflare account ID

The workflow runs typecheck and build on all pushes and PRs, and deploys on push to `main`.

## Tech stack

- [React Router v8](https://reactrouter.com/) — Full-stack framework with server-side rendering
- [Cloudflare Workers](https://workers.cloudflare.com/) — Edge runtime
- [Tailwind CSS v4](https://tailwindcss.com/) — Utility-first styling
- [@yudiel/react-qr-scanner](https://github.com/yudielcurbelo/react-qr-scanner) — Camera-based barcode and QR code scanning
- [@notionhq/client](https://github.com/makenotion/notion-sdk-js) — Official Notion API SDK
- [TypeScript](https://www.typescriptlang.org/) — Type safety throughout

## License

[Apache License 2.0](LICENSE)
