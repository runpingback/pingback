# Python SDK Design Spec

## Overview

A Python SDK for Pingback that lets Python developers define cron jobs and background tasks using decorators, register them with the platform, and handle execution requests. Published to PyPI as `pingback-py`, imported as `pingback`. Standalone repo at `github.com/champ3oy/pingback-py`.

## Decisions

- **Separate repo** — Matches Go SDK pattern. Clean PyPI publishing.
- **Sync only** — Universal compatibility (Flask, Django, scripts). Async can be added later.
- **Decorator-based** — `@pb.cron()` / `@pb.task()` is the Pythonic convention.
- **Framework-agnostic core** — `pb.handle(body, headers)` works with anything. Thin `flask_handler()` and `fastapi_handler()` convenience wrappers included.
- **Zero external dependencies** — stdlib only.

## Public API

```python
from pingback import Pingback

class Pingback:
    def __init__(self, api_key: str, cron_secret: str, platform_url: str = None, base_url: str = None)
    def cron(self, name: str, schedule: str, retries: int = 0, timeout: str = None, concurrency: int = 1) -> decorator
    def task(self, name: str, retries: int = 0, timeout: str = None, concurrency: int = 1) -> decorator
    def handle(self, body: bytes, headers: dict) -> dict
    def flask_handler(self) -> callable
    def fastapi_handler(self) -> callable
    def trigger(self, task_name: str, payload: any = None) -> str  # returns execution_id

class Context:
    execution_id: str
    attempt: int
    scheduled_at: datetime
    payload: dict | None

    def log(self, message: str, **meta)
    def warn(self, message: str, **meta)
    def error(self, message: str, **meta)
    def debug(self, message: str, **meta)
    def task(self, name: str, payload: any = None)
```

## Usage Example

```python
import os
from pingback import Pingback

pb = Pingback(
    api_key=os.environ["PINGBACK_API_KEY"],
    cron_secret=os.environ["PINGBACK_CRON_SECRET"],
)

@pb.cron("cleanup", "0 3 * * *", retries=2, timeout="60s")
def cleanup(ctx):
    removed = remove_expired_sessions()
    ctx.log("Removed sessions", count=removed)
    return {"removed": removed}

@pb.task("send-email", retries=3, timeout="15s")
def send_email(ctx):
    to = ctx.payload["to"]
    deliver_email(to)
    ctx.log("Sent email", to=to)
    return {"sent": to}

# Flask
from flask import Flask
app = Flask(__name__)
app.route("/api/pingback", methods=["POST"])(pb.flask_handler())

# FastAPI
from fastapi import FastAPI, Request
app = FastAPI()
app.post("/api/pingback")(pb.fastapi_handler())
```

## Request Handling Flow

`pb.handle(body, headers)` is the core method. Framework wrappers call it.

1. **Verify signature** — Read `X-Pingback-Signature` and `X-Pingback-Timestamp` from headers. Compute HMAC-SHA256 over `"{timestamp}.{body}"` using `cron_secret`. Timing-safe compare via `hmac.compare_digest()`. Reject if invalid or timestamp > 5 minutes old. Return `{"error": "unauthorized"}` with status 401.

2. **Parse payload** — JSON decode body into `{"function", "executionId", "attempt", "scheduledAt", "payload"}`.

3. **Lookup handler** — Find registered function by name. Return 404 if not found.

4. **Build context** — Create `Context` with execution metadata, empty log list, empty task list.

5. **Execute** — Call the handler. Measure duration with `time.time()`. Catch exceptions.

6. **Respond** — Return dict:
   ```json
   {
     "status": "success" | "error",
     "result": ...,
     "error": "...",
     "logs": [...],
     "tasks": [...],
     "durationMs": 523
   }
   ```

## Framework Wrappers

### `flask_handler()`

Returns a Flask view function:

```python
def flask_handler(self):
    def handler():
        from flask import request, jsonify
        result = self.handle(request.data, dict(request.headers))
        status = result.pop("_status", 200)
        return jsonify(result), status
    return handler
```

### `fastapi_handler()`

Returns a FastAPI endpoint:

```python
def fastapi_handler(self):
    async def handler(request: Request):
        from fastapi.responses import JSONResponse
        body = await request.body()
        result = self.handle(body, dict(request.headers))
        status = result.pop("_status", 200)
        return JSONResponse(result, status_code=status)
    return handler
```

Note: `fastapi_handler` returns an async function since FastAPI expects it, but the actual work (`self.handle`) is sync.

## Registration Flow

On the first call to `handle()`, `flask_handler()`, or `fastapi_handler()`:

1. Collect metadata from all registered crons and tasks.
2. POST to `{platform_url}/api/v1/register`:
   ```json
   {
     "functions": [
       { "name": "cleanup", "type": "cron", "schedule": "0 3 * * *", "options": { "retries": 2 } },
       { "name": "send-email", "type": "task", "options": { "timeout": "15s" } }
     ],
     "endpoint_url": "https://myapp.com/api/pingback"
   }
   ```
   Headers: `Authorization: Bearer {api_key}`, `Content-Type: application/json`.
3. Log result. If registration fails, log and continue — don't block serving.

Uses a boolean flag to ensure registration runs exactly once (thread-safe with `threading.Lock`).

## Trigger Flow

`pb.trigger("send-email", {"to": "user@example.com"})`:

1. POST to `{platform_url}/api/v1/trigger`:
   ```json
   { "task": "send-email", "payload": { "to": "user@example.com" } }
   ```
   Headers: `Authorization: Bearer {api_key}`.
2. Parse response, return `execution_id`.
3. Raise exception on HTTP errors.

## HMAC Verification

- Algorithm: HMAC-SHA256
- Message: `"{X-Pingback-Timestamp}.{body}"`
- Key: `cron_secret`
- Output: hex-encoded digest
- Comparison: `hmac.compare_digest()` (timing-safe)
- Clock tolerance: 5 minutes

## File Structure

```
pingback-py/
├── pingback/
│   ├── __init__.py     # re-exports Pingback, Context
│   ├── client.py       # Pingback class, decorators, handle, trigger
│   ├── context.py      # Context class, logging, task fan-out
│   ├── hmac.py         # HMAC signing and verification
│   └── register.py     # Registration HTTP call
├── tests/
│   ├── test_hmac.py
│   └── test_client.py
├── example/
│   └── app.py          # Flask example
├── pyproject.toml
├── README.md
└── LICENSE
```

## Testing

- **HMAC tests** — Valid signature, invalid signature, expired timestamp, tampered body.
- **Handler tests** — Successful execution, unknown function (404), invalid signature (401), handler error (500 + error response), fan-out tasks collected in response, payload passed to handler.
- **Registration tests** — Mock HTTP server, verify payload shape, verify once-only behavior.
- **Trigger tests** — Mock HTTP server, verify request format, error propagation.
- **Decorator tests** — Verify `@pb.cron()` and `@pb.task()` register functions correctly.

All tests use `unittest` and `unittest.mock` — no external test dependencies.
