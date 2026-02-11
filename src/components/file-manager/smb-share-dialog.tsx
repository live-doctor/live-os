"use client";

import {
    createSmbShare,
    getShareByPath,
    listSmbShares,
    removeSmbShare,
    type SmbShare,
} from "@/app/actions/filesystem/smb-share";
import { Button } from "@/components/ui/button";
import { dialog as dialogTokens } from "@/components/ui/design-tokens";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    AlertCircle,
    Check,
    Copy,
    Loader2,
    Network,
    Share2,
    Trash2,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface SmbShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPath: string;
  targetName: string;
}

export function SmbShareDialog({
  open,
  onOpenChange,
  targetPath,
  targetName,
}: SmbShareDialogProps) {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sambaInstalled, setSambaInstalled] = useState(false);
  const [sambaRunning, setSambaRunning] = useState(false);
  const [existingShare, setExistingShare] = useState<SmbShare | null>(null);
  const [shares, setShares] = useState<SmbShare[]>([]);

  // Form state
  const [shareName, setShareName] = useState("");
  const [guestOk, setGuestOk] = useState(true);
  const [readOnly, setReadOnly] = useState(false);

  const loadShares = useCallback(async () => {
    setLoading(true);
    try {
      const [sharesResult, existing] = await Promise.all([
        listSmbShares(),
        targetPath ? getShareByPath(targetPath) : null,
      ]);

      setSambaInstalled(sharesResult.sambaStatus.installed);
      setSambaRunning(sharesResult.sambaStatus.running);
      setShares(sharesResult.shares);
      setExistingShare(existing);

      // Set default share name
      if (!existing && targetName) {
        setShareName(targetName.replace(/[<>:"/\\|?*\s]/g, "_"));
      }
    } catch {
      // Error handled by toast
      toast.error("Failed to load share information");
    } finally {
      setLoading(false);
    }
  }, [targetPath, targetName]);

  useEffect(() => {
    if (open) {
      loadShares();
    }
  }, [open, loadShares]);

  const handleCreate = async () => {
    if (!shareName.trim()) {
      toast.error("Please enter a share name");
      return;
    }

    setCreating(true);
    try {
      const result = await createSmbShare(targetPath, shareName, {
        guestOk,
        readOnly,
      });
      if (result.success) {
        toast.success(`Share "${shareName}" created`);
        if (result.sharePath) {
          await navigator.clipboard.writeText(result.sharePath);
          toast.info("Share path copied to clipboard");
        }
        loadShares();
      } else {
        toast.error(result.error || "Failed to create share");
      }
    } catch {
      // Error handled by toast
      toast.error("Failed to create share");
    } finally {
      setCreating(false);
    }
  };

  const handleRemove = async (shareId: string) => {
    if (!confirm("Are you sure you want to remove this share?")) return;

    try {
      const result = await removeSmbShare(shareId);
      if (result.success) {
        toast.success("Share removed");
        loadShares();
      } else {
        toast.error(result.error || "Failed to remove share");
      }
    } catch {
      // Error handled by toast
      toast.error("Failed to remove share");
    }
  };

  const copySharePath = async (shareName: string) => {
    try {
      const hostname = window.location.hostname || "localhost";
      const sharePath = `\\\\${hostname}\\${shareName}`;
      await navigator.clipboard.writeText(sharePath);
      toast.success("Share path copied");
    } catch {
      toast.error("Failed to copy path");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogTokens.content, dialogTokens.size.md)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Network className="h-5 w-5 text-cyan-400" />
            Share over Network
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !sambaInstalled ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-amber-800 dark:text-amber-100">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">
                    Samba not installed
                  </div>
                  <div className="text-sm text-amber-700 dark:text-amber-200 mt-1">
                    To share folders over the network, Samba needs to be
                    installed.
                  </div>
                  <code className="block mt-2 text-xs bg-secondary/60 rounded-lg px-2 py-1 text-foreground">
                    sudo apt install samba
                  </code>
                </div>
              </div>
            </div>
          </div>
        ) : !sambaRunning ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-amber-800 dark:text-amber-100">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">
                    Samba not running
                  </div>
                  <div className="text-sm text-amber-700 dark:text-amber-200 mt-1">
                    The Samba service is installed but not running.
                  </div>
                  <code className="block mt-2 text-xs bg-secondary/60 rounded-lg px-2 py-1 text-foreground">
                    sudo systemctl start smbd
                  </code>
                </div>
              </div>
            </div>
          </div>
        ) : existingShare ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-green-800 dark:text-green-200">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium">
                    Already shared
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-200 mt-1">
                    This folder is already shared as &quot;{existingShare.name}
                    &quot;
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-border bg-secondary/60 hover:bg-secondary text-foreground"
                onClick={() => copySharePath(existingShare.name)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Path
              </Button>
              <Button
                variant="outline"
                className="border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-200"
                onClick={() => handleRemove(existingShare.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Share
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Share Name</Label>
              <Input
                value={shareName}
                onChange={(e) => setShareName(e.target.value)}
                placeholder="Enter share name"
                className="bg-secondary/60 border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-foreground">Allow guests</Label>
                <div className="text-xs text-muted-foreground">
                  No password required to access
                </div>
              </div>
              <Switch checked={guestOk} onCheckedChange={setGuestOk} />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-foreground">Read-only</Label>
                <div className="text-xs text-muted-foreground">
                  Prevent modifications
                </div>
              </div>
              <Switch checked={readOnly} onCheckedChange={setReadOnly} />
            </div>

            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleCreate}
              disabled={creating || !shareName.trim()}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  Create Share
                </>
              )}
            </Button>
          </div>
        )}

        {/* Existing shares list */}
        {shares.length > 0 && !loading && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Active Shares
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/40 border border-border"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Network className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                    <div className="truncate">
                      <div className="text-sm font-medium text-foreground truncate">
                        {share.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {share.path}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      onClick={() => copySharePath(share.name)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600 hover:text-red-600 hover:bg-red-500/10 dark:text-red-400"
                      onClick={() => handleRemove(share.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
