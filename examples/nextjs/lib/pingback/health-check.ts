import { cron } from "@usepingback/next";

export const healthCheck = cron(
  "health-check",
  "*/5 * * * *", // every 5 minutes
  async (ctx) => {
    ctx.log("Running health check...");

    const checks = {
      database: true,
      cache: true,
      externalApi: Math.random() > 0.1, // 90% success rate
    };

    const allHealthy = Object.values(checks).every(Boolean);
    ctx.log(`Health: ${allHealthy ? "OK" : "DEGRADED"}`);

    if (!allHealthy) {
      throw new Error("Health check failed: some services degraded");
    }

    return checks;
  },
  {
    retries: 1,
    timeout: "10s",
  },
);
