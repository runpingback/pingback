"use client";

import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { DataTable, type Column } from "@/components/data-table";
import { useProjects, type Project } from "@/lib/hooks/use-projects";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { formatDate } from "@/lib/format";

const columns: Column<Project>[] = [
  {
    key: "name",
    header: "Name",
    render: (project) => <span className="text-primary font-medium">{project.name}</span>,
  },
  {
    key: "endpointUrl",
    header: "Endpoint URL",
    render: (project) => <span className="text-muted-foreground">{project.endpointUrl}</span>,
  },
  {
    key: "created",
    header: "Created",
    render: (project) => (
      <span className="text-muted-foreground">{formatDate(project.createdAt)}</span>
    ),
  },
];

export default function ProjectsPage() {
  const router = useRouter();
  const { data: projects, isLoading } = useProjects();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <CreateProjectDialog />
      </div>
      <DataTable
        columns={columns}
        data={projects}
        isLoading={isLoading}
        keyFn={(project) => project.id}
        onRowClick={(project) => router.push(`/${project.id}/crons`)}
        emptyState={
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No projects yet. Create one to get started.</p>
            <CreateProjectDialog />
          </div>
        }
      />
    </div>
  );
}
