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
import { dialog as dialogTokens } from "@/components/ui/design-tokens";
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
  onLoadingChange?: (loading: boolean) => void;
}

export function AppContextMenu({ app, children, onLoadingChange }: AppContextMenuProps) {
  const [loading, _setLoading] = useState(false);
  const setLoading = (v: boolean) => {
    _setLoading(v);
    onLoadingChange?.(v);
  };
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);
  const [removeAppData, setRemoveAppData] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showCustomDeploy, setShowCustomDeploy] = useState(false);
  const [customData, setCustomData] = useState<CustomDeployInitialData | null>(
    null,
  );
  const [customLoading, setCustomLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastOpenedViaContext = useRef(false);
  const itemClassName =
    "rounded-lg px-2.5 py-1.5 text-[14px] font-medium leading-tight tracking-[-0.015em] text-foreground transition-colors hover:bg-secondary focus:bg-secondary focus:text-foreground";

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
        webUIPort: result.webUIPort,
      });
      setShowCustomDeploy(true);
      // Show loading spinner on the card while deploy dialog is open
      setLoading(true);
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
      const success = await uninstallApp(app.appId, { removeAppData });
      if (success) {
        toast.success(
          removeAppData
            ? `${app.name} uninstalled and data deleted`
            : `${app.name} uninstalled`,
        );
        setShowUninstallConfirm(false);
        setRemoveAppData(false);
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
            <div className="truncate text-[13px] font-semibold text-foreground">
              {app.name}
            </div>
          </div>
          <DropdownMenuSeparator className="mx-0.5 my-1 h-px bg-border" />

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

          <DropdownMenuSeparator className="mx-0.5 my-1 h-px bg-border" />

          <DropdownMenuItem
            onClick={() => {
              setRemoveAppData(false);
              setShowUninstallConfirm(true);
            }}
            disabled={loading}
            className="rounded-lg px-2.5 py-1.5 text-[14px] font-medium leading-tight tracking-[-0.015em] text-red-500 transition-colors hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Uninstall
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Uninstall Confirmation Dialog */}
      <Dialog
        open={showUninstallConfirm}
        onOpenChange={(next) => {
          setShowUninstallConfirm(next);
          if (!next) setRemoveAppData(false);
        }}
      >
        <DialogContent className={`${dialogTokens.content} ${dialogTokens.size.sm}`}>
          <DialogHeader>
            <DialogTitle>Uninstall {app.name}?</DialogTitle>
            <DialogDescription>
              This will remove the app container and stop it.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <label
              htmlFor={`remove-data-${app.appId}`}
              className="flex cursor-pointer items-start gap-2"
            >
              <input
                id={`remove-data-${app.appId}`}
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                checked={removeAppData}
                onChange={(event) => setRemoveAppData(event.target.checked)}
                disabled={loading}
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Remove app folder and lose data
                </p>
                <p className="text-xs text-muted-foreground">
                  Deletes <code>/DATA/AppData/{app.appId}</code> permanently.
                  If unchecked, data is moved to trash.
                </p>
              </div>
            </label>
          </div>
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
              {removeAppData ? "Uninstall & Delete Data" : "Uninstall"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <LogsDialog open={showLogs} onOpenChange={setShowLogs} app={app} />

      <CustomDeployDialog
        open={showCustomDeploy}
        onOpenChange={(open) => {
          setShowCustomDeploy(open);
          // User cancelled the dialog — stop loading on the card
          if (!open) setLoading(false);
        }}
        initialData={customData || undefined}
        onDeploySuccess={() => {
          setShowCustomDeploy(false);
          // Deploy finished — keep loading briefly so the card stays visible
          // while Docker recreates the container and WebSocket catches up
          setTimeout(() => setLoading(false), 5000);
        }}
      />
    </>
  );
}
