"use client";

import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { IconLogout, IconSettingsFilled, IconUserFilled } from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearTokens } from "@/lib/api";

export function UserMenu() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string | undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-secondary transition-colors outline-none">
        <img
          src="https://api.dicebear.com/9.x/glass/svg?seed=account"
          alt=""
          width={24}
          height={24}
          className="rounded shrink-0"
        />
        <span className="text-sm text-muted-foreground truncate">Account</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={() => router.push("/account")}>
          <IconUserFilled className="mr-2 h-4 w-4" /> Account
        </DropdownMenuItem>
        {projectId && (
          <DropdownMenuItem onClick={() => router.push(`/${projectId}/settings`)}>
            <IconSettingsFilled className="mr-2 h-4 w-4" /> Settings
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => clearTokens()}>
          <IconLogout className="mr-2 h-4 w-4" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
