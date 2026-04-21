# Fan-Out Tasks (`ctx.task()`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Enable cron handlers to spawn independent child task executions via `ctx.task(name, payload)`, with the platform dispatching them after the parent completes.

**Architecture:** Response-based fan-out — `ctx.task()` collects task requests in memory, the SDK returns them in the HTTP response, the platform worker creates child executions and enqueues them. The dashboard shows child tasks nested under the parent execution.

**Tech Stack:** TypeScript (SDK core + Next.js adapter), NestJS (platform), React/Next.js (dashboard), TypeORM (migrations), pgboss (queue).

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/core/src/types.ts` | Modify | Add `payload` to `ExecutionPayload`, add `TaskRequest` type |
| `packages/core/src/context.ts` | Modify | Implement `ctx.task()` collection + `_getTasks()` |
| `packages/core/src/index.ts` | Modify | Export new `ContextWithInternals` type |
| `packages/next/src/handler.ts` | Modify | Pass payload to handler, include tasks in response |
| `apps/platform/src/modules/executions/execution.entity.ts` | Modify | Add `parentId` and `payload` columns |
| `apps/platform/src/modules/executions/executions.service.ts` | Modify | Accept `parentId`/`payload` in `createPending`, add `parentId` filter |
| `apps/platform/src/modules/executions/executions.controller.ts` | Modify | Add `parentId` query param |
| `apps/platform/src/modules/worker/worker.service.ts` | Modify | Process `tasks` from response, include `payload` in dispatch |
| `apps/dashboard/lib/hooks/use-executions.ts` | Modify | Add `useChildExecutions` hook |
| `apps/dashboard/app/(dashboard)/[projectId]/runs/page.tsx` | Modify | Show child tasks in expanded detail view |

---

### Task 1: SDK types — add payload and TaskRequest

**Files:**
- Modify: `packages/core/src/types.ts`

- [x] **Step 1: Add `payload` to `ExecutionPayload` and add `TaskRequest` type**

In `packages/core/src/types.ts`, add `payload?: any` to the `ExecutionPayload` interface and add a new `TaskRequest` interface:

Change the `ExecutionPayload` interface from:
```typescript
export interface ExecutionPayload {
  function: string;
  executionId: string;
  attempt: number;
  scheduledAt: string;
}
```
to:
```typescript
export interface ExecutionPayload {
  function: string;
  executionId: string;
  attempt: number;
  scheduledAt: string;
  payload?: any;
}
```

Add after `ExecutionPayload`:
```typescript
export interface TaskRequest {
  name: string;
  payload: any;
}
```

Also add `tasks` to the `ExecutionResult` interface. Change from:
```typescript
export interface ExecutionResult {
  status: 'success' | 'error';
  result?: unknown;
  error?: string;
  logs: LogEntry[];
  durationMs: number;
}
```
to:
```typescript
export interface ExecutionResult {
  status: 'success' | 'error';
  result?: unknown;
  error?: string;
  logs: LogEntry[];
  tasks: TaskRequest[];
  durationMs: number;
}
```

- [x] **Step 2: Verify it compiles**

Run: `cd packages/core && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors (or only pre-existing ones)

- [x] **Step 3: Commit**

```bash
git add packages/core/src/types.ts
git commit -m "feat(core): add payload to ExecutionPayload and TaskRequest type"
```

---

### Task 2: SDK context — implement ctx.task() collection

**Files:**
- Modify: `packages/core/src/context.ts`
- Modify: `packages/core/src/index.ts`

- [x] **Step 1: Rewrite context.ts to collect tasks instead of throwing**

Replace the entire contents of `packages/core/src/context.ts` with:

```typescript
import { Context, LogEntry, ExecutionPayload, TaskRequest } from './types';

export interface ContextWithInternals extends Context {
  _getLogs(): LogEntry[];
  _getTasks(): TaskRequest[];
}

export function createContext(payload: ExecutionPayload): ContextWithInternals {
  const logs: LogEntry[] = [];
  const tasks: TaskRequest[] = [];

  return {
    executionId: payload.executionId,
    attempt: payload.attempt,
    scheduledAt: new Date(payload.scheduledAt),

    log(message: string): void {
      logs.push({ timestamp: Date.now(), message });
    },

    async task(name: string, taskPayload: any): Promise<void> {
      tasks.push({ name, payload: taskPayload });
    },

    _getLogs(): LogEntry[] {
      return logs;
    },

    _getTasks(): TaskRequest[] {
      return tasks;
    },
  };
}
```

