"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IconPlus } from "@tabler/icons-react";
import {
  useCreateAlert,
  useUpdateAlert,
  type Alert,
  type CreateAlertInput,
} from "@/lib/hooks/use-alerts";
import { useJobs, type Job } from "@/lib/hooks/use-jobs";
import { toast } from "sonner";

const TRIGGER_LABELS: Record<CreateAlertInput["triggerType"], string> = {
  consecutive_failures: "Consecutive failures",
  duration_exceeded: "Duration exceeded",
  missed_run: "Missed run",
};

const VALUE_LABELS: Record<CreateAlertInput["triggerType"], string> = {
  consecutive_failures: "Number of failures",
  duration_exceeded: "Seconds",
  missed_run: "Minutes overdue",
};

interface AlertDialogProps {
  projectId: string;
  alert?: Alert;
  trigger?: React.ReactNode;
  onClose?: () => void;
}

export function AlertDialog({
  projectId,
  alert,
  trigger,
  onClose,
}: AlertDialogProps) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [triggerType, setTriggerType] =
    useState<CreateAlertInput["triggerType"]>("consecutive_failures");
  const [triggerValue, setTriggerValue] = useState("3");
  const [jobId, setJobId] = useState<string>("");

  const createAlert = useCreateAlert(projectId);
  const updateAlert = useUpdateAlert(projectId);
  const { data: jobs } = useJobs(projectId);
  const isEdit = !!alert;

  useEffect(() => {
    if (alert && open) {
      setTarget(alert.target);
      setTriggerType(alert.triggerType);
      setTriggerValue(String(alert.triggerValue));
      setJobId(alert.jobId || "");
    }
  }, [alert, open]);

  function resetForm() {
    setTarget("");
    setTriggerType("consecutive_failures");
    setTriggerValue("3");
    setJobId("");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      resetForm();
      onClose?.();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isEdit) {
        await updateAlert.mutateAsync({
          id: alert.id,
          target,
          triggerType,
          triggerValue: Number(triggerValue),
        });
        toast.success("Alert updated");
      } else {
        await createAlert.mutateAsync({
          channel: "email",
          target,
          triggerType,
          triggerValue: Number(triggerValue),
          ...(jobId ? { jobId } : {}),
        });
        toast.success("Alert created");
      }
      handleOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const isPending = createAlert.isPending || updateAlert.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <IconPlus className="mr-2 h-4 w-4" /> Create alert
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit alert" : "Create alert"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alert-target">Email</Label>
            <Input
              id="alert-target"
              type="email"
              placeholder="ops@example.com"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alert-trigger-type">Trigger</Label>
            <select
              id="alert-trigger-type"
              value={triggerType}
              onChange={(e) =>
                setTriggerType(
                  e.target.value as CreateAlertInput["triggerType"]
                )
              }
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alert-trigger-value">
              {VALUE_LABELS[triggerType]}
            </Label>
            <Input
              id="alert-trigger-value"
              type="number"
              min={1}
              value={triggerValue}
              onChange={(e) => setTriggerValue(e.target.value)}
              required
            />
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="alert-job">Scope</Label>
              <select
                id="alert-job"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                <option value="">All jobs</option>
                {jobs?.map((job: Job) => (
                  <option key={job.id} value={job.id}>
                    {job.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending
              ? isEdit
                ? "Updating..."
                : "Creating..."
              : isEdit
                ? "Update alert"
                : "Create alert"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
