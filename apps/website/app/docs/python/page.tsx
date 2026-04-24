import { DocsCode, InlineCode } from "@/components/docs-code";

export const metadata = { title: "Python — Pingback Docs" };

export default function PythonPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Python</h1>
      <p className="text-muted-foreground mb-8">
        Set up Pingback in your Python app with the <InlineCode>pingback-py</InlineCode> SDK.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-3">Installation</h2>
      <DocsCode code="pip install pingback-py" lang="bash" />

      <h2 className="text-xl font-semibold mt-10 mb-3">Setup</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Create a <InlineCode>Pingback</InlineCode> client and define your functions
        with decorators:
      </p>
      <DocsCode code={`import os
from pingback import Pingback

pb = Pingback(
    api_key=os.environ["PINGBACK_API_KEY"],
    cron_secret=os.environ["PINGBACK_CRON_SECRET"],
)`} lang="python" />

      <h2 className="text-xl font-semibold mt-10 mb-3">Defining Functions</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Use <InlineCode>@pb.cron()</InlineCode> and <InlineCode>@pb.task()</InlineCode> decorators
        to register functions. The return value becomes the execution result:
      </p>
      <DocsCode code={`@pb.cron("send-emails", "*/15 * * * *", retries=3, timeout="60s")
def send_emails(ctx):
    pending = get_pending_emails()
    for email in pending:
        ctx.task("send-email", {"id": email.id})
    ctx.log("Dispatched emails", count=len(pending))
    return {"dispatched": len(pending)}

@pb.task("send-email", retries=2, timeout="15s")
def send_email(ctx):
    email_id = ctx.payload["id"]
    deliver_email(email_id)
    ctx.log("Sent email", id=email_id)
    return {"sent": email_id}`} lang="python" />

      <h2 className="text-xl font-semibold mt-10 mb-3">Typed Payloads</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Task handlers can accept a typed second parameter for autocomplete and validation.
        Works with dataclasses and Pydantic models:
      </p>
      <DocsCode code={`from dataclasses import dataclass

@dataclass
class EmailPayload:
    to: str
    subject: str
    priority: int = 1

@pb.task("send-email", retries=3)
def send_email(ctx, payload: EmailPayload):
    # payload.to, payload.subject — full autocomplete
    send_mail(payload.to, payload.subject)
    ctx.log("Sent", to=payload.to)`} lang="python" />

      <p className="text-sm text-muted-foreground mt-4 mb-2">
        With Pydantic:
      </p>
      <DocsCode code={`from pydantic import BaseModel

class OrderPayload(BaseModel):
    order_id: str
    amount: float
    email: str

@pb.task("process-order")
def process_order(ctx, payload: OrderPayload):
    # validated, with defaults and type coercion
    ctx.log("Processing", order_id=payload.order_id)`} lang="python" />

      <p className="text-sm text-muted-foreground mt-4 mb-2">
        All three styles are supported — existing handlers still work:
      </p>
      <div className="rounded-lg border overflow-hidden my-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium">Style</th>
              <th className="text-left p-3 font-medium">Signature</th>
              <th className="text-left p-3 font-medium">Payload access</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="p-3">No param</td>
              <td className="p-3"><InlineCode>def job(ctx)</InlineCode></td>
              <td className="p-3"><InlineCode>ctx.payload["key"]</InlineCode></td>
            </tr>
            <tr className="border-b">
              <td className="p-3">Raw dict</td>
              <td className="p-3"><InlineCode>def job(ctx, payload)</InlineCode></td>
              <td className="p-3"><InlineCode>payload["key"]</InlineCode></td>
            </tr>
            <tr>
              <td className="p-3">Typed</td>
              <td className="p-3"><InlineCode>def job(ctx, payload: MyType)</InlineCode></td>
              <td className="p-3"><InlineCode>payload.key</InlineCode></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-3">Framework Integration</h2>

      <h3 className="text-lg font-semibold mt-6 mb-3">Flask</h3>
      <DocsCode code={`from flask import Flask

app = Flask(__name__)
app.route("/api/pingback", methods=["POST"])(pb.flask_handler())`} lang="python" />

      <h3 className="text-lg font-semibold mt-6 mb-3">FastAPI</h3>
      <DocsCode code={`from fastapi import FastAPI

app = FastAPI()
app.post("/api/pingback")(pb.fastapi_handler())`} lang="python" />

      <h3 className="text-lg font-semibold mt-6 mb-3">Django</h3>
      <DocsCode code={`from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def pingback_handler(request):
    result = pb.handle(request.body, dict(request.headers))
    status = result.pop("_status", 200)
    return JsonResponse(result, status=status)`} lang="python" />

      <h3 className="text-lg font-semibold mt-6 mb-3">Any Framework</h3>
      <p className="text-sm text-muted-foreground mb-2">
        Use the raw <InlineCode>handle()</InlineCode> method with any framework:
      </p>
      <DocsCode code="result = pb.handle(body=request_body_bytes, headers=request_headers_dict)" lang="python" />

      <h2 className="text-xl font-semibold mt-10 mb-3">Structured Logging</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Log with keyword arguments for structured metadata:
      </p>
      <DocsCode code={`ctx.log("message")                         # info
ctx.log("message", key="value")            # info with metadata
ctx.warn("slow query", ms=2500)            # warning
ctx.error("failed", code="E001")           # error
ctx.debug("cache stats", hits=847)         # debug`} lang="python" />

      <h2 className="text-xl font-semibold mt-10 mb-3">Programmatic Triggering</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Trigger tasks from anywhere in your code:
      </p>
      <DocsCode code={`exec_id = pb.trigger("send-email", {"to": "user@example.com"})`} lang="python" />

      <h2 className="text-xl font-semibold mt-10 mb-3">Fan-Out</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Dispatch background tasks from within a cron handler using <InlineCode>ctx.task()</InlineCode>.
        Each task runs independently with its own retries and timeout:
      </p>
      <DocsCode code={`@pb.cron("process-orders", "0 * * * *", retries=3, timeout="120s")
def process_orders(ctx):
    orders = get_unprocessed_orders()
    for order in orders:
        ctx.task("fulfill-order", {"order_id": order.id})
    ctx.log("Dispatched orders", count=len(orders))
    return {"dispatched": len(orders)}`} lang="python" />

      <h2 className="text-xl font-semibold mt-10 mb-3">Configuration</h2>
      <DocsCode code={`pb = Pingback(
    api_key="pb_live_...",
    cron_secret="...",
    platform_url="https://api.pingback.lol",  # default
    base_url="https://myapp.com",              # your app's public URL
)`} lang="python" />

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
              <td className="p-3"><InlineCode>retries</InlineCode></td>
              <td className="p-3">0</td>
              <td className="p-3">Retry up to n times on failure.</td>
            </tr>
            <tr className="border-b">
              <td className="p-3"><InlineCode>timeout</InlineCode></td>
              <td className="p-3">"30s"</td>
              <td className="p-3">Execution timeout (e.g. "30s", "5m").</td>
            </tr>
            <tr>
              <td className="p-3"><InlineCode>concurrency</InlineCode></td>
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
        <p>1. Define functions with <InlineCode>@pb.cron()</InlineCode> and <InlineCode>@pb.task()</InlineCode> decorators.</p>
        <p>2. Mount the handler using your framework{"'"}s routing (Flask, FastAPI, Django, or raw).</p>
        <p>3. On the first request, the SDK registers your functions with the Pingback platform.</p>
        <p>4. The platform sends HMAC-signed HTTP requests to your handler on schedule.</p>
        <p>5. The handler verifies the signature, executes the function, and returns results with logs.</p>
      </div>
    </>
  );
}
