import { DocsCode, InlineCode } from "@/components/docs-code";

export const metadata = { title: "Next.js — Pingback Docs" };

export default function NextJsPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Next.js</h1>
      <p className="text-muted-foreground mb-8">
        Set up Pingback in your Next.js app with the <InlineCode>@usepingback/next</InlineCode> adapter.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-3">Installation</h2>
      <DocsCode code="npm install @usepingback/next" lang="bash" />

      <h2 className="text-xl font-semibold mt-10 mb-3">Configuration</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Create <InlineCode>pingback.config.ts</InlineCode> in your project root:
      </p>
      <DocsCode code={`import { defineConfig } from "@usepingback/next";

export default defineConfig({
  apiKey: process.env.PINGBACK_API_KEY,
});`} />

      <h2 className="text-xl font-semibold mt-10 mb-3">Next.js Plugin</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Wrap your Next.js config with <InlineCode>withPingback()</InlineCode>. At build time,
        it scans your project for <InlineCode>cron()</InlineCode> and <InlineCode>task()</InlineCode> calls,
        collects their metadata, and registers them with the Pingback platform:
      </p>
      <DocsCode code={`import { withPingback } from "@usepingback/next";

export default withPingback({
  // your existing Next.js config
});`} />

      <h2 className="text-xl font-semibold mt-10 mb-3">Route Handler</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Create <InlineCode>app/api/__pingback/route.ts</InlineCode> to receive execution
        requests from the platform:
      </p>
      <DocsCode code={`import { createRouteHandler } from "@usepingback/next";

export const { POST } = createRouteHandler();`} />
      <p className="text-sm text-muted-foreground mt-2">
        The handler validates the HMAC signature using your <InlineCode>PINGBACK_CRON_SECRET</InlineCode>,
        looks up the requested function, executes it, and returns the result with logs.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-3">Define Functions</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Create your cron and task functions anywhere in your project. They are
        automatically discovered at build time:
      </p>
      <DocsCode code={`import { cron, task } from "@usepingback/next";

export const sendEmails = cron(
  "send-emails",
  "*/15 * * * *",
  async (ctx) => {
    const pending = await getPendingEmails();
    for (const email of pending) {
      await ctx.task("send-email", { id: email.id });
    }
    ctx.log(\`Dispatched \${pending.length} emails\`);
  },
  { retries: 3, timeout: "60s" }
);

export const sendEmail = task(
  "send-email",
  async (ctx, { id }: { id: string }) => {
    const email = await getEmail(id);
    await deliver(email);
  },
  { retries: 2, timeout: "15s" }
);`} />

      <h2 className="text-xl font-semibold mt-10 mb-3">Environment Variables</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Add these to your <InlineCode>.env.local</InlineCode>:
      </p>
      <DocsCode code={`PINGBACK_API_KEY=pb_live_your_api_key_here
PINGBACK_CRON_SECRET=your_cron_secret_here`} lang="bash" />
      <div className="rounded-lg border overflow-hidden my-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium">Variable</th>
              <th className="text-left p-3 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="p-3 font-mono">PINGBACK_API_KEY</td>
              <td className="p-3">Your project API key. Found in the dashboard under API Keys.</td>
            </tr>
            <tr>
              <td className="p-3 font-mono">PINGBACK_CRON_SECRET</td>
              <td className="p-3">Request signing secret. Found in the dashboard under project Settings.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-3">Deploy</h2>
      <p className="text-sm text-muted-foreground">
        Deploy your app. Pingback discovers your functions at build time, registers them
        with the platform, and starts scheduling. Monitor executions in the dashboard.
      </p>
    </>
  );
}
