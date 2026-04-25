"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import {
  IconPlayerPlayFilled,
  IconCopy,
  IconCheck,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconClockFilled,
  IconLoader2,
  IconSearch,
  IconGitBranch,
  IconRefresh,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { CodeBlock } from "@/components/code-block";
import { DataTable, type Column } from "@/components/data-table";
import { useExecutions, useChildExecutions, useWorkflowTree, useRetryExecution, type Execution } from "@/lib/hooks/use-executions";
import { WorkflowGraph } from "@/components/workflow-graph";
import { formatDateTime, formatDuration } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { ExecutionChart } from "@/components/execution-chart";
import { Input } from "@/components/ui/input";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="text-muted-foreground hover:text-foreground transition-colors p-0.5 cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <IconCheck className="h-3 w-3" /> : <IconCopy className="h-3 w-3" />}
    </button>
  );
}

const statusColor: Record<string, string> = {
  success: "#a8b545",
  failed: "#d4734a",
  running: "#e8b44a",
  pending: "#e8b44a",
};

const statusIcon: Record<string, React.ReactNode> = {
  success: <IconCircleCheckFilled className="h-4 w-4" style={{ color: "#a8b545" }} />,
  failed: <IconCircleXFilled className="h-4 w-4" style={{ color: "#d4734a" }} />,
  running: <IconLoader2 className="h-4 w-4 animate-spin" style={{ color: "#e8b44a" }} />,
  pending: <IconClockFilled className="h-4 w-4" style={{ color: "#e8b44a" }} />,
};

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

