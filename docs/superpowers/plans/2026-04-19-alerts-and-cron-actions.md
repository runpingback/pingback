# Alerts Page & Cron Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Wire up the alerts page with full CRUD and add pause/resume, run now, and delete actions to the crons page.

**Architecture:** Two independent pieces of dashboard work. (1) New `use-alerts.ts` hooks + `alert-dialog.tsx` create/edit dialog + rewrite of `alerts/page.tsx` to use DataTable. (2) New mutation hooks in `use-jobs.ts` + actions column with DropdownMenu in `crons/page.tsx`.

**Tech Stack:** React 19, Next.js 15, React Query, shadcn/ui (Dialog, DropdownMenu, Button, Input, Label), Tabler Icons, sonner toasts.

---

### Task 1: Alert hooks

**Files:**
- Create: `apps/dashboard/lib/hooks/use-alerts.ts`

- [x] **Step 1: Create the alerts hooks file**

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface Alert {
  id: string;
  projectId: string;
  jobId: string | null;
  channel: "email";
  target: string;
  triggerType: "consecutive_failures" | "duration_exceeded" | "missed_run";
  triggerValue: number;
  enabled: boolean;
  lastFiredAt: string | null;
  cooldownSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertInput {
  jobId?: string;
  channel: "email";
  target: string;
  triggerType: "consecutive_failures" | "duration_exceeded" | "missed_run";
  triggerValue: number;
  cooldownSeconds?: number;
}

export interface UpdateAlertInput {
  target?: string;
  triggerType?: "consecutive_failures" | "duration_exceeded" | "missed_run";
  triggerValue?: number;
  enabled?: boolean;
  cooldownSeconds?: number;
}

export function useAlerts(projectId: string) {
  return useQuery({
    queryKey: ["alerts", projectId],
    queryFn: () =>
      apiClient.get<Alert[]>(
        `/api/v1/projects/${projectId}/alerts`
      ),
    enabled: !!projectId,
  });
}

export function useCreateAlert(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAlertInput) =>
      apiClient.post<Alert>(
        `/api/v1/projects/${projectId}/alerts`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts", projectId] });
    },
  });
}

export function useUpdateAlert(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateAlertInput & { id: string }) =>
      apiClient.patch<Alert>(
        `/api/v1/projects/${projectId}/alerts/${id}`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts", projectId] });
    },
  });
}

export function useDeleteAlert(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/api/v1/projects/${projectId}/alerts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts", projectId] });
    },
  });
}
```

- [x] **Step 2: Verify the file compiles**

Run: `cd apps/dashboard && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `use-alerts.ts`

- [x] **Step 3: Commit**

```bash
git add apps/dashboard/lib/hooks/use-alerts.ts
git commit -m "feat(dashboard): add React Query hooks for alerts CRUD"
```

---

### Task 2: Create/Edit Alert Dialog

**Files:**
- Create: `apps/dashboard/components/alert-dialog.tsx`

This dialog is used for both creating and editing alerts. When `alert` prop is provided, it pre-fills the form for editing.

- [x] **Step 1: Create the alert dialog component**

