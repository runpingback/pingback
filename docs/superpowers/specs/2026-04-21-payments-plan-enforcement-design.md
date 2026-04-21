# Payments & Plan Enforcement — Design Spec

**Date:** 2026-04-21

## Overview

Two-tier pricing: Free (limited) and Enterprise (unlimited, manual invoicing). No payment provider. Enterprise users contact via form, plan is toggled via database flag.

## Tiers

| | Free | Enterprise |
|---|---|---|
| Projects | 1 | Unlimited |
| Jobs | 5 | Unlimited |
| Executions/month | 1,000 | Unlimited |
| Log retention | 24 hours | 90 days |
| Retries | 1 | 10 |
| Fan-out tasks per run | 10 | 100 |
| Alerts | Email only | Email + webhook |
| Team members | 1 | Unlimited |
| Support | Community | Priority |

## Architecture

### User entity changes

Add to the User entity:
- `plan`: enum `'free' | 'enterprise'`, default `'free'`
- `executionsThisMonth`: int, default 0
- `executionsResetAt`: timestamp, set to 1st of next month on creation

### Plan limits config

A simple TypeScript object mapping plan to limits:

```typescript
const PLAN_LIMITS = {
  free: {
    projects: 1,
    jobs: 5,
    executionsPerMonth: 1000,
    retries: 1,
    fanOutPerRun: 10,
    logRetentionDays: 1,
    alertChannels: ['email'],
    teamMembers: 1,
  },
  enterprise: {
    projects: Infinity,
    jobs: Infinity,
    executionsPerMonth: Infinity,
    retries: 10,
    fanOutPerRun: 100,
    logRetentionDays: 90,
    alertChannels: ['email', 'webhook'],
    teamMembers: Infinity,
  },
};
```

### Enforcement points

| Action | Check | Error |
|--------|-------|-------|
| `POST /projects` | Count user's projects vs `limits.projects` | 403 "Project limit reached. Upgrade to Enterprise." |
| SDK registration (`POST /register`) | Count project's active jobs vs `limits.jobs` | 403 "Job limit reached (5/5). Upgrade to Enterprise." |
| Worker before execution | Check `user.executionsThisMonth < limits.executionsPerMonth` | Skip execution, mark as failed with "Execution limit reached" |
| Worker fan-out | Count tasks in response vs `limits.fanOutPerRun` | Truncate tasks array, log warning |
| `POST /alerts` | Check channel is in `limits.alertChannels` | 403 "Webhook alerts require Enterprise plan." |
| Job creation/update | Cap `retries` at `limits.retries` | Silently cap, don't error |

### Enforcement type

- **Hard limits** on projects, jobs, alerts — 403 error with upgrade message
- **Soft limit** on executions — warn at 80% (800/1000), block at 100%
- **Silent cap** on retries and fan-out — don't error, just enforce the max

### Monthly execution reset

Add to the scheduler service (which already ticks every 10 seconds):
- Check if `Date.now() > user.executionsResetAt`
- If so, reset `executionsThisMonth = 0` and set `executionsResetAt` to 1st of next month
- This runs lazily — only checked when the user's jobs execute, not a batch sweep

### Execution counting

In the worker, after marking an execution as `running`:
1. Load the project's user
2. Increment `user.executionsThisMonth`
3. If over limit, mark execution as failed with message "Monthly execution limit reached"
4. Save user

### Dashboard changes

#### Usage display

On the project settings page, add a "Usage" section showing:
- Jobs: `3 / 5` with a progress bar
- Executions this month: `847 / 1,000` with a progress bar
- Color: green < 80%, amber 80-99%, red at 100%

#### Upgrade CTA

- Banner at top of dashboard when any limit is at 80%+: "You've used 80% of your monthly executions. [Contact us to upgrade →]"
- When a limit is hit, error toast: "Job limit reached (5/5). Upgrade to Enterprise for unlimited jobs."
- Both link to `/enterprise-contact`

#### Contact form page

Create `/enterprise-contact` page with:
- Fields: Name, Email, Company, Message
- On submit: `POST /api/v1/enterprise-contact`
- Platform stores the inquiry in a `contact_inquiries` table and sends an email to the admin (you)
- Shows success message: "We'll be in touch within 24 hours."

Also accessible from the landing page pricing section.

### Contact inquiry entity

```typescript
@Entity('contact_inquiries')
class ContactInquiry {
  id: string;           // UUID
  name: string;
  email: string;
  company: string;
  message: string;
  createdAt: Date;
}
```

Endpoint: `POST /api/v1/enterprise-contact` — no auth required (public).

### Plan display

- Settings page shows current plan badge: "Free" or "Enterprise"
- If Enterprise, show "Enterprise plan" with a checkmark
- If Free, show "Free plan" with "Upgrade to Enterprise" button

### How to upgrade a user

Run SQL or use a simple API endpoint (admin-only, protected by a secret):
```
PATCH /api/v1/admin/users/:id/plan
Body: { "plan": "enterprise", "adminSecret": "..." }
```

This is a simple endpoint protected by an `ADMIN_SECRET` env var, not a full admin panel.

## File changes

### Platform
| File | Action |
|------|--------|
| `entities/user.entity.ts` | Add `plan`, `executionsThisMonth`, `executionsResetAt` columns |
| `common/plan-limits.ts` | Create — plan limits config object |
| `modules/projects/projects.service.ts` | Add project count check on create |
| `modules/projects/registration.service.ts` | Add job count check on register |
| `modules/worker/worker.service.ts` | Add execution count check + increment |
| `modules/alerts/alerts.service.ts` | Add channel check on create |
| `modules/contact/contact.entity.ts` | Create — ContactInquiry entity |
| `modules/contact/contact.module.ts` | Create — module |
| `modules/contact/contact.controller.ts` | Create — POST endpoint |
| `modules/admin/admin.controller.ts` | Create — PATCH plan endpoint |

### Dashboard
| File | Action |
|------|--------|
| `app/(dashboard)/[projectId]/settings/page.tsx` | Add usage bars and plan display |
| `app/(dashboard)/enterprise-contact/page.tsx` | Create — contact form page |
| `lib/hooks/use-usage.ts` | Create — hook to fetch usage data |
| `components/upgrade-banner.tsx` | Create — limit warning banner |

### Website
| File | Action |
|------|--------|
| `app/pricing` or pricing component | Update with Free/Enterprise tiers |
