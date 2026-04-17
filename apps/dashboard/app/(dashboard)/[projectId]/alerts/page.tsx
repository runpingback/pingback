import { Bell } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function AlertsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Alerts</h1>
      <EmptyState icon={Bell} title="No alerts configured" description="Set up alert rules to get notified of failures." />
    </div>
  );
}
