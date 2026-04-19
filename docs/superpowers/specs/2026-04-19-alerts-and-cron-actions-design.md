# Alerts Page & Cron Actions — Design Spec

**Date:** 2026-04-19

---

## Scope

Two additions to the dashboard:

1. **Alerts page** — full CRUD UI for alert rules, wired to existing backend endpoints
2. **Crons page actions** — pause/resume, run now, and delete actions per job

## 1. Alerts Page

### Backend (already exists)

- `POST /api/v1/projects/:projectId/alerts` — create alert
- `GET /api/v1/projects/:projectId/alerts` — list alerts
- `PATCH /api/v1/projects/:projectId/alerts/:id` — update alert
- `DELETE /api/v1/projects/:projectId/alerts/:id` — delete alert

### Frontend

**Hooks needed** (`lib/hooks/useAlerts.ts`):
- `useAlerts(projectId)` — query, key `["alerts", projectId]`
- `useCreateAlert(projectId)` — mutation, invalidates `["alerts", projectId]`
- `useUpdateAlert(projectId)` — mutation, invalidates `["alerts", projectId]`
- `useDeleteAlert(projectId)` — mutation, invalidates `["alerts", projectId]`

**Page layout** (`[projectId]/alerts/page.tsx`):
- PageHeader with title "Alerts" and "Create Alert" button
- DataTable when alerts exist, EmptyState when none
- Columns:
  - **Target** — email address
  - **Trigger** — human-readable (e.g., "3 consecutive failures", "Duration > 5s", "Missed run")
  - **Scope** — job name or "All jobs"
  - **Status** — enabled/disabled badge
  - **Actions** — edit, delete via dropdown menu

**Create/Edit Alert Dialog** (`components/alert-dialog.tsx`):
- Target email input
- Trigger type select: consecutive_failures, duration_exceeded, missed_run
- Trigger value number input with contextual label:
  - consecutive_failures → "after N failures"
  - duration_exceeded → "exceeds N seconds"
  - missed_run → "missed by N minutes"
- Job scope select: "All jobs" (null jobId) + list from `useJobs(projectId)`
- Enabled toggle (default true)
- Reused for both create and edit modes (edit pre-fills fields)

**Delete:** confirmation via `confirm()` dialog + toast, same pattern as api-keys.

## 2. Crons Page Actions

### Backend (already exists)

- `POST /api/v1/projects/:projectId/jobs/:id/run` — trigger immediate run
- `PATCH /api/v1/projects/:projectId/jobs/:id` — update job (pause/resume)
- `DELETE /api/v1/projects/:projectId/jobs/:id` — delete job

### Frontend

**Hooks needed** (`lib/hooks/useJobs.ts` — extend existing):
- `useRunJob(projectId)` — mutation, invalidates `["jobs", projectId]`
- `useUpdateJob(projectId)` — mutation, invalidates `["jobs", projectId]`
- `useDeleteJob(projectId)` — mutation, invalidates `["jobs", projectId]`

**Crons page changes** (`[projectId]/crons/page.tsx`):
- Add Actions column to DataTable with a dropdown menu (DropdownMenu from shadcn)
- Menu items:
  - **Run Now** — calls `useRunJob`, toast on success/failure
  - **Pause** / **Resume** — label toggles based on `job.status`, calls `useUpdateJob` with `{ status: "paused" | "active" }`
  - **Delete** — `confirm()` dialog, calls `useDeleteJob`, toast on success

## Patterns to Follow

- All hooks follow existing patterns in `lib/hooks/` (useQuery/useMutation with invalidation)
- Toast notifications via sonner for all mutations
- DataTable component for list rendering
- PageHeader for page title + action buttons
- Dialog components for create/edit forms
