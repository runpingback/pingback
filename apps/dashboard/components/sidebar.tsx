"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  IconClockFilled,
  IconListCheck,
  IconPlayerPlayFilled,
  IconTerminal2,
  IconKeyFilled,
  IconBellFilled,
  IconFolderFilled,
  IconSettingsFilled,
} from "@tabler/icons-react";
import { ProjectSwitcher } from "./project-switcher";
import { UserMenu } from "./user-menu";
import { cn } from "@/lib/utils";

const projectNav = [
  { name: "Runs", href: "runs", icon: IconPlayerPlayFilled },
  { name: "Crons", href: "crons", icon: IconClockFilled },
  { name: "Tasks", href: "tasks", icon: IconListCheck },
  { name: "Logs", href: "logs", icon: IconTerminal2 },
  { name: "API Keys", href: "api-keys", icon: IconKeyFilled },
  { name: "Alerts", href: "alerts", icon: IconBellFilled },
  { name: "Settings", href: "settings", icon: IconSettingsFilled },
];

const accountNav = [{ name: "Projects", href: "/projects", icon: IconFolderFilled }];

export function Sidebar() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;

  return (
    <aside className="fixed left-0 top-0 h-screen w-52 border-r flex flex-col bg-background">
      <div className="h-12 flex items-center px-2 border-b">
        <div className="flex-1 min-w-0">
          <ProjectSwitcher />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {projectId && (
          <div className="mb-4">
            <p className="px-3 mb-1 text-[11px] font-semibold text-muted-foreground">
              Project
            </p>
            {projectNav.map((item) => {
              const href = `/${projectId}/${item.href}`;
              const isActive = pathname === href;
              return (
                <Link
                  key={item.name}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                    isActive
                      ? "text-foreground bg-secondary border-l-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        )}

        <div>
          <p className="px-3 mb-1 text-[11px] font-semibold text-muted-foreground">
            Account
          </p>
          {accountNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                  isActive
                    ? "text-foreground bg-secondary border-l-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t p-3">
        <UserMenu />
      </div>
    </aside>
  );
}
