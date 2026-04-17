import { ListChecks } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function TasksPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tasks</h1>
      <EmptyState icon={ListChecks} title="No tasks yet" description="Background tasks defined with task() will appear here." />
    </div>
  );
}
