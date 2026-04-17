# Pingback Platform & SDK — Technical Spec

**Scope:** Phase 1 (Foundation) + Phase 2 (SDK) — everything needed to define a cron function in code and have Pingback run it reliably.

**Date:** 2026-04-14

---

## 1. Monorepo Structure

npm workspaces monorepo:

```
pingback/
├── package.json                  # root workspace config
├── tsconfig.base.json            # shared TS config
├── packages/
│   ├── core/                     # @pingback/core — framework-agnostic SDK logic
│   │   ├── src/
│   │   │   ├── registry.ts       # function registry (stores cron/task definitions)
│   │   │   ├── context.ts        # ctx object (log, attempt, executionId, scheduledAt)
│   │   │   ├── signing.ts        # HMAC-SHA256 verification
│   │   │   ├── registration.ts   # API client for registering functions with platform
│   │   │   └── types.ts          # shared types (JobDefinition, ExecutionPayload, etc.)
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── next/                     # @pingback/next — Next.js adapter
│       ├── src/
│       │   ├── plugin.ts         # Next.js build plugin (scans for cron/task calls, registers)
│       │   ├── handler.ts        # auto-generated route handler at /api/__pingback
│       │   └── index.ts          # re-exports cron(), task() from core + Next.js-specific wiring
│       ├── package.json
│       └── tsconfig.json
├── apps/
│   ├── platform/                 # NestJS app — API server + scheduler
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/         # JWT, API keys, GitHub OAuth
│   │   │   │   ├── projects/     # CRUD, cron secret generation
│   │   │   │   ├── jobs/         # CRUD, pause/resume, immediate trigger
│   │   │   │   ├── executions/   # logs, status tracking
│   │   │   │   ├── scheduler/    # tick loop, job enqueueing
│   │   │   │   └── alerts/       # email alerts on failure
│   │   │   └── main.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── worker/                   # NestJS app — pulls from queue, dispatches HTTP calls
│   │   ├── src/
│   │   │   ├── dispatcher.ts     # HTTP request to user's app
│   │   │   ├── signer.ts         # HMAC-SHA256 signing
│   │   │   └── main.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── dashboard/                # Next.js 15 app — UI (Phase 3, stubbed here)
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
└── shared/
    └── types/                    # shared TypeScript types between platform, worker, dashboard
        ├── src/
        │   └── index.ts
        ├── package.json
        └── tsconfig.json
```

Key decisions:
- `shared/types` is a separate workspace package so platform, worker, and dashboard import the same types without circular dependencies.
- `packages/core` does NOT depend on anything in `apps/` or `shared/` — it's a standalone npm package.
- `apps/worker` is its own process, separate from `apps/platform`, so it can scale independently.
- `apps/dashboard` is stubbed but not part of this spec (Phase 3).

## 2. Database Schema

PostgreSQL with TypeORM.

### users

```
id              UUID PRIMARY KEY (generated)
email           TEXT UNIQUE NOT NULL
name            TEXT
password_hash   TEXT NULL                  -- null for OAuth-only users
github_id       TEXT UNIQUE NULL
avatar_url      TEXT NULL
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

### projects

```
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users ON DELETE CASCADE
name            TEXT NOT NULL
domain          TEXT NULL                  -- e.g., myapp.vercel.app
cron_secret     TEXT NOT NULL              -- AES-256 encrypted, used for HMAC signing
endpoint_url    TEXT NOT NULL              -- e.g., https://myapp.vercel.app/api/__pingback
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()

UNIQUE(user_id, name)
```

### api_keys

```
id              UUID PRIMARY KEY
project_id      UUID REFERENCES projects ON DELETE CASCADE
name            TEXT NOT NULL              -- user-given label
key_hash        TEXT NOT NULL              -- bcrypt hash, raw key shown once on creation
key_prefix      TEXT NOT NULL              -- first 8 chars, for identification in UI
last_used_at    TIMESTAMP NULL
created_at      TIMESTAMP DEFAULT NOW()

