"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface LogEntry {
  executionId: string;
  jobId: string;
  jobName: string;
  timestamp: number;
  message: string;
}

interface PaginatedLogs {
  items: LogEntry[];
  total: number;
  page: number;
  limit: number;
}

export function useLogs(
  projectId: string,
  filters?: { jobId?: string; q?: string; page?: number; limit?: number }
) {
  const params = new URLSearchParams();
  if (filters?.jobId) params.set("jobId", filters.jobId);
  if (filters?.q) params.set("q", filters.q);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  const query = params.toString();

  return useQuery({
    queryKey: ["logs", projectId, filters],
    queryFn: () =>
      apiClient.get<PaginatedLogs>(
        `/api/v1/projects/${projectId}/logs${query ? `?${query}` : ""}`
      ),
    enabled: !!projectId,
    refetchInterval: 10000,
  });
}
