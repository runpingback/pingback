import { Terminal } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function LogsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Logs</h1>
      <EmptyState icon={Terminal} title="No logs yet" description="Logs from ctx.log() calls will appear here." />
    </div>
  );
}
