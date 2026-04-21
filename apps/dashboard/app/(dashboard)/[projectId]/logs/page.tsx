"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { IconTerminal2, IconSearch } from "@tabler/icons-react";
import { formatDateTime } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { DataTable, type Column } from "@/components/data-table";
import { CodeBlock } from "@/components/code-block";
import { useLogs, type LogEntry } from "@/lib/hooks/use-logs";
import { PageHeader } from "@/components/page-header";
import { LogsChart } from "@/components/logs-chart";

function LogDetail({ log }: { log: LogEntry }) {
  return (
    <div className="border-t border-border bg-background">
      {/* Top row: metadata fields */}
      <div className="grid grid-cols-4 gap-4 p-4 pb-3 border-b border-border">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Execution ID</p>
          <p className="text-xs font-mono truncate">{log.executionId}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Job</p>
          <p className="text-xs font-medium" style={{ color: "#d4a574" }}>{log.jobName}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Level</p>
          <StatusBadge status={log.level || "info"} />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Timestamp</p>
          <p className="text-xs">{formatDateTime(log.timestamp)}</p>
        </div>
      </div>

      {/* Bottom row: message + metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-border">
        <div className="p-4">
          <p className="text-[10px] text-muted-foreground mb-1">Message</p>
          <p className="text-sm font-mono">{log.message}</p>
        </div>
        <div className="p-4">
          <p className="text-[10px] text-muted-foreground mb-1">Metadata</p>
          {log.meta ? (
            <div className="overflow-auto max-h-[300px]">
              <CodeBlock code={JSON.stringify(log.meta, null, 2)} lang="json" />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No metadata</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LogsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useLogs(projectId, { q: query || undefined, page, limit: 50 });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(search);
    setPage(1);
  }

  const columns: Column<LogEntry>[] = [
    {
      key: "level",
      header: "Level",
      className: "w-24",
      render: (log) => <StatusBadge status={log.level || "info"} />,
    },
    {
      key: "time",
      header: "Time",
      render: (log) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {formatDateTime(log.timestamp)}
        </span>
      ),
    },
    {
      key: "job",
      header: "Job",
      render: (log) => <span className="font-medium">{log.jobName}</span>,
    },
    {
      key: "message",
      header: "Message",
      render: (log) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-sm truncate">{log.message}</span>
          {log.meta && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0"
              style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
            >
              +meta
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Logs">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button type="submit" variant="outline" size="icon">
            <IconSearch className="h-4 w-4" />
          </Button>
        </form>
      </PageHeader>

      <div className="p-6">
        <LogsChart projectId={projectId} />
        <DataTable
          columns={columns}
          data={data?.items}
          isLoading={isLoading}
          keyFn={(log) => `${log.executionId}-${log.timestamp}-${log.message.slice(0, 20)}`}
          expandable={{ render: (log) => <LogDetail log={log} /> }}
          emptyState={
            <EmptyState
              icon={IconTerminal2}
              title="No logs yet"
              description="Logs from ctx.log() calls will appear here."
            />
          }
          pagination={
            data
              ? {
                  total: data.total,
                  page,
                  limit: 50,
                  onPageChange: setPage,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
