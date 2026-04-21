import { cron } from "@usepingback/next";

export const quickTest = cron(
  "quick-test",
  "* * * * *", // every minute
  async (ctx) => {
    ctx.log("Quick test started", { version: "1.0.0", env: "production" });

    ctx.log.debug("Fetching user data", { userId: "usr_abc123" });

    const startMs = Date.now();
    // Simulate work
    await new Promise((r) => setTimeout(r, 50));
    const elapsed = Date.now() - startMs;

    ctx.log("Processed batch", {
      records: 142,
      durationMs: elapsed,
      source: "postgres",
    });

    ctx.log.warn("Slow query detected", {
      query: "SELECT * FROM events WHERE created_at > $1",
      durationMs: 2340,
      threshold: 1000,
    });

    ctx.log.error("Failed to send notification", {
      channel: "slack",
      webhook: "https://hooks.slack.com/***",
      statusCode: 403,
      retryable: true,
    });

    ctx.log.debug("Cache stats", {
      hits: 847,
      misses: 23,
      hitRate: "97.4%",
    });

    ctx.log("Quick test complete", { totalMs: Date.now() - startMs });

    return { ok: true, processed: 142 };
  },
  { retries: 2 },
);
