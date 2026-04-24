# Workflow Graph Visualization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an inline workflow graph to the execution detail page that visualizes parent→child execution chains using React Flow.

**Architecture:** New backend endpoint walks the execution tree (up to root, down through all descendants) and returns a flat node array. Frontend renders it inline using React Flow with dagre auto-layout, custom dark-themed card nodes, status-colored edges, and retry buttons on failed nodes.

**Tech Stack:** NestJS (backend), React Flow v12 (`@xyflow/react`), dagre (layout), `@tabler/icons-react`, Tailwind CSS, React Query

**Spec:** `docs/superpowers/specs/2026-04-24-workflow-graph-design.md`

---

### Task 1: Backend — getWorkflowTree service method

**Files:**
- Modify: `apps/platform/src/modules/executions/executions.service.ts`
- Modify: `apps/platform/src/modules/executions/executions.service.spec.ts`

- [ ] **Step 1: Write the failing test for getWorkflowTree**

Add to `executions.service.spec.ts`:

```typescript
describe('getWorkflowTree', () => {
  it('should return full tree when given a leaf node', async () => {
    const root = { id: 'root', parentId: null, jobId: 'j1', status: 'success', durationMs: 100, attempt: 1, scheduledAt: new Date(), completedAt: new Date(), job: { name: 'step0', type: 'cron', retries: 0 } };
    const child = { id: 'child', parentId: 'root', jobId: 'j2', status: 'success', durationMs: 50, attempt: 1, scheduledAt: new Date(), completedAt: new Date(), job: { name: 'step1', type: 'task', retries: 2 } };
    const grandchild = { id: 'grandchild', parentId: 'child', jobId: 'j3', status: 'failed', durationMs: 30, attempt: 2, scheduledAt: new Date(), completedAt: new Date(), job: { name: 'step2', type: 'task', retries: 2 } };

    // findOne for the starting node (grandchild)
    execRepo.findOne.mockResolvedValueOnce(grandchild);
    // findOne walking up: child
    execRepo.findOne.mockResolvedValueOnce(child);
    // findOne walking up: root (parentId is null, stop)
    execRepo.findOne.mockResolvedValueOnce(root);

    // find descendants from root
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([root, child, grandchild]),
    };
    execRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getWorkflowTree('grandchild');

    expect(result.rootId).toBe('root');
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes[0].id).toBe('root');
    expect(result.nodes[0].functionName).toBe('step0');
    expect(result.nodes[2].id).toBe('grandchild');
    expect(result.nodes[2].parentId).toBe('child');
  });

  it('should return tree when given the root node', async () => {
    const root = { id: 'root', parentId: null, jobId: 'j1', status: 'success', durationMs: 100, attempt: 1, scheduledAt: new Date(), completedAt: new Date(), job: { name: 'step0', type: 'cron', retries: 0 } };
    const child = { id: 'child', parentId: 'root', jobId: 'j2', status: 'success', durationMs: 50, attempt: 1, scheduledAt: new Date(), completedAt: new Date(), job: { name: 'step1', type: 'task', retries: 2 } };

    // findOne for starting node (root) — parentId is null, no walk-up needed
    execRepo.findOne.mockResolvedValueOnce(root);

    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([root, child]),
    };
    execRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getWorkflowTree('root');

    expect(result.rootId).toBe('root');
    expect(result.nodes).toHaveLength(2);
  });

  it('should throw NotFoundException for non-existent execution', async () => {
    execRepo.findOne.mockResolvedValue(null);

    await expect(service.getWorkflowTree('nope')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/platform && npx jest executions.service.spec --verbose 2>&1 | tail -20`
Expected: FAIL — `service.getWorkflowTree is not a function`

- [ ] **Step 3: Implement getWorkflowTree**

Add to `executions.service.ts`:

