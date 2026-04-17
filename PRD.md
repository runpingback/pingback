# Pingback — Product Requirements Document

**Cron jobs and scheduled functions for modern web apps. Starting with Next.js.**

**Version:** 1.2
**Date:** 2026-04-14
**Author:** cirx

---

## 1. Problem

Developers building on modern web frameworks need reliable background job execution (sending emails, syncing data, cleanup tasks, etc.) but serverless platforms impose strict limits on cron scheduling. Vercel Hobby allows only once-per-day crons. Netlify and Cloudflare Pages have similar constraints. Even on paid plans, developers lack retries, fan-out, structured logging, and visibility into execution history.

Existing solutions (Upstash QStash, EasyCron, cron-job.org) are generic HTTP schedulers. They work but require manual endpoint setup, lack framework-aware tooling, and offer no path from simple cron to more powerful patterns (retries, fan-out, long-running tasks). Meanwhile, platforms like Inngest and Trigger.dev are powerful but complex — overkill for developers who just need reliable cron.

## 2. Solution

Pingback is a platform with framework-specific SDKs that let developers define scheduled functions and background tasks directly in their codebase. Pingback handles scheduling, execution, retries, fan-out, and provides a dashboard for monitoring — all without managing infrastructure.

**The first SDK is `@pingback/next` for Next.js.** Additional framework SDKs (Nuxt, SvelteKit, Remix, etc.) will follow, each built as a thin adapter over a shared `@pingback/core` package.

```ts
import { cron } from "@pingback/next";

export const sendEmails = cron("send-emails", "*/15 * * * *", async (ctx) => {
  const pending = await getPendingEmails();
  for (const email of pending) {
    await ctx.task("send-email", { id: email._id });
  }
});
```

## 3. Target Users

### Primary (at launch)
- **Solo developers and small teams** building SaaS products on Next.js who need background job execution with more control than platform-native cron.
- **Next.js developers** who want retries, fan-out, execution logs, and monitoring without spinning up separate infrastructure (Redis, BullMQ, etc.).

### Expanding to
- **Developers on other modern frameworks** — Nuxt, SvelteKit, Remix, Astro — who face the same cron limitations and want the same DX.
- **Agencies** deploying multiple client projects (potentially across different frameworks) who want centralized cron management and visibility.

## 4. Competitive Landscape

| Product | Approach | Next.js Native? | SDK? | Pricing |
|---------|----------|-----------------|------|---------|
| Vercel Cron | Built-in | Yes | No | Tied to plan limits |
| Upstash QStash | Message queue | No | Yes (generic) | Free tier + usage-based |
| EasyCron | HTTP polling | No | No | Free tier + plans |
| Inngest | Event-driven functions | Partial | Yes | Free tier + plans |
| Trigger.dev | Background jobs | Partial | Yes | Free tier + plans |
| **Pingback** | **Cron + Tasks SDK** | **Yes (Next.js first, expanding)** | **Yes** | **Free tier + plans** |

**Differentiation:** Inngest and Trigger.dev are powerful but complex — they're general-purpose background job platforms that went broad from day one. Pingback takes a framework-first wedge approach: ship an exceptional DX for one framework at a time, starting with Next.js. "I need this function to run every 15 minutes, with retries, and I want to see if it worked." Minimal API surface, maximum developer experience — repeated per framework.

## 5. Product Architecture

### 5.1 System Overview

```
┌─────────────────────────────────────────────────┐
│                 Pingback Platform                 │
│                                                   │
│  ┌───────────┐  ┌─────────┐  ┌────────────────┐ │
│  │ Scheduler  │─▶│  Queue  │─▶│    Workers     │ │
│  │ (tick loop)│  │(Redis/  │  │ (HTTP dispatch)│ │
│  └───────────┘  │ BullMQ) │  └───────┬────────┘ │
│       │         └─────────┘          │           │
│       ▼                              │           │
│  ┌───────────┐  ┌─────────┐         │           │
│  │    API    │  │Dashboard│         │           │
│  │  Server   │  │  (Next) │         │           │
│  └───────────┘  └─────────┘         │           │
│                                      │           │
└──────────────────────────────────────┼───────────┘
                                       │
                                       ▼
                             ┌─────────────────┐
                             │  User's app via  │
                             │  SDK's auto-     │
                             │  generated route │
                             │  handler         │
                             └─────────────────┘
```

