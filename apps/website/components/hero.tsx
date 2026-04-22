import Link from "next/link";
import { CodeSnippet } from "./code-snippet";
import { GridSection, GridDot } from "./grid-section";

export function Hero() {
  return (
    <GridSection>
        <div className="py-24 px-6 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] mb-4 font-display">
            Background tasks you can
            <br />
            see and control.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Cron jobs, queues, and scheduled tasks — with structured logs,
            real-time monitoring, and automatic retries. Any framework, any language.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="https://app.pingback.lol/register"
              className="bg-accent text-accent-foreground px-6 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
            <Link
              href="/docs"
              className="bg-muted px-6 py-2.5 rounded-full text-sm font-medium hover:bg-muted/70 transition-colors"
            >
              Documentation
            </Link>
          </div>
        </div>
        <div className="border-t px-6 py-8 relative">
          <GridDot className="-top-[5px] -left-[5px]" />
          <GridDot className="-top-[5px] -right-[5px]" />
          <CodeSnippet />
        </div>
    </GridSection>
  );
}
