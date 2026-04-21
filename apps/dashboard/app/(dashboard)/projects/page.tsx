"use client";

import { useRouter } from "next/navigation";
import { IconFolderFilled, IconArrowRight } from "@tabler/icons-react";
import { useProjects, type Project } from "@/lib/hooks/use-projects";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-md border hover:bg-secondary/50 transition-colors"
      style={{ backgroundColor: "var(--muted)" }}
    >
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <img
            src={`https://api.dicebear.com/9.x/glass/svg?seed=${project.id}`}
            alt=""
            width={36}
            height={36}
            className="rounded shrink-0 mt-0.5"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium mb-0.5">{project.name}</p>
            <p className="text-xs text-muted-foreground truncate">{project.endpointUrl}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <StatusBadge status="active" />
          <IconArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-px border-t" style={{ backgroundColor: "var(--border)" }}>
        <div className="px-4 py-2.5" style={{ backgroundColor: "var(--background)" }}>
          <p className="text-[10px] text-muted-foreground">Domain</p>
          <p className="text-xs">{project.domain || "—"}</p>
        </div>
        <div className="px-4 py-2.5" style={{ backgroundColor: "var(--background)" }}>
          <p className="text-[10px] text-muted-foreground">Created</p>
          <p className="text-xs">{formatDate(project.createdAt)}</p>
        </div>
        <div className="px-4 py-2.5" style={{ backgroundColor: "var(--background)" }}>
          <p className="text-[10px] text-muted-foreground">Project ID</p>
          <p className="text-xs font-mono truncate">{project.id.slice(0, 12)}...</p>
        </div>
      </div>
    </button>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const { data: projects, isLoading } = useProjects();

  return (
    <div>
      <PageHeader title="Projects">
        <CreateProjectDialog />
      </PageHeader>
      <div className="p-6 max-w-3xl mx-auto">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 rounded-md border animate-pulse" style={{ backgroundColor: "var(--muted)" }} />
            ))}
          </div>
        ) : !projects?.length ? (
          <EmptyState
            icon={IconFolderFilled}
            title="No projects yet"
            description="Create a project to start scheduling cron jobs and background tasks."
          />
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => router.push(`/${project.id}/runs`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
