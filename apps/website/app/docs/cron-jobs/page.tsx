import { DocsCode, InlineCode } from "@/components/docs-code";
import { FrameworkSwitcher } from "@/components/framework-switcher";

export const metadata = { title: "Cron Jobs — Pingback Docs" };

export default function CronJobsPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Cron Jobs</h1>
      <p className="text-muted-foreground mb-8">
        Define scheduled functions that run on a cron expression.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-3">API</h2>
      <DocsCode code={`cron(name: string, schedule: string, handler: Function, options?: Options)`} />
      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <p><InlineCode>name</InlineCode> — unique identifier for this cron job.</p>
        <p><InlineCode>schedule</InlineCode> — standard 5-field cron expression.</p>
        <p><InlineCode>handler</InlineCode> — async function receiving a context object.</p>
        <p><InlineCode>options</InlineCode> — optional configuration (see below).</p>
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-3">Schedule Expressions</h2>
      <div className="rounded-lg border overflow-hidden my-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium">Expression</th>
              <th className="text-left p-3 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b"><td className="p-3 font-mono">*/15 * * * *</td><td className="p-3">Every 15 minutes</td></tr>
            <tr className="border-b"><td className="p-3 font-mono">0 3 * * *</td><td className="p-3">Daily at 3:00 AM UTC</td></tr>
            <tr className="border-b"><td className="p-3 font-mono">0 */6 * * *</td><td className="p-3">Every 6 hours</td></tr>
            <tr className="border-b"><td className="p-3 font-mono">0 9 * * 1</td><td className="p-3">Every Monday at 9:00 AM</td></tr>
            <tr><td className="p-3 font-mono">0 0 1 * *</td><td className="p-3">First day of every month</td></tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-3">Options</h2>
      <div className="rounded-lg border overflow-hidden my-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium">Option</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Default</th>
              <th className="text-left p-3 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b"><td className="p-3 font-mono">retries</td><td className="p-3">0–10</td><td className="p-3">0</td><td className="p-3">Retry attempts with exponential backoff</td></tr>
            <tr className="border-b"><td className="p-3 font-mono">timeout</td><td className="p-3">string</td><td className="p-3">"30s"</td><td className="p-3">Max execution time (e.g. "30s", "5m")</td></tr>
            <tr><td className="p-3 font-mono">concurrency</td><td className="p-3">1–10</td><td className="p-3">1</td><td className="p-3">Max concurrent executions</td></tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-3">Full Example</h2>
      <FrameworkSwitcher>
        {{
          next: (
            <DocsCode code={`import { cron } from "@usepingback/next";

export const syncData = cron(
  "sync-data",
  "0 */6 * * *",
  async (ctx) => {
    ctx.log("Starting data sync", { source: "postgres" });
    const records = await fetchRecordsToSync();

    for (const record of records) {
      await syncRecord(record);
    }

    ctx.log(\`Synced \${records.length} records\`, { count: records.length });
    return { synced: records.length };
  },
  {
    retries: 3,
    timeout: "5m",
    concurrency: 1,
  }
);`} />
          ),
        }}
      </FrameworkSwitcher>
    </>
  );
}
