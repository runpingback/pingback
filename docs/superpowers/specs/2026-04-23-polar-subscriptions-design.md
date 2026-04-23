# Polar.sh Subscriptions & Feature Guards — Design Spec

**Date:** 2026-04-23
**Replaces:** 2026-04-21-payments-plan-enforcement-design.md

## Overview

Three-tier pricing (Free / Pro $12/mo / Team $39/mo) powered by Polar.sh as the payment provider and merchant of record. Every user gets a Polar subscription — free users included. Plan state is cached locally on the User entity and kept in sync via Polar webhooks. Feature enforcement uses hard limits, soft limits, and silent caps. Users manage billing through Polar's hosted checkout and customer portal.

## Tiers

| | Free | Pro ($12/mo) | Team ($39/mo) |
|---|---|---|---|
| Projects | 1 | 5 | Unlimited |
| Jobs | 5 | 50 | Unlimited |
| Executions/month | 1,000 | 50,000 | 500,000 |
| Min interval | 1 minute | 10 seconds | 10 seconds |
| Log retention | 24 hours | 30 days | 90 days |
| Retries | 1 | 5 | 10 |
| Fan-out tasks/run | 0 | 10 | 100 |
| Alerts | Email | Email + webhook | Email + webhook |
| Team members | 1 | 1 | 10 |

No overage billing — hard caps at the execution limit. Overage billing may be added later.

## Data Model

### User entity additions

```typescript
@Column({ type: 'text', default: 'free' })
plan: 'free' | 'pro' | 'team';

@Column({ type: 'text', nullable: true, name: 'polar_customer_id' })
polarCustomerId: string | null;

@Column({ type: 'text', nullable: true, name: 'polar_subscription_id' })
polarSubscriptionId: string | null;

@Column({ type: 'int', default: 0, name: 'executions_this_month' })
executionsThisMonth: number;

@Column({ type: 'timestamp', nullable: true, name: 'executions_reset_at' })
executionsResetAt: Date;
```

No new tables. Plan state lives on User. Polar is the source of truth for billing; the local fields are a cache updated by webhooks.

### Plan limits config

```typescript
// modules/subscription/plan-limits.ts
export const PLAN_LIMITS = {
  free: {
    projects: 1,
    jobs: 5,
    executionsPerMonth: 1_000,
    minIntervalSeconds: 60,
    logRetentionDays: 1,
    retries: 1,
    fanOutPerRun: 0,
    alertChannels: ['email'],
    teamMembers: 1,
  },
  pro: {
    projects: 5,
    jobs: 50,
    executionsPerMonth: 50_000,
    minIntervalSeconds: 10,
    logRetentionDays: 30,
    retries: 5,
    fanOutPerRun: 10,
    alertChannels: ['email', 'webhook'],
    teamMembers: 1,
  },
  team: {
    projects: Infinity,
    jobs: Infinity,
    executionsPerMonth: 500_000,
    minIntervalSeconds: 10,
    logRetentionDays: 90,
    retries: 10,
    fanOutPerRun: 100,
    alertChannels: ['email', 'webhook'],
    teamMembers: 10,
  },
} as const;
```

## Polar Integration Flow

### Configuration

```typescript
// Added to config/configuration.ts
polar: {
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET,
  products: {
    free: process.env.POLAR_FREE_PRODUCT_ID,
    pro: process.env.POLAR_PRO_PRODUCT_ID,
    team: process.env.POLAR_TEAM_PRODUCT_ID,
  },
}
```

### Signup flow

1. User registers (existing auth flow)
2. `SubscriptionService.createFreeSubscription(user)` is called after user creation:
   - Creates a Polar customer via `POST /v1/customers/` with `external_id: user.id`, `email: user.email`
   - Creates a free subscription via `POST /v1/subscriptions/` (Polar allows programmatic creation for $0 products)
   - Saves `polarCustomerId` and `polarSubscriptionId` on User entity

### Upgrade flow

1. User clicks "Upgrade to Pro" or "Upgrade to Team" in dashboard
2. Dashboard calls `POST /api/v1/subscription/checkout` with `{ plan: 'pro' | 'team' }`
3. Platform creates Polar checkout session via SDK with `external_customer_id: user.id` and `success_url` pointing back to dashboard
4. Returns checkout URL to dashboard
5. Dashboard redirects user to Polar's hosted checkout page
6. After payment, Polar sends `subscription.active` webhook
7. Webhook handler maps the Polar product ID to a plan and updates `user.plan`

### Manage/cancel flow

1. User clicks "Manage Billing" in dashboard settings
2. Dashboard calls `GET /api/v1/subscription/portal`
3. Platform creates a Polar customer session, returns portal URL
4. Dashboard redirects to Polar's customer portal
5. Any changes trigger webhooks
6. Webhook handler updates `user.plan` accordingly

### Webhook events handled

| Event | Action |
|-------|--------|
| `subscription.active` | Map product ID to plan, update `user.plan` |
| `subscription.updated` | Update plan if product changed |
| `subscription.canceled` | Keep current plan until period ends (Polar handles end-of-period) |
| `subscription.revoked` | Set `user.plan` back to `free`, create free subscription |

Product-to-plan mapping is derived from the `POLAR_*_PRODUCT_ID` env vars. The webhook handler reverse-maps the product ID from the event payload to determine which plan to set.

## Enforcement

### Enforcement points

