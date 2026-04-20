import { task } from "@usepingback/next";

export const processWebhook = task(
  "process-webhook",
  async (ctx, payload: { webhookId: string; source: string }) => {
    ctx.log(`Processing webhook ${payload.webhookId} from ${payload.source}`);

    // Simulate webhook processing
    const steps = ["validate", "transform", "store", "notify"];
    for (const step of steps) {
      ctx.log(`Step: ${step}`);
    }

    return { webhookId: payload.webhookId, processed: true };
  },
  { retries: 2, timeout: "15s" },
);
