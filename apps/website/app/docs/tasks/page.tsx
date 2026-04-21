import { DocsCode, InlineCode } from "@/components/docs-code";
import { FrameworkSwitcher } from "@/components/framework-switcher";

export const metadata = { title: "Tasks — Pingback Docs" };

export default function TasksPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Tasks</h1>
      <p className="text-muted-foreground mb-8">
        Define background tasks that are triggered via fan-out from cron jobs or
        manually from the dashboard.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-3">API</h2>
      <DocsCode code={`task(name: string, handler: Function, options?: Options)`} />
      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <p><InlineCode>name</InlineCode> — unique identifier for this task.</p>
        <p><InlineCode>handler</InlineCode> — async function receiving context and payload.</p>
        <p><InlineCode>options</InlineCode> — optional <InlineCode>retries</InlineCode>, <InlineCode>timeout</InlineCode>, <InlineCode>concurrency</InlineCode> (same as cron).</p>
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-3">Defining a Task</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Tasks are defined the same way as crons, but without a schedule. They receive
        a payload as the second argument:
      </p>
      <FrameworkSwitcher>
        {{
          next: (
            <DocsCode code={`import { task } from "@usepingback/next";

export const sendEmail = task(
  "send-email",
  async (ctx, { id }: { id: string }) => {
    const email = await getEmail(id);
    await deliver(email);
    ctx.log(\`Sent email to \${email.to}\`);
  },
  { retries: 2, timeout: "15s" }
);`} />
          ),
        }}
      </FrameworkSwitcher>

      <h2 className="text-xl font-semibold mt-10 mb-3">Fan-Out Pattern</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Use <InlineCode>ctx.task()</InlineCode> inside a cron to dispatch independent sub-tasks.
        Each task runs with its own retries, timeout, and tracking:
      </p>
      <FrameworkSwitcher>
        {{
          next: (
            <DocsCode code={`import { cron, task } from "@usepingback/next";

// Parent cron — runs every 15 minutes
export const sendEmails = cron(
  "send-emails",
  "*/15 * * * *",
  async (ctx) => {
    const pending = await getPendingEmails();

    for (const email of pending) {
      await ctx.task("send-email", { id: email.id });
    }

    ctx.log(\`Dispatched \${pending.length} emails\`);
    return { dispatched: pending.length };
  }
);

// Child task — runs independently per email
export const sendEmail = task(
  "send-email",
  async (ctx, { id }: { id: string }) => {
    const email = await getEmail(id);
    await deliver(email);
    ctx.log(\`Sent email to \${email.to}\`);
  },
  { retries: 2, timeout: "15s" }
);`} />
          ),
        }}
      </FrameworkSwitcher>

      <h2 className="text-xl font-semibold mt-10 mb-3">How Fan-Out Works</h2>
      <div className="text-sm text-muted-foreground space-y-2">
        <p>1. The cron handler calls <InlineCode>ctx.task("send-email", payload)</InlineCode> which collects the task request in memory.</p>
        <p>2. When the cron handler finishes, the SDK returns the collected tasks in the response.</p>
        <p>3. The platform creates a child execution for each task, linked to the parent.</p>
        <p>4. Each child task is dispatched independently via the queue with its own retry policy.</p>
        <p>5. Child tasks appear nested under the parent execution in the dashboard.</p>
      </div>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 mt-6">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Note:</strong> Tasks can also be triggered
          manually from the Pingback dashboard. Navigate to your task in the dashboard
          and click "Run" to dispatch it with a custom payload — useful for testing and
          one-off executions.
        </p>
      </div>
    </>
  );
}
