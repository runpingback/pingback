"use client";

import { useRouter, useParams } from "next/navigation";
import { IconSelector, IconPlus } from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjects } from "@/lib/hooks/use-projects";

function ProjectAvatar({ id, size = 20 }: { id: string; size?: number }) {
  return (
    <img
      src={`https://api.dicebear.com/9.x/glass/svg?seed=${id}`}
      alt=""
      width={size}
      height={size}
      className="rounded shrink-0"
    />
  );
}

export function ProjectSwitcher() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: projects } = useProjects();
  const currentProject = projects?.find((p) => p.id === projectId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full outline-none">
        <div className="flex items-center justify-between w-full px-3 py-1.5 rounded-md text-left text-sm bg-muted hover:bg-muted/80 transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            {currentProject && <ProjectAvatar id={currentProject.id} />}
            <span className="truncate text-sm">
              {currentProject?.name || "Select project"}
            </span>
          </div>
          <IconSelector className="ml-2 h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        {projects?.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onClick={() => router.push(`/${project.id}/crons`)}
            className={project.id === projectId ? "bg-muted" : ""}
          >
            <ProjectAvatar id={project.id} size={16} />
            {project.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/projects")}>
          <IconPlus className="mr-2 h-4 w-4" /> Create new project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
