import { DocsCode, InlineCode } from "@/components/docs-code";

export const metadata = { title: "Go — Pingback Docs" };

export default function GoPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Go</h1>
      <p className="text-muted-foreground mb-8">
        Set up Pingback in your Go app with the <InlineCode>pingback-go</InlineCode> SDK.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-3">Installation</h2>
      <DocsCode code="go get github.com/runpingback/pingback-go" lang="bash" />

      <h2 className="text-xl font-semibold mt-10 mb-3">Setup</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Create a <InlineCode>Pingback</InlineCode> client and mount the handler on your HTTP server:
      </p>
      <DocsCode code={`package main

import (
    "net/http"
    "os"

    pingback "github.com/runpingback/pingback-go"
)

func main() {
    pb := pingback.New(
        os.Getenv("PINGBACK_API_KEY"),
        os.Getenv("PINGBACK_CRON_SECRET"),
    )

    // Define functions here...

    http.Handle("/api/pingback", pb.Handler())
    http.ListenAndServe(":8080", nil)
}`} lang="go" />

      <h2 className="text-xl font-semibold mt-10 mb-3">Defining Functions</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Register cron jobs with <InlineCode>pb.Cron()</InlineCode> and background tasks
        with <InlineCode>pb.Task()</InlineCode>. Handlers return <InlineCode>(any, error)</InlineCode> —
        the return value becomes the execution result:
      </p>
      <DocsCode code={`pb.Cron("send-emails", "*/15 * * * *", func(ctx *pingback.Context) (any, error) {
    pending := getPendingEmails()
    for _, email := range pending {
        ctx.Task("send-email", map[string]string{"id": email.ID})
    }
    ctx.Log("Dispatched emails", "count", len(pending))
    return map[string]int{"dispatched": len(pending)}, nil
}, pingback.WithRetries(3), pingback.WithTimeout("60s"))

pb.Task("send-email", func(ctx *pingback.Context) (any, error) {
    var p struct{ ID string \`json:"id"\` }
    json.Unmarshal(ctx.Payload, &p)
    err := sendEmail(p.ID)
    ctx.Log("Sent email", "id", p.ID)
    return nil, err
}, pingback.WithRetries(2), pingback.WithTimeout("15s"))`} lang="go" />

      <h2 className="text-xl font-semibold mt-10 mb-3">Structured Logging</h2>
      <p className="text-sm text-muted-foreground mb-2">
        The context provides structured logging with key-value metadata:
      </p>
      <DocsCode code={`ctx.Log("message")                         // info
ctx.Log("message", "key", "value")         // info with metadata
ctx.Warn("slow query", "ms", 2500)         // warning
ctx.Error("failed", "code", "E001")        // error
ctx.Debug("cache stats", "hits", 847)      // debug`} lang="go" />

      <h2 className="text-xl font-semibold mt-10 mb-3">Programmatic Triggering</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Trigger tasks from anywhere in your code using <InlineCode>pb.Trigger()</InlineCode>:
      </p>
      <DocsCode code={`execID, err := pb.Trigger(context.Background(), "send-email", map[string]string{
    "to": "user@example.com",
})`} lang="go" />

      <h2 className="text-xl font-semibold mt-10 mb-3">Fan-Out</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Dispatch background tasks from within a cron handler using <InlineCode>ctx.Task()</InlineCode>.
        Each task runs independently with its own retries and timeout:
      </p>
      <DocsCode code={`pb.Cron("process-orders", "0 * * * *", func(ctx *pingback.Context) (any, error) {
    orders := getUnprocessedOrders()
    for _, order := range orders {
        ctx.Task("fulfill-order", map[string]string{"orderId": order.ID})
    }
    ctx.Log("Dispatched orders", "count", len(orders))
    return map[string]int{"dispatched": len(orders)}, nil
}, pingback.WithRetries(3), pingback.WithTimeout("120s"))`} lang="go" />

      <h2 className="text-xl font-semibold mt-10 mb-3">Configuration</h2>
      <DocsCode code={`pb := pingback.New(
    apiKey,
    cronSecret,
    pingback.WithPlatformURL("https://api.pingback.lol"),  // default
    pingback.WithBaseURL("https://myapp.com"),
)`} lang="go" />

      <h3 className="text-lg font-semibold mt-6 mb-3">Function Options</h3>
      <div className="rounded-lg border overflow-hidden my-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium">Option</th>
              <th className="text-left p-3 font-medium">Default</th>
              <th className="text-left p-3 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="p-3"><InlineCode>WithRetries(n)</InlineCode></td>
              <td className="p-3">0</td>
              <td className="p-3">Retry up to n times on failure.</td>
            </tr>
            <tr className="border-b">
              <td className="p-3"><InlineCode>WithTimeout("30s")</InlineCode></td>
              <td className="p-3">30s</td>
              <td className="p-3">Execution timeout.</td>
            </tr>
            <tr>
              <td className="p-3"><InlineCode>WithConcurrency(n)</InlineCode></td>
              <td className="p-3">1</td>
              <td className="p-3">Max concurrent runs.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-3">Environment Variables</h2>
      <DocsCode code={`PINGBACK_API_KEY=pb_live_your_api_key_here
PINGBACK_CRON_SECRET=your_cron_secret_here`} lang="bash" />

      <h2 className="text-xl font-semibold mt-10 mb-3">How It Works</h2>
      <div className="text-sm text-muted-foreground space-y-2">
        <p>1. Register cron jobs and tasks with <InlineCode>pb.Cron()</InlineCode> and <InlineCode>pb.Task()</InlineCode>.</p>
        <p>2. Mount the handler with <InlineCode>http.Handle("/api/pingback", pb.Handler())</InlineCode>.</p>
        <p>3. On the first request, the SDK registers your functions with the Pingback platform.</p>
        <p>4. The platform sends HMAC-signed HTTP requests to your handler on schedule.</p>
        <p>5. The handler verifies the signature, executes the function, and returns results with logs.</p>
      </div>
    </>
  );
}