### 5.2 Scheduler

A persistent Node.js process (not serverless) that:
- Runs a tick loop every 10 seconds
- Queries the database for jobs where `next_run_at <= NOW` and `status = 'active'`
- Enqueues matching jobs into the work queue
- Calculates and updates `next_run_at` using the cron expression
- Handles missed runs (if the scheduler was down, catch up or skip based on job config)

**Cron parsing:** Use `cron-parser` library. Support standard 5-field cron expressions plus `@every 15m` shorthand.

### 5.3 Queue

Redis + BullMQ for job queuing:
- Jobs are enqueued with a unique execution ID to prevent duplicates
- Workers pull from the queue and execute
- Built-in retry with configurable backoff (exponential by default)
- Dead letter queue for permanently failed jobs

### 5.4 Workers

Stateless processes that:
1. Pull a job from the queue
2. Make an HTTP request to the user's SDK route handler
3. Record the result (status code, response body, duration, timestamp)
4. If failed and retries remaining, re-enqueue with backoff
5. If permanently failed, move to dead letter queue and notify user

**Timeout:** Default 30 seconds, configurable up to 5 minutes (aligned with serverless function limits).

**Concurrency:** Each job has a configurable max concurrency (default 1) to prevent overlapping runs.

### 5.5 API Server

RESTful API for:
- CRUD operations on jobs (create, read, update, delete, pause, resume)
- Execution log queries
- SDK registration endpoint (functions register themselves at deploy time)
- Authentication via API keys

### 5.6 Dashboard

Next.js web app providing:
- Project and job management
- Real-time execution logs with status, duration, response
- Execution timeline/chart (success rate over time)
- Alert configuration (email/webhook on failure)
- API key management
- Billing and usage

## 6. Feature Specifications

### 6.1 SDK

#### Architecture

The SDK is split into two layers:
- **`@pingback/core`** — Framework-agnostic logic: function registry, context object, request validation, API communication. This is not installed directly by users.
- **`@pingback/next`** (and future `@pingback/nuxt`, `@pingback/sveltekit`, etc.) — Thin framework adapters that handle route generation, build plugins, and framework-specific conventions. Each adapter depends on `@pingback/core`.

This separation is critical: all business logic lives in core, adapters only bridge framework conventions. When adding a new framework, the adapter should be small (ideally < 500 lines).

#### Installation (Next.js)

```bash
npm install @pingback/next
```

#### Configuration

```ts
// pingback.config.ts (project root)
import { defineConfig } from "@pingback/next";

export default defineConfig({
  apiKey: process.env.PINGBACK_API_KEY,
});
```

#### Defining Scheduled Functions

```ts
// lib/pingback/review-emails.ts
import { cron } from "@pingback/next";

export const sendReviewEmails = cron(
  "send-review-emails",     // unique job name
  "*/15 * * * *",           // cron expression
  async (ctx) => {
    const pending = await getPendingTokens();
    for (const token of pending) {
      await ctx.task("send-single-email", { tokenId: token._id });
    }
    return { processed: pending.length };
  },
  {
    retries: 3,
    timeout: "60s",
    concurrency: 1,          // don't overlap runs
  }
);
```

#### How It Works Under the Hood

1. **At build time:** A Next.js plugin scans for `cron()` and `task()` calls, collects function metadata (name, schedule, options), and registers them with the Pingback API.

2. **Auto-generated route handler:** The SDK generates a Next.js API route at `/api/__pingback` (configurable). This route:
   - Validates incoming requests using a shared secret
   - Looks up the requested function by name
   - Executes it
   - Returns the result

3. **At runtime:** When a job is due, Pingback's worker sends `POST /api/__pingback` with:
   ```json
   {
     "function": "send-review-emails",
     "executionId": "exec_abc123",
     "attempt": 1
   }
   ```

4. The SDK route handler executes the function and returns:
   ```json
   {
     "status": "success",
     "result": { "processed": 12 },
     "durationMs": 4523
   }
   ```

