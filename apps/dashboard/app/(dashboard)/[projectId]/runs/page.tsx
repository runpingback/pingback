import { Play } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function RunsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Runs</h1>
      <EmptyState icon={Play} title="No runs yet" description="Execution history will appear here once your crons start running." />
    </div>
  );
}
