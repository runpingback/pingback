"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import {
  Play, Copy, Check, CircleCheck, CircleX, Clock, Loader2,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { CodeBlock } from "@/components/code-block";
import { DataTable, type Column } from "@/components/data-table";
import { useExecutions, type Execution } from "@/lib/hooks/use-executions";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border rounded px-2 py-1 transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      Copy
    </button>
  );
}

const statusIcon: Record<string, React.ReactNode> = {
  success: <CircleCheck className="h-4 w-4 text-green-500" />,
  failed: <CircleX className="h-4 w-4 text-red-500" />,
  running: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
};

function RunDetail({ exec }: { exec: Execution }) {
  const formattedOutput = (() => {
    if (!exec.responseBody) return null;
    try { return JSON.stringify(JSON.parse(exec.responseBody), null, 2); }
    catch { return exec.responseBody; }
  })();

  const durationFormatted =
    exec.durationMs != null
      ? exec.durationMs >= 1000 ? `${(exec.durationMs / 1000).toFixed(1)}s` : `${exec.durationMs}ms`
      : "—";

  return (
    <div className="border-t border-border bg-background">
      <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-border">
        <div className="p-4 pb-3">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Run ID</p>
              <p className="text-xs font-mono truncate">{exec.id.slice(0, 24)}...</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Function</p>
              <p className="text-xs font-medium text-primary">{exec.job?.name || exec.jobId.slice(0, 8)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Duration</p>
              <p className="text-xs font-medium">{durationFormatted}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Scheduled at</p>
              <p className="text-xs">{new Date(exec.scheduledAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Started at</p>
              <p className="text-xs">{exec.startedAt ? new Date(exec.startedAt).toLocaleString() : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Completed at</p>
              <p className="text-xs">{exec.completedAt ? new Date(exec.completedAt).toLocaleString() : "—"}</p>
            </div>
          </div>
        </div>
        <div className="p-4 pb-3">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">HTTP Status</p>
              <p className="text-xs font-medium">{exec.httpStatus || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Attempt</p>
              <p className="text-xs font-medium">{exec.attempt}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Status</p>
              <StatusBadge status={exec.status} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-border border-t border-border">
        <div className="p-4">
          <p className="text-sm font-medium mb-3">Trace</p>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              {statusIcon[exec.status]}
              <span className="text-sm font-medium">Run</span>
              <span className="text-xs text-muted-foreground">{durationFormatted}</span>
            </div>
            <div className="ml-6 h-5 rounded-sm bg-border overflow-hidden">
              <div
                className={`h-full rounded-sm ${exec.status === "success" ? "bg-green-500" : exec.status === "failed" ? "bg-red-500" : "bg-blue-500"}`}
                style={{ width: "100%" }}
              />
            </div>
          </div>
          {exec.errorMessage && (
            <div className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 mb-3 flex items-start gap-2 ml-6">
              <CircleX className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
              <p className="text-xs text-destructive">{exec.errorMessage}</p>
            </div>
          )}
          {exec.logs && exec.logs.length > 0 && (
            <div className="ml-6 space-y-0">
              {exec.logs.map((log, i) => {
                const prevTs = i > 0 ? exec.logs[i - 1].timestamp : (exec.startedAt ? new Date(exec.startedAt).getTime() : log.timestamp);
                const stepDuration = log.timestamp - prevTs;
                const stepFormatted = stepDuration >= 1000 ? `${(stepDuration / 1000).toFixed(1)}s` : `${stepDuration}ms`;
                return (
                  <div key={i} className="flex items-center py-1 border-l border-border pl-3 ml-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                      <span className="text-xs truncate">{log.message}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 ml-2">{stepFormatted}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="p-4">
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
  );
}

export default function RunsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [page, setPage] = useState(1);
  const { data, isLoading } = useExecutions(projectId, { page, limit: 20 });

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
        <span className="font-medium">{exec.job?.name || exec.jobId.slice(0, 8)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (exec) => (
        <div className="flex items-center gap-1.5">
          {statusIcon[exec.status]}
          <StatusBadge status={exec.status} />
        </div>
      ),
    },
    {
      key: "started",
      header: "Started",
      render: (exec) => (
        <span className="text-muted-foreground">
          {exec.startedAt ? new Date(exec.startedAt).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (exec) => (
        <span className="text-muted-foreground">
          {exec.durationMs != null ? `${(exec.durationMs / 1000).toFixed(1)}s` : "—"}
        </span>
      ),
    },
    {
      key: "attempt",
      header: "Attempt",
      render: (exec) => <span className="text-muted-foreground">{exec.attempt}</span>,
    },
    {
      key: "created",
      header: "Created",
      render: (exec) => (
        <span className="text-muted-foreground">{new Date(exec.createdAt).toLocaleString()}</span>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Runs</h1>
      <DataTable
        columns={columns}
        data={data?.items}
        isLoading={isLoading}
        keyFn={(exec) => exec.id}
        expandable={{ render: (exec) => <RunDetail exec={exec} /> }}
        emptyState={
          <EmptyState
            icon={Play}
            title="No runs yet"
            description="Execution history will appear here once your crons start running."
          />
        }
        pagination={data ? {
          total: data.total,
          page,
          limit: 20,
          onPageChange: setPage,
        } : undefined}
      />
    </div>
  );
}
