"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  IconClockFilled,
  IconPlayerPlayFilled,
  IconDeviceHeartMonitorFilled,
  IconKeyFilled,
  IconBellFilled,
  IconFolderFilled,
  IconSettingsFilled,
  IconPlayerTrackNextFilled,
  IconLayoutListFilled,
} from "@tabler/icons-react";
import { ProjectSwitcher } from "./project-switcher";
import { UserMenu } from "./user-menu";
import { UpgradeBanner } from "./upgrade-banner";
import { cn } from "@/lib/utils";

const ACTIVE_COLOR = "#d4a574";

const projectNav = [
  { name: "Runs", href: "runs", icon: IconPlayerTrackNextFilled },
  { name: "Crons", href: "crons", icon: IconClockFilled },
  { name: "Tasks", href: "tasks", icon: IconLayoutListFilled },
  { name: "Logs", href: "logs", icon: IconDeviceHeartMonitorFilled },
  { name: "API Keys", href: "api-keys", icon: IconKeyFilled },
  { name: "Alerts", href: "alerts", icon: IconBellFilled },
  { name: "Settings", href: "settings", icon: IconSettingsFilled },
];

const accountNav = [
  { name: "Projects", href: "/projects", icon: IconFolderFilled, color: "#d4a574" },
];

function NavItem({
  href,
  name,
  icon: Icon,
  isActive,
}: {
  href: string;
  name: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  isActive: boolean;
}) {
  if (isActive) {
    return (
      <Link
        href={href}
        className="flex items-center rounded-md text-sm transition-colors overflow-hidden"
        style={{
          backgroundColor: ACTIVE_COLOR,
          color: "#2a1f0a",
          fontWeight: 600,
          height: "28px",
        }}
      >
        <span className="flex items-center gap-2 px-3 py-1.5">
          <Icon className="h-4 w-4" style={{ color: "#2a1f0a" }} />
          {name}
        </span>
        <span
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignSelf: "stretch",
            width: "6px",
            marginLeft: "auto",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "3px",
              borderRadius: "0 0 3px 3px",
              backgroundColor: "var(--background)",
              display: "block",
            }}
          />
          <span
            style={{
              width: "6px",
              height: "3px",
              borderRadius: "3px 3px 0 0",
              backgroundColor: "var(--background)",
              display: "block",
            }}
          />
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
          }}
        >
          <span
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              backgroundColor: "#2a1f0a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              className="h-2.5 w-2.5"
              style={{ color: ACTIVE_COLOR }}
            />
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary"
    >
      <Icon className="h-4 w-4" />
      {name}
    </Link>
  );
}

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
          <div className="mb-6">
            <p className="px-3 mb-1 text-[11px] font-semibold text-muted-foreground">
              Project
            </p>
            {projectNav.map((item) => {
              const href = `/${projectId}/${item.href}`;
              return (
                <NavItem
                  key={item.name}
                  href={href}
                  name={item.name}
                  icon={item.icon}
                  isActive={pathname === href}
                />
              );
            })}
          </div>
        )}

        <div>
          <p className="px-3 mb-1 text-[11px] font-semibold text-muted-foreground">
            Account
          </p>
          {accountNav.map((item) => (
            <NavItem
              key={item.name}
              href={item.href}
              name={item.name}
              icon={item.icon}
              isActive={pathname === item.href}
            />
          ))}
        </div>
      </nav>

      <UpgradeBanner />
      <div className="border-t p-3 py-1">
        <UserMenu />
      </div>
    </aside>
  );
}
