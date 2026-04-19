"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export function useRunJob(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      apiClient.post(`/api/v1/projects/${projectId}/jobs/${jobId}/run`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", projectId] });
    },
  });
}

export function useUpdateJob(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: "active" | "paused" }) =>
      apiClient.patch(`/api/v1/projects/${projectId}/jobs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", projectId] });
    },
  });
}

export function useDeleteJob(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      apiClient.delete(`/api/v1/projects/${projectId}/jobs/${jobId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", projectId] });
    },
  });
}
