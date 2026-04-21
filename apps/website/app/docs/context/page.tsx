import { DocsCode, InlineCode } from "@/components/docs-code";

export const metadata = { title: "Context Object — Pingback Docs" };

export default function ContextPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Context Object</h1>
      <p className="text-muted-foreground mb-8">
        The <InlineCode>ctx</InlineCode> object is passed to every cron and task handler.
      </p>

      <div className="rounded-lg border overflow-hidden my-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium">Property</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b"><td className="p-3 font-mono">ctx.executionId</td><td className="p-3">string</td><td className="p-3">Unique ID for this execution</td></tr>
            <tr className="border-b"><td className="p-3 font-mono">ctx.attempt</td><td className="p-3">number</td><td className="p-3">Current retry attempt (1-indexed)</td></tr>
            <tr className="border-b"><td className="p-3 font-mono">ctx.scheduledAt</td><td className="p-3">Date</td><td className="p-3">When this run was scheduled</td></tr>
            <tr className="border-b"><td className="p-3 font-mono">ctx.log(message, meta?)</td><td className="p-3">LogFunction</td><td className="p-3">Add a structured log entry (see below)</td></tr>
            <tr><td className="p-3 font-mono">ctx.task(name, payload)</td><td className="p-3">(string, any) =&gt; Promise&lt;void&gt;</td><td className="p-3">Dispatch a child task</td></tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-3">ctx.executionId</h2>
      <p className="text-sm text-muted-foreground mb-2">
        A unique UUID for the current execution. Useful for correlating logs or
        building idempotency keys:
      </p>
      <DocsCode code={`export const processPayment = cron("process", "0 * * * *", async (ctx) => {
  await processWithKey(ctx.executionId);
});`} />

      <h2 className="text-xl font-semibold mt-10 mb-3">ctx.attempt</h2>
      <p className="text-sm text-muted-foreground mb-2">
        The current retry attempt, starting at 1. Use it to adjust behavior on retries:
      </p>
      <DocsCode code={`export const syncData = cron("sync", "0 */6 * * *", async (ctx) => {
  if (ctx.attempt > 1) {
    ctx.log(\`Retry attempt \${ctx.attempt}\`);
  }
  await sync();
}, { retries: 3 });`} />

      <h2 className="text-xl font-semibold mt-10 mb-3">ctx.log(message, meta?)</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Adds a structured log entry visible in the dashboard. Logs include timestamps
        and appear in the execution detail view. Calling <InlineCode>ctx.log()</InlineCode> directly
        logs at the <InlineCode>info</InlineCode> level. You can also use <InlineCode>.warn()</InlineCode>,{" "}
        <InlineCode>.error()</InlineCode>, and <InlineCode>.debug()</InlineCode> for other levels.
        All methods accept an optional metadata object as the second argument.
      </p>

      <div className="rounded-lg border overflow-hidden my-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium">Method</th>
              <th className="text-left p-3 font-medium">Signature</th>
              <th className="text-left p-3 font-medium">Level</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b"><td className="p-3 font-mono">ctx.log()</td><td className="p-3">(message: string, meta?: object) =&gt; void</td><td className="p-3">info (default)</td></tr>
            <tr className="border-b"><td className="p-3 font-mono">ctx.log.info()</td><td className="p-3">(message: string, meta?: object) =&gt; void</td><td className="p-3">info</td></tr>
            <tr className="border-b"><td className="p-3 font-mono">ctx.log.warn()</td><td className="p-3">(message: string, meta?: object) =&gt; void</td><td className="p-3">warning</td></tr>
            <tr className="border-b"><td className="p-3 font-mono">ctx.log.error()</td><td className="p-3">(message: string, meta?: object) =&gt; void</td><td className="p-3">error</td></tr>
            <tr><td className="p-3 font-mono">ctx.log.debug()</td><td className="p-3">(message: string, meta?: object) =&gt; void</td><td className="p-3">debug</td></tr>
          </tbody>
        </table>
      </div>

      <DocsCode code={`export const cleanup = cron("cleanup", "0 3 * * *", async (ctx) => {
  const expired = await getExpiredSessions();
  ctx.log(\`Found \${expired.length} expired sessions\`);

  await deleteAll(expired);
  ctx.log("Cleanup complete");
});`} />

      <h2 className="text-xl font-semibold mt-10 mb-3">Structured Logging</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Pass a metadata object as the second argument to attach structured data to any
        log entry. Use different log levels to categorize messages:
      </p>
      <DocsCode code={`export const syncData = cron("sync-data", "0 */6 * * *", async (ctx) => {
  ctx.log("Starting sync", { source: "postgres" });

  ctx.log.debug("Fetching records", { batchSize: 100 });

  const records = await fetchRecords();
  ctx.log(\`Fetched \${records.length} records\`, { count: records.length });

  for (const record of records) {
    try {
      await sync(record);
    } catch (err) {
      ctx.log.error("Failed to sync record", { recordId: record.id, code: "E001" });
    }
  }

  if (records.length > 10000) {
    ctx.log.warn("Large batch detected", { count: records.length, threshold: 10000 });
  }

  ctx.log("Sync complete", { synced: records.length });
});`} />

      <h2 className="text-xl font-semibold mt-10 mb-3">ctx.task(name, payload)</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Dispatches a child task for fan-out. The task is collected and dispatched
        after the parent handler completes. See the <a href="/docs/tasks" className="text-accent hover:underline">Tasks</a> page for details.
      </p>
      <DocsCode code={`export const sendEmails = cron("send-emails", "*/15 * * * *", async (ctx) => {
  const pending = await getPending();
  for (const item of pending) {
    await ctx.task("send-email", { id: item.id });
  }
});`} />
    </>
  );
}
