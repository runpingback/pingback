"use client";

import React, { useState, useCallback } from "react";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  selectable?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
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
  selectable = true,
  onSelectionChange,
}: DataTableProps<T>) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allIds = data?.map(keyFn) || [];
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = allIds.some((id) => selectedIds.has(id));

  const toggleAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const next = new Set<string>();
      if (!allSelected) {
        allIds.forEach((id) => next.add(id));
      }
      setSelectedIds(next);
      onSelectionChange?.(Array.from(next));
    },
    [allIds, allSelected, onSelectionChange],
  );

  const toggleOne = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onSelectionChange?.(Array.from(next));
        return next;
      });
    },
    [onSelectionChange],
  );

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
  const extraCols = (selectable ? 1 : 0) + (expandable ? 1 : 0);

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/30">
              {selectable && (
                <th className="w-10 p-2 text-center">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onCheckedChange={() => {}}
                    onClick={toggleAll}
                  />
                </th>
              )}
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
            const isSelected = selectedIds.has(id);

            return (
              <tbody key={id}>
                <tr
                  className={`border-b transition-colors ${isClickable ? "cursor-pointer hover:bg-secondary/50" : ""} ${isExpanded ? "bg-secondary/30" : ""} ${isSelected ? "bg-secondary/20" : ""}`}
                  onClick={() => handleRowClick(item)}
                >
                  {selectable && (
                    <td className="w-10 p-2 text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {}}
                        onClick={(e) => toggleOne(e, id)}
                      />
                    </td>
                  )}
                  {expandable && (
                    <td className="w-10 p-2 text-center">
                      {isExpanded ? (
                        <IconChevronDown className="h-4 w-4 text-muted-foreground inline" />
                      ) : (
                        <IconChevronRight className="h-4 w-4 text-muted-foreground inline" />
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
                  <tr className="border-b">
                    <td colSpan={columns.length + extraCols} className="p-0">
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
            {selectedIds.size > 0
              ? `${selectedIds.size} of ${pagination.total} selected`
              : `${pagination.total} total`}
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
