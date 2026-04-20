import { defineConfig } from "@usepingback/next";

export default defineConfig({
  apiKey: process.env.PINGBACK_API_KEY!,
  platformUrl: process.env.PINGBACK_PLATFORM_URL || "http://localhost:4000",
  baseUrl: "http://localhost:3001",
});
