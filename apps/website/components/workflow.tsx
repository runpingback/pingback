import { GridSection, GridDot } from "./grid-section";

const steps = [
  {
    number: "01",
    title: "Install",
    content: (
      <div className="mt-4 rounded-lg border bg-[#0d1117] px-4 py-3">
        <code className="text-sm text-gray-300 font-mono">
          npm install @usepingback/next
        </code>
      </div>
    ),
  },
  {
    number: "02",
    title: "Define",
    content: (
      <div className="mt-4 rounded-lg border bg-[#0d1117] px-4 py-3 overflow-auto">
        <pre className="text-sm text-gray-300 font-mono leading-6">{`import { cron } from "@usepingback/next";

export const cleanup = cron(
  "cleanup",
  "0 3 * * *",
  async (ctx) => {
    await removeExpiredSessions();
    ctx.log("Sessions cleaned");
  }
);`}</pre>
      </div>
    ),
  },
  {
    number: "03",
    title: "Monitor",
    content: (
      <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
        Deploy your app. Pingback discovers your functions, schedules them, and
        shows every execution in your dashboard — status, duration, logs, and
        errors.
      </p>
    ),
  },
];

export function Workflow() {
  return (
    <GridSection>
        <div className="py-20 px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            Get started in 3 steps
          </h2>
          <p className="text-muted-foreground">
            From install to monitoring in under 10 minutes.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 border-t relative">
          <GridDot className="-top-[5px] -left-[5px]" />
          <GridDot className="-top-[5px] left-1/3 -translate-x-1/2" />
          <GridDot className="-top-[5px] left-2/3 -translate-x-1/2" />
          <GridDot className="-top-[5px] -right-[5px]" />
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`p-8 ${i < 2 ? "md:border-r" : ""} border-b md:border-b-0`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-accent font-mono font-semibold">
                  {step.number}.
                </span>
                <span className="text-xs text-muted-foreground">
                  {step.title}
                </span>
              </div>
              {step.content}
            </div>
          ))}
        </div>
    </GridSection>
  );
}
