"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Play } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { useExecutions } from "@/lib/hooks/use-executions";

export default function RunsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [page, setPage] = useState(1);
  const { data, isLoading } = useExecutions(projectId, { page, limit: 20 });

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
                <TableRow key={exec.id}>
                  <TableCell>
                    <Link
                      href={`/${projectId}/runs/${exec.id}`}
                      className="text-primary hover:underline font-mono text-sm"
                    >
                      {data.total - ((page - 1) * 20) - index}
                    </Link>
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
