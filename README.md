# Moving Buddy

A simple app that takes the chaos out of moving day. Stick barcode labels on your boxes, scan them with your phone, and keep track of what's packed, in transit, or already at the new place — all synced with a Notion database.

## How it works

1. **Pick your database** — Connect to a Notion database that has a Status field and an ID field. The app finds compatible databases automatically.
2. **Scan a box** — Point your phone camera at a barcode or QR code. The app looks up the matching entry in your Notion database (or creates a new one if it doesn't exist yet).
3. **Update the status** — Tap a status button to mark the box as "Packed", "In Transit", "Delivered", or whatever statuses you've set up in Notion. Done.

## Getting started

You'll need:

- [Node.js](https://nodejs.org/) (v20 or later)
- [pnpm](https://pnpm.io/) package manager
- A [Notion](https://www.notion.so/) account

### 1. Set up a Notion integration

Head to [notion.so/my-integrations](https://www.notion.so/my-integrations) and create a new **internal integration**. Give it a name (like "Moving Buddy") and copy the token — you'll need it in a moment.

Then open your Notion database, click the `...` menu in the top right, go to **Connections**, and add your integration. This gives the app permission to read and write to that database.

Your database needs at least:

- A **Status** field (the built-in Status type or a Select field work fine)
- An **ID** field (this can be the auto-generated Unique ID, the title column, or a text property)

### 2. Install and run

```bash
git clone <your-repo-url> moving-buddy
cd moving-buddy
pnpm install
```

Copy the example env file and add your Notion token:

```bash
cp .env.example .env
```

Open `.env` and paste your token:

```text
NOTION_TOKEN=secret_abc123...
```

Start the dev server:

```bash
pnpm dev
```

Open [localhost:5173](http://localhost:5173) on your phone or computer.

### 3. Testing on your phone

The barcode scanner needs camera access, which browsers only allow over HTTPS (or localhost). To test on your phone over your local network:

```bash
pnpm dev --host
```

Then use a tool like [ngrok](https://ngrok.com/) to get an HTTPS URL, or access it via your machine's local IP if your browser allows it.

## Tech stack

- [React Router v7](https://reactrouter.com/) — Full-stack framework with server-side rendering
- [Tailwind CSS v4](https://tailwindcss.com/) — Utility-first styling
- [@yudiel/react-qr-scanner](https://github.com/yudielcurbelo/react-qr-scanner) — Camera-based barcode and QR code scanning
- [@notionhq/client](https://github.com/makenotion/notion-sdk-js) — Official Notion API SDK
- [TypeScript](https://www.typescriptlang.org/) — Type safety throughout
