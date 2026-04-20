import { task } from "@usepingback/next";

export const generateReport = task(
  "generate-report",
  async (ctx, payload: { reportType: string; userId: string }) => {
    ctx.log(`Generating ${payload.reportType} report for user ${payload.userId}`);

    // Simulate report generation
    ctx.log("Fetching data...");
    ctx.log("Aggregating metrics...");
    ctx.log("Rendering PDF...");

    return {
      reportType: payload.reportType,
      userId: payload.userId,
      url: `https://reports.example.com/${payload.reportType}-${Date.now()}.pdf`,
    };
  },
  { retries: 1, timeout: "120s" },
);
