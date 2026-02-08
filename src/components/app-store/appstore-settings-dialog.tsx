"use client";

import {
  getImportedStoreDetails,
  refreshAllStores,
  removeImportedStore,
} from "@/app/actions/appstore";
import { Button } from "@/components/ui/button";
import {
  HOMEIO_DIALOG_CLOSE_BUTTON_CLASS,
  HOMEIO_DIALOG_CONTENT_GUTTER_CLASS,
  HOMEIO_DIALOG_SHELL_CLASS,
  HOMEIO_DIALOG_SUBTITLE_CLASS,
  HOMEIO_DIALOG_TITLE_CLASS,
} from "@/components/ui/dialog-chrome";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check,
  FileCode,
  Loader2,
  Package,
  RefreshCw,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface StoreDetails {
  slug: string;
  name: string;
  description: string | null;
  url: string | null;
  format: string;
  isDefault: boolean;
  appCount: number;
}

interface AppStoreSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoresUpdated?: () => void;
  onCustomDeploy?: () => void;
  onCommunityStore?: () => void;
}

type UpdateDetail = {
  slug: string;
  name: string;
  success: boolean;
  apps?: number;
  error?: string;
  skipped?: boolean;
};

const panelClass =
  "rounded-[12px] border border-white/12 bg-white/[0.07] px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:px-4";

