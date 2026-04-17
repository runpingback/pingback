"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useCreateApiKey } from "@/lib/hooks/use-api-keys";
import { toast } from "sonner";

interface CreateApiKeyDialogProps {
  projectId: string;
  onCreated: (key: string) => void;
}

export function CreateApiKeyDialog({ projectId, onCreated }: CreateApiKeyDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const createApiKey = useCreateApiKey(projectId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await createApiKey.mutateAsync({ name });
      setOpen(false);
      setName("");
      onCreated(result.key);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Create API key</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create API key</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="key-name">Name</Label>
            <Input id="key-name" placeholder="e.g. Production, Development" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={createApiKey.isPending}>
            {createApiKey.isPending ? "Creating..." : "Create key"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