- [x] **Step 2: Update index.ts exports**

In `packages/core/src/index.ts`, change:
```typescript
export type { ContextWithLogs } from './context';
```
to:
```typescript
export type { ContextWithInternals } from './context';
```

- [x] **Step 3: Update handler.ts import**

In `packages/next/src/handler.ts`, change:
```typescript
import type { ContextWithLogs, ExecutionPayload } from '@pingback/core';
```
to:
```typescript
import type { ContextWithInternals, ExecutionPayload } from '@pingback/core';
```

And change line 49:
```typescript
    const ctx = createContext(payload) as ContextWithLogs;
```
to:
```typescript
    const ctx = createContext(payload) as ContextWithInternals;
```

- [x] **Step 4: Verify it compiles**

Run: `cd packages/core && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [x] **Step 5: Commit**

```bash
git add packages/core/src/context.ts packages/core/src/index.ts packages/next/src/handler.ts
git commit -m "feat(core): implement ctx.task() collection with _getTasks()"
```

---

### Task 3: SDK handler — pass payload and return tasks

**Files:**
- Modify: `packages/next/src/handler.ts`

- [x] **Step 1: Update the route handler to pass payload and return tasks**

In `packages/next/src/handler.ts`, make two changes:

**Change 1:** Pass `payload.payload` to the handler. Change line 52 from:
```typescript
      const result = await definition.handler(ctx);
```
to:
```typescript
      const result = await definition.handler(ctx, payload.payload);
```

**Change 2:** Include tasks in the success response. Change lines 54-59 from:
```typescript
      return Response.json({
        status: 'success',
        result,
        logs: ctx._getLogs(),
        durationMs,
      });
```
to:
```typescript
      return Response.json({
        status: 'success',
        result,
        logs: ctx._getLogs(),
        tasks: ctx._getTasks(),
        durationMs,
      });
```

**Change 3:** Include tasks in the error response too (tasks collected before the error should still be dispatched). Change lines 62-69 from:
```typescript
      return Response.json(
        {
          status: 'error',
          error: (err as Error).message,
          logs: ctx._getLogs(),
          durationMs,
        },
        { status: 500 },
      );
```
to:
```typescript
      return Response.json(
        {
          status: 'error',
          error: (err as Error).message,
          logs: ctx._getLogs(),
          tasks: ctx._getTasks(),
          durationMs,
        },
        { status: 500 },
      );
