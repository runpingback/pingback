import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Icon className="h-12 w-12 text-muted-foreground/30 mb-4" />
      <h3 className="text-lg font-medium text-muted-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground/60 max-w-sm text-center">{description}</p>
    </div>
  );
}
