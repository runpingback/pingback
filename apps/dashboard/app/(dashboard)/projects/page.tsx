"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/data-table";
import { useProjects, type Project } from "@/lib/hooks/use-projects";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";

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
      <PageHeader title="Projects">
        <CreateProjectDialog />
      </PageHeader>
      <div className="p-6">
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
    </div>
  );
}