INDEX(key_hash)
```

API keys are project-scoped and separated into their own table so users can have multiple keys, rotate them, and track usage per key.

### jobs

```
id              UUID PRIMARY KEY
project_id      UUID REFERENCES projects ON DELETE CASCADE
name            TEXT NOT NULL              -- e.g., "send-review-emails"
schedule        TEXT NOT NULL              -- cron expression
status          ENUM('active', 'paused', 'inactive') DEFAULT 'active'
next_run_at     TIMESTAMP NULL
last_run_at     TIMESTAMP NULL
retries         INT DEFAULT 0
timeout_seconds INT DEFAULT 30
concurrency     INT DEFAULT 1
source          ENUM('sdk', 'manual') DEFAULT 'sdk'
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()

UNIQUE(project_id, name)
INDEX(status, next_run_at)                -- scheduler query
```

Status meanings:
- `active` — running on schedule
- `paused` — user-initiated pause via API/dashboard
- `inactive` — auto-deactivated because the function was removed from code on redeploy

### executions

```
id              UUID PRIMARY KEY
job_id          UUID REFERENCES jobs ON DELETE CASCADE
status          ENUM('pending', 'running', 'success', 'failed') DEFAULT 'pending'
attempt         INT DEFAULT 1
scheduled_at    TIMESTAMP NOT NULL
started_at      TIMESTAMP NULL
completed_at    TIMESTAMP NULL
duration_ms     INT NULL
http_status     INT NULL
response_body   TEXT NULL                  -- truncated at 10KB
error_message   TEXT NULL
logs            JSONB DEFAULT '[]'         -- ctx.log() entries
created_at      TIMESTAMP DEFAULT NOW()

