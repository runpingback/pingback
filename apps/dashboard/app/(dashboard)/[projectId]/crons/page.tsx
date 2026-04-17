"use client";

import { useParams } from "next/navigation";
import { Clock } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { useJobs } from "@/lib/hooks/use-jobs";

export default function CronsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: jobs, isLoading } = useJobs(projectId, { type: "cron" });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Crons</h1>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !jobs?.length ? (
        <EmptyState
          icon={Clock}
          title="No crons yet"
          description="Functions registered via the SDK will appear here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead>Next Run</TableHead>
              <TableHead>Retries</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">{job.name}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {job.schedule}
                </TableCell>
                <TableCell><StatusBadge status={job.status} /></TableCell>
                <TableCell className="text-muted-foreground">
                  {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : "Never"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {job.nextRunAt ? new Date(job.nextRunAt).toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{job.retries}</TableCell>
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
