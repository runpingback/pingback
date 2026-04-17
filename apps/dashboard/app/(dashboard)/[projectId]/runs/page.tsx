"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Play, ChevronDown, ChevronRight } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { useExecutions, type Execution } from "@/lib/hooks/use-executions";

function RunDetail({ exec }: { exec: Execution }) {
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground">Job</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-sm font-medium">
            {exec.job?.name || exec.jobId.slice(0, 8)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground">Duration</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-sm font-medium">
            {exec.durationMs != null ? `${(exec.durationMs / 1000).toFixed(2)}s` : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground">HTTP Status</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-sm font-medium">
            {exec.httpStatus || "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground">Scheduled At</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-sm font-medium">
            {new Date(exec.scheduledAt).toLocaleString()}
          </CardContent>
        </Card>
      </div>

      {exec.errorMessage && (
        <div className="rounded-md border border-destructive/30 p-3">
          <p className="text-xs font-medium text-destructive mb-1">Error</p>
          <pre className="text-sm text-destructive whitespace-pre-wrap">{exec.errorMessage}</pre>
        </div>
      )}

      {exec.logs && exec.logs.length > 0 && (
        <div className="rounded-md border p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Logs</p>
          <div className="font-mono text-sm space-y-0.5">
            {exec.logs.map((log, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-muted-foreground shrink-0 text-xs">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-sm">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {exec.responseBody && (
        <div className="rounded-md border p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Response</p>
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap overflow-auto max-h-48 font-mono">
            {(() => {
              try { return JSON.stringify(JSON.parse(exec.responseBody!), null, 2); }
              catch { return exec.responseBody; }
            })()}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function RunsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading } = useExecutions(projectId, { page, limit: 20 });

  function toggleRow(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Runs</h1>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !data?.items?.length ? (
        <EmptyState
          icon={Play}
          title="No runs yet"
          description="Execution history will appear here once your crons start running."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Run</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Attempt</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((exec, index) => (
                <>
                  <TableRow
                    key={exec.id}
                    className="cursor-pointer hover:bg-secondary"
                    onClick={() => toggleRow(exec.id)}
                  >
                    <TableCell className="w-8">
                      {expandedId === exec.id ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-primary font-mono text-sm">
                      {data.total - ((page - 1) * 20) - index}
                    </TableCell>
                    <TableCell className="font-medium">
                      {exec.job?.name || exec.jobId.slice(0, 8)}
                    </TableCell>
                    <TableCell><StatusBadge status={exec.status} /></TableCell>
                    <TableCell className="text-muted-foreground">
                      {exec.startedAt ? new Date(exec.startedAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {exec.durationMs != null ? `${(exec.durationMs / 1000).toFixed(1)}s` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{exec.attempt}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(exec.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                  {expandedId === exec.id && (
                    <TableRow key={`${exec.id}-detail`}>
                      <TableCell colSpan={8} className="p-0 bg-secondary/30">
                        <RunDetail exec={exec} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {data.total} total runs
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 20 >= data.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
