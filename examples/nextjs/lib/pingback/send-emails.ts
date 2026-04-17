import { cron } from "@pingback/next";

export const sendEmails = cron(
  "send-pending-emails",
  "*/15 * * * *", // every 15 minutes
  async (ctx) => {
    ctx.log("Checking for pending emails...");

    // Simulate fetching pending emails
    const pendingCount = Math.floor(Math.random() * 20);
    ctx.log(`Found ${pendingCount} pending emails`);

    for (let i = 0; i < pendingCount; i++) {
      // Simulate sending
      ctx.log(`Sent email ${i + 1}/${pendingCount}`);
    }

    return { sent: pendingCount };
  },
  {
    retries: 3,
    timeout: "60s",
    concurrency: 1,
  },
);
