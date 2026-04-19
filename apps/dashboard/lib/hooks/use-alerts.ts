"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface Alert {
  id: string;
  projectId: string;
  jobId: string | null;
  channel: "email";
  target: string;
  triggerType: "consecutive_failures" | "duration_exceeded" | "missed_run";
  triggerValue: number;
  enabled: boolean;
  lastFiredAt: string | null;
  cooldownSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertInput {
  jobId?: string;
  channel: "email";
  target: string;
  triggerType: "consecutive_failures" | "duration_exceeded" | "missed_run";
  triggerValue: number;
  cooldownSeconds?: number;
}

export interface UpdateAlertInput {
  target?: string;
  triggerType?: "consecutive_failures" | "duration_exceeded" | "missed_run";
  triggerValue?: number;
  enabled?: boolean;
  cooldownSeconds?: number;
}

export function useAlerts(projectId: string) {
  return useQuery({
    queryKey: ["alerts", projectId],
    queryFn: () =>
      apiClient.get<Alert[]>(
        `/api/v1/projects/${projectId}/alerts`
      ),
    enabled: !!projectId,
  });
}

export function useCreateAlert(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAlertInput) =>
      apiClient.post<Alert>(
        `/api/v1/projects/${projectId}/alerts`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts", projectId] });
    },
  });
}

export function useUpdateAlert(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateAlertInput & { id: string }) =>
      apiClient.patch<Alert>(
        `/api/v1/projects/${projectId}/alerts/${id}`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts", projectId] });
    },
  });
}

export function useDeleteAlert(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/api/v1/projects/${projectId}/alerts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts", projectId] });
    },
  });
}
