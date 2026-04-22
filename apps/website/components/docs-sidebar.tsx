"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  {
    title: "Overview",
    items: [
      { href: "/docs/getting-started", label: "Getting Started" },
    ],
  },
  {
    title: "Adapters",
    items: [
      { href: "/docs/next", label: "Next.js" },
      { href: "/docs/nestjs", label: "NestJS" },
      { href: "/docs/go", label: "Go" },
      { href: "/docs/python", label: "Python" },
    ],
  },
  {
    title: "API Reference",
    items: [
      { href: "/docs/cron-jobs", label: "Cron Jobs" },
      { href: "/docs/tasks", label: "Tasks" },
      { href: "/docs/context", label: "Context Object" },
    ],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-56 shrink-0 py-8 px-4">
      {sections.map((section) => (
        <div key={section.title} className="mb-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block text-sm px-2 py-1.5 rounded transition-colors ${
                      isActive
                        ? "text-accent font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
