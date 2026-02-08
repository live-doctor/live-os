"use client";

import { getComposeForApp } from "@/app/actions/appstore";
import {
  getAppWebUI,
  restartApp,
  startApp,
  stopApp,
  uninstallApp,
} from "@/app/actions/docker";
import {
  CustomDeployDialog,
  type CustomDeployInitialData,
} from "@/components/app-store/custom-deploy-dialog";
import type { InstalledApp } from "@/components/app-store/types";
import { Button } from "@/components/ui/button";
import { HOMEIO_CONTEXT_MENU_SURFACE_CLASS } from "@/components/ui/dialog-chrome";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ExternalLink,
  FileText,
  Loader2,
  Play,
  RotateCw,
  Square,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { LogsDialog } from "./logs-dialog";

interface AppContextMenuProps {
  app: InstalledApp;
  children: React.ReactNode;
}

export function AppContextMenu({ app, children }: AppContextMenuProps) {
  const [loading, setLoading] = useState(false);
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showCustomDeploy, setShowCustomDeploy] = useState(false);
  const [customData, setCustomData] = useState<CustomDeployInitialData | null>(
    null,
  );
  const [customLoading, setCustomLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastOpenedViaContext = useRef(false);
  const itemClassName =
    "rounded-md px-2.5 py-1.5 text-[14px] font-medium leading-tight tracking-[-0.015em] text-white transition-colors hover:bg-white/6 focus:bg-white/6 focus:text-white";

  const handleOpen = async () => {
    try {
      const url = await getAppWebUI(app.appId);
      if (url) {
        window.open(url, "_blank");
      } else {
        toast.error(
          "Unable to determine app URL. Ensure the container exposes a port and is running.",
        );
      }
    } catch {
      toast.error("Failed to open app");
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const success = await stopApp(app.containerName || app.appId);
      if (success) {
        toast.success(`${app.name} stopped`);
      } else {
        toast.error("Failed to stop app");
      }
    } catch {
      toast.error("Failed to stop app");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const success = await startApp(app.containerName);
      if (success) {
        toast.success(`${app.name} started`);
      } else {
        toast.error("Failed to start app");
      }
    } catch {
      toast.error("Failed to start app");
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setLoading(true);
    try {
      const success = await restartApp(app.containerName);
      if (success) {
        toast.success(`${app.name} restarted`);
      } else {
        toast.error("Failed to restart app");
      }
    } catch {
      toast.error("Failed to restart app");
    } finally {
      setLoading(false);
    }
  };

  const handleEditDeploy = async () => {
    setCustomLoading(true);
    try {
      const result = await getComposeForApp(app.appId);
      if (!result.success) {
        toast.error(result.error || "App config not found");
        return;
      }

      setCustomData({
        appName: app.appId,
        dockerCompose: result.content,
        appIcon: result.appIcon,
        appTitle: result.appTitle,
        storeId: result.storeId,
        containerMeta: result.container as Record<string, unknown> | undefined,
      });
      setShowCustomDeploy(true);
    } catch (error) {
      console.error("Failed to load app config for edit:", error);
      toast.error("Failed to load app config");
    } finally {
      setCustomLoading(false);
    }
  };

  const handleUninstall = async () => {
    setLoading(true);
    try {
      const success = await uninstallApp(app.containerName);
      if (success) {
        toast.success(`${app.name} uninstalled`);
        setShowUninstallConfirm(false);
      } else {
        toast.error("Failed to uninstall app");
      }
    } catch {
      toast.error("Failed to uninstall app");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(next) => {
          // Only allow opens triggered explicitly by context menu
          if (next && !lastOpenedViaContext.current) return;
          setMenuOpen(next);
          if (!next) lastOpenedViaContext.current = false;
        }}
      >
        <DropdownMenuTrigger
          asChild
          onContextMenu={(e) => {
            e.preventDefault();
            lastOpenedViaContext.current = true;
            setMenuOpen(true);
          }}
          onPointerDown={(e) => {
            if (e.button !== 2) {
              // Prevent left-click from toggling the menu; let parent handle navigation
              e.preventDefault();
            }
          }}
        >
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className={`min-w-[168px] p-1 ${HOMEIO_CONTEXT_MENU_SURFACE_CLASS}`}
          align="start"
        >
          <div className="flex items-center gap-2 px-2.5 pb-1 pt-0.5">
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor:
                  app.status === "running" ? "#34d399" : "#fbbf24",
              }}
            />
            <div className="truncate text-[13px] font-semibold text-white/90">
              {app.name}
            </div>
          </div>
          <DropdownMenuSeparator className="mx-0.5 my-1 h-px bg-white/10" />

          <DropdownMenuItem
            onClick={handleOpen}
            disabled={loading}
            className={itemClassName}
          >
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            Open
          </DropdownMenuItem>

          {app.status === "running" ? (
            <DropdownMenuItem
              onClick={handleStop}
              disabled={loading}
              className={itemClassName}
            >
              {loading ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Square className="mr-2 h-3.5 w-3.5" />
              )}
              Stop
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={handleStart}
              disabled={loading}
              className={itemClassName}
            >
              {loading ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="mr-2 h-3.5 w-3.5" />
              )}
              Start
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={handleRestart}
            disabled={loading}
            className={itemClassName}
          >
            {loading ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCw className="mr-2 h-3.5 w-3.5" />
            )}
            Restart
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setShowLogs(true)}
            disabled={loading}
            className={itemClassName}
          >
            <FileText className="mr-2 h-3.5 w-3.5" />
            View Logs
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleEditDeploy}
            disabled={loading || customLoading}
            className={itemClassName}
          >
            {customLoading ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="mr-2 h-3.5 w-3.5" />
            )}
            Edit / Redeploy
          </DropdownMenuItem>

          <DropdownMenuSeparator className="mx-0.5 my-1 h-px bg-white/10" />

          <DropdownMenuItem
            onClick={() => setShowUninstallConfirm(true)}
            disabled={loading}
            className="rounded-md px-2.5 py-1.5 text-[14px] font-medium leading-tight tracking-[-0.015em] text-red-400 transition-colors hover:bg-white/6 focus:bg-white/6 focus:text-red-300"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Uninstall
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Uninstall Confirmation Dialog */}
      <Dialog
        open={showUninstallConfirm}
        onOpenChange={setShowUninstallConfirm}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Uninstall {app.name}?</DialogTitle>
            <DialogDescription>
              This will remove the app. Data will be moved to trash and can be
              recovered later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUninstallConfirm(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUninstall}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Uninstall
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <LogsDialog open={showLogs} onOpenChange={setShowLogs} app={app} />

      <CustomDeployDialog
        open={showCustomDeploy}
        onOpenChange={setShowCustomDeploy}
        initialData={customData || undefined}
        onDeploySuccess={() => {
          setShowCustomDeploy(false);
        }}
      />
    </>
  );
}
