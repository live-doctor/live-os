"use client";

import { removeContainer, startApp, stopApp } from "@/app/actions/docker";
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
import type { OtherContainer } from "@/hooks/system-status-types";
import { Loader2, Play, Square, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type OtherContainerContextMenuProps = {
  container: OtherContainer;
  children: React.ReactNode;
  onLoadingChange?: (loading: boolean) => void;
};

export function OtherContainerContextMenu({
  container,
  children,
  onLoadingChange,
}: OtherContainerContextMenuProps) {
  const [loading, _setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const lastOpenedViaContext = useRef(false);

  const setLoading = (value: boolean) => {
    _setLoading(value);
    onLoadingChange?.(value);
  };

  const itemClassName =
    "rounded-lg px-2.5 py-1.5 text-[14px] font-medium leading-tight tracking-[-0.015em] text-foreground transition-colors hover:bg-secondary focus:bg-secondary focus:text-foreground";

  const handleStop = async () => {
    setLoading(true);
    try {
      const success = await stopApp(container.id);
      if (success) {
        toast.success(`${container.name} stopped`);
      } else {
        toast.error("Failed to stop container");
      }
    } catch {
      toast.error("Failed to stop container");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const success = await startApp(container.id);
      if (success) {
        toast.success(`${container.name} started`);
      } else {
        toast.error("Failed to start container");
      }
    } catch {
      toast.error("Failed to start container");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const success = await removeContainer(container.id);
      if (success) {
        toast.success(`${container.name} deleted`);
        setShowDeleteConfirm(false);
      } else {
        toast.error("Failed to delete container");
      }
    } catch {
      toast.error("Failed to delete container");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(next) => {
          if (next && !lastOpenedViaContext.current) return;
          setMenuOpen(next);
          if (!next) lastOpenedViaContext.current = false;
        }}
      >
        <DropdownMenuTrigger
          asChild
          onContextMenu={(event) => {
            event.preventDefault();
            lastOpenedViaContext.current = true;
            setMenuOpen(true);
          }}
          onPointerDown={(event) => {
            if (event.button !== 2) {
              event.preventDefault();
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
                  container.status === "running" ? "#34d399" : "#fbbf24",
              }}
            />
            <div className="truncate text-[13px] font-semibold text-foreground">
              {container.name}
            </div>
          </div>
          <DropdownMenuSeparator className="mx-0.5 my-1 h-px bg-border" />

          {container.status === "running" ? (
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

          <DropdownMenuSeparator className="mx-0.5 my-1 h-px bg-border" />

          <DropdownMenuItem
            onClick={() => setShowDeleteConfirm(true)}
            disabled={loading}
            className="rounded-lg px-2.5 py-1.5 text-[14px] font-medium leading-tight tracking-[-0.015em] text-red-500 transition-colors hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Container</DialogTitle>
            <DialogDescription>
              This removes container <strong>{container.name}</strong>. Data in mounted volumes is not deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