INDEX(job_id, created_at DESC)            -- execution history query
INDEX(status)                             -- worker query
```

Logs are stored as JSONB: `[{ "timestamp": 1713091800000, "message": "Found 12 pending emails" }]`.

Retries create new execution rows with `attempt + 1` rather than updating the existing row. No `retrying` status — a failed execution with remaining retries spawns a new `pending` execution.

No `parent_id` field — fan-out tasks are post-MVP.

### alerts

```
id                UUID PRIMARY KEY
project_id        UUID REFERENCES projects ON DELETE CASCADE
job_id            UUID REFERENCES jobs NULL  -- null = project-level alert
channel           ENUM('email') DEFAULT 'email'
target            TEXT NOT NULL              -- email address
trigger_type      ENUM('consecutive_failures', 'duration_exceeded', 'missed_run')
trigger_value     INT NOT NULL              -- e.g., 3 consecutive failures, or 5000ms duration
enabled           BOOLEAN DEFAULT true
last_fired_at     TIMESTAMP NULL
cooldown_seconds  INT DEFAULT 3600          -- don't re-fire within this window
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()
```

Webhook alerts are post-MVP. Only email channel at launch.

## 3. Platform API

NestJS app (`apps/platform`) serving REST endpoints.

### 3.1 Authentication

Two auth mechanisms:

**Dashboard auth (cookie-based):**
- `POST /auth/register` — email + password signup
- `POST /auth/login` — email + password login, returns JWT in httpOnly cookie
- `GET /auth/github` — redirects to GitHub OAuth
- `GET /auth/github/callback` — handles OAuth callback, creates/links user, sets cookie
- `POST /auth/logout` — clears cookie

**API key auth (header-based):**
- All `/api/v1/*` endpoints accept `Authorization: Bearer {api_key}`
- Middleware hashes the incoming key, looks up `api_keys` table by `key_hash`
- Resolves to a project context (not user context — API keys are project-scoped)

Both auth paths go through a NestJS guard. Dashboard routes require user context, API routes accept either user session or API key.

### 3.2 REST Endpoints

**Projects**
```
POST   /api/v1/projects              — create project (generates cron_secret, returns raw secret once)
GET    /api/v1/projects              — list user's projects
GET    /api/v1/projects/:id          — get project detail
PATCH  /api/v1/projects/:id          — update project (name, domain, endpoint_url)
DELETE /api/v1/projects/:id          — delete project (cascades jobs, executions)
```

**API Keys**
```
POST   /api/v1/projects/:id/keys     — create API key (returns raw key once)
GET    /api/v1/projects/:id/keys     — list keys (prefix + name only, never the raw key)
DELETE /api/v1/projects/:id/keys/:keyId — revoke key
```

**Jobs**
```
POST   /api/v1/jobs                  — create job (manual source)
GET    /api/v1/jobs                  — list jobs (filterable by project_id, status)
GET    /api/v1/jobs/:id              — get job detail
PATCH  /api/v1/jobs/:id              — update job (schedule, retries, timeout, concurrency)
DELETE /api/v1/jobs/:id              — delete job
POST   /api/v1/jobs/:id/pause       — pause job
POST   /api/v1/jobs/:id/resume      — resume job
POST   /api/v1/jobs/:id/trigger     — trigger immediate run (see below)
```

**Immediate Trigger (`POST /api/v1/jobs/:id/trigger`):**
Bypasses the scheduler. Creates an execution row with `status = 'pending'` and `scheduled_at = NOW()`, then enqueues it directly to BullMQ. Does not affect `next_run_at` — the next scheduled run still fires on time. Subject to the same concurrency check as scheduled runs.

**Executions**
```
GET    /api/v1/jobs/:id/executions   — list executions (paginated, newest first)
GET    /api/v1/executions/:id        — get execution detail
```

**Alerts**
```
POST   /api/v1/alerts                — create alert
GET    /api/v1/alerts                — list alerts (filterable by project_id, job_id)
PATCH  /api/v1/alerts/:id            — update alert
DELETE /api/v1/alerts/:id            — delete alert
```

### 3.3 SDK Registration Endpoint

```
POST   /api/v1/register
```

Request body:
```json
{
  "project_id": "uuid",
  "functions": [
    {
      "name": "send-review-emails",
      "type": "cron",
      "schedule": "*/15 * * * *",
      "options": { "retries": 3, "timeout": 60, "concurrency": 1 }
    }
  ]
}
```

Authenticated via API key (`Authorization: Bearer {api_key}` from `pingback.config.ts`).

Behavior:
- Creates new jobs for functions not yet in the database
- Updates existing jobs if schedule or options changed
- Sets `status = 'inactive'` on any existing SDK-sourced jobs NOT in the incoming list (auto-deactivation)
- Calculates `next_run_at` for new/updated jobs using `cron-parser`
- Returns confirmation with the list of active jobs

## 4. Scheduler

Runs inside `apps/platform` as a NestJS service.

### 4.1 Tick Loop

Runs every 10 seconds via `setInterval`:

1. Query: `SELECT * FROM jobs WHERE status = 'active' AND next_run_at <= NOW() FOR UPDATE SKIP LOCKED`
2. For each matched job, check concurrency: count executions where `job_id = job.id AND status IN ('pending', 'running')`. If count >= `job.concurrency`, skip.
3. Create an execution row with `status = 'pending'`
4. Enqueue a message to BullMQ (see queue message format below)
5. Update `job.next_run_at` to the next occurrence using `cron-parser`
6. Update `job.last_run_at = NOW()`

### 4.2 Missed Runs

If the scheduler was down and `next_run_at` is in the past:
- Enqueue one catch-up run (not multiple for each missed tick)
- Advance `next_run_at` to the next future occurrence

### 4.3 Cron Secret Handling

Cron secrets are AES-256 encrypted at rest. The scheduler decrypts them at enqueue time and passes the raw secret in the queue message. The raw secret sits in Redis transiently — acceptable because Redis is internal infrastructure and messages are consumed quickly.

API keys use bcrypt hashing (one-way, never retrieved). Cron secrets use AES-256 encryption (reversible, platform needs them for signing).

### 4.4 Queue Message Format

```json
{
  "executionId": "uuid",
  "jobId": "uuid",
  "projectId": "uuid",
  "functionName": "send-review-emails",
  "endpointUrl": "https://myapp.vercel.app/api/__pingback",
  "cronSecret": "raw_decrypted_secret",
  "attempt": 1,
  "maxRetries": 3,
  "timeoutSeconds": 60,
  "scheduledAt": "2026-04-14T10:30:00Z"
}
```

### 4.5 Cron Parsing

Use the `cron-parser` library for standard 5-field cron expressions. Additionally, support `@every <duration>` shorthand (e.g., `@every 15m`, `@every 2h`) via custom parsing that converts to a fixed-interval schedule. The `@every` syntax is parsed before passing to `cron-parser` — it translates to a cron expression where possible (e.g., `@every 15m` → `*/15 * * * *`) or falls back to a fixed-interval mechanism stored as metadata on the job.

### 4.6 Missed Run Alerts

During the tick loop, the scheduler also evaluates `missed_run` alerts: if a job's `next_run_at` is more than `trigger_value` seconds in the past and no execution exists for that window, fire the alert (respecting cooldown).

## 5. Worker

Separate NestJS process (`apps/worker`) consuming from BullMQ.

### 5.1 Dispatch Flow

1. Pull message from queue
2. Update execution: `status = 'running'`, `started_at = NOW()`
3. Build the request payload:
   ```json
   {
     "function": "send-review-emails",
     "executionId": "exec_abc123",
     "attempt": 1,
     "scheduledAt": "2026-04-14T10:30:00Z"
   }
   ```
4. Sign: `HMAC-SHA256(JSON.stringify(payload), cronSecret)` → set as `X-Pingback-Signature` header
5. Set `X-Pingback-Timestamp` header (for replay protection — SDK rejects requests older than 5 minutes)
6. Send `POST` to `endpointUrl`
7. Wait for response up to `timeoutSeconds`

### 5.2 Response Handling

**Success (2xx):**
- Update execution: `status = 'success'`, `completed_at = NOW()`, `duration_ms`, `http_status`, `response_body` (truncated to 10KB), `logs` (from response body)

**Failure (non-2xx, timeout, network error):**
- Update execution: `status = 'failed'`, `completed_at = NOW()`, `error_message`, `http_status` (if available)
- If `attempt < maxRetries + 1`:
  - Create a new execution row with `attempt + 1`, `status = 'pending'`
  - Re-enqueue to BullMQ with exponential backoff: `delay = min(2^attempt * 1000, 300000)` (1s, 2s, 4s, 8s... capped at 5 minutes)
- If retries exhausted:
  - Evaluate alert rules (see Section 8)

### 5.3 Non-Retryable Failures

Some failures should not be retried:
- `401` — signature verification failed. Error: "Signature verification failed. Check your PINGBACK_SIGNING_SECRET."
- `404` — route not found. Error: "Route /api/__pingback not found. Ensure withPingback() is configured."

These are marked `failed` immediately with no retry, regardless of retry config.

### 5.4 Concurrency

BullMQ's built-in concurrency controls how many jobs one worker process handles simultaneously. Default: 10 concurrent jobs per worker process. This is separate from per-job concurrency (enforced by the scheduler).

### 5.5 Idempotency

The `executionId` is included in the queue message. Before dispatching, the worker checks if the execution is already `running` or `success`. If so, it skips. Prevents double-dispatch on rare duplicate message delivery.

## 6. SDK — @pingback/core

Framework-agnostic package. Not installed directly by users.

### 6.1 Function Registry

In-memory registry populated by `cron()` and `task()` calls:

```ts
const registry = new Map<string, FunctionDefinition>();

