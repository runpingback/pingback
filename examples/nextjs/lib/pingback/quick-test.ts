import { cron } from "@usepingback/next";

export const quickTest = cron(
  "quick-test",
  "* * * * *", // every minute
  async (ctx) => {
    ctx.log("Quick test started");
    ctx.log(`Current time: ${new Date().toISOString()}`);
    ctx.log("Quick test complete");
    return { ok: true };
  },
  { retries: 2 },
);