```typescript
async getWorkflowTree(executionId: string): Promise<{
  rootId: string;
  nodes: Array<{
    id: string;
    functionName: string;
    type: string;
    status: string;
    durationMs: number | null;
    attempt: number;
    maxRetries: number;
    parentId: string | null;
    jobId: string;
    scheduledAt: Date;
    completedAt: Date | null;
  }>;
}> {
  // Find starting execution
  const start = await this.execRepo.findOne({
    where: { id: executionId },
    relations: ['job'],
  });
  if (!start) throw new NotFoundException('Execution not found');

  // Walk up to find root
  let root = start;
  while (root.parentId) {
    const parent = await this.execRepo.findOne({
      where: { id: root.parentId },
      relations: ['job'],
    });
    if (!parent) break;
    root = parent;
  }

  // Fetch all descendants using recursive CTE via a simpler approach:
  // Load all executions that share the same root ancestry.
  // We use a breadth-first approach: start with root, find children, repeat.
  const allNodes: typeof root[] = [];
  const queue = [root.id];
  const visited = new Set<string>();

  // Add root first
  allNodes.push(root);
  visited.add(root.id);

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const children = await this.execRepo
      .createQueryBuilder('exec')
      .leftJoinAndSelect('exec.job', 'job')
      .where('exec.parent_id = :parentId', { parentId })
      .getMany();

    for (const child of children) {
      if (!visited.has(child.id)) {
        visited.add(child.id);
        allNodes.push(child);
        queue.push(child.id);
      }
    }
  }

  return {
    rootId: root.id,
    nodes: allNodes.map((exec) => ({
      id: exec.id,
      functionName: exec.job?.name || 'unknown',
      type: exec.job?.type || 'task',
      status: exec.status,
      durationMs: exec.durationMs,
      attempt: exec.attempt,
      maxRetries: exec.job?.retries || 0,
      parentId: exec.parentId,
      jobId: exec.jobId,
      scheduledAt: exec.scheduledAt,
      completedAt: exec.completedAt,
    })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/platform && npx jest executions.service.spec --verbose 2>&1 | tail -20`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/platform/src/modules/executions/executions.service.ts apps/platform/src/modules/executions/executions.service.spec.ts
git commit -m "feat: add getWorkflowTree service method for execution chain traversal"
```

---

### Task 2: Backend — Workflow controller endpoint

**Files:**
- Modify: `apps/platform/src/modules/executions/executions.controller.ts`

- [ ] **Step 1: Add the workflow endpoint to ExecutionsDashboardController**

Add this method to the `ExecutionsDashboardController` class in `executions.controller.ts`, **before** the existing `findOne` method (so the `:id/workflow` route matches before `:id`):

```typescript
@Get('executions/:id/workflow')
@ApiOperation({ summary: 'Get workflow tree for an execution (dashboard)' })
@ApiParam({ name: 'projectId', description: 'Project UUID' })
@ApiParam({ name: 'id', description: 'Execution UUID' })
@ApiResponse({ status: 200, description: 'Workflow tree with all nodes in the chain' })
@ApiResponse({ status: 404, description: 'Execution not found' })
async getWorkflowTree(
  @Req() req: Request,
  @Param('projectId') projectId: string,
  @Param('id') id: string,
) {
  const user = req.user as { id: string };
  await this.projectsService.findOneByUser(projectId, user.id);
  return this.executionsService.getWorkflowTree(id);
}
```

- [ ] **Step 2: Verify the endpoint works**

Run: `cd apps/platform && npx jest --verbose 2>&1 | tail -10`
Expected: All existing tests still pass (this is a new route, no unit test needed — it delegates to the tested service method)

- [ ] **Step 3: Commit**

```bash
git add apps/platform/src/modules/executions/executions.controller.ts
git commit -m "feat: add GET executions/:id/workflow endpoint"
```

---

### Task 3: Backend — Add hasChildren field to execution response

**Files:**
- Modify: `apps/platform/src/modules/executions/executions.service.ts`

The frontend needs to know whether to show the workflow icon. Add a `hasChildren` check to `findOne`.

- [ ] **Step 1: Write the failing test**

Add to `executions.service.spec.ts`:

```typescript
describe('findOne', () => {
  it('should include hasChildren=true when children exist', async () => {
    const exec = { id: 'exec-1', parentId: null, job: { name: 'test' } };
    execRepo.findOne.mockResolvedValue(exec);
    execRepo.count.mockResolvedValue(2);

    const result = await service.findOne('exec-1');

    expect(result.hasChildren).toBe(true);
  });

  it('should include hasChildren=false when no children', async () => {
    const exec = { id: 'exec-1', parentId: null, job: { name: 'test' } };
    execRepo.findOne.mockResolvedValue(exec);
    execRepo.count.mockResolvedValue(0);

    const result = await service.findOne('exec-1');

    expect(result.hasChildren).toBe(false);
  });
});
```

Note: The existing `findOne` test that checks `NotFoundException` should still be in the same `describe` block. Merge them.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/platform && npx jest executions.service.spec --verbose 2>&1 | tail -20`
Expected: FAIL — `hasChildren` is undefined

