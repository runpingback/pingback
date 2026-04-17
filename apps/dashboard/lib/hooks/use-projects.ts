"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface Project {
  id: string;
  name: string;
  endpointUrl: string;
  domain?: string;
  cronSecret?: string;
  createdAt: string;
  updatedAt: string;
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => apiClient.get<Project[]>("/api/v1/projects"),
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => apiClient.get<Project>(`/api/v1/projects/${projectId}`),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; endpointUrl: string; domain?: string }) =>
      apiClient.post<Project>("/api/v1/projects", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => apiClient.delete(`/api/v1/projects/${projectId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); },
  });
}
