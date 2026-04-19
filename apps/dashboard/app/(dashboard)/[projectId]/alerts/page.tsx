"use client";

import { useParams } from "next/navigation";
import { IconBellFilled, IconDotsVertical, IconEditFilled, IconTrashFilled } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/empty-state";
import { DataTable, type Column } from "@/components/data-table";
import { useAlerts, useDeleteAlert, useUpdateAlert, type Alert } from "@/lib/hooks/use-alerts";
import { useJobs } from "@/lib/hooks/use-jobs";
import { AlertDialog } from "@/components/alert-dialog";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

const TRIGGER_DISPLAY: Record<string, (v: number) => string> = {
  consecutive_failures: (v) => `${v} consecutive failure${v !== 1 ? "s" : ""}`,
  duration_exceeded: (v) => `Duration > ${v}s`,
  missed_run: (v) => `Missed by ${v}m`,
};

export default function AlertsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: alerts, isLoading } = useAlerts(projectId);
  const { data: jobs } = useJobs(projectId);
  const deleteAlert = useDeleteAlert(projectId);
  const updateAlert = useUpdateAlert(projectId);

  const jobMap = new Map(jobs?.map((j) => [j.id, j.name]) || []);

  async function handleDelete(e: React.MouseEvent, alert: Alert) {
    e.stopPropagation();
    if (!confirm(`Delete alert for "${alert.target}"? This cannot be undone.`)) return;
    try {
      await deleteAlert.mutateAsync(alert.id);
      toast.success("Alert deleted");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleToggle(e: React.MouseEvent, alert: Alert) {
    e.stopPropagation();
    try {
      await updateAlert.mutateAsync({ id: alert.id, enabled: !alert.enabled });
      toast.success(alert.enabled ? "Alert disabled" : "Alert enabled");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const columns: Column<Alert>[] = [
    {
      key: "target",
      header: "Target",
      render: (alert) => <span className="font-medium">{alert.target}</span>,
    },
    {
      key: "trigger",
      header: "Trigger",
      render: (alert) => (
        <span className="text-muted-foreground">
          {(TRIGGER_DISPLAY[alert.triggerType] || (() => alert.triggerType))(alert.triggerValue)}
        </span>
      ),
    },
    {
      key: "scope",
      header: "Scope",
      render: (alert) => (
        <span className="text-muted-foreground">
          {alert.jobId ? jobMap.get(alert.jobId) || "Unknown job" : "All jobs"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (alert) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            alert.enabled
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {alert.enabled ? "Enabled" : "Disabled"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (alert) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-secondary/80 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <IconDotsVertical className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => handleToggle(e, alert)}>
              {alert.enabled ? "Disable" : "Enable"}
            </DropdownMenuItem>
            <AlertDialog
              projectId={projectId}
              alert={alert}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <IconEditFilled className="h-4 w-4" /> Edit
                </DropdownMenuItem>
              }
            />
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={(e) => handleDelete(e, alert)}>
              <IconTrashFilled className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Alerts">
        <AlertDialog projectId={projectId} />
      </PageHeader>
      <div className="p-6">
        <DataTable
          columns={columns}
          data={alerts}
          isLoading={isLoading}
          keyFn={(alert) => alert.id}
          selectable={false}
          emptyState={
            <EmptyState
              icon={IconBellFilled}
              title="No alerts configured"
              description="Set up alert rules to get notified of failures."
            />
          }
        />
      </div>
    </div>
  );
}