```typescript
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IconPlus } from "@tabler/icons-react";
import {
  useCreateAlert,
  useUpdateAlert,
  type Alert,
  type CreateAlertInput,
} from "@/lib/hooks/use-alerts";
import { useJobs, type Job } from "@/lib/hooks/use-jobs";
import { toast } from "sonner";

const TRIGGER_LABELS: Record<CreateAlertInput["triggerType"], string> = {
  consecutive_failures: "Consecutive failures",
  duration_exceeded: "Duration exceeded",
  missed_run: "Missed run",
};

const VALUE_LABELS: Record<CreateAlertInput["triggerType"], string> = {
  consecutive_failures: "Number of failures",
  duration_exceeded: "Seconds",
  missed_run: "Minutes overdue",
};

interface AlertDialogProps {
  projectId: string;
  alert?: Alert;
  trigger?: React.ReactNode;
  onClose?: () => void;
}

export function AlertDialog({
  projectId,
  alert,
  trigger,
  onClose,
}: AlertDialogProps) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [triggerType, setTriggerType] =
    useState<CreateAlertInput["triggerType"]>("consecutive_failures");
  const [triggerValue, setTriggerValue] = useState("3");
  const [jobId, setJobId] = useState<string>("");

  const createAlert = useCreateAlert(projectId);
  const updateAlert = useUpdateAlert(projectId);
  const { data: jobs } = useJobs(projectId);
  const isEdit = !!alert;

  useEffect(() => {
    if (alert && open) {
      setTarget(alert.target);
      setTriggerType(alert.triggerType);
      setTriggerValue(String(alert.triggerValue));
      setJobId(alert.jobId || "");
    }
  }, [alert, open]);

  function resetForm() {
    setTarget("");
    setTriggerType("consecutive_failures");
    setTriggerValue("3");
    setJobId("");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      resetForm();
      onClose?.();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isEdit) {
        await updateAlert.mutateAsync({
          id: alert.id,
          target,
          triggerType,
          triggerValue: Number(triggerValue),
        });
        toast.success("Alert updated");
      } else {
        await createAlert.mutateAsync({
          channel: "email",
          target,
          triggerType,
          triggerValue: Number(triggerValue),
          ...(jobId ? { jobId } : {}),
        });
        toast.success("Alert created");
      }
      handleOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const isPending = createAlert.isPending || updateAlert.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <IconPlus className="mr-2 h-4 w-4" /> Create alert
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit alert" : "Create alert"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alert-target">Email</Label>
            <Input
              id="alert-target"
              type="email"
              placeholder="ops@example.com"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alert-trigger-type">Trigger</Label>
            <select
              id="alert-trigger-type"
              value={triggerType}
              onChange={(e) =>
                setTriggerType(
                  e.target.value as CreateAlertInput["triggerType"]
                )
              }
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alert-trigger-value">
              {VALUE_LABELS[triggerType]}
            </Label>
            <Input
              id="alert-trigger-value"
              type="number"
              min={1}
              value={triggerValue}
              onChange={(e) => setTriggerValue(e.target.value)}
              required
            />
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="alert-job">Scope</Label>
              <select
                id="alert-job"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                <option value="">All jobs</option>
                {jobs?.map((job: Job) => (
                  <option key={job.id} value={job.id}>
                    {job.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending
              ? isEdit
                ? "Updating..."
                : "Creating..."
              : isEdit
                ? "Update alert"
                : "Create alert"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [x] **Step 2: Verify the file compiles**

Run: `cd apps/dashboard && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `alert-dialog.tsx`

- [x] **Step 3: Commit**

```bash
git add apps/dashboard/components/alert-dialog.tsx
git commit -m "feat(dashboard): add create/edit alert dialog component"
```

---

### Task 3: Alerts page

**Files:**
- Modify: `apps/dashboard/app/(dashboard)/[projectId]/alerts/page.tsx`

Replace the empty state shell with a full DataTable-based alerts page.

- [x] **Step 1: Rewrite the alerts page**

Replace the entire contents of `apps/dashboard/app/(dashboard)/[projectId]/alerts/page.tsx` with:

