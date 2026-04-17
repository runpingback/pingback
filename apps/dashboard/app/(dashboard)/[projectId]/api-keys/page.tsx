"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Key, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { CreateApiKeyDialog } from "@/components/create-api-key-dialog";
import { ApiKeyCreatedDialog } from "@/components/api-key-created-dialog";
import { useApiKeys, useRevokeApiKey } from "@/lib/hooks/use-api-keys";
import { toast } from "sonner";

export default function ApiKeysPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: apiKeys, isLoading } = useApiKeys(projectId);
  const revokeApiKey = useRevokeApiKey(projectId);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  async function handleRevoke(keyId: string, keyName: string) {
    if (!confirm(`Revoke "${keyName}"? This cannot be undone.`)) return;
    try {
      await revokeApiKey.mutateAsync(keyId);
      toast.success("API key revoked");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <CreateApiKeyDialog projectId={projectId} onCreated={(key) => setCreatedKey(key)} />
      </div>

      <ApiKeyCreatedDialog apiKey={createdKey} onClose={() => setCreatedKey(null)} />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-12 w-full" />))}
        </div>
      ) : apiKeys?.length === 0 ? (
        <EmptyState icon={Key} title="No API keys" description="Create an API key to connect your app to Pingback." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys?.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">{key.name}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{key.keyPrefix}...</TableCell>
                <TableCell className="text-muted-foreground">
                  {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}
                </TableCell>
                <TableCell className="text-muted-foreground">{new Date(key.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => handleRevoke(key.id, key.name)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
