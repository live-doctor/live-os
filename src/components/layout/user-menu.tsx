"use client";

import { getCurrentUser, logout, type AuthUser } from "@/app/actions/auth";
import { useRebootTracker } from "@/hooks/useRebootTracker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HelpCircle, LogOut, Power, RotateCw, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface UserMenuProps {
  onOpenSettings: () => void;
}

export function UserMenu({ onOpenSettings }: UserMenuProps) {
  // Component now requires an onOpenSettings callback prop
  const router = useRouter();
  const { requestReboot } = useRebootTracker();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  // TODO: issue with rerendering infinite loop
  useEffect(() => {
    getCurrentUser().then((userData) => {
      setUser(userData);
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  const handleRestart = async () => {
    const result = await requestReboot();
    if (result.ok) toast.success("Restarting system...");
    else toast.error(result.error ?? "Restart failed");
  };

  const handleShutdown = async () => {
    const res = await fetch("/api/system/shutdown", { method: "POST" });
    if (res.ok) toast.success("Shutting down...");
    else toast.error("Shutdown failed");
  };

  const openShortcuts = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("openShortcuts"));
  };

  if (loading || !user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center h-9 w-9 border rounded-lg bg-secondary/60 backdrop-blur-xl border border-border transition-all shadow-lg">
          <User className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 bg-popover/95 border border-border backdrop-blur-xl shadow-2xl rounded-lg p-2"
      >
        <DropdownMenuLabel className="text-foreground px-2 py-1.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-secondary/60 border border-border flex items-center justify-center text-sm font-semibold uppercase text-foreground">
              {user.username?.slice(0, 2) || "U"}
            </div>
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-semibold">{user.username}</p>
              <p className="text-[11px] text-muted-foreground font-normal tracking-wide uppercase">
                {user.role}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/70" />
        <DropdownMenuItem
          className="text-foreground focus:bg-secondary/60 focus:text-foreground cursor-pointer rounded-lg px-3 py-2"
          onClick={onOpenSettings}
        >
          <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={openShortcuts}
          className="text-foreground focus:bg-secondary/60 focus:text-foreground cursor-pointer rounded-lg px-3 py-2"
        >
          <HelpCircle className="mr-2 h-4 w-4 text-muted-foreground" />
          Shortcut help
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/70" />
        <DropdownMenuItem
          onClick={handleRestart}
          className="text-foreground focus:bg-secondary/60 focus:text-foreground cursor-pointer rounded-lg px-3 py-2"
        >
          <RotateCw className="mr-2 h-4 w-4 text-muted-foreground" />
          Restart
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleShutdown}
          className="text-red-600 dark:text-red-300 focus:bg-red-500/10 focus:text-red-600 cursor-pointer rounded-lg px-3 py-2"
        >
          <Power className="mr-2 h-4 w-4" />
          Shut down
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/70" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-600 dark:text-red-400 focus:bg-red-500/10 focus:text-red-600 cursor-pointer rounded-lg px-3 py-2"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