#### Context Object (`ctx`)

The `ctx` object passed to every function provides:
- `ctx.task(name, payload)` — Fan out to a sub-task (runs as a separate execution)
- `ctx.log(message)` — Structured log visible in dashboard
- `ctx.attempt` — Current retry attempt number (1-indexed)
- `ctx.executionId` — Unique ID for this execution
- `ctx.scheduledAt` — When this run was originally scheduled

#### Tasks (Sub-functions)

```ts
import { task } from "@pingback/next";

export const sendSingleEmail = task(
  "send-single-email",
  async (ctx, { tokenId }: { tokenId: string }) => {
    const token = await ReviewToken.findById(tokenId);
    await sendReviewInvitationEmail(token);
    return { sent: true };
  },
  { retries: 2, timeout: "15s" }
);
```

Tasks are one-off executions triggered by `ctx.task()` inside a cron function. They run independently, have their own retry policies, and show as child executions in the dashboard.

### 6.2 Dashboard

#### Projects View
- List of connected projects (one per SDK installation)
- Each project shows: name, job count, last execution status, total executions today

#### Job Detail View
- Job name, schedule (human-readable + cron expression), status (active/paused)
- Execution history: table of recent runs with status, duration, timestamp
- Execution timeline: sparkline chart showing success/failure over last 24h/7d/30d
- Logs: for SDK functions, shows `ctx.log()` output per execution
- Settings: edit schedule, retries, timeout, concurrency, pause/resume, delete

#### Alerts
- Configure per-job or per-project
- Channels: email, webhook (Slack/Discord via webhook URL)
- Triggers: N consecutive failures, execution duration exceeds threshold, job not run in expected window

#### Execution Detail View
- Full request/response: HTTP status, headers, response body (first 10KB)
- Duration breakdown
- Retry history (if applicable)
- Child tasks (if SDK with fan-out)

### 6.3 API

All endpoints require `Authorization: Bearer {api_key}` header.

#### Jobs
```
POST   /api/v1/jobs          — Create a job
GET    /api/v1/jobs          — List jobs (filterable by project, status)
GET    /api/v1/jobs/:id      — Get job details
PATCH  /api/v1/jobs/:id      — Update job (schedule, config, pause/resume)
DELETE /api/v1/jobs/:id      — Delete job
POST   /api/v1/jobs/:id/run  — Trigger an immediate run
```

#### Executions
```
GET    /api/v1/jobs/:id/executions           — List executions (paginated)
GET    /api/v1/executions/:executionId       — Get execution detail
```

#### Projects
```
GET    /api/v1/projects          — List projects
POST   /api/v1/projects          — Create project (SDK mode)
DELETE /api/v1/projects/:id      — Delete project
```

## 7. Non-Functional Requirements

### 7.1 Reliability
- **Scheduling precision:** Jobs fire within 15 seconds of their scheduled time
- **At-least-once delivery:** Jobs are guaranteed to run at least once (may run twice in rare edge cases; users should design for idempotency)
- **Availability target:** 99.9% uptime for the scheduler and worker pool

### 7.2 Security
- All communication over HTTPS
- API keys are hashed at rest (bcrypt), shown once on creation
- Cron secrets per project are generated with 256-bit entropy
- Request signing: SDK requests include an HMAC signature for verification
- No sensitive data stored from execution responses (truncated at 10KB, user can opt out of response logging)

### 7.3 Scalability
- Scheduler is a single process (leader-elected if running multiple replicas for HA)
- Workers are horizontally scalable — add more to handle higher throughput
- Target: 10,000 job executions per minute at launch, scalable to 100K+

### 7.4 Data Retention
- Execution logs retained based on plan tier (24h / 30d / 90d)
- Older logs are purged automatically
- Users can export logs via API before purge

