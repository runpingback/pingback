"use client";

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

interface DocsCodeProps {
  code: string;
  lang?: string;
}

export function DocsCode({ code, lang = "typescript" }: DocsCodeProps) {
  const [html, setHtml] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    codeToHtml(code.trim(), {
      lang,
      theme: "github-dark-default",
    }).then(setHtml);
  }, [code, lang]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg border border-white/10 bg-[#0d1117] overflow-hidden my-4">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-md bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
        title="Copy code"
      >
        {copied ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        )}
      </button>
      <div className="p-4 overflow-auto">
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