function cron(name, schedule, handler, options?) {
  registry.set(name, { name, type: 'cron', schedule, handler, options });
  return { name, type: 'cron' };
}

function task(name, handler, options?) {
  registry.set(name, { name, type: 'task', handler, options });
  return { name, type: 'task' };
}
```

These are side-effect functions — calling them registers metadata. The build plugin extracts metadata via AST analysis, not by executing them.

### 6.2 Context Object

Created per-execution when the route handler receives a request:

```ts
function createContext(payload) {
  const logs = [];
  return {
    executionId: payload.executionId,
    attempt: payload.attempt,
    scheduledAt: new Date(payload.scheduledAt),
    log(message: string) {
      logs.push({ timestamp: Date.now(), message });
    },
    async task(name: string, payload: any) {
      // Post-MVP stub
      throw new Error('ctx.task() is not available in the current plan. Upgrade to Pro for fan-out tasks.');
    },
    _getLogs() { return logs; }
  };
}
```

`ctx.log()` collects logs in-memory. They're included in the response body so the worker can persist them to the `logs` JSONB column.

### 6.3 Request Verification

```ts
function verifySignature(payload, signature, timestamp, secret) {
  // Reject if timestamp is older than 5 minutes (replay protection)
  if (Date.now() - timestamp > 5 * 60 * 1000) return false;

  const expected = hmacSHA256(JSON.stringify(payload), secret);
  return timingSafeEqual(expected, signature);
}
```

Shared across all framework adapters.

### 6.4 Response Format

Every execution returns this structure to the worker:

```json
{
  "status": "success",
  "result": { "processed": 12 },
  "logs": [
    { "timestamp": 1713091800000, "message": "Found 12 pending emails" },
    { "timestamp": 1713091804000, "message": "All emails sent" }
  ],
  "durationMs": 4523
}
```

On error:
```json
{
  "status": "error",
  "error": "Connection refused: smtp.example.com",
  "logs": [...],
  "durationMs": 1200
}
```

## 7. SDK — @pingback/next

Next.js adapter. Thin wrapper over `@pingback/core`.

### 7.1 User-Facing API

Three touchpoints:

```ts
// 1. pingback.config.ts (project root)
import { defineConfig } from "@pingback/next";
export default defineConfig({
  apiKey: process.env.PINGBACK_API_KEY,
  signingSecret: process.env.PINGBACK_SIGNING_SECRET,
});

