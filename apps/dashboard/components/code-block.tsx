"use client";

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

interface CodeBlockProps {
  code: string;
  lang?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ code, lang = "json", showLineNumbers = true }: CodeBlockProps) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    codeToHtml(code, {
      lang,
      theme: "github-dark",
    }).then(setHtml);
  }, [code, lang]);

  if (!html) {
    // Fallback while shiki loads
    return (
      <pre className="text-xs font-mono p-3 overflow-auto">
        <code className="text-muted-foreground">{code}</code>
      </pre>
    );
  }

  return (
    <div
      className="shiki-wrapper overflow-auto [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0 [&_pre]:!text-[13px] [&_pre]:!leading-[18px] [&_code]:!text-[13px] [&_code]:!leading-[18px] [&_.line]:!leading-[18px] [&_.line]:!min-h-0 [&_span]:!leading-[18px]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
