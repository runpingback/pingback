"use client";

import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/lib/hooks/use-projects";
import { CreateProjectDialog } from "@/components/create-project-dialog";

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <CreateProjectDialog />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-12 w-full" />))}
        </div>
      ) : projects?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No projects yet. Create one to get started.</p>
          <CreateProjectDialog />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Endpoint URL</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects?.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <Link href={`/${project.id}/crons`} className="text-primary hover:underline font-medium">
                    {project.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{project.endpointUrl}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(project.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
