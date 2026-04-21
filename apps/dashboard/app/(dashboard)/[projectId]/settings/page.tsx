"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconCheck, IconCopy, IconExternalLink } from "@tabler/icons-react";
import { useProject, useDeleteProject } from "@/lib/hooks/use-projects";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useConfirm } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/status-badge";

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="text-muted-foreground hover:text-foreground transition-colors p-0.5 inline-flex items-center gap-1"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <IconCheck className="h-3 w-3" style={{ color: "#a8b545" }} /> : <IconCopy className="h-3 w-3" />}
      {label && <span className="text-xs">{copied ? "Copied" : label}</span>}
    </button>
  );
}

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { data: project, refetch } = useProject(projectId);
  const deleteProject = useDeleteProject();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [domain, setDomain] = useState("");
  const [initialized, setInitialized] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  if (project && !initialized) {
    setName(project.name);
    setEndpointUrl(project.endpointUrl);
    setDomain(project.domain || "");
    setInitialized(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.patch(`/api/v1/projects/${projectId}`, { name, endpointUrl, domain: domain || undefined });
      await refetch();
      toast.success("Project updated");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    confirm({
      title: "Delete this project?",
      description: "This cannot be undone. All jobs and execution history will be permanently lost.",
      confirmLabel: "Delete project",
      onConfirm: async () => {
        try {
          await deleteProject.mutateAsync(projectId);
          toast.success("Project deleted");
          router.push("/projects");
        } catch (err) {
          toast.error((err as Error).message);
        }
      },
    });
  }

  if (!project) return null;

  return (
    <div>
      <PageHeader title="Settings" />
      {ConfirmDialog}
      <div className="p-6 max-w-3xl mx-auto">

        {/* Overview */}
        <div className="rounded-md border mb-6">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Project overview</span>
            <StatusBadge status="active" />
          </div>
          <div className="grid grid-cols-2 gap-px" style={{ backgroundColor: "var(--border)" }}>
            <div className="p-4" style={{ backgroundColor: "var(--background)" }}>
              <p className="text-[10px] text-muted-foreground mb-1">Project ID</p>
              <div className="flex items-center gap-1">
                <p className="text-xs font-mono break-all">{projectId}</p>
                <CopyButton text={projectId} />
              </div>
            </div>
            <div className="p-4" style={{ backgroundColor: "var(--background)" }}>
              <p className="text-[10px] text-muted-foreground mb-1">Endpoint</p>
              <p className="text-xs truncate" style={{ color: "#d4a574" }}>{project.endpointUrl}</p>
            </div>
            <div className="p-4" style={{ backgroundColor: "var(--background)" }}>
              <p className="text-[10px] text-muted-foreground mb-1">Domain</p>
              <p className="text-xs">{project.domain || "—"}</p>
            </div>
            <div className="p-4" style={{ backgroundColor: "var(--background)" }}>
              <p className="text-[10px] text-muted-foreground mb-1">Created</p>
              <p className="text-xs">{new Date(project.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
            </div>
          </div>
        </div>

        {/* Cron Secret */}
        <div className="rounded-md border mb-6">
          <div className="px-4 py-3 border-b">
            <span className="text-xs text-muted-foreground">Cron secret</span>
          </div>
          <div className="p-4">
            <p className="text-xs text-muted-foreground mb-3">
              Add this to your app as the <code className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: "var(--muted)" }}>PINGBACK_CRON_SECRET</code> environment variable.
            </p>
            <div className="flex items-center gap-2 p-3 rounded-md border font-mono text-xs break-all" style={{ backgroundColor: "var(--muted)" }}>
              <span className="flex-1 text-muted-foreground select-all">{project.cronSecret || "Not available"}</span>
              <CopyButton text={project.cronSecret || ""} label="Copy" />
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="rounded-md border mb-6">
          <div className="px-4 py-3 border-b">
            <span className="text-xs text-muted-foreground">General</span>
          </div>
          <div className="p-4">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain (optional)</Label>
                  <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="myapp.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endpoint">Endpoint URL</Label>
                <Input id="endpoint" value={endpointUrl} onChange={(e) => setEndpointUrl(e.target.value)} required placeholder="https://myapp.com/api/pingback" />
                <p className="text-[11px] text-muted-foreground">The URL where Pingback sends execution requests to your app.</p>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  style={{ backgroundColor: "#d4a574", color: "#000", borderColor: "#d4a574" }}
                >
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-md border" style={{ borderColor: "rgba(212, 115, 74, 0.3)" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(212, 115, 74, 0.3)" }}>
            <span className="text-xs" style={{ color: "#d4734a" }}>Danger zone</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium mb-0.5">Delete this project</p>
              <p className="text-xs text-muted-foreground">All jobs, executions, logs, alerts, and API keys will be permanently deleted.</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              Delete project
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