```typescript
"use client";

import { useParams } from "next/navigation";
import { IconBellFilled, IconDotsVertical, IconEditFilled, IconTrashFilled } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/empty-state";
import { DataTable, type Column } from "@/components/data-table";
import { useAlerts, useDeleteAlert, useUpdateAlert, type Alert } from "@/lib/hooks/use-alerts";
import { useJobs } from "@/lib/hooks/use-jobs";
import { AlertDialog } from "@/components/alert-dialog";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

const TRIGGER_DISPLAY: Record<string, (v: number) => string> = {
  consecutive_failures: (v) => `${v} consecutive failure${v !== 1 ? "s" : ""}`,
  duration_exceeded: (v) => `Duration > ${v}s`,
  missed_run: (v) => `Missed by ${v}m`,
};

export default function AlertsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: alerts, isLoading } = useAlerts(projectId);
  const { data: jobs } = useJobs(projectId);
  const deleteAlert = useDeleteAlert(projectId);
  const updateAlert = useUpdateAlert(projectId);

  const jobMap = new Map(jobs?.map((j) => [j.id, j.name]) || []);

  async function handleDelete(e: React.MouseEvent, alert: Alert) {
    e.stopPropagation();
    if (!confirm(`Delete alert for "${alert.target}"? This cannot be undone.`)) return;
    try {
      await deleteAlert.mutateAsync(alert.id);
      toast.success("Alert deleted");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleToggle(e: React.MouseEvent, alert: Alert) {
    e.stopPropagation();
    try {
      await updateAlert.mutateAsync({ id: alert.id, enabled: !alert.enabled });
      toast.success(alert.enabled ? "Alert disabled" : "Alert enabled");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const columns: Column<Alert>[] = [
    {
      key: "target",
      header: "Target",
      render: (alert) => <span className="font-medium">{alert.target}</span>,
    },
    {
      key: "trigger",
      header: "Trigger",
      render: (alert) => (
        <span className="text-muted-foreground">
          {(TRIGGER_DISPLAY[alert.triggerType] || (() => alert.triggerType))(alert.triggerValue)}
        </span>
      ),
    },
    {
      key: "scope",
      header: "Scope",
      render: (alert) => (
        <span className="text-muted-foreground">
          {alert.jobId ? jobMap.get(alert.jobId) || "Unknown job" : "All jobs"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (alert) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            alert.enabled
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {alert.enabled ? "Enabled" : "Disabled"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (alert) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-secondary/80 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <IconDotsVertical className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => handleToggle(e, alert)}>
              {alert.enabled ? "Disable" : "Enable"}
            </DropdownMenuItem>
            <AlertDialog
              projectId={projectId}
              alert={alert}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <IconEditFilled className="h-4 w-4" /> Edit
                </DropdownMenuItem>
              }
            />
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={(e) => handleDelete(e, alert)}>
              <IconTrashFilled className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Alerts">
        <AlertDialog projectId={projectId} />
      </PageHeader>
      <div className="p-6">
        <DataTable
          columns={columns}
          data={alerts}
          isLoading={isLoading}
          keyFn={(alert) => alert.id}
          selectable={false}
          emptyState={
            <EmptyState
              icon={IconBellFilled}
              title="No alerts configured"
              description="Set up alert rules to get notified of failures."
            />
          }
        />
      </div>
    </div>
  );
}
```

- [x] **Step 2: Verify the file compiles**

Run: `cd apps/dashboard && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add apps/dashboard/app/\(dashboard\)/\[projectId\]/alerts/page.tsx
git commit -m "feat(dashboard): wire up alerts page with CRUD and DataTable"
```

---

### Task 4: Job mutation hooks

**Files:**
- Modify: `apps/dashboard/lib/hooks/use-jobs.ts`

Add mutation hooks for run, update (pause/resume), and delete.

- [x] **Step 1: Add mutation hooks to use-jobs.ts**

Append the following to the end of `apps/dashboard/lib/hooks/use-jobs.ts`, and update the import line from:
```typescript
import { useQuery } from "@tanstack/react-query";
```
to:
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
```

Then append these hooks after the existing `useJobs` function:

```typescript
export function useRunJob(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      apiClient.post(`/api/v1/projects/${projectId}/jobs/${jobId}/run`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", projectId] });
    },
  });
}

export function useUpdateJob(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: "active" | "paused" }) =>
      apiClient.patch(`/api/v1/projects/${projectId}/jobs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", projectId] });
    },
  });
}

export function useDeleteJob(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      apiClient.delete(`/api/v1/projects/${projectId}/jobs/${jobId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", projectId] });
    },
  });
}
```

- [x] **Step 2: Verify the file compiles**

Run: `cd apps/dashboard && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add apps/dashboard/lib/hooks/use-jobs.ts
git commit -m "feat(dashboard): add run, update, and delete mutation hooks for jobs"
```

---

### Task 5: Crons page actions column

**Files:**
- Modify: `apps/dashboard/app/(dashboard)/[projectId]/crons/page.tsx`

Add an actions column with a DropdownMenu for Run Now, Pause/Resume, and Delete.

- [x] **Step 1: Update the crons page**

Replace the entire contents of `apps/dashboard/app/(dashboard)/[projectId]/crons/page.tsx` with:

```typescript
"use client";

