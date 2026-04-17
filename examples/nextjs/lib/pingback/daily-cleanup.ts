import { cron } from "@pingback/next";

export const dailyCleanup = cron(
  "daily-cleanup",
  "0 0 * * *", // midnight every day
  async (ctx) => {
    ctx.log("Starting daily cleanup...");

    // Simulate cleanup work
    const itemsDeleted = Math.floor(Math.random() * 100);
    ctx.log(`Deleted ${itemsDeleted} expired items`);

    return { itemsDeleted };
  },
  {
    retries: 2,
    timeout: "30s",
  },
);
