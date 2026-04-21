"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface LogEntry {
  executionId: string;
  jobId: string;
  jobName: string;
  timestamp: number;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  meta?: Record<string, any>;
}

interface PaginatedLogs {
  items: LogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface LogsHistogramBucket {
  time: string;
  info: number;
  warn: number;
  error: number;
  debug: number;
  total: number;
}

export function useLogsHistogram(projectId: string) {
  return useQuery({
    queryKey: ["logs-histogram", projectId],
    queryFn: () =>
      apiClient.get<LogsHistogramBucket[]>(
        `/api/v1/projects/${projectId}/logs/histogram`
      ),
    enabled: !!projectId,
    refetchInterval: 10000,
  });
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
