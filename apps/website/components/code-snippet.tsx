"use client";

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

const CODE = `import { cron } from "@usepingback/next";

export const sendEmails = cron(
  "send-emails",
  "*/15 * * * *",
  async (ctx) => {
    const pending = await getPendingEmails();
    for (const email of pending) {
      await ctx.task("send-email", { id: email.id });
    }
    ctx.log(\`Processed \${pending.length} emails\`);
    return { processed: pending.length };
  },
  { retries: 3, timeout: "60s" }
);`;

export function CodeSnippet() {
  const [html, setHtml] = useState("");

  useEffect(() => {
    codeToHtml(CODE, {
      lang: "typescript",
      theme: "github-dark",
    }).then(setHtml);
  }, []);

  return (
    <div className="rounded-lg border bg-[#0d1117] p-6 overflow-auto">
      {html ? (
        <div
          className="[&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0 [&_pre]:!text-sm [&_pre]:!leading-6 [&_code]:!text-sm [&_code]:!leading-6"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="text-sm leading-6 font-mono text-gray-400">
          <code>{CODE}</code>
        </pre>
      )}
    </div>
  );
}
