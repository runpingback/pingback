"use client";

import { useState } from "react";
import { useExecutionHistogram } from "@/lib/hooks/use-executions";

const CHART_HEIGHT = 80;

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  const h = hours % 12 || 12;
  const time = `${h}:${mins}${ampm}`;

  if (d.toDateString() !== now.toDateString()) {
    const month = d.toLocaleString("default", { month: "short" });
    return `${month} ${d.getDate()}, ${time}`;
  }
  return time;
}

function getYTicks(max: number): number[] {
  if (max <= 4) return [0, Math.ceil(max / 2), max || 1];
  const step = Math.ceil(max / 3);
  const rounded = Math.ceil(step / 5) * 5 || step;
  return [0, rounded, rounded * 2, Math.max(rounded * 3, max)];
}

export function ExecutionChart({ projectId }: { projectId: string }) {
  const { data: buckets, isLoading } = useExecutionHistogram(projectId);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isLoading || !buckets) {
    return (
      <div
        className="rounded-md border overflow-hidden mb-4 animate-pulse"
        style={{ height: "140px", backgroundColor: "var(--muted)" }}
      />
    );
  }

  const max = Math.max(...buckets.map((b) => b.total), 1);
  const yTicks = getYTicks(max);
  const yMax = yTicks[yTicks.length - 1];
  const labelInterval = Math.ceil(buckets.length / 5);

  const totalSuccess = buckets.reduce((s, b) => s + b.success, 0);
  const totalFailed = buckets.reduce((s, b) => s + b.failed, 0);

  return (
    <div className="rounded-md border mb-4" style={{ overflow: "visible", position: "relative" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-xs text-muted-foreground">Executions (24h)</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#a8b545" }} />
            <span className="text-xs text-muted-foreground">{totalSuccess} success</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#d4734a" }} />
            <span className="text-xs text-muted-foreground">{totalFailed} failed</span>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-1" style={{ overflow: "visible" }}>
        <div style={{ display: "flex", position: "relative", overflow: "visible" }}>
          {/* Y-axis */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: `${CHART_HEIGHT}px`,
              paddingRight: "8px",
              minWidth: "24px",
              alignItems: "flex-end",
            }}
          >
            {[...yTicks].reverse().map((v, i) => (
              <span key={i} style={{ fontSize: "9px", color: "var(--muted-foreground)", lineHeight: "1" }}>
                {v}
              </span>
            ))}
          </div>

          {/* Chart area */}
          <div
            style={{
              flex: 1,
              height: `${CHART_HEIGHT}px`,
              display: "flex",
              alignItems: "flex-end",
              gap: "1px",
              position: "relative",
              overflow: "visible",
            }}
          >
            {/* Grid lines */}
            {yTicks.slice(1).map((v, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  bottom: `${(v / yMax) * CHART_HEIGHT}px`,
                  left: 0,
                  right: 0,
                  borderTop: "1px solid var(--border)",
                  pointerEvents: "none",
                  opacity: 0.5,
                }}
              />
            ))}

            {/* Bars */}
            {buckets.map((bucket, i) => {
              const successPx = yMax > 0 ? Math.round((bucket.success / yMax) * CHART_HEIGHT) : 0;
              const failedPx = yMax > 0 ? Math.round((bucket.failed / yMax) * CHART_HEIGHT) : 0;
              const isHovered = hoveredIndex === i;

              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    height: "100%",
                    position: "relative",
                    cursor: bucket.total > 0 ? "pointer" : "default",
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {bucket.failed > 0 && (
                    <div
                      style={{
                        height: `${failedPx}px`,
                        backgroundColor: "#d4734a",
                        borderRadius: "1px 1px 0 0",
                        minHeight: "2px",
                        opacity: isHovered ? 1 : 0.8,
                        transition: "opacity 0.15s",
                      }}
                    />
                  )}
                  {bucket.success > 0 && (
                    <div
                      style={{
                        height: `${successPx}px`,
                        backgroundColor: "#a8b545",
                        borderRadius: bucket.failed > 0 ? "0" : "1px 1px 0 0",
                        minHeight: "2px",
                        opacity: isHovered ? 1 : 0.8,
                        transition: "opacity 0.15s",
                      }}
                    />
                  )}

                  {/* Tooltip */}
                  {isHovered && bucket.total > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: `${Math.max(successPx + failedPx, 4) + 8}px`,
                        left: "50%",
                        transform: i > buckets.length - 5 ? "translateX(-80%)" : i < 5 ? "translateX(-20%)" : "translateX(-50%)",
                        backgroundColor: "#2a2a25",
                        border: "1px solid #3a3a35",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        whiteSpace: "nowrap",
                        zIndex: 50,
                        pointerEvents: "none",
                        fontSize: "11px",
                        lineHeight: "16px",
                        color: "#f5f5f0",
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: "2px" }}>
                        {formatTime(bucket.time)}
                      </div>
                      {bucket.success > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ height: "6px", width: "6px", borderRadius: "50%", backgroundColor: "#a8b545" }} />
                          {bucket.success} success
                        </div>
                      )}
                      {bucket.failed > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ height: "6px", width: "6px", borderRadius: "50%", backgroundColor: "#d4734a" }} />
                          {bucket.failed} failed
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* X-axis labels */}
        <div style={{ display: "flex", marginLeft: "32px", paddingTop: "6px", paddingBottom: "4px" }}>
          {buckets.map((bucket, i) =>
            i % labelInterval === 0 ? (
              <span
                key={i}
                style={{
                  flex: labelInterval,
                  fontSize: "9px",
                  color: "var(--muted-foreground)",
                }}
              >
                {formatTime(bucket.time)}
              </span>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
