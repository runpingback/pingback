import { GridSection, GridDot } from "./grid-section";
import { StatusBadge } from "./status-badge";

const features = [
  {
    title: "Structured Logs",
    badge: { label: "Observability", bg: "#a8b545", text: "#2a1f0a", icon: "M4 7h16M4 12h16M4 17h10" },
    description:
      "Every job emits logs via ctx.log(). Search, filter, and trace across executions in one dashboard.",
  },
  {
    title: "Real-Time Monitoring",
    badge: { label: "Dashboard", bg: "#5bb8a9", text: "#2a1f0a", icon: "M12 6v6l4 2" },
    description:
      "See every execution as it happens — status, duration, response, and errors. Get alerts when things break.",
  },
  {
    title: "Automatic Retries",
    badge: { label: "Reliability", bg: "#e8b44a", text: "#2a1f0a", icon: "M5 13l4 4L19 7" },
    description:
      "Configurable retry policies with exponential backoff. Failed jobs recover without you waking up at 3 AM.",
  },
  {
    title: "Fan-Out Tasks",
    badge: { label: "Execution", bg: "#d4734a", text: "#2a1f0a", icon: "M5 12h14" },
    description:
      "Spawn independent sub-tasks from any job. Each runs with its own retries, timeout, and tracking.",
  },
];

export function Features() {
  return (
    <GridSection>
        <div className="py-20 px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            Monitor every job. Debug every failure.
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Logs, retries, and alerts — so you know what ran, what failed, and why.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 border-t relative">
          <GridDot className="-top-[5px] -left-[5px]" />
          <GridDot className="-top-[5px] left-1/2 -translate-x-1/2" />
          <GridDot className="-top-[5px] -right-[5px]" />
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`p-8 relative ${i % 2 === 0 ? "md:border-r" : ""} ${i < 2 ? "border-b" : ""}`}
            >
              {i === 0 && (
                <>
                  <GridDot className="-bottom-[5px] -left-[5px]" />
                  <GridDot className="-bottom-[5px] -right-[5px]" />
                </>
              )}
              {i === 1 && (
                <GridDot className="-bottom-[5px] -right-[5px]" />
              )}
              <div className="mb-3">
                <StatusBadge {...feature.badge} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
    </GridSection>
  );
}
