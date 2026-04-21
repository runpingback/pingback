"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  IconKeyFilled,
  IconDotsVertical,
  IconTrashFilled,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react";
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
import { CreateApiKeyDialog } from "@/components/create-api-key-dialog";
import { ApiKeyCreatedDialog } from "@/components/api-key-created-dialog";
import { useApiKeys, useRevokeApiKey, type ApiKey } from "@/lib/hooks/use-api-keys";
import { useConfirm } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";

function CopyPrefix({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <IconCheck className="h-3 w-3" /> : <IconCopy className="h-3 w-3" />}
    </button>
  );
}

export default function ApiKeysPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: apiKeys, isLoading } = useApiKeys(projectId);
  const revokeApiKey = useRevokeApiKey(projectId);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  function handleRevoke(key: ApiKey) {
    confirm({
      title: `Revoke "${key.name}"?`,
      description: "This key will stop working immediately. Any apps using it will lose access.",
      confirmLabel: "Revoke",
      onConfirm: async () => {
        try {
          await revokeApiKey.mutateAsync(key.id);
          toast.success("API key revoked");
        } catch (err) {
          toast.error((err as Error).message);
        }
      },
    });
  }

  function handleDelete(key: ApiKey) {
    confirm({
      title: `Delete "${key.name}"?`,
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await revokeApiKey.mutateAsync(key.id);
          toast.success("API key deleted");
        } catch (err) {
          toast.error((err as Error).message);
        }
      },
    });
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
      render: (key) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-muted-foreground">{key.keyPrefix}...</span>
          <CopyPrefix text={key.keyPrefix} />
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: () => <StatusBadge status="active" />,
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
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-secondary/80 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <IconDotsVertical className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => handleRevoke(key)}>
              Revoke
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => handleDelete(key)}>
              <IconTrashFilled className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
        {ConfirmDialog}
        <DataTable
          columns={columns}
          data={apiKeys}
          isLoading={isLoading}
          keyFn={(key) => key.id}
          selectable={false}
          emptyState={
            <EmptyState icon={IconKeyFilled} title="No API keys" description="Create an API key to connect your app to Pingback." />
          }
        />
      </div>
    </div>
  );
}
