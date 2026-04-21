import { DocsCode, InlineCode } from "@/components/docs-code";
import { FrameworkSwitcher } from "@/components/framework-switcher";
import Link from "next/link";

export const metadata = { title: "Getting Started — Pingback Docs" };

export default function GettingStartedPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Getting Started</h1>
      <p className="text-muted-foreground mb-8">
        Pingback lets you define scheduled functions and background tasks directly
        in your codebase. The platform handles scheduling, retries, fan-out, and monitoring.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-3">How it works</h2>
      <div className="text-sm text-muted-foreground space-y-2">
        <p>1. Install a framework adapter (e.g. <InlineCode>@usepingback/next</InlineCode>).</p>
        <p>2. Define <InlineCode>cron()</InlineCode> and <InlineCode>task()</InlineCode> functions in your code.</p>
        <p>3. Deploy — Pingback discovers your functions at build time and registers them.</p>
        <p>4. The platform schedules and executes your functions, with retries and logging built in.</p>
        <p>5. Monitor everything in the Pingback dashboard.</p>
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-3">Quick example</h2>
      <FrameworkSwitcher>
        {{
          next: (
            <DocsCode code={`import { cron } from "@usepingback/next";

export const dailyCleanup = cron(
  "daily-cleanup",
  "0 3 * * *",
  async (ctx) => {
    await removeExpiredSessions();
    ctx.log("Sessions cleaned up");
  },
  { retries: 3 }
);`} />
          ),
        }}
      </FrameworkSwitcher>

      <h2 className="text-xl font-semibold mt-10 mb-3">Choose your framework</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Pingback provides framework-specific adapters built on a shared core.
        Each adapter handles route generation, build plugins, and framework conventions.
      </p>
      <div className="rounded-lg border overflow-hidden my-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium">Framework</th>
              <th className="text-left p-3 font-medium">Package</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="p-3"><Link href="/docs/next" className="text-accent hover:underline">Next.js</Link></td>
              <td className="p-3 font-mono">@usepingback/next</td>
              <td className="p-3">Available</td>
            </tr>
            <tr className="border-b">
              <td className="p-3"><Link href="/docs/nestjs" className="text-accent hover:underline">NestJS</Link></td>
              <td className="p-3 font-mono">@usepingback/nestjs</td>
              <td className="p-3">Available</td>
            </tr>
            <tr className="border-b">
              <td className="p-3">Nuxt</td>
              <td className="p-3 font-mono">@usepingback/nuxt</td>
              <td className="p-3">Coming soon</td>
            </tr>
            <tr className="border-b">
              <td className="p-3">SvelteKit</td>
              <td className="p-3 font-mono">@usepingback/sveltekit</td>
              <td className="p-3">Coming soon</td>
            </tr>
            <tr>
              <td className="p-3">Remix</td>
              <td className="p-3 font-mono">@usepingback/remix</td>
              <td className="p-3">Coming soon</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-3">Environment variables</h2>
      <p className="text-sm text-muted-foreground mb-2">
        All adapters require these environment variables:
      </p>
      <DocsCode code={`PINGBACK_API_KEY=pb_live_your_api_key_here
PINGBACK_CRON_SECRET=your_cron_secret_here`} lang="bash" />
      <p className="text-sm text-muted-foreground mt-2">
        You can find both values in the Pingback dashboard under your project settings.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-3">Scaffolding</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Use <InlineCode>npx pingback init</InlineCode> to scaffold a new project with
        the recommended file structure, config, and route handler:
      </p>
      <DocsCode code="npx pingback init" lang="bash" />

      <h2 className="text-xl font-semibold mt-10 mb-3">Local Development</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Use <InlineCode>npx pingback dev</InlineCode> to start a tunnel-based local
        development session against the production Pingback platform. This lets you
        test cron and task executions locally without deploying:
      </p>
      <DocsCode code="npx pingback dev [port]" lang="bash" />
      <p className="text-sm text-muted-foreground mt-2">
        The CLI creates a secure tunnel to your local server so the platform can reach
        your route handler. Pass an optional port number to match your dev server (defaults to 3000).
      </p>
    </>
  );
}
