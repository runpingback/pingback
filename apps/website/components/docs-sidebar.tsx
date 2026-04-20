"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/docs/getting-started", label: "Getting Started" },
  { href: "/docs/cron-jobs", label: "Cron Jobs" },
  { href: "/docs/tasks", label: "Tasks" },
  { href: "/docs/context", label: "Context Object" },
  { href: "/docs/configuration", label: "Configuration" },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-56 shrink-0 py-8 px-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 px-2">
        Documentation
      </p>
      <ul className="space-y-0.5">
        {navItems.map((item) => {
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
    </nav>
  );
}