- [ ] **Step 3: Update findOne to include hasChildren**

Update the `findOne` method in `executions.service.ts`:

```typescript
async findOne(id: string) {
  const exec = await this.execRepo.findOne({
    where: { id },
    relations: ['job'],
  });
  if (!exec) throw new NotFoundException('Execution not found');

  const childCount = await this.execRepo.count({ where: { parentId: id } });

  return { ...exec, hasChildren: childCount > 0 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/platform && npx jest executions.service.spec --verbose 2>&1 | tail -20`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/platform/src/modules/executions/executions.service.ts apps/platform/src/modules/executions/executions.service.spec.ts
git commit -m "feat: add hasChildren field to execution findOne response"
```

---

### Task 4: Backend — Support payload in triggerRun

**Files:**
- Modify: `apps/platform/src/modules/jobs/jobs.controller.ts`

The retry button on workflow nodes needs to re-run a task with the same payload. The existing `POST /api/v1/projects/:projectId/jobs/:id/run` doesn't accept a payload body.

- [ ] **Step 1: Add optional payload to triggerRun**

In `jobs.controller.ts`, update the `triggerRun` method to accept an optional body:

```typescript
@Post(':id/run')
@ApiOperation({ summary: 'Manually trigger a job run' })
@ApiParam({ name: 'projectId', description: 'Project UUID' })
@ApiParam({ name: 'id', description: 'Job UUID' })
@ApiResponse({ status: 201, description: 'Run triggered' })
async triggerRun(
  @Req() req: Request,
  @Param('projectId') projectId: string,
  @Param('id') id: string,
  @Body() body?: { payload?: any },
) {
  const user = req.user as { id: string };
  const project = await this.projectsService.findOneByUser(projectId, user.id);
  const job = await this.jobsService.findOne(id, projectId);

  const execution = await this.executionsService.createPending(
    job.id,
    new Date(),
    1,
    body?.payload !== undefined ? { payload: body.payload } : undefined,
  );

  await this.queueService.send('pingback-execution', {
    executionId: execution.id,
    jobId: job.id,
    projectId,
    functionName: job.name,
    endpointUrl: project.endpointUrl,
    cronSecret: project.cronSecret,
    attempt: 1,
    maxRetries: job.retries,
    timeoutSeconds: job.timeoutSeconds,
    scheduledAt: new Date().toISOString(),
    ...(body?.payload !== undefined ? { payload: body.payload } : {}),
  });

  return { message: 'Run triggered', executionId: execution.id, jobId: job.id };
}
```

Also add the `Body` import at the top of the file if not already present:

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
```

- [ ] **Step 2: Verify existing tests still pass**

Run: `cd apps/platform && npx jest --verbose 2>&1 | tail -10`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/platform/src/modules/jobs/jobs.controller.ts
git commit -m "feat: support optional payload in triggerRun endpoint"
```

---

### Task 5: Frontend — Install dependencies and add hook

**Files:**
- Modify: `apps/dashboard/package.json`
- Modify: `apps/dashboard/lib/hooks/use-executions.ts`

- [ ] **Step 1: Install React Flow and dagre**

```bash
cd apps/dashboard && npm install @xyflow/react dagre @types/dagre
```

- [ ] **Step 2: Add hasChildren to the Execution interface**

In `apps/dashboard/lib/hooks/use-executions.ts`, add `hasChildren` to the `Execution` interface:

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
  logs: Array<{ timestamp: number; level?: string; message: string; meta?: Record<string, any> }>;
  attempts: Array<{
    attempt: number;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    durationMs: number | null;
    httpStatus: number | null;
    errorMessage: string | null;
    logs: Array<{ timestamp: number; level?: string; message: string; meta?: Record<string, any> }>;
  }>;
  createdAt: string;
  job?: { name: string; retries: number; type: "cron" | "task" };
  parent?: { id: string; job?: { name: string } } | null;
  hasChildren?: boolean;
}
```

- [ ] **Step 3: Add WorkflowNode interface and useWorkflowTree hook**

Add to the bottom of `apps/dashboard/lib/hooks/use-executions.ts`:

