"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface Job {
  id: string;
  projectId: string;
  name: string;
  schedule: string | null;
  status: "active" | "paused" | "inactive";
  nextRunAt: string | null;
  lastRunAt: string | null;
  retries: number;
  timeoutSeconds: number;
  concurrency: number;
  source: "sdk" | "manual";
  createdAt: string;
  updatedAt: string;
}

export function useJobs(projectId: string, filters?: { status?: string; type?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.type) params.set("type", filters.type);
  const query = params.toString();

  return useQuery({
    queryKey: ["jobs", projectId, filters],
    queryFn: () => apiClient.get<Job[]>(`/api/v1/projects/${projectId}/jobs${query ? `?${query}` : ""}`),
    enabled: !!projectId,
  });
}