function TraceTimeline({ exec }: { exec: Execution }) {
  // Build segments: past attempts + current
  const segments: Array<{
    attempt: number;
    status: string;
    durationMs: number | null;
    errorMessage: string | null;
    logs: Array<{ timestamp: number; message: string }>;
  }> = [];

  if (exec.attempts && exec.attempts.length > 0) {
    for (const att of exec.attempts) {
      segments.push({
        attempt: att.attempt,
        status: att.status,
        durationMs: att.durationMs,
        errorMessage: att.errorMessage,
        logs: att.logs || [],
      });
    }
  }

  segments.push({
    attempt: exec.attempt,
    status: exec.status,
    durationMs: exec.durationMs,
    errorMessage: exec.errorMessage,
    logs: exec.logs || [],
  });

  const totalDuration = segments.reduce((sum, s) => sum + (s.durationMs || 1), 0) || 1;

  return (
    <div>
      <p className="text-sm font-medium mb-3">Trace</p>

      {/* Total duration */}
      <div className="flex items-center gap-2 mb-2">
        {statusIcon[exec.status]}
        <span className="text-sm font-medium">
          {segments.length > 1 ? `${segments.length} attempts` : "Run"}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatDuration(totalDuration)}
        </span>
      </div>

      {/* Waterfall bar */}
      <div className="h-6 rounded-sm bg-border overflow-hidden flex mb-3">
        {segments.map((seg, i) => {
          const width = Math.max(((seg.durationMs || 1) / totalDuration) * 100, segments.length > 1 ? 2 : 100);
          const color = seg.status === "success" ? "#a8b545"
            : seg.status === "failed" ? "#d4734a"
            : seg.status === "running" ? "#e8b44a"
            : "#e8b44a";
          const isLast = i === segments.length - 1;
          return (
            <div
              key={i}
              className="h-full relative group"
              style={{
                width: `${width}%`,
                backgroundColor: color,
                borderRight: !isLast ? "1.5px solid var(--background)" : "none",
              }}
            >
              {/* Hover tooltip */}
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 pointer-events-none"
                style={{
                  backgroundColor: "#2a2a25",
                  border: "1px solid #3a3a35",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  whiteSpace: "nowrap",
                  fontSize: "11px",
                  color: "#f5f5f0",
                }}
              >
                Attempt {seg.attempt} — {seg.status} — {formatDuration(seg.durationMs)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Segment details */}
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const isFailed = seg.status === "failed";
        return (
          <div key={i} className={`${i > 0 ? "mt-2" : ""} ${!isLast ? "mb-2" : ""}`}>
            {/* Segment label */}
            {segments.length > 1 && (
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: isFailed ? "#d4734a" : "#a8b545" }}
                />
                <span className="text-xs font-medium">
                  Attempt {seg.attempt}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDuration(seg.durationMs)}
                </span>
                {isFailed && seg.errorMessage && (
                  <span className="text-[10px] text-muted-foreground">
                    — {seg.errorMessage}
                  </span>
                )}
              </div>
            )}

            {/* Logs */}
            {seg.logs.length > 0 && (
              <div className={`space-y-0 ${segments.length > 1 ? "ml-3.5" : ""}`}>
                {seg.logs.map((log, j) => {
                  const prevTs = j > 0 ? seg.logs[j - 1].timestamp : log.timestamp;
                  const stepDuration = log.timestamp - prevTs;
                  return (
                    <div
                      key={j}
                      className="flex items-center py-1 border-l border-border pl-3 ml-1"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: (log as any).level === "error" ? "#d4734a" : (log as any).level === "warn" ? "#e8b44a" : "#8a8a80" }}
                        />
                        <span className="text-xs truncate">{log.message}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 ml-2">
                        {formatDuration(stepDuration)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Final error message */}
      {exec.status === "failed" && exec.errorMessage && (
        <div
          className="rounded border px-3 py-2 mt-3 flex items-start gap-2"
          style={{ borderColor: "rgba(212,115,74,0.3)", backgroundColor: "rgba(212,115,74,0.05)" }}
        >
          <IconCircleXFilled className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "#d4734a" }} />
          <p className="text-xs" style={{ color: "#d4734a" }}>{exec.errorMessage}</p>
        </div>
      )}
    </div>
  );
}

function RunDetail({ exec, projectId }: { exec: Execution; projectId: string }) {
  const [showWorkflow, setShowWorkflow] = useState(false);
  const isPartOfChain = !!exec.parentId || !!exec.hasChildren;
  const { data: workflowTree } = useWorkflowTree(projectId, exec.id, showWorkflow && isPartOfChain);
  const retryMutation = useRetryExecution(projectId);

  const formattedPayload = (() => {
    if (!exec.payload) return null;
    try {
      return JSON.stringify(typeof exec.payload === "string" ? JSON.parse(exec.payload) : exec.payload, null, 2);
    } catch {
      return String(exec.payload);
    }
  })();

  const formattedOutput = (() => {
    if (!exec.responseBody) return null;
    try {
      return JSON.stringify(JSON.parse(exec.responseBody), null, 2);
    } catch {
      return exec.responseBody;
    }
  })();

  const durationFormatted = formatDuration(exec.durationMs);

  return (
    <div className="border-t border-border bg-background">
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
      {showWorkflow && workflowTree && (
        <div className="border-t border-b border-border p-4">
          <WorkflowGraph
            workflowNodes={workflowTree.nodes}
            currentExecutionId={exec.id}
            projectId={projectId}
          />
        </div>
      )}
      {exec.parentId && (
        <div className="px-4 pt-3 pb-0 flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: "rgba(212, 165, 116, 0.15)", color: "#d4a574" }}
          >
            Child Task
          </span>
          <span className="text-xs text-muted-foreground">
            spawned by{" "}
            <span className="font-medium" style={{ color: "#d4a574" }}>
              {exec.parent?.job?.name || exec.parentId.slice(0, 8) + "..."}
            </span>
            <span className="font-mono ml-1">({exec.parentId.slice(0, 8)}...)</span>
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-border">
        <div className="p-4 pb-3">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Run ID</p>
              <div className="flex items-center gap-1">
                <p className="text-xs font-mono truncate">{exec.id.slice(0, 24)}...</p>
                <CopyButton text={exec.id} />
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">
                Function
              </p>
              <p className="text-xs font-medium" style={{ color: "#d4a574" }}>
                {exec.job?.name || exec.jobId.slice(0, 8)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">
                Duration
              </p>
              <p className="text-xs font-medium">{durationFormatted}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">
                Scheduled at
              </p>
              <p className="text-xs">{formatDateTime(exec.scheduledAt)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">
                Started at
              </p>
              <p className="text-xs">
                {exec.startedAt ? formatDateTime(exec.startedAt) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">
                Completed at
              </p>
              <p className="text-xs">
                {exec.completedAt ? formatDateTime(exec.completedAt) : "—"}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 pb-3">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">
                HTTP Status
              </p>
              <p className="text-xs font-medium">{exec.httpStatus || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">
                Attempt
              </p>
              <p className="text-xs font-medium">{exec.attempt}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Status</p>
              <div className="flex items-center gap-2">
                <StatusBadge status={exec.status} />
                {exec.status === "failed" && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => retryMutation.mutate(exec.id)}
                    disabled={retryMutation.isPending}
                  >
                    {retryMutation.isPending ? (
                      <IconLoader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <IconRefresh className="h-3 w-3" />
                    )}
                    <span className="ml-1">Retry</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-border border-t border-border">
        <div className="p-4">
          <TraceTimeline exec={exec} />
        </div>
        <div className="p-4 space-y-4">
          {formattedPayload && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Payload</p>
                <CopyButton text={formattedPayload} />
              </div>
              <div className="overflow-auto max-h-[200px]">
                <CodeBlock code={formattedPayload} lang="json" />
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Output</p>
              {formattedOutput && <CopyButton text={formattedOutput} />}
            </div>
            {formattedOutput ? (
              <div className="overflow-auto max-h-[400px]">
                <CodeBlock code={formattedOutput} lang="json" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No output</p>
            )}
          </div>
        </div>
      </div>
      <ChildTasks projectId={projectId} parentId={exec.id} />
    </div>
  );
}

export default function RunsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useExecutions(projectId, { page, limit: 20, q: search || undefined });

  const columns: Column<Execution>[] = [
    {
      key: "run",
      header: "Run",
      render: (_, index) => (
        <span className="text-primary font-mono">
          {(data?.total || 0) - (page - 1) * 20 - index}
        </span>
      ),
    },
    {
      key: "job",
      header: "Job",
      render: (exec) => (
        <span className="font-medium">
          {exec.job?.name || exec.jobId.slice(0, 8)}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (exec) => (
        <span
          className="text-xs font-mono px-1.5 py-0.5 rounded"
          style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
        >
          {exec.job?.type || (exec.parentId ? "task" : "cron")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (exec) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={exec.status} />
        </div>
      ),
    },

    {
      key: "duration",
      header: "Duration",
      render: (exec) => (
        <span className="text-muted-foreground">
          {formatDuration(exec.durationMs)}
        </span>
      ),
    },
    {
      key: "attempt",
      header: "Attempt",
      render: (exec) => {
        const maxAttempts = (exec.job?.retries ?? 0) + 1;
        const current = exec.status === "success" || exec.status === "failed"
          ? exec.attempt
          : exec.attempt;
        return (
          <span className="text-muted-foreground font-mono text-xs">
            {current}/{maxAttempts}
          </span>
        );
      },
    },
    {
      key: "started",
      header: "Started",
      render: (exec) => (
        <span className="text-muted-foreground">
          {exec.startedAt ? formatDateTime(exec.startedAt) : "—"}
        </span>
      ),
    },
    {
      key: "created",
      header: "Created",
      render: (exec) => (
        <span className="text-muted-foreground">
          {formatDateTime(exec.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Runs">
        <form onSubmit={(e) => {
          e.preventDefault();
          setSearch(query);
          setPage(1);
        }} className="flex gap-2">
          <Input
            placeholder="Search runs..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value) {
                setSearch("");
                setPage(1);
              }
            }}
            className="w-64"
          />
          <Button type="submit" variant="outline" size="icon">
            <IconSearch className="h-4 w-4" />
          </Button>
        </form>
      </PageHeader>
      <div className="p-6">
        <ExecutionChart projectId={projectId} />
        <DataTable
          columns={columns}
          data={data?.items}
          isLoading={isLoading}
          keyFn={(exec) => exec.id}
          expandable={{ render: (exec) => <RunDetail exec={exec} projectId={projectId} /> }}
          emptyState={
            <EmptyState
              icon={IconPlayerPlayFilled}
              title="No runs yet"
              description="Execution history will appear here once your crons start running."
            />
          }
          pagination={
            data
              ? {
                  total: data.total,
                  page,
                  limit: 20,
                  onPageChange: setPage,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
