"use client";

import { useParams } from "next/navigation";
import { IconListCheck } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { useJobs, type Job } from "@/lib/hooks/use-jobs";
import { PageHeader } from "@/components/page-header";

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
      <PageHeader title="Tasks" />
      <div className="p-6">
        <DataTable
          columns={columns}
          data={jobs}
          isLoading={isLoading}
          keyFn={(job) => job.id}
          emptyState={
            <EmptyState icon={IconListCheck} title="No tasks yet" description="Background tasks defined with task() will appear here." />
          }
        />
      </div>
    </div>
  );
}