```

- [x] **Step 2: Verify it compiles**

Run: `cd packages/next && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add packages/next/src/handler.ts
git commit -m "feat(next): pass payload to handlers and return collected tasks in response"
```

---

### Task 4: Platform — add parentId and payload to execution entity

**Files:**
- Modify: `apps/platform/src/modules/executions/execution.entity.ts`

- [x] **Step 1: Add parentId and payload columns**

In `apps/platform/src/modules/executions/execution.entity.ts`, add these columns after the `logs` column (before `createdAt`):

```typescript
  @Column({ type: 'uuid', nullable: true, name: 'parent_id' })
  parentId: string | null;

  @ManyToOne(() => Execution, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Execution;

  @Column({ type: 'jsonb', nullable: true })
  payload: any;
```

Note: The `ManyToOne` self-reference requires importing nothing extra — `Execution` is already in scope since it's a self-reference within the class. TypeORM handles this with `() => Execution`.

- [x] **Step 2: Verify it compiles**

Run: `cd apps/platform && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add apps/platform/src/modules/executions/execution.entity.ts
git commit -m "feat(platform): add parentId and payload columns to execution entity"
```

**Note:** TypeORM with `synchronize: true` in development will auto-create these columns. For production, a migration would be needed, but the project currently uses synchronize mode.

---

### Task 5: Platform — update executions service for fan-out

**Files:**
- Modify: `apps/platform/src/modules/executions/executions.service.ts`

- [x] **Step 1: Update createPending to accept parentId and payload**

In `apps/platform/src/modules/executions/executions.service.ts`, change the `createPending` method from:

```typescript
  async createPending(jobId: string, scheduledAt: Date, attempt = 1) {
    const exec = this.execRepo.create({
      jobId,
      status: 'pending' as const,
      scheduledAt,
      attempt,
    });
    return this.execRepo.save(exec);
  }
```

to:

```typescript
  async createPending(
    jobId: string,
    scheduledAt: Date,
    attempt = 1,
    options?: { parentId?: string; payload?: any },
  ) {
    const exec = this.execRepo.create({
      jobId,
      status: 'pending' as const,
      scheduledAt,
      attempt,
      ...(options?.parentId ? { parentId: options.parentId } : {}),
      ...(options?.payload !== undefined ? { payload: options.payload } : {}),
    });
    return this.execRepo.save(exec);
  }
```

- [x] **Step 2: Add parentId filter to findByProject**

In the `findByProject` method, add a `parentId` filter. After the existing `jobId` filter block:

```typescript
    if (filters?.jobId) {
      qb.andWhere('exec.job_id = :jobId', { jobId: filters.jobId });
    }
```

Add:

```typescript
    if (filters?.parentId) {
      qb.andWhere('exec.parent_id = :parentId', { parentId: filters.parentId });
    }
```

Also update the `filters` type parameter to include `parentId`:

Change:
```typescript
    filters?: {
      status?: string;
      jobId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
```

to:

```typescript
    filters?: {
      status?: string;
      jobId?: string;
      parentId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
```

- [x] **Step 3: Verify it compiles**

Run: `cd apps/platform && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [x] **Step 4: Commit**

```bash
git add apps/platform/src/modules/executions/executions.service.ts
git commit -m "feat(platform): support parentId and payload in executions service"
```

---

### Task 6: Platform — add parentId query param to controller

**Files:**
- Modify: `apps/platform/src/modules/executions/executions.controller.ts`

- [x] **Step 1: Add parentId query parameter to the dashboard controller**

In the `ExecutionsDashboardController`'s `findByProject` method, add a `parentId` query parameter.

Add this import-style decorator after the existing `@ApiQuery` for `dateTo`:
```typescript
  @ApiQuery({ name: 'parentId', required: false, description: 'Filter by parent execution ID' })
```

Add the parameter to the method signature. Change:
```typescript
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
```
to:
```typescript
    @Query('dateTo') dateTo?: string,
    @Query('parentId') parentId?: string,
    @Query('page') page?: string,
```

And pass it through to the service. Change:
```typescript
    return this.executionsService.findByProject(projectId, {
      status,
      jobId,
      dateFrom,
      dateTo,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
```
to:
```typescript
    return this.executionsService.findByProject(projectId, {
      status,
      jobId,
      parentId,
      dateFrom,
      dateTo,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
```

- [x] **Step 2: Verify it compiles**

Run: `cd apps/platform && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add apps/platform/src/modules/executions/executions.controller.ts
git commit -m "feat(platform): add parentId query parameter to executions endpoint"
```

---

### Task 7: Platform — worker processes fan-out tasks

**Files:**
- Modify: `apps/platform/src/modules/worker/worker.service.ts`

This is the most complex task. The worker needs to:
1. Include `payload` in the HTTP request body when dispatching
2. After a successful execution, parse `tasks` from the response and create child executions

- [x] **Step 1: Add payload to QueueMessage and inject JobsService**

In `apps/platform/src/modules/worker/worker.service.ts`:

Add `payload` to the `QueueMessage` interface:
```typescript
interface QueueMessage {
  executionId: string;
  jobId: string;
  projectId: string;
  functionName: string;
  endpointUrl: string;
  cronSecret: string;
  attempt: number;
  maxRetries: number;
  timeoutSeconds: number;
  scheduledAt: string;
  payload?: any;
}
```

Add `JobsService` import and inject it. Change the imports at the top to add:
```typescript
import { JobsService } from '../jobs/jobs.service';
```

Change the constructor from:
```typescript
  constructor(
    private executionsService: ExecutionsService,
    private queueService: QueueService,
    private alertsService: AlertsService,
  ) {}
```
to:
```typescript
  constructor(
    private executionsService: ExecutionsService,
    private queueService: QueueService,
    private alertsService: AlertsService,
    private jobsService: JobsService,
  ) {}
```

- [x] **Step 2: Include payload in the request body**

Change the `body` construction in `processJob` from:
```typescript
      const body = JSON.stringify({
        function: msg.functionName,
        executionId: msg.executionId,
        attempt: msg.attempt,
        scheduledAt: msg.scheduledAt,
      });
```
to:
```typescript
      const body = JSON.stringify({
        function: msg.functionName,
        executionId: msg.executionId,
        attempt: msg.attempt,
        scheduledAt: msg.scheduledAt,
        ...(msg.payload !== undefined ? { payload: msg.payload } : {}),
      });
```

- [x] **Step 3: Process tasks from successful response**

In the success branch of `processJob` (inside the `if (response.ok)` block), after `markCompleted`, add fan-out processing. Change from:

```typescript
        if (response.ok) {
          let logs: Array<{ timestamp: number; message: string }> = [];
          try {
            const parsed = JSON.parse(responseText);
            logs = parsed.logs || [];
          } catch {}

          await this.executionsService.markCompleted(msg.executionId, {
            status: 'success',
            httpStatus: response.status,
            responseBody: responseText,
            logs,
          });
```

to:

```typescript
        if (response.ok) {
          let logs: Array<{ timestamp: number; message: string }> = [];
          let tasks: Array<{ name: string; payload: any }> = [];
          try {
            const parsed = JSON.parse(responseText);
            logs = parsed.logs || [];
            tasks = parsed.tasks || [];
          } catch {}

          await this.executionsService.markCompleted(msg.executionId, {
            status: 'success',
            httpStatus: response.status,
            responseBody: responseText,
            logs,
          });

          // Fan-out: dispatch child tasks
          for (const task of tasks) {
            try {
              const taskJob = await this.jobsService.findByName(
                msg.projectId,
                task.name,
              );
              if (!taskJob) {
                this.logger.warn(
                  `Fan-out: task function "${task.name}" not registered, skipping`,
                );
                continue;
              }

              const childExec = await this.executionsService.createPending(
                taskJob.id,
                new Date(),
                1,
                { parentId: msg.executionId, payload: task.payload },
              );

              await this.queueService.send('pingback-execution', {
                executionId: childExec.id,
                jobId: taskJob.id,
                projectId: msg.projectId,
                functionName: task.name,
                endpointUrl: msg.endpointUrl,
                cronSecret: msg.cronSecret,
                attempt: 1,
                maxRetries: taskJob.retries,
                timeoutSeconds: taskJob.timeoutSeconds,
                scheduledAt: new Date().toISOString(),
                payload: task.payload,
              });
            } catch (err) {
              this.logger.error(
                `Fan-out error for task "${task.name}": ${(err as Error).message}`,
              );
            }
          }
```

- [x] **Step 4: Add `findByName` method to JobsService**

In `apps/platform/src/modules/jobs/jobs.service.ts`, add this method:

```typescript
  async findByName(projectId: string, name: string): Promise<Job | null> {
    return this.jobRepo.findOne({ where: { projectId, name } });
  }
```

- [x] **Step 5: Add JobsModule to WorkerModule imports**

Check `apps/platform/src/modules/worker/worker.module.ts` and ensure `JobsModule` is imported. If not, add it:

```typescript
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [..., JobsModule],
  providers: [WorkerService],
})
export class WorkerModule {}
```

- [x] **Step 6: Verify it compiles**

Run: `cd apps/platform && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [x] **Step 7: Commit**

```bash
git add apps/platform/src/modules/worker/worker.service.ts apps/platform/src/modules/worker/worker.module.ts apps/platform/src/modules/jobs/jobs.service.ts
git commit -m "feat(platform): worker processes fan-out tasks from response and dispatches child executions"
```

---

### Task 8: Dashboard — useChildExecutions hook

**Files:**
- Modify: `apps/dashboard/lib/hooks/use-executions.ts`

- [x] **Step 1: Add parentId to Execution interface and add useChildExecutions hook**

In `apps/dashboard/lib/hooks/use-executions.ts`:

Add `parentId` and `payload` to the `Execution` interface:
```typescript
export interface Execution {
  id: string;
  jobId: string;
  parentId: string | null;
  payload: any;
  status: "pending" | "running" | "success" | "failed";
  attempt: number;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  httpStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  logs: Array<{ timestamp: number; message: string }>;
  createdAt: string;
  job?: { name: string };
}
```

Append this hook after the existing `useExecution` function:

```typescript
export function useChildExecutions(projectId: string, parentId: string) {
  return useQuery({
    queryKey: ["executions", projectId, { parentId }],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Execution>>(
        `/api/v1/projects/${projectId}/executions?parentId=${parentId}&limit=100`
      ),
    enabled: !!projectId && !!parentId,
    refetchInterval: 5000,
  });
}
```

- [x] **Step 2: Verify it compiles**

Run: `cd apps/dashboard && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add apps/dashboard/lib/hooks/use-executions.ts
git commit -m "feat(dashboard): add useChildExecutions hook"
```

---

### Task 9: Dashboard — show child tasks in run detail view

**Files:**
- Modify: `apps/dashboard/app/(dashboard)/[projectId]/runs/page.tsx`

- [x] **Step 1: Import useChildExecutions and update RunDetail**

In `apps/dashboard/app/(dashboard)/[projectId]/runs/page.tsx`:

Add `useChildExecutions` to the imports:
```typescript
import { useExecutions, useChildExecutions, type Execution } from "@/lib/hooks/use-executions";
```

Add `useParams` is already imported. Add `formatDuration` is already imported.

- [x] **Step 2: Create ChildTasks component**

Add this component before the `RunDetail` component:

```typescript
function ChildTasks({ projectId, parentId }: { projectId: string; parentId: string }) {
  const { data, isLoading } = useChildExecutions(projectId, parentId);

  if (isLoading) {
    return (
      <div className="p-4 border-t border-border">
        <p className="text-sm font-medium mb-3">Child Tasks</p>
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!data?.items?.length) return null;

  return (
    <div className="p-4 border-t border-border">
      <p className="text-sm font-medium mb-3">Child Tasks ({data.total})</p>
      <div className="rounded border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/30">
              <th className="p-2 text-left text-xs font-medium text-muted-foreground">Name</th>
              <th className="p-2 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="p-2 text-left text-xs font-medium text-muted-foreground">Duration</th>
              <th className="p-2 text-left text-xs font-medium text-muted-foreground">Attempt</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((child) => (
              <tr key={child.id} className="border-b last:border-0">
                <td className="p-2">
                  <span className="font-medium">{child.job?.name || child.jobId.slice(0, 8)}</span>
                </td>
                <td className="p-2">
                  <StatusBadge status={child.status} />
                </td>
                <td className="p-2 text-muted-foreground">
                  {formatDuration(child.durationMs)}
                </td>
                <td className="p-2 text-muted-foreground">{child.attempt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [x] **Step 3: Add ChildTasks to RunDetail and show parent indicator**

In the `RunDetail` component, add `ChildTasks` at the bottom (just before the closing `</div>` of the component, after the Output section's closing `</div>`):

```typescript
      <ChildTasks projectId={projectId} parentId={exec.id} />
```

This requires `projectId` to be passed to `RunDetail`. Update the component signature:

Change:
```typescript
function RunDetail({ exec }: { exec: Execution }) {
```
to:
```typescript
function RunDetail({ exec, projectId }: { exec: Execution; projectId: string }) {
```

Also add a parent indicator at the top of RunDetail. After the opening `<div className="border-t border-border bg-background">`, before the grid, add:

```typescript
      {exec.parentId && (
        <div className="px-4 pt-3 pb-0">
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-500/10 text-purple-500">
            Child Task
          </span>
        </div>
      )}
```

- [x] **Step 4: Update RunDetail usage in the DataTable**

In the `RunsPage` component, update the expandable render to pass `projectId`:

Change:
```typescript
          expandable={{ render: (exec) => <RunDetail exec={exec} /> }}
```
to:
```typescript
          expandable={{ render: (exec) => <RunDetail exec={exec} projectId={projectId} /> }}
```

- [x] **Step 5: Verify it compiles**

Run: `cd apps/dashboard && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [x] **Step 6: Commit**

```bash
git add apps/dashboard/app/\(dashboard\)/\[projectId\]/runs/page.tsx
git commit -m "feat(dashboard): show child tasks in run detail view with parent indicator"
```
