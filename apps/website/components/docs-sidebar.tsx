"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface NavItem {
  href: string;
  label: string;
}

interface CollapsibleSection {
  title: string;
  basePath: string;
  items: NavItem[];
}

interface NavGroup {
  label: string;
  items?: NavItem[];
  sections?: CollapsibleSection[];
}

const navigation: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/docs/getting-started", label: "Getting Started" },
    ],
  },
  {
    label: "Adapters",
    sections: [
      {
        title: "Next.js",
        basePath: "/docs/next",
        items: [
          { href: "/docs/next/getting-started", label: "Getting Started" },
          { href: "/docs/next/cron-jobs", label: "Cron Jobs" },
          { href: "/docs/next/tasks", label: "Tasks" },
          { href: "/docs/next/triggering", label: "Triggering" },
          { href: "/docs/next/delayed-triggers", label: "Delayed Triggers" },
          { href: "/docs/next/fan-out", label: "Fan-Out" },
          { href: "/docs/next/context", label: "Context & Logging" },
        ],
      },
      {
        title: "NestJS",
        basePath: "/docs/nestjs",
        items: [
          { href: "/docs/nestjs/getting-started", label: "Getting Started" },
          { href: "/docs/nestjs/cron-jobs", label: "Cron Jobs" },
          { href: "/docs/nestjs/tasks", label: "Tasks" },
          { href: "/docs/nestjs/triggering", label: "Triggering" },
          { href: "/docs/nestjs/delayed-triggers", label: "Delayed Triggers" },
          { href: "/docs/nestjs/fan-out", label: "Fan-Out" },
          { href: "/docs/nestjs/context", label: "Context & Logging" },
        ],
      },
      {
        title: "Go",
        basePath: "/docs/go",
        items: [
          { href: "/docs/go/getting-started", label: "Getting Started" },
          { href: "/docs/go/cron-jobs", label: "Cron Jobs" },
          { href: "/docs/go/tasks", label: "Tasks" },
          { href: "/docs/go/triggering", label: "Triggering" },
          { href: "/docs/go/delayed-triggers", label: "Delayed Triggers" },
          { href: "/docs/go/fan-out", label: "Fan-Out" },
          { href: "/docs/go/context", label: "Context & Logging" },
        ],
      },
      {
        title: "Python",
        basePath: "/docs/python",
        items: [
          { href: "/docs/python/getting-started", label: "Getting Started" },
          { href: "/docs/python/cron-jobs", label: "Cron Jobs" },
          { href: "/docs/python/tasks", label: "Tasks" },
          { href: "/docs/python/triggering", label: "Triggering" },
          { href: "/docs/python/delayed-triggers", label: "Delayed Triggers" },
          { href: "/docs/python/fan-out", label: "Fan-Out" },
          { href: "/docs/python/context", label: "Context & Logging" },
        ],
      },
    ],
  },
  {
    label: "API Reference",
    sections: [
      {
        title: "API Reference",
        basePath: "/docs/api-reference",
        items: [
          { href: "/docs/api-reference/cron-jobs", label: "Cron Jobs" },
          { href: "/docs/api-reference/tasks", label: "Tasks" },
          { href: "/docs/api-reference/triggering", label: "Triggering" },
          { href: "/docs/api-reference/delayed-triggers", label: "Delayed Triggers" },
          { href: "/docs/api-reference/fan-out", label: "Fan-Out" },
          { href: "/docs/api-reference/context", label: "Context" },
        ],
      },
    ],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Auto-expand the section containing the current page
  useEffect(() => {
    for (const group of navigation) {
      if (group.sections) {
        for (const section of group.sections) {
          if (pathname.startsWith(section.basePath)) {
            setExpanded((prev) => new Set([...prev, section.title]));
          }
        }
      }
    }
  }, [pathname]);

  const toggle = (title: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  return (
    <nav className="w-56 shrink-0 py-8 px-4">
      {navigation.map((group) => (
        <div key={group.label} className="mb-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
            {group.label}
          </p>

          {/* Direct items (like Getting Started under Overview) */}
          {group.items && (
            <ul className="space-y-0.5">
              {group.items.map((item) => {
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
          )}

          {/* Collapsible sections */}
          {group.sections?.map((section) => {
            const isExpanded = expanded.has(section.title);
            return (
              <div key={section.title} className="mb-1">
                <button
                  onClick={() => toggle(section.title)}
                  className="flex items-center justify-between w-full text-sm px-2 py-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  {section.title}
                  <svg
                    className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {isExpanded && (
                  <ul className="space-y-0.5 mt-0.5">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={`block text-sm pl-4 pr-2 py-1.5 rounded transition-colors ${
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
                )}
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
