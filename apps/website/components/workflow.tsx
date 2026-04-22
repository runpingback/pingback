"use client";

import { useEffect, useState } from "react";
import { GridSection, GridDot } from "./grid-section";

const frameworks = [
  {
    name: "Next.js",
    lang: "typescript",
    install: "npm install @usepingback/next",
    code: `import { cron } from "@usepingback/next";

export const cleanup = cron(
  "cleanup",
  "0 3 * * *",
  async (ctx) => {
    const expired = await removeExpiredSessions();
    ctx.log(\`Removed \${expired} sessions\`);
  },
  { retries: 2 }
);`,
  },
  {
    name: "NestJS",
    lang: "typescript",
    install: "npm install @usepingback/nestjs",
    code: `import { Cron, PingbackService } from "@usepingback/nestjs";

@Cron("cleanup", "0 3 * * *", { retries: 2 })
async handleCleanup(ctx) {
  const expired = await this.sessionService.removeExpired();
  ctx.log(\`Removed \${expired} sessions\`);
}`,
  },
  {
    name: "Go",
    lang: "go",
    install: "go get github.com/usepingback/pingback-go",
    code: `import "github.com/usepingback/pingback-go"

func main() {
    pb := pingback.New(os.Getenv("PINGBACK_API_KEY"))

    pb.Cron("cleanup", "0 3 * * *", func(ctx *pingback.Context) error {
        expired, err := removeExpiredSessions()
        ctx.Log("Removed %d sessions", expired)
        return err
    }, pingback.WithRetries(2))
}`,
  },
];

const steps = [
  {
    number: "01",
    title: "Install the SDK",
    description: "Add the adapter for your framework.",
  },
  {
    number: "02",
    title: "Define your jobs",
    description: "Write cron and task functions in your codebase.",
  },
  {
    number: "03",
    title: "Monitor everything",
    description:
      "Deploy and get a dashboard with execution status, structured logs, failure alerts, and retry history.",
  },
];

export function Workflow() {
  const [active, setActive] = useState(0);
  const [highlightedHtml, setHighlightedHtml] = useState("");
  const fw = frameworks[active];

  useEffect(() => {
    let cancelled = false;
    import("shiki")
      .then(({ codeToHtml }) =>
        codeToHtml(fw.code, {
          lang: fw.lang,
          theme: "vesper",
        })
      )
      .then((result) => {
        if (!cancelled) setHighlightedHtml(result);
      })
      .catch(() => {
        if (!cancelled) setHighlightedHtml("");
      });
    return () => {
      cancelled = true;
    };
  }, [active, fw.code, fw.lang]);

  return (
    <GridSection>
      <div className="py-20 px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight mb-3">
          Works with your stack
        </h2>
        <p className="text-muted-foreground">
          Add Pingback to any framework in minutes.
        </p>
      </div>

      {/* Steps row */}
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
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-accent font-mono font-semibold">
                {step.number}.
              </span>
              <span className="text-sm font-semibold">{step.title}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      {/* Code example */}
      <div className="border-t relative p-8">
        <GridDot className="-top-[5px] -left-[5px]" />
        <GridDot className="-top-[5px] -right-[5px]" />
        <div className="flex gap-2 mb-4">
          {frameworks.map((f, i) => (
            <button
              key={f.name}
              onClick={() => setActive(i)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                active === i
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
        <div className="rounded-lg border bg-[#101010] px-4 py-3 mb-3">
          <code className="text-sm text-gray-300 font-mono">{fw.install}</code>
        </div>
        <div className="rounded-lg border bg-[#101010] px-4 py-3 overflow-x-auto">
          {highlightedHtml ? (
            <div
              className="[&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0 [&_pre]:!text-sm [&_pre]:!leading-6 [&_code]:!text-sm [&_code]:!leading-6"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          ) : (
            <pre className="text-sm text-gray-400 font-mono leading-6">
              <code>{fw.code}</code>
            </pre>
          )}
        </div>
      </div>
    </GridSection>
  );
}
