# @usepingback/core

Framework-agnostic core for Pingback SDKs. Used internally by framework adapters like `@usepingback/next`.

**You probably want [`@usepingback/next`](../next) instead.**

## What's Inside

- **Registry** — Function registration (cron jobs and tasks)
- **Context** — Execution context with structured logging
- **Signing** — HMAC-SHA256 request signing and verification
- **Registration Client** — Deploy-time function registration with the Pingback API

## API

```ts
import {
  Registry,
  createContext,
  signPayload,
  verifySignature,
  RegistrationClient,
} from "@usepingback/core";

// Register functions
const registry = new Registry();
registry.cron("my-job", "*/15 * * * *", handler, { retries: 3 });
registry.task("my-task", handler, { timeout: "30s" });

// Create execution context
const ctx = createContext({
  function: "my-job",
  executionId: "exec-123",
  attempt: 1,
  scheduledAt: "2026-04-17T12:00:00.000Z",
});

// Structured logging (LogFunction type — callable with .info/.warn/.error/.debug)
ctx.log("something happened");                   // info level
ctx.log("user signed in", { userId: "u-1" });    // info with metadata
ctx.log.warn("slow query", { ms: 1200 });        // warning
ctx.log.error("payment failed");                  // error
ctx.log.debug("cache miss");                      // debug
// LogEntry: { level: "info"|"warn"|"error"|"debug", message: string, meta?: Record<string, unknown> }

// Sign/verify payloads
const signature = signPayload(payload, secret);
const valid = verifySignature(payload, signature, timestamp, secret);

// Register with platform
const client = new RegistrationClient("https://api.pingback.lol", apiKey);
await client.register(functions, { projectId: "proj-123" });
```

## For Framework Adapter Authors

If you're building a Pingback adapter for a new framework, use this package as your foundation. See `@usepingback/next` for a reference implementation. An adapter typically needs:

1. Wrapper functions around `Registry` (`cron()`, `task()`)
2. A route handler that uses `createContext()` and HMAC verification
3. A build plugin that calls `RegistrationClient`
