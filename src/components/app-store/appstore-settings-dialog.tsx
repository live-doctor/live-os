"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getImportedStoreDetails,
  refreshAllStores,
  removeImportedStore,
} from "@/app/actions/appstore";
import {
  Check,
  Loader2,
  FileCode,
  Package,
  RefreshCw,
  Store,
  Users,
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

export function AppStoreSettingsDialog({
  open,
  onOpenChange,
  onStoresUpdated,
  onCustomDeploy,
  onCommunityStore,
}: AppStoreSettingsDialogProps) {
  const [stores, setStores] = useState<StoreDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [updateResults, setUpdateResults] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [updateDetails, setUpdateDetails] = useState<
    {
      slug: string;
      name: string;
      success: boolean;
      apps?: number;
      error?: string;
      skipped?: boolean;
    }[]
  >([]);
  const [removingStore, setRemovingStore] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadStores();
    }
  }, [open]);

  const loadStores = async () => {
    setLoading(true);
    try {
      const details = await getImportedStoreDetails();
      setStores(details);
    } catch (error) {
      // Error handled by toast
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAll = async () => {
    if (!stores.length) return;
    // Ask for confirmation first; don't run until the user confirms.
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
    } catch (error) {
      // Error handled by toast
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
    } catch (error) {
      // Error handled by toast
    } finally {
      setRemovingStore(null);
    }
  };

  const totalApps = stores.reduce((sum, s) => sum + s.appCount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg overflow-hidden rounded-[20px] border border-white/10 bg-[rgba(47,51,57,0.78)] p-0 text-white shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-3xl"
      >
        <div className="border-b border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent px-6 py-5">
          <DialogTitle className="sr-only">App Store Settings</DialogTitle>
          <h2 className="text-[24px] font-bold leading-none tracking-[-0.04em] text-white/75">
            App Store Settings
          </h2>
          <DialogDescription className="mt-1 text-[13px] leading-tight text-white/55">
            Manage your imported app stores and check for updates.
          </DialogDescription>
        </div>

        <div className="space-y-6 px-6 py-5">
          {/* Community Store entry */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">Import Community Store</h3>
              <p className="text-xs text-white/60">
                Add community app stores by URL (ZIP or API endpoint).
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-white border-white/20 bg-white/10 hover:bg-white/20"
              onClick={() => {
                onOpenChange(false);
                onCommunityStore?.();
              }}
            >
              <Users className="h-4 w-4 mr-2" />
              Open
            </Button>
          </div>

          {/* Custom Deploy entry */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">Custom Deploy</h3>
              <p className="text-xs text-white/60">
                Launch a custom Docker Compose or Docker Run deployment.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-white border-white/20 bg-white/10 hover:bg-white/20"
              onClick={() => {
                onOpenChange(false);
                onCustomDeploy?.();
              }}
            >
              <FileCode className="h-4 w-4 mr-2" />
              Open
            </Button>
          </div>

          {/* Update Section */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">
                Update App Store
              </h3>
              <p className="text-xs text-white/60">
                Refresh all stores to get the latest apps
              </p>
            </div>
            <Button
              onClick={handleUpdateAll}
              disabled={updating || stores.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              {updating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {updating ? "Updating..." : "Update All"}
            </Button>
          </div>

          {confirming && !updating && (
            <div className="rounded-lg border border-yellow-400/30 bg-yellow-500/10 text-yellow-100 p-3 space-y-2">
              <div className="text-sm font-medium">Confirm refresh?</div>
              <p className="text-xs text-yellow-50/90">
                We will download and re-parse {stores.length} store(s):
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                {stores.map((s) => (
                  <span
                    key={s.slug}
                    className="rounded-full bg-white/10 px-2 py-1 text-white/80 border border-white/10"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={runUpdateAll}
                >
                  Run updates
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-white border-white/20 bg-white/5 hover:bg-white/10"
                  onClick={() => setConfirming(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Update Results */}
          {updateResults && (
            <div className="space-y-2">
              <div
                className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
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
                <div className="rounded-lg border border-white/10 bg-white/5 divide-y divide-white/5">
                  {updateDetails.map((detail) => (
                    <div
                      key={detail.slug}
                      className="flex items-center justify-between px-3 py-2 text-sm text-white/80"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{detail.name}</div>
                        <div className="text-xs text-white/50 truncate">
                          {detail.slug}
                        </div>
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
                          <span className="text-red-300 truncate max-w-[160px]" title={detail.error}>
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

            {/* Stats */}
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

          {/* Imported Stores List */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white/80 px-1">
              Imported Stores
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-white/60">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading stores...
              </div>
            ) : stores.length === 0 ? (
              <div className="text-center py-8 text-white/50 text-sm">
                No stores imported yet.
                <br />
                Import a community store to get started.
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
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
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-white/60" />
          <span className="font-medium text-white text-sm truncate">
            {store.name}
          </span>
          {locked && (
            <span className="text-[10px] uppercase tracking-wide text-white/70 bg-white/10 border border-white/20 px-2 py-0.5 rounded-full">
              Default
            </span>
          )}
          <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
            {store.appCount} apps
          </span>
        </div>
        {store.description && (
          <p className="text-xs text-white/50 mt-1 truncate pl-6">
            {store.description}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-white/50 hover:text-red-400 hover:bg-red-500/10 disabled:text-white/30"
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
