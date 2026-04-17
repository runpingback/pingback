import { createRouteHandler } from "@pingback/next/handler";

// Import all your pingback function files here
import "@/lib/pingback/quick-test";
import "@/lib/pingback/send-emails";
import "@/lib/pingback/health-check";
import "@/lib/pingback/daily-cleanup";
import "@/lib/pingback/process-webhook";
import "@/lib/pingback/generate-report";

export const POST = createRouteHandler();
