# @usepingback/core

Framework-agnostic core for Pingback SDKs. This package is used internally by framework adapters like `@usepingback/next`.

**You probably want [`@usepingback/next`](../next) instead.**

## What's Inside

- **Registry** — Function registration (cron jobs and tasks)
- **Context** — Execution context with logging
- **Signing** — HMAC-SHA256 request signing and verification
- **Registration Client** — Deploy-time function registration with the Pingback API

## API

```ts
import { 
  Registry, 
  createContext, 
  signPayload, 
  verifySignature, 
  RegistrationClient 
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

// Sign/verify payloads
const signature = signPayload(payload, secret);
const valid = verifySignature(payload, signature, timestamp, secret);

// Register with platform
const client = new RegistrationClient("https://api.pingback.dev", apiKey);
await client.register(functions, { projectId: "proj-123" });
```

## For Framework Adapter Authors

If you're building a Pingback adapter for a new framework, use this package as your foundation. See `@usepingback/next` for a reference implementation. An adapter typically needs:

1. Wrapper functions around `Registry` (`cron()`, `task()`)
2. A route handler that uses `createContext()` and HMAC verification
3. A build plugin that calls `RegistrationClient`
