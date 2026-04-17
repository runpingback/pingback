"use client";

import { useParams } from "next/navigation";
import { ListChecks } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { useJobs } from "@/lib/hooks/use-jobs";

export default function TasksPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: jobs, isLoading } = useJobs(projectId, { type: "task" });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tasks</h1>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !jobs?.length ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description="Background tasks defined with task() will appear here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Retries</TableHead>
              <TableHead>Timeout</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">{job.name}</TableCell>
                <TableCell><StatusBadge status={job.status} /></TableCell>
                <TableCell className="text-muted-foreground">{job.retries}</TableCell>
                <TableCell className="text-muted-foreground">{job.timeoutSeconds}s</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal text-xs">
                    {job.source.toUpperCase()}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