// 2. next.config.ts
import { withPingback } from "@pingback/next/plugin";
export default withPingback({ /* normal next config */ });

// 3. lib/pingback/my-job.ts (define functions anywhere)
import { cron } from "@pingback/next";
export const myJob = cron("my-job", "*/15 * * * *", async (ctx) => {
  ctx.log("Starting");
  // do work
  return { done: true };
}, { retries: 3, timeout: "60s", concurrency: 1 });
```

No route file to create manually. No `serve()` call.

### 7.2 Build Plugin

`withPingback()` wraps the Next.js config and adds a webpack/turbopack plugin:

1. **Scan** — find all imports of `cron()` and `task()` from `@pingback/next`. Extract function name, schedule, and options from the AST (first two arguments must be string literals, options must be a static object).
2. **Register** — call `POST /api/v1/register` with the list of discovered functions. Auto-deactivates any SDK-sourced jobs not in the list.
3. **Generate route** — emit a catch-all route handler at `app/api/__pingback/route.ts` into the build output. This file imports all discovered function modules and wires them to the handler.

If a user uses dynamic values for the schedule (variable instead of string literal), the plugin warns at build time and skips that function.

### 7.3 Auto-Generated Route Handler

On `POST /api/__pingback`:
1. Parse JSON body
2. Verify HMAC signature via `@pingback/core`'s `verifySignature`
3. Look up function by name in the registry
4. Create context via `@pingback/core`'s `createContext`
5. Execute the handler, catch errors
6. Return structured response (status, result, logs, durationMs)

### 7.4 Startup Verification

On the first incoming request to `/api/__pingback`:
1. Collect all registered functions from the registry
2. Call `POST /api/v1/register` to verify they match what was registered at build time
3. Cache the result — don't re-verify on subsequent requests

### 7.5 Fixed Route Path

The route is always `/api/__pingback`. Not configurable in MVP.

## 8. Alert Evaluation

### 8.1 When Alerts Are Checked

- **`consecutive_failures`** — checked by the worker after an execution permanently fails (retries exhausted). Count the last N executions where `status = 'failed'` and `attempt` equals max attempt. If count >= `trigger_value`, fire.
- **`duration_exceeded`** — checked by the worker on any completed execution (success or failure). If `duration_ms > trigger_value`, fire.
- **`missed_run`** — checked by the scheduler during the tick loop. If a job's `next_run_at` is more than `trigger_value` seconds in the past and no execution exists for that window, fire.

### 8.2 Deduplication

Alerts have `last_fired_at` and `cooldown_seconds` (default 3600). The same alert won't fire again within the cooldown window.

### 8.3 Email Sending

A shared `AlertService` sends via Resend. Template: "Job `{job_name}` in project `{project_name}` failed {N} consecutive times. Last error: {error_message}. View in dashboard: {link}."

## 9. Environment Variables

### Platform (`apps/platform`)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
ENCRYPTION_KEY=...                    # AES-256 key for cron secrets
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
RESEND_API_KEY=...
DASHBOARD_URL=http://localhost:3000   # for CORS + alert email links
```

