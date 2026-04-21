"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface Execution {
  id: string;
  jobId: string;
  parentId: string | null;
  payload: any;
  status: "pending" | "running" | "success" | "failed";
  attempt: number;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  httpStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  logs: Array<{ timestamp: number; level?: string; message: string; meta?: Record<string, any> }>;
  attempts: Array<{
    attempt: number;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    durationMs: number | null;
    httpStatus: number | null;
    errorMessage: string | null;
    logs: Array<{ timestamp: number; level?: string; message: string; meta?: Record<string, any> }>;
  }>;
  createdAt: string;
  job?: { name: string; retries: number };
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export function useExecutions(
  projectId: string,
  filters?: { status?: string; jobId?: string; page?: number; limit?: number }
) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.jobId) params.set("jobId", filters.jobId);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  const query = params.toString();

  return useQuery({
    queryKey: ["executions", projectId, filters],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Execution>>(
        `/api/v1/projects/${projectId}/executions${query ? `?${query}` : ""}`
      ),
    enabled: !!projectId,
    refetchInterval: 5000, // poll every 5 seconds for live updates
  });
}

export function useExecution(projectId: string, executionId: string) {
  return useQuery({
    queryKey: ["execution", executionId],
    queryFn: () =>
      apiClient.get<Execution>(`/api/v1/projects/${projectId}/executions/${executionId}`),
    enabled: !!projectId && !!executionId,
    refetchInterval: 5000,
  });
}

export interface HistogramBucket {
  time: string;
  success: number;
  failed: number;
  total: number;
}

export function useExecutionHistogram(projectId: string) {
  return useQuery({
    queryKey: ["execution-histogram", projectId],
    queryFn: () =>
      apiClient.get<HistogramBucket[]>(
        `/api/v1/projects/${projectId}/executions/histogram?hours=24&buckets=144`
      ),
    enabled: !!projectId,
    refetchInterval: 5000,
  });
}

export function useChildExecutions(projectId: string, parentId: string) {
  return useQuery({
    queryKey: ["executions", projectId, { parentId }],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Execution>>(
        `/api/v1/projects/${projectId}/executions?parentId=${parentId}&limit=100`
      ),
    enabled: !!projectId && !!parentId,
    refetchInterval: 5000,
  });
}
