"use client";

import { IconLogout, IconSettingsFilled } from "@tabler/icons-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { clearTokens } from "@/lib/api";

export function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-secondary transition-colors">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">P</AvatarFallback>
        </Avatar>
        <span className="text-sm text-muted-foreground truncate">Account</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem><IconSettingsFilled className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
        <DropdownMenuItem onClick={() => clearTokens()}>
          <IconLogout className="mr-2 h-4 w-4" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