```typescript
export interface WorkflowNode {
  id: string;
  functionName: string;
  type: string;
  status: "pending" | "running" | "success" | "failed";
  durationMs: number | null;
  attempt: number;
  maxRetries: number;
  parentId: string | null;
  jobId: string;
  scheduledAt: string;
  completedAt: string | null;
}

export interface WorkflowTree {
  rootId: string;
  nodes: WorkflowNode[];
}

export function useWorkflowTree(executionId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["workflow", executionId],
    queryFn: () =>
      apiClient.get<WorkflowTree>(
        `/api/v1/executions/${executionId}/workflow`
      ),
    enabled: !!executionId && enabled,
  });
}
```

Note: This endpoint is under `ExecutionsApiController` (not project-scoped), so the URL is `/api/v1/executions/:id/workflow`. Wait — actually we put it in `ExecutionsDashboardController` which is project-scoped. We need to pass projectId.

Update the hook:

```typescript
export function useWorkflowTree(projectId: string, executionId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["workflow", executionId],
    queryFn: () =>
      apiClient.get<WorkflowTree>(
        `/api/v1/projects/${projectId}/executions/${executionId}/workflow`
      ),
    enabled: !!projectId && !!executionId && enabled,
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/package.json apps/dashboard/package-lock.json apps/dashboard/lib/hooks/use-executions.ts
git commit -m "feat: install React Flow, add workflow tree hook and types"
```

---

### Task 6: Frontend — Custom workflow node component

**Files:**
- Create: `apps/dashboard/components/workflow-node.tsx`

- [ ] **Step 1: Create the custom node component**

Create `apps/dashboard/components/workflow-node.tsx`:

```tsx
"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { IconLoader2 } from "@tabler/icons-react";
import { StatusBadge } from "@/components/status-badge";
import { formatDuration } from "@/lib/format";
import { Button } from "@/components/ui/button";

const statusDotColor: Record<string, string> = {
  success: "#a8b545",
  failed: "#d4734a",
  running: "#e8b44a",
  pending: "#e8b44a",
};

export interface WorkflowNodeData {
  id: string;
  functionName: string;
  type: string;
  status: "pending" | "running" | "success" | "failed";
  durationMs: number | null;
  attempt: number;
  maxRetries: number;
  parentId: string | null;
  jobId: string;
  isCurrent: boolean;
  onRetry?: (jobId: string, payload?: any) => void;
  payload?: any;
  [key: string]: unknown;
}

function WorkflowNodeComponent({ data }: NodeProps) {
  const d = data as unknown as WorkflowNodeData;
  const maxAttempts = d.maxRetries + 1;

  return (
    <div
      className="rounded-lg px-3 py-2.5 min-w-[200px] max-w-[240px]"
      style={{
        backgroundColor: "#1e1e1a",
        border: d.isCurrent
          ? "1.5px solid #d4a574"
          : "1px solid #3a3a35",
        boxShadow: d.isCurrent
          ? "0 0 8px rgba(212, 165, 116, 0.2)"
          : "none",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "#3a3a35", border: "none", width: 6, height: 6 }} />

      {/* Header: status dot + function name */}
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: statusDotColor[d.status] || "#8a8a80" }}
        />
        <span className="text-xs font-medium text-foreground truncate">
          {d.functionName}
        </span>
      </div>

      {/* Status + duration */}
      <div className="flex items-center justify-between mb-1">
        <StatusBadge status={d.status} />
        <span className="text-[10px] text-muted-foreground">
          {formatDuration(d.durationMs)}
        </span>
      </div>

      {/* Attempt */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          Attempt {d.attempt}/{maxAttempts}
        </span>

        {/* Retry button — only on failed nodes */}
        {d.status === "failed" && d.onRetry && (
          <Button
            variant="outline"
            size="xs"
            className="h-5 text-[10px] px-1.5"
            onClick={(e) => {
              e.stopPropagation();
              d.onRetry!(d.jobId, d.payload);
            }}
          >
            Retry
          </Button>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: "#3a3a35", border: "none", width: 6, height: 6 }} />
    </div>
  );
}

export default memo(WorkflowNodeComponent);
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/components/workflow-node.tsx
git commit -m "feat: add custom workflow node component for React Flow"
```

---

### Task 7: Frontend — Workflow graph container

**Files:**
- Create: `apps/dashboard/components/workflow-graph.tsx`

- [ ] **Step 1: Create the workflow graph container**