## 8. Tech Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| Dashboard + API | Next.js 15, TypeScript | Dogfooding, modern stack |
| Database | PostgreSQL | Relational data (jobs, executions, users), strong consistency |
| Queue | Redis + BullMQ | Proven, fast, supports delayed jobs and retries |
| Scheduler | Node.js (long-running) | Needs persistent process, not serverless |
| SDK Core | TypeScript npm package (`@pingback/core`) | Framework-agnostic logic, shared across all adapters |
| SDK Adapters | TypeScript npm packages (`@pingback/next`, etc.) | Thin framework-specific wrappers |
| Auth | NextAuth.js + API keys | Dashboard login + programmatic access |
| Hosting | Railway or Fly.io | Supports long-running processes (scheduler), affordable |
| Email | Resend | Transactional alerts |
| Monitoring | Sentry + internal metrics | Error tracking, execution metrics |

## 9. Data Model

### Users
```
id            UUID PRIMARY KEY
email         TEXT UNIQUE NOT NULL
name          TEXT
password_hash TEXT
created_at    TIMESTAMP
```

### Projects
```
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users
name            TEXT NOT NULL
domain          TEXT            -- e.g., myapp.vercel.app
cron_secret     TEXT NOT NULL   -- hashed, used for request auth
created_at      TIMESTAMP
```

### Jobs
```
id              UUID PRIMARY KEY
project_id      UUID REFERENCES projects
name            TEXT NOT NULL           -- e.g., "send-review-emails"
endpoint_path   TEXT                    -- e.g., "/api/cron/review-emails"
schedule        TEXT NOT NULL           -- cron expression
timezone        TEXT DEFAULT 'UTC'
status          ENUM('active', 'paused', 'deleted')
next_run_at     TIMESTAMP
last_run_at     TIMESTAMP
retries         INT DEFAULT 0
timeout_seconds INT DEFAULT 30
concurrency     INT DEFAULT 1
source          ENUM('sdk', 'manual')
created_at      TIMESTAMP
updated_at      TIMESTAMP

UNIQUE(project_id, name)
INDEX(status, next_run_at)          -- scheduler query
```

### Executions
```
id              UUID PRIMARY KEY
job_id          UUID REFERENCES jobs
parent_id       UUID REFERENCES executions  -- for child tasks
execution_id    TEXT UNIQUE NOT NULL         -- external-facing ID
status          ENUM('pending', 'running', 'success', 'failed', 'retrying')
attempt         INT DEFAULT 1
scheduled_at    TIMESTAMP
started_at      TIMESTAMP
completed_at    TIMESTAMP
duration_ms     INT
http_status     INT
response_body   TEXT                        -- truncated at 10KB
error_message   TEXT
created_at      TIMESTAMP

INDEX(job_id, created_at DESC)      -- execution history query
INDEX(status)                       -- worker query
```

### Alerts
```
id              UUID PRIMARY KEY
project_id      UUID REFERENCES projects
job_id          UUID REFERENCES jobs    -- null = project-level
channel         ENUM('email', 'webhook')
target          TEXT NOT NULL            -- email address or webhook URL
trigger_type    ENUM('consecutive_failures', 'duration_exceeded', 'missed_run')
trigger_value   INT                     -- e.g., 3 consecutive failures
enabled         BOOLEAN DEFAULT true
created_at      TIMESTAMP
```

## 10. User Journeys

### Journey 1: Solo Developer

1. Building a Next.js SaaS, needs to send review emails every 15 minutes
2. Currently using `vercel.json` cron but limited to once/day on Hobby
3. Installs `@pingback/next`, defines a `cron()` function, deploys
4. Emails now run every 15 minutes. Dashboard shows execution history.
5. Adds `retries: 3` after noticing occasional Resend API timeouts — problem solved

**Time to value:** Under 10 minutes.

### Journey 2: Growing SaaS

1. Starts with 2 cron functions (email sending, data sync)
2. Data sync needs to process 500 records — uses `ctx.task()` for fan-out
3. Each record processes independently with its own retries
4. Dashboard shows parent cron + 500 child task executions, easy to spot failures
5. Upgrades to Pro for higher execution limits and 30-day log retention

**Upgrade trigger:** Higher execution volume, longer log retention.

### Journey 3: Agency

1. Manages 12 client projects, each with 2-5 cron jobs
2. Each project has its own Pingback project and API key
3. Single dashboard shows all projects, all crons, all execution status
4. Sets up Slack webhook alerts for any failure across all projects
5. Client asks "did the email cron run last night?" — answers from dashboard in seconds