export function AppStoreSettingsDialog({
  open,
  onOpenChange,
  onStoresUpdated,
  onCustomDeploy,
}: AppStoreSettingsDialogProps) {
  const [stores, setStores] = useState<StoreDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [updateResults, setUpdateResults] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [updateDetails, setUpdateDetails] = useState<UpdateDetail[]>([]);
  const [removingStore, setRemovingStore] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      void loadStores();
    }
  }, [open]);

  const loadStores = async () => {
    setLoading(true);
    try {
      const details = await getImportedStoreDetails();
      setStores(details);
    } catch {
      // handled by server action toasts
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAll = () => {
    if (!stores.length) return;
    setConfirming(true);
    setUpdateResults(null);
    setUpdateDetails([]);
  };

  const runUpdateAll = async () => {
    setUpdating(true);
    setUpdateResults(null);
    try {
      const result = await refreshAllStores();
      setUpdateDetails(result.results);
      const successCount = result.results.filter((r) => r.success).length;
      const totalApps = result.results.reduce((sum, r) => sum + (r.apps || 0), 0);

      setUpdateResults({
        success: result.success,
        message: `Checked ${result.results.length} stores · Updated ${successCount} · ${totalApps} apps total`,
      });

      await loadStores();
      onStoresUpdated?.();
    } catch {
      setUpdateResults({
        success: false,
        message: "Failed to update stores",
      });
    } finally {
      setUpdating(false);
      setConfirming(false);
    }
  };

  const handleRemoveStore = async (slug: string) => {
    setRemovingStore(slug);
    try {
      const removed = await removeImportedStore(slug);
      if (!removed) return;
      await loadStores();
      onStoresUpdated?.();
    } catch {
      // handled by server action toasts
    } finally {
      setRemovingStore(null);
    }
  };

  const totalApps = stores.reduce((sum, store) => sum + store.appCount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${HOMEIO_DIALOG_SHELL_CLASS} sm:max-w-[760px]`}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className={HOMEIO_DIALOG_CLOSE_BUTTON_CLASS}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className={`${HOMEIO_DIALOG_CONTENT_GUTTER_CLASS} space-y-4 py-4 md:py-5`}>
          <DialogTitle className="sr-only">App Store Settings</DialogTitle>
          <div className="space-y-1 pr-10">
            <h2 className={HOMEIO_DIALOG_TITLE_CLASS}>App Store Settings</h2>
            <DialogDescription className={HOMEIO_DIALOG_SUBTITLE_CLASS}>
              Manage your imported app stores and check for updates.
            </DialogDescription>
          </div>

          <div className={`${panelClass} flex items-center justify-between gap-3`}>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">Custom Deploy</h3>
              <p className="text-xs text-white/60">
                Launch a custom Docker Compose or Docker Run deployment.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              onClick={() => {
                onOpenChange(false);
                onCustomDeploy?.();
              }}
            >
              <FileCode className="mr-2 h-4 w-4" />
              Open
            </Button>
          </div>

          <div className={`${panelClass} space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Update App Store</h3>
                <p className="text-xs text-white/60">Refresh all stores to get the latest apps</p>
              </div>
              <Button
                onClick={handleUpdateAll}
                disabled={updating || stores.length === 0}
                className="bg-brand text-white hover:bg-brand-lighter"
                size="sm"
              >
                {updating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {updating ? "Updating..." : "Update All"}
              </Button>
            </div>

            {confirming && !updating && (
              <div className="space-y-2 rounded-lg border border-yellow-400/30 bg-yellow-500/10 p-3 text-yellow-100">
                <div className="text-sm font-medium">Confirm refresh?</div>
                <p className="text-xs text-yellow-50/90">
                  We will download and re-parse {stores.length} store(s):
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {stores.map((store) => (
                    <span
                      key={store.slug}
                      className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-white/80"
                    >
                      {store.name}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="bg-brand text-white hover:bg-brand-lighter"
                    onClick={runUpdateAll}
                  >
                    Run updates
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => setConfirming(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {updateResults && (
              <div className="space-y-2">
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    updateResults.success
                      ? "bg-green-500/10 text-green-300"
                      : "bg-red-500/10 text-red-300"
                  }`}
                >
                  {updateResults.success ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  {updateResults.message}
                </div>

                {updateDetails.length > 0 && (
                  <div className="divide-y divide-white/5 rounded-lg border border-white/10 bg-white/5">
                    {updateDetails.map((detail) => (
                      <div
                        key={detail.slug}
                        className="flex items-center justify-between px-3 py-2 text-sm text-white/80"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">{detail.name}</div>
                          <div className="truncate text-xs text-white/50">{detail.slug}</div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {detail.success ? (
                            detail.skipped ? (
                              <span className="text-white/60">No change</span>
                            ) : (
                              <span className="text-green-400">Updated</span>
                            )
                          ) : (
                            <span className="text-red-400">Failed</span>
                          )}
                          {typeof detail.apps === "number" && (
                            <span className="text-white/50">{detail.apps} apps</span>
                          )}
                          {detail.error && !detail.success && (
                            <span
                              className="max-w-[160px] truncate text-red-300"
                              title={detail.error}
                            >
                              {detail.error}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-white/60">
                <Store className="h-4 w-4" />
                <span>{stores.length} stores</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <Package className="h-4 w-4" />
                <span>{totalApps} apps</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="px-1 text-sm font-semibold text-white/80">Imported Stores</h3>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-white/60">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading stores...
              </div>
            ) : stores.length === 0 ? (
              <div className="py-8 text-center text-sm text-white/50">
                No stores imported yet.
                <br />
                Import a community store to get started.
              </div>
            ) : (
              <ScrollArea className="h-[220px] rounded-[10px] border border-white/12 bg-white/[0.06] p-2">
                <div className="space-y-2 pr-2">
                  {stores.map((store) => (
                    <StoreItem
                      key={store.slug}
                      store={store}
                      locked={store.isDefault}
                      removing={removingStore === store.slug}
                      onRemove={() => handleRemoveStore(store.slug)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface StoreItemProps {
  store: StoreDetails;
  locked: boolean;
  removing: boolean;
  onRemove: () => void;
}

function StoreItem({ store, locked, removing, onRemove }: StoreItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] border border-white/12 bg-white/[0.07] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:px-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-white/60" />
          <span className="truncate text-sm font-medium text-white">{store.name}</span>
          {locked && (
            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/70">
              Default
            </span>
          )}
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/40">
            {store.appCount} apps
          </span>
        </div>
        {store.description && (
          <p className="mt-1 truncate pl-6 text-xs text-white/50">{store.description}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-white/50 hover:bg-red-500/10 hover:text-red-400 disabled:text-white/30"
        disabled={locked || removing}
        onClick={onRemove}
      >
        {removing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
