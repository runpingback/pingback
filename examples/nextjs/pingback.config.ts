import { defineConfig } from "@pingback/next";

export default defineConfig({
  apiKey: process.env.PINGBACK_API_KEY!,
  platformUrl: process.env.PINGBACK_PLATFORM_URL || "http://localhost:4000",
});
