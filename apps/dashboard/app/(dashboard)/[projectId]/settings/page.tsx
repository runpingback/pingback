"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Check, Copy } from "lucide-react";
import { useProject, useDeleteProject } from "@/lib/hooks/use-projects";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { data: project, refetch } = useProject(projectId);
  const deleteProject = useDeleteProject();
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [domain, setDomain] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (project && !initialized) {
    setName(project.name);
    setEndpointUrl(project.endpointUrl);
    setDomain(project.domain || "");
    setInitialized(true);
  }

  function handleCopySecret() {
    if (project?.cronSecret) {
      navigator.clipboard.writeText(project.cronSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

  async function handleDelete() {
    if (!confirm("Delete this project? This cannot be undone. All jobs and execution history will be lost.")) return;
    try {
      await deleteProject.mutateAsync(projectId);
      toast.success("Project deleted");
      router.push("/projects");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (!project) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Project Settings</h1>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-lg">General</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endpoint">Endpoint URL</Label>
              <Input id="endpoint" value={endpointUrl} onChange={(e) => setEndpointUrl(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domain (optional)</Label>
              <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} />
            </div>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Cron Secret</CardTitle>
          <p className="text-sm text-muted-foreground">
            Add this to your app as the <code className="text-xs bg-secondary px-1 py-0.5 rounded">PINGBACK_CRON_SECRET</code> environment variable.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 bg-background rounded-md border font-mono text-sm break-all">
            <span className="flex-1 text-muted-foreground">{project.cronSecret || "Not available"}</span>
            <Button variant="ghost" size="sm" onClick={handleCopySecret} disabled={!project.cronSecret}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete this project, all its jobs, and execution history.
          </p>
          <Button variant="destructive" onClick={handleDelete}>Delete project</Button>
        </CardContent>
      </Card>
    </div>
  );
}
