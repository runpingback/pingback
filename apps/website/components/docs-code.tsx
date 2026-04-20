"use client";

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

interface DocsCodeProps {
  code: string;
  lang?: string;
}

export function DocsCode({ code, lang = "typescript" }: DocsCodeProps) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    codeToHtml(code.trim(), {
      lang,
      theme: "github-dark",
    }).then(setHtml);
  }, [code, lang]);

  return (
    <div className="rounded-lg border bg-[#0d1117] p-4 overflow-auto my-4">
      {html ? (
        <div
          className="[&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0 [&_pre]:!text-[13px] [&_pre]:!leading-6 [&_code]:!text-[13px] [&_code]:!leading-6"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="text-[13px] leading-6 font-mono text-gray-400">
          <code>{code.trim()}</code>
        </pre>
      )}
    </div>
  );
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-[13px] bg-muted px-1.5 py-0.5 rounded font-mono">
      {children}
    </code>
  );
}
