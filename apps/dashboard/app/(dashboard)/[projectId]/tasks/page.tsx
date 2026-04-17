"use client";

import { useParams } from "next/navigation";
import { ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { useJobs, type Job } from "@/lib/hooks/use-jobs";

const columns: Column<Job>[] = [
  {
    key: "name",
    header: "Name",
    render: (job) => <span className="font-medium">{job.name}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (job) => <StatusBadge status={job.status} />,
  },
  {
    key: "retries",
    header: "Retries",
    render: (job) => <span className="text-muted-foreground">{job.retries}</span>,
  },
  {
    key: "timeout",
    header: "Timeout",
    render: (job) => <span className="text-muted-foreground">{job.timeoutSeconds}s</span>,
  },
  {
    key: "source",
    header: "Source",
    render: (job) => (
      <Badge variant="outline" className="font-normal text-xs">{job.source.toUpperCase()}</Badge>
    ),
  },
];

export default function TasksPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: jobs, isLoading } = useJobs(projectId, { type: "task" });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tasks</h1>
      <DataTable
        columns={columns}
        data={jobs}
        isLoading={isLoading}
        keyFn={(job) => job.id}
        emptyState={
          <EmptyState icon={ListChecks} title="No tasks yet" description="Background tasks defined with task() will appear here." />
        }
      />
    </div>
  );
}