## 11. Pricing

| | Free | Pro ($12/mo) | Team ($39/mo) |
|---|---|---|---|
| Jobs | 5 | 50 | Unlimited |
| Minimum interval | 1 minute | 10 seconds | 10 seconds |
| Executions/month | 1,000 | 50,000 | 500,000 |
| Log retention | 24 hours | 30 days | 90 days |
| Retries | 1 | 5 | 10 |
| Fan-out tasks | — | 10 per run | 100 per run |
| Alerts | Email only | Email + webhook | Email + webhook |
| Projects | 1 | 5 | Unlimited |
| Team members | 1 | 1 | 10 |
| Support | Community | Email | Priority |

**Overage:** $2 per 10,000 additional executions on Pro and Team.

## 12. MVP Scope

The MVP focuses on proving the core value proposition: **define cron functions in code, Pingback runs them reliably.**

### MVP includes:
- `@pingback/core` — framework-agnostic SDK core
- `@pingback/next` — Next.js adapter with `cron()` function definition, auto-generated route handler
- Scheduler + worker infrastructure
- Dashboard: project list, job list, execution logs
- Email alerts on failure
- API key auth
- Free and Pro tiers

### MVP excludes (post-launch):
- Fan-out tasks (`ctx.task()`)
- Additional framework adapters (`@pingback/nuxt`, `@pingback/sveltekit`, etc.)
- Webhook alerts (Slack/Discord)
- Team features (multi-user, permissions)
- Programmatic API for job management
- Custom timezone support (UTC only at launch)
- Execution timeline charts

### MVP rationale
Ship the core loop first: define a cron in code, Pingback runs it, you see the result. The core/adapter split is built from day one so that adding frameworks later is a matter of writing a thin adapter, not refactoring. Fan-out, additional frameworks, and team features are the upgrade path once the core is proven with Next.js.

## 13. Success Metrics

| Metric | Target (3 months post-launch) |
|--------|-------------------------------|
| npm installs (all SDK packages) | 1,000 |
| Monthly active projects | 200 |
| Monthly executions | 500,000 |
| Free → Pro conversion | 8% |
| Execution success rate | 99.5% (platform-side) |
| Scheduling precision p95 | < 10 seconds |
| Churn (monthly) | < 5% |

## 14. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| User endpoints are slow/broken | Workers bottleneck | Per-job timeout enforcement, circuit breaker pattern |
| Scheduler single point of failure | All jobs stop | Leader election with hot standby, health check monitoring |
| Abuse (free tier spam) | Cost overrun | Rate limiting per project, anomaly detection, IP-based throttling |
| Vercel/Netlify improve native cron | Reduces demand | SDK differentiation — retries, fan-out, logging, monitoring are still valuable beyond basic scheduling. Multi-framework support means we're not tied to any single platform's decisions. |
| Low conversion free → paid | Revenue | Ensure free tier is useful but limited enough to upsell (5 jobs, 24h logs) |
| Inngest/Trigger.dev add framework-first DX | Competition | They went broad from day one — hard to retroactively deliver deep per-framework DX. Pingback's wedge advantage compounds with each framework added. |

## 15. Milestones

| Phase | Timeline | Deliverable |
|-------|----------|-------------|
| **Phase 1: Foundation** | Weeks 1-3 | Database schema, scheduler, worker, basic API, auth |
| **Phase 2: SDK** | Weeks 4-6 | `@pingback/core` + `@pingback/next` adapter, build plugin, route handler, function registration |
| **Phase 3: Dashboard** | Weeks 7-8 | Project/job/execution views, alerts |
| **Phase 4: Launch** | Week 9 | Landing page, docs, npm publish, launch on socials |
| **Phase 5: Tasks** | Weeks 10-12 | `ctx.task()` fan-out, child execution tracking |
| **Phase 6: Second Framework** | Weeks 13-15 | `@pingback/nuxt` or `@pingback/sveltekit` adapter (chosen based on demand signal) |
| **Phase 7: Scale** | Weeks 16+ | Team features, programmatic API, webhook alerts, additional framework adapters |
