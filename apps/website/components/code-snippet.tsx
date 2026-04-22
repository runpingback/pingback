"use client";

import { useEffect, useRef, useState } from "react";

const useCases = [
  {
    name: "Cron Jobs",
    icon: { path: "M12 6v6l4 2M12 2a10 10 0 100 20 10 10 0 000-20z", color: "#a8b545" },
    description:
      "Run functions on a schedule with standard cron expressions. Pingback handles timing, retries, and logs every execution.",
    code: `import { cron } from "@usepingback/next";

export const syncProducts = cron(
  "sync-products",
  "0 */6 * * *",
  async (ctx) => {
    const products = await shopify.products.list();
    ctx.log(\`Syncing \${products.length} products\`);

    for (const product of products) {
      await upsertProduct(product);
    }

    ctx.log("Sync complete", {
      count: products.length,
    });
  },
  { retries: 2, timeout: "120s" }
);`,
  },
  {
    name: "Background Tasks",
    icon: { path: "M4 4h16v16H4zM9 9h6v6H9z", color: "#5bb8a9" },
    description:
      "Offload work to background tasks triggered from your API routes. Each task runs independently with its own lifecycle.",
    code: `import { task } from "@usepingback/next";

export const processWebhook = task(
  "process-webhook",
  async (ctx, payload) => {
    const { event, data } = payload;
    ctx.log(\`Processing \${event}\`, { data });

    switch (event) {
      case "payment.completed":
        await activateSubscription(data);
        break;
      case "payment.failed":
        await notifyUser(data.userId);
        break;
    }

    ctx.log("Webhook processed");
  },
  { retries: 5, timeout: "30s" }
);`,
  },
  {
    name: "Fan-Out",
    icon: { path: "M12 5v14M5 12l7-7 7 7", color: "#e8b44a" },
    description:
      "Spawn independent sub-tasks from a parent job. Each child runs with its own retries, timeout, and tracking — no batch failures.",
    code: `import { cron } from "@usepingback/next";

export const sendEmails = cron(
  "send-emails",
  "*/15 * * * *",
  async (ctx) => {
    const pending = await db.emails.findPending();
    ctx.log(\`Found \${pending.length} emails\`);

    for (const email of pending) {
      await ctx.task("deliver-email", {
        to: email.recipient,
        template: email.template,
      });
    }

    ctx.log("All emails dispatched");
  },
  { retries: 3, timeout: "60s" }
);`,
  },
  {
    name: "Retries",
    icon: { path: "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15", color: "#d4734a" },
    description:
      "Configure retry policies per job. Failed executions retry with exponential backoff — every attempt is logged in your dashboard.",
    code: `import { cron } from "@usepingback/next";

export const chargeSubscriptions = cron(
  "charge-subscriptions",
  "0 0 * * *",
  async (ctx) => {
    const due = await db.subscriptions.findDue();
    ctx.log(\`Charging \${due.length} subscriptions\`);

    for (const sub of due) {
      const result = await stripe.charges.create({
        customer: sub.stripeId,
        amount: sub.amount,
      });
      ctx.log(\`Charged \${sub.stripeId}\`, {
        status: result.status,
      });
    }
  },
  { retries: 5, timeout: "120s" }
);`,
  },
  {
    name: "Concurrency",
    icon: { path: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01", color: "#8b5cf6" },
    description:
      "Control how many tasks run at the same time. Set concurrency limits per job to avoid overwhelming downstream services.",
    code: `import { task } from "@usepingback/next";

export const generateThumbnail = task(
  "generate-thumbnail",
  async (ctx, payload) => {
    const { imageUrl, sizes } = payload;
    ctx.log(\`Generating thumbnails for \${imageUrl}\`);

    for (const size of sizes) {
      const result = await sharp(imageUrl)
        .resize(size.width, size.height)
        .toBuffer();

      await s3.upload(\`thumbs/\${size.name}\`, result);
      ctx.log(\`Uploaded \${size.name}\`);
    }
  },
  { retries: 2, timeout: "60s", concurrency: 5 }
);`,
  },
  {
    name: "Workflows",
    icon: { path: "M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2 2 4-4M17 14v7M14 17h7", color: "#3b82f6" },
    description:
      "Chain tasks together to build multi-step workflows. Each step runs as its own task with independent retries and logging.",
    code: `import { cron } from "@usepingback/next";

export const onboardUser = cron(
  "onboard-new-users",
  "*/10 * * * *",
  async (ctx) => {
    const users = await db.users.findUnonboarded();

    for (const user of users) {
      ctx.log(\`Onboarding \${user.email}\`);

      await ctx.task("send-welcome-email", {
        userId: user.id,
      });
      await ctx.task("create-default-project", {
        userId: user.id,
      });
      await ctx.task("notify-team-slack", {
        email: user.email,
      });
    }
  },
  { retries: 2 }
);`,
  },
  {
    name: "Logging",
    icon: { path: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8", color: "#22c55e" },
    description:
      "Emit structured logs from any job with ctx.log(). Add metadata, set log levels, and search across all executions in one dashboard.",
    code: `import { cron } from "@usepingback/next";

export const healthCheck = cron(
  "health-check",
  "* * * * *",
  async (ctx) => {
    const services = [
      { name: "database", url: process.env.DB_URL },
      { name: "redis", url: process.env.REDIS_URL },
      { name: "stripe", url: "https://api.stripe.com" },
    ];

    for (const svc of services) {
      const start = Date.now();
      const ok = await ping(svc.url);

      ctx.log(\`\${svc.name}: \${ok ? "healthy" : "down"}\`, {
        latency: Date.now() - start,
        service: svc.name,
      });

      if (!ok) ctx.log.error(\`\${svc.name} is unreachable\`);
    }
  },
  { retries: 0 }
);`,
  },
  {
    name: "LLM Chains",
    icon: { path: "M12 2a4 4 0 014 4c0 1.95-2 3-2 8h-4c0-5-2-6.05-2-8a4 4 0 014-4zM10 22h4M10 18h4", color: "#f472b6" },
    description:
      "Run AI pipelines as background tasks. Chain LLM calls, fan out per model, and log token usage and responses for debugging.",
    code: `import { task } from "@usepingback/next";

export const summarizeArticle = task(
  "summarize-article",
  async (ctx, payload) => {
    const { articleId } = payload;
    const article = await db.articles.findById(articleId);
    ctx.log(\`Summarizing: \${article.title}\`);

    const summary = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Summarize concisely." },
        { role: "user", content: article.body },
      ],
    });

    await db.articles.update(articleId, {
      summary: summary.choices[0].message.content,
    });

    ctx.log("Summary saved", {
      tokens: summary.usage.total_tokens,
    });
  },
  { retries: 3, timeout: "60s" }
);`,
  },
];

export function CodeSnippet() {
  const [active, setActive] = useState(0);
  const [html, setHtml] = useState("");
  const tabsRef = useRef<HTMLDivElement>(null);
  const useCase = useCases[active];

  useEffect(() => {
    let cancelled = false;
    import("shiki")
      .then(({ codeToHtml }) =>
        codeToHtml(useCase.code, {
          lang: "typescript",
          theme: "vesper",
        })
      )
      .then((result) => {
        if (!cancelled) setHtml(result);
      })
      .catch(() => {
        if (!cancelled) setHtml("");
      });
    return () => {
      cancelled = true;
    };
  }, [active, useCase.code]);

  return (
    <div>
      {/* Scrollable tabs */}
      <div
        ref={tabsRef}
        className="flex gap-2 overflow-x-auto pb-4 scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {useCases.map((uc, i) => (
          <button
            key={uc.name}
            onClick={() => setActive(i)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
              active === i
                ? "bg-muted text-foreground border border-white/20"
                : "bg-muted text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={uc.icon.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={uc.icon.path} />
            </svg>
            {uc.name}
          </button>
        ))}
      </div>

      {/* Code + description */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr,320px] gap-0 rounded-lg border bg-[#101010] overflow-hidden">
        {/* Code */}
        <div className="p-6 overflow-auto border-b md:border-b-0 md:border-r border-white/5">
          {html ? (
            <div
              className="[&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0 [&_pre]:!text-sm [&_pre]:!leading-6 [&_code]:!text-sm [&_code]:!leading-6"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <pre className="text-sm leading-6 font-mono text-gray-400">
              <code>{useCase.code}</code>
            </pre>
          )}
        </div>

        {/* Description */}
        <div className="p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-gray-100">
              {useCase.name}
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              {useCase.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
