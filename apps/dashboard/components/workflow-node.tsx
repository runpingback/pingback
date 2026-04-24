"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { StatusBadge } from "@/components/status-badge";
import { formatDuration } from "@/lib/format";
import { Button } from "@/components/ui/button";

const typeDotColor: Record<string, string> = {
  cron: "#5b9bd5",
  task: "#d4a574",
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
  const typeColor = typeDotColor[d.type] || "#8a8a80";

  return (
    <div
      className="rounded-lg min-w-[210px] max-w-[240px] overflow-hidden"
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
      <Handle type="target" position={Position.Left} style={{ background: "#3a3a35", border: "none", width: 6, height: 6 }} />

      {/* Header bar with type color accent */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ borderBottom: "1px solid #3a3a35" }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm shrink-0"
            style={{ backgroundColor: typeColor }}
          />
          <span className="text-xs font-semibold text-foreground truncate">
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

      {/* Body */}
      <div className="px-3 py-2 space-y-1.5">
        {/* Status + duration */}
        <div className="flex items-center justify-between">
          <StatusBadge status={d.status} />
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {formatDuration(d.durationMs)}
          </span>
        </div>

        {/* Attempt + retry */}
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

      <Handle type="source" position={Position.Right} style={{ background: "#3a3a35", border: "none", width: 6, height: 6 }} />
    </div>
  );
}

export default memo(WorkflowNodeComponent);
