"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { IconPlus } from "@tabler/icons-react";
import { useCreateProject } from "@/lib/hooks/use-projects";
import { toast } from "sonner";

export function CreateProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [domain, setDomain] = useState("");
  const createProject = useCreateProject();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const project = await createProject.mutateAsync({ name, endpointUrl, domain: domain || undefined });
      toast.success("Project created");
      setOpen(false);
      setName("");
      setEndpointUrl("");
      setDomain("");
      router.push(`/${project.id}/crons`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><IconPlus className="mr-2 h-4 w-4" /> Create project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create a new project</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input id="project-name" placeholder="My App" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endpoint-url">Endpoint URL</Label>
            <Input id="endpoint-url" placeholder="https://myapp.vercel.app/api/__pingback" value={endpointUrl} onChange={(e) => setEndpointUrl(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain">Domain (optional)</Label>
            <Input id="domain" placeholder="myapp.vercel.app" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={createProject.isPending}>
            {createProject.isPending ? "Creating..." : "Create project"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