### Worker (`apps/worker`)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
RESEND_API_KEY=...
```

The worker does not need `ENCRYPTION_KEY`. The scheduler decrypts cron secrets at enqueue time and passes them in the queue message.

### Dashboard (`apps/dashboard`)
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

## 10. Error Handling & Edge Cases

### SDK Route Handler

| Scenario | Response |
|----------|----------|
| Invalid/missing signature | `401` — `{ error: "Invalid signature" }` |
| Unknown function name | `404` — `{ error: "Function not found: {name}" }` |
| Function throws | `500` — `{ status: "error", error: error.message, logs }` |
| Function hangs | Worker-side timeout aborts the HTTP request |

### Worker

| Scenario | Behavior |
|----------|----------|
| App down (connection refused) | `failed`, retry with backoff |
| `401` (bad secret) | `failed`, no retry. "Check your PINGBACK_SIGNING_SECRET." |
| `404` (route missing) | `failed`, no retry. "Ensure withPingback() is configured." |
| Timeout | `failed`, retry with backoff |
| Response > 10KB | Truncate, store first 10KB |
| Duplicate message | Idempotency check on executionId, skip if already running/completed |

### Scheduler

| Scenario | Behavior |
|----------|----------|
| Multiple instances | `FOR UPDATE SKIP LOCKED` prevents double-processing |
| Was down for hours | Single catch-up run per job, advance `next_run_at` |
| Invalid cron expression | Log error, set job `status = 'paused'`, alert |
| Database connection lost | Tick fails, retries next tick (10s). Log error. |

### Registration

| Scenario | Behavior |
|----------|----------|
| Build-time registration fails (network) | Build fails with clear error. User fixes and rebuilds. |
| Startup verification mismatch | Log warning, don't block. Build-time registration is source of truth. |
| Concurrent deploys race | Last write wins. Most recent register call is truth. |

## 11. Out of Scope (Post-MVP)

- Fan-out tasks (`ctx.task()`) — stubbed with error message
- Additional framework adapters (`@pingback/nuxt`, `@pingback/sveltekit`)
- Webhook alert channel
- Team features (multi-user, permissions)
- Custom timezone support (UTC only)
- Execution timeline charts
- Dashboard UI (Phase 3)
- Configurable route path
