"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useExecution } from "@/lib/hooks/use-executions";

export default function RunDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const executionId = params.executionId as string;
  const { data: exec, isLoading } = useExecution(projectId, executionId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!exec) return <p className="text-muted-foreground">Execution not found.</p>;

  return (
    <div>
      <Link
        href={`/${projectId}/runs`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Runs
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Run {executionId.slice(0, 8)}</h1>
        <StatusBadge status={exec.status} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Job</CardTitle></CardHeader>
          <CardContent className="font-medium">{exec.job?.name || exec.jobId.slice(0, 8)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Duration</CardTitle></CardHeader>
          <CardContent className="font-medium">
            {exec.durationMs != null ? `${(exec.durationMs / 1000).toFixed(2)}s` : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Attempt</CardTitle></CardHeader>
          <CardContent className="font-medium">{exec.attempt}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">HTTP Status</CardTitle></CardHeader>
          <CardContent className="font-medium">{exec.httpStatus || "—"}</CardContent>
        </Card>
      </div>

      {exec.errorMessage && (
        <Card className="mb-6 border-destructive/30">
          <CardHeader><CardTitle className="text-sm text-destructive">Error</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-sm text-destructive whitespace-pre-wrap">{exec.errorMessage}</pre>
          </CardContent>
        </Card>
      )}

      {exec.logs && exec.logs.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm">Logs</CardTitle></CardHeader>
          <CardContent>
            <div className="font-mono text-sm space-y-1">
              {exec.logs.map((log, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-muted-foreground shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {exec.responseBody && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Response</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap overflow-auto max-h-64">
              {(() => {
                try { return JSON.stringify(JSON.parse(exec.responseBody), null, 2); }
                catch { return exec.responseBody; }
              })()}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
