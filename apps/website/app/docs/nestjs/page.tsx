import { DocsCode, InlineCode } from "@/components/docs-code";

export const metadata = { title: "NestJS — Pingback Docs" };

export default function NestJsPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-2">NestJS</h1>
      <p className="text-muted-foreground mb-8">
        Set up Pingback in your NestJS app with the <InlineCode>@usepingback/nestjs</InlineCode> adapter.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-3">Installation</h2>
      <DocsCode code="npm install @usepingback/nestjs" lang="bash" />

      <h2 className="text-xl font-semibold mt-10 mb-3">Module Setup</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Import <InlineCode>PingbackModule</InlineCode> and call <InlineCode>register()</InlineCode> in
        your root module. The module auto-registers a POST endpoint and scans your providers
        for decorated handlers on startup:
      </p>
      <DocsCode code={`import { PingbackModule } from '@usepingback/nestjs';

@Module({
  imports: [
    PingbackModule.register({
      apiKey: process.env.PINGBACK_API_KEY,
      cronSecret: process.env.PINGBACK_CRON_SECRET,
      baseUrl: process.env.APP_URL,
    }),
  ],
})
export class AppModule {}`} />

      <h2 className="text-xl font-semibold mt-10 mb-3">Defining Functions</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Use the <InlineCode>@Cron</InlineCode> and <InlineCode>@Task</InlineCode> decorators on
        methods in any injectable service. They are automatically discovered at startup:
      </p>
      <DocsCode code={`import { Injectable } from '@nestjs/common';
import { Cron, Task, PingbackContext } from '@usepingback/nestjs';

@Injectable()
export class EmailService {
  @Cron('send-emails', '*/15 * * * *', { retries: 3, timeout: '60s' })
  async sendEmails(ctx: PingbackContext) {
    const pending = await getPendingEmails();
    for (const email of pending) {
      await ctx.task('send-email', { id: email.id });
    }
    ctx.log(\`Dispatched \${pending.length} emails\`);
  }

  @Task('send-email', { retries: 2, timeout: '15s' })
  async sendEmail(ctx: PingbackContext, payload: { id: string }) {
    const email = await getEmail(payload.id);
    await deliver(email);
    ctx.log('Sent email', { id: payload.id });
  }
}`} />

      <h2 className="text-xl font-semibold mt-10 mb-3">Structured Logging</h2>
      <p className="text-sm text-muted-foreground mb-2">
        The <InlineCode>ctx</InlineCode> object provides structured logging at multiple levels.
        All log entries are captured and returned to the platform with the execution result:
      </p>
      <DocsCode code={`ctx.log('message');                          // info
ctx.log('message', { key: 'value' });        // info with metadata
ctx.log.warn('slow query', { ms: 2500 });    // warning
ctx.log.error('failed', { code: 'E001' });   // error
ctx.log.debug('cache stats', { hits: 847 }); // debug`} />

      <h2 className="text-xl font-semibold mt-10 mb-3">Fan-Out</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Dispatch background tasks from within a cron handler using <InlineCode>ctx.task()</InlineCode>.
        Each task runs independently with its own retries and timeout:
      </p>
      <DocsCode code={`@Cron('process-orders', '0 * * * *', { retries: 3, timeout: '120s' })
async processOrders(ctx: PingbackContext) {
  const orders = await getUnprocessedOrders();
  for (const order of orders) {
    await ctx.task('fulfill-order', { orderId: order.id });
  }
  ctx.log(\`Dispatched \${orders.length} orders for fulfillment\`);
}`} />

      <h2 className="text-xl font-semibold mt-10 mb-3">Configuration</h2>
      <p className="text-sm text-muted-foreground mb-2">
        The full set of options accepted by <InlineCode>PingbackModule.register()</InlineCode>:
      </p>
      <DocsCode code={`PingbackModule.register({
  apiKey: string;          // Required — your project API key
  cronSecret: string;      // Required — request signing secret
  baseUrl?: string;        // Your app's public URL
  routePath?: string;      // default: /api/pingback
  platformUrl?: string;    // default: https://api.pingback.lol
})`} />

      <h2 className="text-xl font-semibold mt-10 mb-3">Environment Variables</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Add these to your <InlineCode>.env</InlineCode> file:
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

      <h2 className="text-xl font-semibold mt-10 mb-3">Local Development</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Use <InlineCode>npx pingback-nest dev [port]</InlineCode> to test your cron jobs and
        tasks locally against the production Pingback platform. The CLI creates a secure
        tunnel to your local NestJS dev server so the platform can invoke your endpoint:
      </p>
      <DocsCode code={`# Start your NestJS dev server, then in another terminal:
npx pingback-nest dev 3000`} lang="bash" />
      <p className="text-sm text-muted-foreground mt-2">
        Executions triggered from the dashboard or by schedule will be routed to your
        local machine, letting you debug with full access to local logs and breakpoints.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-3">How It Works</h2>
      <div className="text-sm text-muted-foreground space-y-2">
        <p>1. On startup, the module scans all providers for <InlineCode>@Cron</InlineCode> and <InlineCode>@Task</InlineCode> decorators.</p>
        <p>2. Discovered functions are registered with the Pingback platform via the API.</p>
        <p>3. A POST endpoint is auto-registered at <InlineCode>/api/pingback</InlineCode> (configurable).</p>
        <p>4. The platform sends signed execution requests to your endpoint on schedule.</p>
        <p>5. The controller verifies the HMAC signature, executes the handler, and returns results with logs.</p>
      </div>
    </>
  );
}
