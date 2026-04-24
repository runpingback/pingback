# Pingback

Reliable cron jobs, background tasks, and workflows for modern web apps.

Pingback is a platform with framework-specific SDKs that let you define scheduled functions, background tasks, and multi-step workflows directly in your codebase. Pingback handles scheduling, execution, retries, task chaining, and provides a dashboard for monitoring.

![Pingback Dashboard](apps/website/public/dashboard.png)

- **Website:** https://pingback.run


## SDKs

| Package | Install | Description |
|---------|---------|-------------|
| [`@usepingback/next`](packages/next) | `npm install @usepingback/next` | Next.js adapter |
| [`@usepingback/nestjs`](packages/nestjs) | `npm install @usepingback/nestjs` | NestJS adapter |
| [`pingback-go`](https://github.com/runpingback/pingback-go) | `go get github.com/runpingback/pingback-go` | Go SDK |
| [`pingback-py`](https://github.com/runpingback/pingback-py) | `pip install pingback-py` | Python SDK |
| [`@usepingback/core`](packages/core) | `npm install @usepingback/core` | Framework-agnostic core |

## Apps

| App | Description |
|-----|-------------|
| [`platform`](apps/platform) | NestJS API server, scheduler, and worker |
| [`dashboard`](apps/dashboard) | Next.js web UI for monitoring |
| [`website`](apps/website) | Landing page and documentation |

## Quick Start (Next.js)

### 1. Install & initialize

```bash
npm install @usepingback/next
pingback init
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
// app/api/pingback/route.ts
import { createRouteHandler } from "@usepingback/next/handler";

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
    ctx.log("Processed emails", { count: pending.length });
    ctx.log.warn("Slow batch detected", { threshold: 100 });
    ctx.log.error("Failed to send", { emailId: "abc" });
    ctx.log.debug("Email payload", { email });
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

Your cron functions are automatically discovered, registered with Pingback, and a route handler is generated at `/api/pingback`.

## Local Development

Use `pingback dev` to create a tunnel so the Pingback platform can reach your local app:

```bash
pingback dev        # tunnels to localhost:3000
pingback dev 4000   # tunnels to localhost:4000
```

This lets you test cron jobs and background tasks locally without deploying.

## How It Works

1. **At build time:** `withPingback()` scans your codebase for `cron()` and `task()` calls, generates a route handler, and registers your functions with the Pingback platform.

2. **At runtime:** When a job is due, the scheduler enqueues it. The worker sends an HMAC-signed POST request to your app's `/api/pingback` endpoint. The handler verifies the signature, executes the function, and returns the result with logs.

3. **Fan-out:** Cron handlers can call `ctx.task()` to spawn independent child tasks. Each child runs with its own retries, timeout, and tracking.

4. **Programmatic triggering:** Use `PingbackClient` to trigger any registered task from your application code — no schedule needed. Useful for event-driven workflows like sending emails after signup or processing webhooks.

5. **On the dashboard:** See execution history, logs, success/failure status, child tasks, and configure email alerts.

## Architecture

```
Your Next.js App                    Pingback Platform
┌──────────────────┐               ┌──────────────────────┐
│  lib/pingback/   │               │  Scheduler (10s tick) │
│    emails.ts     │               │         │             │
│    sync.ts       │               │         ▼             │
│                  │  ◄── POST ──  │  Worker (HTTP dispatch)│
│  /api/pingback   │               │         │             │
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
│   ├── next/              # Next.js adapter
│   └── nestjs/            # NestJS adapter
├── shared/
│   └── types/             # Shared TypeScript types
└── examples/
    ├── nextjs/            # Example Next.js app using @usepingback/next
    └── nestjs/            # Example NestJS app using @usepingback/nestjs
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
