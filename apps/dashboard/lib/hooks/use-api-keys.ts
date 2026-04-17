"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  projectId: string;
  lastUsedAt?: string;
  createdAt: string;
}

export interface ApiKeyCreated {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
}

export function useApiKeys(projectId: string) {
  return useQuery({
    queryKey: ["api-keys", projectId],
    queryFn: () => apiClient.get<ApiKey[]>(`/api/v1/projects/${projectId}/api-keys`),
    enabled: !!projectId,
  });
}

export function useCreateApiKey(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) =>
      apiClient.post<ApiKeyCreated>(`/api/v1/projects/${projectId}/api-keys`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["api-keys", projectId] }); },
  });
}

export function useRevokeApiKey(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) =>
      apiClient.delete(`/api/v1/projects/${projectId}/api-keys/${keyId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["api-keys", projectId] }); },
  });
}
