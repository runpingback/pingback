# Pingback

Reliable cron jobs and background tasks for modern web apps. Starting with Next.js.

Pingback is a platform with framework-specific SDKs that let you define scheduled functions and background tasks directly in your codebase. Pingback handles scheduling, execution, retries, fan-out, and provides a dashboard for monitoring.

## Packages

| Package | Description |
|---------|-------------|
| [`@usepingback/next`](packages/next) | Next.js SDK adapter |
| [`@usepingback/core`](packages/core) | Framework-agnostic core (used internally) |

## Apps

| App | Description |
|-----|-------------|
| [`platform`](apps/platform) | NestJS API server, scheduler, and worker |
| [`dashboard`](apps/dashboard) | Next.js web UI for monitoring |
| [`website`](apps/website) | Landing page and documentation |

## Quick Start (Next.js)

### 1. Install

```bash
npm install @usepingback/next
```

### 2. Create config

```ts
// pingback.config.ts
import { defineConfig } from "@usepingback/next";

export default defineConfig({
  apiKey: process.env.PINGBACK_API_KEY,
});
```

### 3. Wrap your Next.js config

```ts
// next.config.ts
import { withPingback } from "@usepingback/next";

export default withPingback({
  // your existing config
});
```

### 4. Create the route handler

```ts
// app/api/__pingback/route.ts
import { createRouteHandler } from "@usepingback/next";

export const { POST } = createRouteHandler();
```

### 5. Define a cron job

```ts
// lib/pingback/review-emails.ts
import { cron } from "@usepingback/next";

export const sendReviewEmails = cron(
  "send-review-emails",
  "*/15 * * * *",
  async (ctx) => {
    const pending = await getPendingEmails();
    for (const email of pending) {
      await ctx.task("send-email", { id: email.id });
    }
    ctx.log(`Processed ${pending.length} emails`);
    return { processed: pending.length };
  },
  { retries: 3, timeout: "60s" }
);
```

### 6. Set environment variables

```
PINGBACK_API_KEY=pb_live_...        # From your Pingback project settings
PINGBACK_CRON_SECRET=...            # From your Pingback project settings
```

### 7. Build & deploy

```bash
next build
```

Your cron functions are automatically discovered, registered with Pingback, and a route handler is generated at `/api/__pingback`.

## How It Works

1. **At build time:** `withPingback()` scans your codebase for `cron()` and `task()` calls, generates a route handler, and registers your functions with the Pingback platform.

2. **At runtime:** When a job is due, the scheduler enqueues it. The worker sends an HMAC-signed POST request to your app's `/api/__pingback` endpoint. The handler verifies the signature, executes the function, and returns the result with logs.

3. **Fan-out:** Cron handlers can call `ctx.task()` to spawn independent child tasks. Each child runs with its own retries, timeout, and tracking.

4. **On the dashboard:** See execution history, logs, success/failure status, child tasks, and configure email alerts.

## Architecture

```
Your Next.js App                    Pingback Platform
┌──────────────────┐               ┌──────────────────────┐
│  lib/pingback/   │               │  Scheduler (10s tick) │
│    emails.ts     │               │         │             │
│    sync.ts       │               │         ▼             │
│                  │  ◄── POST ──  │  Worker (HTTP dispatch)│
│  /api/__pingback │               │         │             │
│  (auto-generated)│  ── result ─► │  Executions DB        │
└──────────────────┘               │  Dashboard API        │
                                   └──────────────────────┘
```

## Development

This is a monorepo using npm workspaces.

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Start the platform
cd apps/platform
cp .env.example .env  # Edit with your database credentials
npm run start:dev     # API at http://localhost:4000

# Start the dashboard
cd apps/dashboard
npm run dev           # http://localhost:3000

# Start the website
cd apps/website
npm run dev           # http://localhost:3100

# Run the example app
cd examples/nextjs
npm run build && npm start  # http://localhost:3001
```

## Project Structure

```
pingback/
├── apps/
│   ├── platform/          # NestJS API server + scheduler + worker
│   ├── dashboard/         # Next.js dashboard for monitoring
│   └── website/           # Landing page + documentation
├── packages/
│   ├── core/              # Framework-agnostic SDK core
│   └── next/              # Next.js adapter
├── shared/
│   └── types/             # Shared TypeScript types
└── examples/
    └── nextjs/            # Example Next.js app using @usepingback/next
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Platform | NestJS, PostgreSQL, pgboss (queue), TypeORM |
| Dashboard | Next.js 15, React 19, Tailwind CSS 4, React Query |
| Website | Next.js 15, Tailwind CSS 4, Shiki |
| SDK Core | TypeScript |
| SDK Adapters | TypeScript (Next.js first, more coming) |
| Auth | JWT + API Keys + GitHub OAuth |

## License

MIT
