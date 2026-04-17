import { Clock } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function CronsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Crons</h1>
      <EmptyState icon={Clock} title="No crons yet" description="Functions registered via the SDK will appear here." />
    </div>
  );
}
