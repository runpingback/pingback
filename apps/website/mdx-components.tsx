import type { MDXComponents } from "mdx/types";
import { DocsCode, InlineCode } from "@/components/docs-code";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold tracking-tight mb-2">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-semibold mt-10 mb-3">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-semibold mt-6 mb-3">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="text-sm text-muted-foreground mb-2">{children}</p>
    ),
    code: ({ children, className }) => {
      if (className) {
        const lang = className.replace("language-", "");
        return <DocsCode code={String(children).trimEnd()} lang={lang} />;
      }
      return <InlineCode>{children}</InlineCode>;
    },
    pre: ({ children }) => {
      return <>{children}</>;
    },
    table: ({ children }) => (
      <div className="rounded-lg border overflow-hidden my-4">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead>{children}</thead>,
    tbody: ({ children }) => (
      <tbody className="text-muted-foreground">{children}</tbody>
    ),
    tr: ({ children }) => <tr className="border-b">{children}</tr>,
    th: ({ children }) => (
      <th className="text-left p-3 font-medium bg-muted/30">{children}</th>
    ),
    td: ({ children }) => <td className="p-3">{children}</td>,
    ul: ({ children }) => (
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mb-4">{children}</ol>
    ),
    a: ({ href, children }) => (
      <a href={href} className="text-accent hover:underline">{children}</a>
    ),
    strong: ({ children }) => (
      <strong className="text-foreground font-medium">{children}</strong>
    ),
    blockquote: ({ children }) => (
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 my-4 [&>p]:mb-0">
        {children}
      </div>
    ),
    ...components,
  };
}