| Action | Check | Type | Response |
|--------|-------|------|----------|
| `POST /projects` | User's project count vs `limits.projects` | Hard | 403 "Project limit reached (1/1). Upgrade your plan." |
| Job registration (`POST /register`) | Project's job count vs `limits.jobs` | Hard | 403 "Job limit reached (5/5). Upgrade your plan." |
| Job creation/update | Cron interval vs `limits.minIntervalSeconds` | Hard | 400 "Minimum interval is 60s on Free plan." |
| Worker before execution | `user.executionsThisMonth < limits.executionsPerMonth` | Soft | Skip execution, mark failed: "Monthly execution limit reached" |
| Worker fan-out | Task count vs `limits.fanOutPerRun` | Silent | Truncate tasks array to limit, log warning |
| Job creation/update retries | `retries` vs `limits.retries` | Silent | Cap to max, no error |
| `POST /alerts` | Channel in `limits.alertChannels` | Hard | 403 "Webhook alerts require Pro or Team plan." |

### Enforcement types

- **Hard limits** — 403 error with upgrade message. Blocks the action.
- **Soft limit** — Execution counter. Warn at 80%, block at 100%. Execution is marked failed with a message.
- **Silent cap** — Value is capped to the plan max without returning an error.

### Soft lock on downgrade

When a user downgrades (e.g., Pro → Free) and their resources exceed the new plan's limits:
- All existing resources stay (no data loss)
- New resource creation is blocked
- Excess jobs skip execution — worker checks if user is over the job limit
- User sees: "You have 30/5 jobs. Delete or pause jobs to resume execution."

### Execution counter

- Incremented in Worker after marking execution as `running`
- Lazy reset: before incrementing, check if `Date.now() > executionsResetAt`. If so, reset `executionsThisMonth = 0` and set `executionsResetAt` to 1st of next month.

### PlanLimitsService API

```typescript
canCreateProject(user: User): { allowed: boolean; message?: string }
canCreateJob(user: User, projectId: string): { allowed: boolean; message?: string }
canExecute(user: User): { allowed: boolean; message?: string }
checkInterval(user: User, intervalSeconds: number): { allowed: boolean; message?: string }
capRetries(user: User, retries: number): number
capFanOut(user: User, tasks: any[]): any[]
getUsage(user: User): { projects: { used: number; limit: number }; jobs: { used: number; limit: number }; executions: { used: number; limit: number }; plan: string }
```

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST /api/v1/subscription/checkout` | JWT | Create Polar checkout session, return URL |
| `GET /api/v1/subscription/portal` | JWT | Get Polar customer portal URL |
| `GET /api/v1/subscription/usage` | JWT | Return current usage + limits |
| `POST /api/v1/webhooks/polar` | Polar signature | Receive Polar webhook events |

## Dashboard Changes

### Plan & Billing section (settings page)

- Current plan badge: "Free" / "Pro" / "Team"
- Usage bars:
  - Jobs: `3 / 5` with progress bar
  - Executions this month: `847 / 1,000` with progress bar
  - Color: green < 80%, amber 80–99%, red at 100%
- "Upgrade" button (Free/Pro users) → creates checkout session, redirects to Polar
- "Manage Billing" button (Pro/Team users) → redirects to Polar customer portal

### Upgrade banner

- Shown at top of dashboard when any resource is at 80%+
- "You've used 80% of your monthly executions. [Upgrade →]"

### Limit hit toasts

- When a 403 comes back from a gated action: "Job limit reached (5/5). Upgrade for more."

## Website Changes

- Update pricing component CTA buttons: Pro and Team link to checkout flow (register first if not logged in, then redirect to Polar checkout)

## File Changes

### Platform

| File | Action |
|------|--------|
| `entities/user.entity.ts` | Add `plan`, `polarCustomerId`, `polarSubscriptionId`, `executionsThisMonth`, `executionsResetAt` |
| `config/configuration.ts` | Add `polar` config block |
| `modules/subscription/subscription.module.ts` | Create — register services, controllers |
| `modules/subscription/subscription.service.ts` | Create — Polar API wrapper (create customer, checkout, portal) |
| `modules/subscription/subscription.controller.ts` | Create — checkout, portal, usage endpoints |
| `modules/subscription/webhook.controller.ts` | Create — Polar webhook handler |
| `modules/subscription/plan-limits.ts` | Create — PLAN_LIMITS config object |
| `modules/subscription/plan-limits.service.ts` | Create — enforcement checks |
| `modules/projects/projects.service.ts` | Add project count check via PlanLimitsService |
| `modules/jobs/jobs.service.ts` | Add job count + interval + retry cap checks |
| `modules/worker/worker.service.ts` | Add execution count check, increment, lazy reset, fan-out cap |
| `modules/alerts/alerts.service.ts` | Add alert channel check |
| `modules/auth/auth.service.ts` | Call SubscriptionService.createFreeSubscription on signup |
| `app.module.ts` | Register SubscriptionModule |

### Dashboard

| File | Action |
|------|--------|
| `app/(dashboard)/[projectId]/settings/page.tsx` | Add Plan & Billing section with usage bars |
| `components/upgrade-banner.tsx` | Create — limit warning banner |
| `lib/hooks/use-subscription.ts` | Create — fetch usage/plan data |
| `lib/api.ts` (or equivalent) | Add checkout/portal API calls |

### Website

| File | Action |
|------|--------|
| `components/pricing.tsx` | Update CTA buttons for Pro/Team |

### Config

| File | Action |
|------|--------|
| `.env.example` | Add `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_FREE_PRODUCT_ID`, `POLAR_PRO_PRODUCT_ID`, `POLAR_TEAM_PRODUCT_ID` |