import { useParams } from "next/navigation";
import {
  IconClockFilled,
  IconDotsVertical,
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconTrashFilled,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { useJobs, useRunJob, useUpdateJob, useDeleteJob, type Job } from "@/lib/hooks/use-jobs";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

export default function CronsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: jobs, isLoading } = useJobs(projectId, { type: "cron" });
  const runJob = useRunJob(projectId);
  const updateJob = useUpdateJob(projectId);
  const deleteJob = useDeleteJob(projectId);

  async function handleRun(e: React.MouseEvent, job: Job) {
    e.stopPropagation();
    try {
      await runJob.mutateAsync(job.id);
      toast.success(`Triggered "${job.name}"`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleToggle(e: React.MouseEvent, job: Job) {
    e.stopPropagation();
    const next = job.status === "paused" ? "active" : "paused";
    try {
      await updateJob.mutateAsync({ id: job.id, status: next });
      toast.success(next === "paused" ? `Paused "${job.name}"` : `Resumed "${job.name}"`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleDelete(e: React.MouseEvent, job: Job) {
    e.stopPropagation();
    if (!confirm(`Delete "${job.name}"? This cannot be undone.`)) return;
    try {
      await deleteJob.mutateAsync(job.id);
      toast.success(`Deleted "${job.name}"`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const columns: Column<Job>[] = [
    {
      key: "name",
      header: "Name",
      render: (job) => <span className="font-medium">{job.name}</span>,
    },
    {
      key: "schedule",
      header: "Schedule",
      render: (job) => (
        <span className="font-mono text-muted-foreground">{job.schedule}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (job) => <StatusBadge status={job.status} />,
    },
    {
      key: "lastRun",
      header: "Last Run",
      render: (job) => (
        <span className="text-muted-foreground">
          {job.lastRunAt ? formatDateTime(job.lastRunAt) : "Never"}
        </span>
      ),
    },
    {
      key: "nextRun",
      header: "Next Run",
      render: (job) => (
        <span className="text-muted-foreground">
          {job.nextRunAt ? formatDateTime(job.nextRunAt) : "—"}
        </span>
      ),
    },
    {
      key: "retries",
      header: "Retries",
      render: (job) => (
        <span className="text-muted-foreground">{job.retries}</span>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (job) => (
        <Badge variant="outline" className="font-normal text-xs">
          {job.source.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (job) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-secondary/80 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <IconDotsVertical className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => handleRun(e, job)}>
              <IconPlayerPlayFilled className="h-4 w-4" /> Run now
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleToggle(e, job)}>
              {job.status === "paused" ? (
                <>
                  <IconPlayerPlayFilled className="h-4 w-4" /> Resume
                </>
              ) : (
                <>
                  <IconPlayerPauseFilled className="h-4 w-4" /> Pause
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={(e) => handleDelete(e, job)}>
              <IconTrashFilled className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Crons" />
      <div className="p-6">
        <DataTable
          columns={columns}
          data={jobs}
          isLoading={isLoading}
          keyFn={(job) => job.id}
          emptyState={
            <EmptyState
              icon={IconClockFilled}
              title="No crons yet"
              description="Functions registered via the SDK will appear here."
            />
          }
        />
      </div>
    </div>
  );
}
```

- [x] **Step 2: Verify the file compiles**

Run: `cd apps/dashboard && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add apps/dashboard/app/\(dashboard\)/\[projectId\]/crons/page.tsx
git commit -m "feat(dashboard): add run now, pause/resume, and delete actions to crons page"
```
