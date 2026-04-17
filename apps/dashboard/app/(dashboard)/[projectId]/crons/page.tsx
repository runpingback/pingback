"use client";

import { useParams } from "next/navigation";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { useJobs, type Job } from "@/lib/hooks/use-jobs";
import { formatDateTime } from "@/lib/format";

const columns: Column<Job>[] = [
  {
    key: "name",
    header: "Name",
    render: (job) => <span className="font-medium">{job.name}</span>,
  },
  {
    key: "schedule",
    header: "Schedule",
    render: (job) => <span className="font-mono text-muted-foreground">{job.schedule}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (job) => <StatusBadge status={job.status} />,
  },
  {
    key: "lastRun",
    header: "Last Run",
    render: (job) => (
      <span className="text-muted-foreground">
        {job.lastRunAt ? formatDateTime(job.lastRunAt) : "Never"}
      </span>
    ),
  },
  {
    key: "nextRun",
    header: "Next Run",
    render: (job) => (
      <span className="text-muted-foreground">
        {job.nextRunAt ? formatDateTime(job.nextRunAt) : "—"}
      </span>
    ),
  },
  {
    key: "retries",
    header: "Retries",
    render: (job) => <span className="text-muted-foreground">{job.retries}</span>,
  },
  {
    key: "source",
    header: "Source",
    render: (job) => (
      <Badge variant="outline" className="font-normal text-xs">{job.source.toUpperCase()}</Badge>
    ),
  },
];

export default function CronsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: jobs, isLoading } = useJobs(projectId, { type: "cron" });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Crons</h1>
      <DataTable
        columns={columns}
        data={jobs}
        isLoading={isLoading}
        keyFn={(job) => job.id}
        emptyState={
          <EmptyState icon={Clock} title="No crons yet" description="Functions registered via the SDK will appear here." />
        }
      />
    </div>
  );
}
