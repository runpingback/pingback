"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { formatDuration } from "@/lib/format";
import { Button } from "@/components/ui/button";

const typeDotColor: Record<string, string> = {
  cron: "#5b9bd5",
  task: "#d4a574",
};

const statusColor: Record<string, string> = {
  success: "#a8b545",
  failed: "#d4734a",
  running: "#e8b44a",
  pending: "#8a8a80",
};

function formatJson(value: any): string | null {
  if (!value) return null;
  try {
    const obj = typeof value === "string" ? JSON.parse(value) : value;
    return JSON.stringify(obj, null, 2);
  } catch {
    return typeof value === "string" ? value : null;
  }
}

function extractResult(responseBody: string | null): string | null {
  if (!responseBody) return null;
  try {
    const parsed = JSON.parse(responseBody);
    if (parsed.result !== undefined) {
      return JSON.stringify(parsed.result, null, 2);
    }
    return null;
  } catch {
    return null;
  }
}

export interface WorkflowNodeData {
  id: string;
  functionName: string;
  type: string;
  schedule: string | null;
  status: "pending" | "running" | "success" | "failed";
  durationMs: number | null;
  attempt: number;
  maxRetries: number;
  parentId: string | null;
  jobId: string;
  isCurrent: boolean;
  isExpanded: boolean;
  onRetry?: (jobId: string, payload?: any) => void;
  onNavigate?: (executionId: string) => void;
  payload?: any;
  errorMessage?: string | null;
  responseBody?: string | null;
  [key: string]: unknown;
}

function WorkflowNodeComponent({ data }: NodeProps) {
  const d = data as unknown as WorkflowNodeData;
  const maxAttempts = d.maxRetries + 1;
  const typeColor = typeDotColor[d.type] || "#8a8a80";

  const payloadStr = formatJson(d.payload);
  const outputStr = extractResult(d.responseBody ?? null);
  const hasDetails = !!(payloadStr || outputStr || (d.status === "failed" && d.errorMessage));

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: "#1e1e1a",
        border: d.isCurrent
          ? "1.5px solid #d4a574"
          : "1px solid #3a3a35",
        boxShadow: d.isCurrent
          ? "0 0 8px rgba(212, 165, 116, 0.2)"
          : "none",
        width: 230,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "#3a3a35", border: "none", width: 6, height: 6 }} />

      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ borderBottom: "1px solid #3a3a35" }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded shrink-0"
            style={{ backgroundColor: typeColor }}
          />
          <span
            className="text-xs font-semibold text-foreground truncate hover:underline cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              d.onNavigate?.(d.id);
            }}
          >
            {d.functionName}
          </span>
        </div>
        <span
          className="text-[9px] font-mono px-1.5 py-0.5 rounded"
          style={{ backgroundColor: `${typeColor}15`, color: typeColor }}
        >
          {d.type}
        </span>
      </div>

      {/* Summary */}
      <div className="px-3 py-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: statusColor[d.status] || "#8a8a80" }}
            />
            <span
              className="text-[10px] font-medium capitalize"
              style={{ color: statusColor[d.status] || "#8a8a80" }}
            >
              {d.status}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {formatDuration(d.durationMs)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            Attempt {d.attempt}/{maxAttempts}
          </span>
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
      </div>

      {/* Expanded details */}
      {d.isExpanded && hasDetails && (
        <div
          className="px-3 py-2 space-y-2"
          style={{ borderTop: "1px solid #3a3a35" }}
        >
          {payloadStr && (
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Payload</p>
              <pre
                className="text-[10px] font-mono p-1.5 rounded overflow-auto max-h-[80px]"
                style={{ backgroundColor: "#2a2a25", color: "#c5c5b8" }}
              >
                {payloadStr}
              </pre>
            </div>
          )}
          {outputStr && (
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Output</p>
              <pre
                className="text-[10px] font-mono p-1.5 rounded overflow-auto max-h-[80px]"
                style={{ backgroundColor: "#2a2a25", color: "#c5c5b8" }}
              >
                {outputStr}
              </pre>
            </div>
          )}
          {d.status === "failed" && d.errorMessage && (
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Error</p>
              <p
                className="text-[10px] p-1.5 rounded"
                style={{ backgroundColor: "rgba(212,115,74,0.1)", color: "#d4734a" }}
              >
                {d.errorMessage}
              </p>
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} style={{ background: "#3a3a35", border: "none", width: 6, height: 6 }} />
    </div>
  );
}

export default memo(WorkflowNodeComponent);
