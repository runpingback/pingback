"use client";

import { useState } from "react";
import { useLogsHistogram } from "@/lib/hooks/use-logs";

const CHART_HEIGHT = 80;

const LEVEL_COLORS: Record<string, string> = {
  error: "#d4734a",
  warn: "#e8b44a",
  info: "#8a8a80",
  debug: "#5bb8a9",
};

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

export function LogsChart({ projectId }: { projectId: string }) {
  const { data: buckets, isLoading } = useLogsHistogram(projectId);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isLoading || !buckets) {
    return (
      <div
        className="rounded-md border mb-4 animate-pulse"
        style={{ height: "140px", backgroundColor: "var(--muted)" }}
      />
    );
  }

  const max = Math.max(...buckets.map((b) => b.total), 1);
  const yTicks = getYTicks(max);
  const yMax = yTicks[yTicks.length - 1];
  const labelInterval = Math.ceil(buckets.length / 5);

  const totals = buckets.reduce(
    (acc, b) => ({
      info: acc.info + b.info,
      warn: acc.warn + b.warn,
      error: acc.error + b.error,
      debug: acc.debug + b.debug,
    }),
    { info: 0, warn: 0, error: 0, debug: 0 },
  );

  return (
    <div className="rounded-md border mb-4" style={{ overflow: "visible", position: "relative" }}>
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-xs text-muted-foreground">Logs (24h)</span>
        <div className="flex items-center gap-4">
          {totals.error > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: LEVEL_COLORS.error }} />
              <span className="text-xs text-muted-foreground">{totals.error} errors</span>
            </div>
          )}
          {totals.warn > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: LEVEL_COLORS.warn }} />
              <span className="text-xs text-muted-foreground">{totals.warn} warnings</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: LEVEL_COLORS.info }} />
            <span className="text-xs text-muted-foreground">{totals.info + totals.debug} info</span>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-1" style={{ overflow: "visible" }}>
        <div style={{ display: "flex", position: "relative", overflow: "visible" }}>
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

            {buckets.map((bucket, i) => {
              const errorPx = yMax > 0 ? Math.round((bucket.error / yMax) * CHART_HEIGHT) : 0;
              const warnPx = yMax > 0 ? Math.round((bucket.warn / yMax) * CHART_HEIGHT) : 0;
              const infoPx = yMax > 0 ? Math.round(((bucket.info + bucket.debug) / yMax) * CHART_HEIGHT) : 0;
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
                  {bucket.error > 0 && (
                    <div style={{ height: `${errorPx}px`, backgroundColor: LEVEL_COLORS.error, borderRadius: "1px 1px 0 0", minHeight: "2px", opacity: isHovered ? 1 : 0.8, transition: "opacity 0.15s" }} />
                  )}
                  {bucket.warn > 0 && (
                    <div style={{ height: `${warnPx}px`, backgroundColor: LEVEL_COLORS.warn, borderRadius: bucket.error > 0 ? "0" : "1px 1px 0 0", minHeight: "2px", opacity: isHovered ? 1 : 0.8, transition: "opacity 0.15s" }} />
                  )}
                  {(bucket.info + bucket.debug) > 0 && (
                    <div style={{ height: `${infoPx}px`, backgroundColor: LEVEL_COLORS.info, borderRadius: (bucket.error > 0 || bucket.warn > 0) ? "0" : "1px 1px 0 0", minHeight: "2px", opacity: isHovered ? 1 : 0.8, transition: "opacity 0.15s" }} />
                  )}

                  {isHovered && bucket.total > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: `${Math.max(errorPx + warnPx + infoPx, 4) + 8}px`,
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
                      <div style={{ fontWeight: 600, marginBottom: "2px" }}>{formatTime(bucket.time)}</div>
                      {bucket.error > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ height: "6px", width: "6px", borderRadius: "50%", backgroundColor: LEVEL_COLORS.error }} />
                          {bucket.error} errors
                        </div>
                      )}
                      {bucket.warn > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ height: "6px", width: "6px", borderRadius: "50%", backgroundColor: LEVEL_COLORS.warn }} />
                          {bucket.warn} warnings
                        </div>
                      )}
                      {(bucket.info + bucket.debug) > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ height: "6px", width: "6px", borderRadius: "50%", backgroundColor: LEVEL_COLORS.info }} />
                          {bucket.info + bucket.debug} info
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", marginLeft: "32px", paddingTop: "6px", paddingBottom: "4px" }}>
          {buckets.map((bucket, i) =>
            i % labelInterval === 0 ? (
              <span key={i} style={{ flex: labelInterval, fontSize: "9px", color: "var(--muted-foreground)" }}>
                {formatTime(bucket.time)}
              </span>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
