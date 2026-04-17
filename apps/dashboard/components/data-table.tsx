"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T, index: number) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[] | undefined;
  isLoading?: boolean;
  keyFn: (item: T) => string;
  expandable?: {
    render: (item: T) => React.ReactNode;
  };
  onRowClick?: (item: T) => void;
  emptyState?: React.ReactNode;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    onPageChange: (page: number) => void;
  };
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  keyFn,
  expandable,
  onRowClick,
  emptyState,
  pagination,
}: DataTableProps<T>) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleRowClick(item: T) {
    const id = keyFn(item);
    if (expandable) {
      setExpandedId((prev) => (prev === id ? null : id));
    }
    onRowClick?.(item);
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return <>{emptyState}</>;
  }

  const isClickable = !!expandable || !!onRowClick;

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/30">
              {expandable && <th className="w-10 p-2" />}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`p-2 text-left text-xs font-medium text-muted-foreground ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          {data.map((item, index) => {
            const id = keyFn(item);
            const isExpanded = expandedId === id;

            return (
              <tbody key={id}>
                <tr
                  className={`border-b transition-colors ${isClickable ? "cursor-pointer hover:bg-secondary/50" : ""} ${isExpanded ? "bg-secondary/30" : ""}`}
                  onClick={() => handleRowClick(item)}
                >
                  {expandable && (
                    <td className="w-10 p-2 text-center">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground inline" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground inline" />
                      )}
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={`p-2 ${col.className || ""}`}>
                      {col.render(item, index)}
                    </td>
                  ))}
                </tr>
                {expandable && isExpanded && (
                  <tr>
                    <td colSpan={columns.length + 1} className="p-0">
                      {expandable.render(item)}
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            {pagination.total} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page * pagination.limit >= pagination.total}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
