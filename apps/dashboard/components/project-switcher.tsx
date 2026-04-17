"use client";

import { useRouter, useParams } from "next/navigation";
import { ChevronsUpDown, Plus } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/lib/hooks/use-projects";

export function ProjectSwitcher() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: projects } = useProjects();
  const currentProject = projects?.find((p) => p.id === projectId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between text-left font-normal h-auto py-1.5">
          <span className="truncate text-sm">{currentProject?.name || "Select project"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        {projects?.map((project) => (
          <DropdownMenuItem key={project.id} onClick={() => router.push(`/${project.id}/crons`)}
            className={project.id === projectId ? "bg-secondary" : ""}>
            {project.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/projects")}>
          <Plus className="mr-2 h-4 w-4" /> Create new project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
