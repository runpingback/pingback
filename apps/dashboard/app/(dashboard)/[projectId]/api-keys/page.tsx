"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconKeyFilled, IconTrashFilled } from "@tabler/icons-react";
import { EmptyState } from "@/components/empty-state";
import { DataTable, type Column } from "@/components/data-table";
import { CreateApiKeyDialog } from "@/components/create-api-key-dialog";
import { ApiKeyCreatedDialog } from "@/components/api-key-created-dialog";
import { useApiKeys, useRevokeApiKey, type ApiKey } from "@/lib/hooks/use-api-keys";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";

export default function ApiKeysPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: apiKeys, isLoading } = useApiKeys(projectId);
  const revokeApiKey = useRevokeApiKey(projectId);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  async function handleRevoke(e: React.MouseEvent, keyId: string, keyName: string) {
    e.stopPropagation();
    if (!confirm(`Revoke "${keyName}"? This cannot be undone.`)) return;
    try {
      await revokeApiKey.mutateAsync(keyId);
      toast.success("API key revoked");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const columns: Column<ApiKey>[] = [
    {
      key: "name",
      header: "Name",
      render: (key) => <span className="font-medium">{key.name}</span>,
    },
    {
      key: "key",
      header: "Key",
      render: (key) => <span className="font-mono text-muted-foreground">{key.keyPrefix}...</span>,
    },
    {
      key: "lastUsed",
      header: "Last Used",
      render: (key) => (
        <span className="text-muted-foreground">
          {key.lastUsedAt ? formatDate(key.lastUsedAt) : "Never"}
        </span>
      ),
    },
    {
      key: "created",
      header: "Created",
      render: (key) => (
        <span className="text-muted-foreground">{formatDate(key.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (key) => (
        <Button variant="ghost" size="sm" onClick={(e) => handleRevoke(e, key.id, key.name)}>
          <IconTrashFilled className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="API Keys">
        <CreateApiKeyDialog projectId={projectId} onCreated={(key) => setCreatedKey(key)} />
      </PageHeader>

      <div className="p-6">
        <ApiKeyCreatedDialog apiKey={createdKey} onClose={() => setCreatedKey(null)} />

        <DataTable
          columns={columns}
          data={apiKeys}
          isLoading={isLoading}
          keyFn={(key) => key.id}
          emptyState={
            <EmptyState icon={IconKeyFilled} title="No API keys" description="Create an API key to connect your app to Pingback." />
          }
        />
      </div>
    </div>
  );
}