Create `apps/dashboard/components/workflow-graph.tsx`:

```tsx
"use client";

import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Controls,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";
import WorkflowNodeComponent, { type WorkflowNodeData } from "./workflow-node";
import { type WorkflowNode } from "@/lib/hooks/use-executions";
import { apiClient } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 90;

const statusEdgeColor: Record<string, string> = {
  success: "#a8b545",
  failed: "#d4734a",
  running: "#e8b44a",
  pending: "#8a8a80",
};

const nodeTypes = { workflowNode: WorkflowNodeComponent };

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 60 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

interface WorkflowGraphProps {
  workflowNodes: WorkflowNode[];
  currentExecutionId: string;
  projectId: string;
}

export function WorkflowGraph({
  workflowNodes,
  currentExecutionId,
  projectId,
}: WorkflowGraphProps) {
  const queryClient = useQueryClient();

  const handleRetry = useCallback(
    async (jobId: string, payload?: any) => {
      await apiClient.post(
        `/api/v1/projects/${projectId}/jobs/${jobId}/run`,
        payload !== undefined ? { payload } : undefined,
      );
      queryClient.invalidateQueries({ queryKey: ["workflow"] });
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    },
    [projectId, queryClient],
  );

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    const rfNodes: Node[] = workflowNodes.map((node) => ({
      id: node.id,
      type: "workflowNode",
      position: { x: 0, y: 0 },
      data: {
        ...node,
        isCurrent: node.id === currentExecutionId,
        onRetry: handleRetry,
      } as WorkflowNodeData,
    }));

    const rfEdges: Edge[] = workflowNodes
      .filter((n) => n.parentId)
      .map((node) => ({
        id: `${node.parentId}-${node.id}`,
        source: node.parentId!,
        target: node.id,
        style: {
          stroke: statusEdgeColor[node.status] || "#8a8a80",
          strokeDasharray: "6 3",
        },
        animated: node.status === "running",
      }));

    return getLayoutedElements(rfNodes, rfEdges);
  }, [workflowNodes, currentExecutionId, handleRetry]);

  const [nodes] = useNodesState(layoutedNodes);
  const [edges] = useEdgesState(layoutedEdges);

  return (
    <div style={{ height: 300 }} className="w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Controls
          showInteractive={false}
          position="bottom-right"
          style={{
            backgroundColor: "#1e1e1a",
            border: "1px solid #3a3a35",
            borderRadius: 6,
          }}
        />
      </ReactFlow>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/components/workflow-graph.tsx
git commit -m "feat: add workflow graph container with dagre layout"
```

---

### Task 8: Frontend — Integrate into execution detail page

**Files:**
- Modify: `apps/dashboard/app/(dashboard)/[projectId]/runs/page.tsx`

- [ ] **Step 1: Add imports to runs page**

Add these imports at the top of `page.tsx`:

```tsx
import { IconGitBranch } from "@tabler/icons-react";
import { useWorkflowTree } from "@/lib/hooks/use-executions";
import { WorkflowGraph } from "@/components/workflow-graph";
```

- [ ] **Step 2: Add workflow toggle state and icon to RunDetail**

Update the `RunDetail` component. Add state and the workflow tree hook at the top of the function:

```tsx
function RunDetail({ exec, projectId }: { exec: Execution; projectId: string }) {
  const [showWorkflow, setShowWorkflow] = useState(false);
  const isPartOfChain = !!exec.parentId || !!exec.hasChildren;
  const { data: workflowTree } = useWorkflowTree(projectId, exec.id, showWorkflow && isPartOfChain);
```

- [ ] **Step 3: Add the workflow icon button**

In `RunDetail`, right after the opening `<div className="border-t border-border bg-background">` and before the `{exec.parentId && (` block, add the icon button row:

```tsx
{isPartOfChain && (
  <div className="flex items-center justify-end px-4 pt-2">
    <button
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      onClick={() => setShowWorkflow(!showWorkflow)}
    >
      <IconGitBranch className="h-3.5 w-3.5" />
      <span>{showWorkflow ? "Hide" : "View"} workflow</span>
    </button>
  </div>
)}
```

- [ ] **Step 4: Add the inline graph section**

Right after the icon button block and before the `{exec.parentId && (` block, add:

```tsx
{showWorkflow && workflowTree && (
  <div className="border-t border-border p-4">
    <WorkflowGraph
      workflowNodes={workflowTree.nodes}
      currentExecutionId={exec.id}
      projectId={projectId}
    />
  </div>
)}
```

- [ ] **Step 5: Add useState import if not already present**

`useState` is already imported at the top of the file — no change needed. But `RunDetail` currently doesn't use `useState`. The component needs to be checked. Looking at the file, `RunDetail` does not have any state currently, but `useState` is imported at the file level for `CopyButton` — so it's available.

- [ ] **Step 6: Verify the page compiles**

Run: `cd apps/dashboard && npx next build 2>&1 | tail -20`
Expected: Build succeeds (or at least no TypeScript errors in the modified files)

- [ ] **Step 7: Commit**

```bash
git add apps/dashboard/app/\(dashboard\)/\[projectId\]/runs/page.tsx
git commit -m "feat: integrate workflow graph into execution detail page"
```

---

### Task 9: Frontend — Override React Flow default styles for dark theme

**Files:**
- Modify: `apps/dashboard/components/workflow-graph.tsx`

React Flow ships with a light theme. The default styles need overrides to match Pingback's dark palette.

- [ ] **Step 1: Add dark theme overrides**

In `workflow-graph.tsx`, add a style block inside the `<div style={{ height: 300 }}>` wrapper, wrapping the `<ReactFlow>` in a themed container:

Replace the outer div:

```tsx
return (
  <div
    style={{ height: 300 }}
    className="w-full [&_.react-flow__background]:!bg-transparent [&_.react-flow__pane]:!bg-transparent [&_.react-flow__controls_button]:!bg-[#1e1e1a] [&_.react-flow__controls_button]:!border-[#3a3a35] [&_.react-flow__controls_button]:!fill-[#8a8a80] [&_.react-flow__controls_button:hover]:!fill-[#f5f5f0]"
  >
```

- [ ] **Step 2: Verify visually**

Run the dashboard locally (`cd apps/dashboard && npm run dev`) and expand an execution that has child tasks. Confirm:
- Dark background (transparent, inherits from page)
- Nodes are dark cards with status colors
- Edges are dashed lines colored by status
- Current node has an orange border glow
- Controls in bottom-right are dark themed
- Failed nodes show a retry button

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/components/workflow-graph.tsx
git commit -m "feat: apply dark theme overrides to React Flow graph"
```

---

### Task 10: Fix React Flow CSS import for Next.js

**Files:**
- Modify: `apps/dashboard/components/workflow-graph.tsx`

React Flow's CSS import (`@xyflow/react/dist/style.css`) may need to be imported at the layout level or handled differently in Next.js 15 with Tailwind v4. If the build fails on the CSS import, move it.

- [ ] **Step 1: Check if the CSS import works**

Run: `cd apps/dashboard && npm run dev`

If you see a CSS import error, move the import from `workflow-graph.tsx` to `apps/dashboard/app/globals.css`:

```css
@import "@xyflow/react/dist/style.css";
```

And remove the import line from `workflow-graph.tsx`.

- [ ] **Step 2: Verify the graph renders correctly**

Open the dashboard, go to Runs, expand an execution that is part of a chain.

- [ ] **Step 3: Commit if changes were needed**

```bash
git add apps/dashboard/components/workflow-graph.tsx apps/dashboard/app/globals.css
git commit -m "fix: move React Flow CSS import for Next.js compatibility"
```

---

### Task 11: End-to-end verification

- [ ] **Step 1: Run all backend tests**

```bash
cd apps/platform && npx jest --verbose 2>&1 | tail -20
```

Expected: All tests pass

- [ ] **Step 2: Run frontend build**

```bash
cd apps/dashboard && npx next build 2>&1 | tail -20
```

Expected: Build succeeds

- [ ] **Step 3: Manual test with a real chain**

1. Start the platform: `cd apps/platform && npm run start:dev`
2. Start the dashboard: `cd apps/dashboard && npm run dev`
3. Use the Next.js example app to trigger a cron that fans out to child tasks
4. Open the Runs page in the dashboard
5. Expand an execution that has children → verify the "View workflow" link appears
6. Click it → verify the graph renders inline with correct nodes, edges, statuses
7. Expand a child execution → verify the same graph appears with that node highlighted
8. If a node is failed → verify the Retry button appears and works

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix: workflow graph adjustments from manual testing"
```
