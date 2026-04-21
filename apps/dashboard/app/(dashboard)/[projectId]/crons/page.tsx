"use client";

import { useParams } from "next/navigation";
import {
  IconClockFilled,
  IconDotsVertical,
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconTrashFilled,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { useJobs, useRunJob, useUpdateJob, useDeleteJob, type Job } from "@/lib/hooks/use-jobs";
import { useConfirm } from "@/components/confirm-dialog";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

export default function CronsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: jobs, isLoading } = useJobs(projectId, { type: "cron" });
  const runJob = useRunJob(projectId);
  const updateJob = useUpdateJob(projectId);
  const deleteJob = useDeleteJob(projectId);
  const { confirm, ConfirmDialog } = useConfirm();

  async function handleRun(e: React.MouseEvent, job: Job) {
    e.stopPropagation();
    try {
      await runJob.mutateAsync(job.id);
      toast.success(`Triggered "${job.name}"`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleToggle(e: React.MouseEvent, job: Job) {
    e.stopPropagation();
    const next = job.status === "paused" ? "active" : "paused";
    try {
      await updateJob.mutateAsync({ id: job.id, status: next });
      toast.success(next === "paused" ? `Paused "${job.name}"` : `Resumed "${job.name}"`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function handleDelete(job: Job) {
    confirm({
      title: `Delete "${job.name}"?`,
      description: "This cannot be undone. All execution history for this job will be lost.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await deleteJob.mutateAsync(job.id);
          toast.success(`Deleted "${job.name}"`);
        } catch (err) {
          toast.error((err as Error).message);
        }
      },
    });
  }

  const columns: Column<Job>[] = [
    {
      key: "name",
      header: "Name",
      render: (job) => <span className="font-medium">{job.name}</span>,
    },
    {
      key: "schedule",
      header: "Schedule",
      render: (job) => (
        <span className="font-mono text-muted-foreground">{job.schedule}</span>
      ),
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
      render: (job) => (
        <span className="text-muted-foreground">{job.retries}</span>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (job) => (
        <Badge variant="outline" className="font-normal text-xs">
          {job.source.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (job) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-secondary/80 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <IconDotsVertical className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => handleRun(e, job)}>
              <IconPlayerPlayFilled className="h-4 w-4" /> Run now
            </DropdownMenuItem>
            {job.status !== "inactive" && (
              <DropdownMenuItem onClick={(e) => handleToggle(e, job)}>
                {job.status === "paused" ? (
                  <>
                    <IconPlayerPlayFilled className="h-4 w-4" /> Resume
                  </>
                ) : (
                  <>
                    <IconPlayerPauseFilled className="h-4 w-4" /> Pause
                  </>
                )}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => handleDelete(job)}>
              <IconTrashFilled className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Crons" />
      <div className="p-6">
        {ConfirmDialog}
        <DataTable
          columns={columns}
          data={jobs}
          isLoading={isLoading}
          keyFn={(job) => job.id}
          selectable={false}
          emptyState={
            <EmptyState
              icon={IconClockFilled}
              title="No crons yet"
              description="Functions registered via the SDK will appear here."
            />
          }
        />
      </div>
    </div>
  );
}
