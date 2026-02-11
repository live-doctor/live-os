"use client";

import { getStorageInfo, type StorageInfo } from "@/app/actions/system/storage";
import { dialog as dialogTokens } from "@/components/ui/design-tokens";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatBytes } from "@/lib/utils";
import { HardDrive, HardDriveDownload, Loader2, RefreshCw } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

type StorageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StorageDialog({ open, onOpenChange }: StorageDialogProps) {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStorageInfo();
      setInfo(data);
    } catch (err) {
      setError((err as Error)?.message || "Unable to read storage info.");
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void refresh();
    }
  }, [open, refresh]);

  const diskCount = info?.disks.length ?? 0;
  const partitionCount = info?.partitions.length ?? 0;
  const volumeCount = info?.volumes.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          dialogTokens.content,
          dialogTokens.size.full,
          "sm:max-w-5xl",
          dialogTokens.padding.none,
        )}
      >
        <div className="space-y-3 px-5 py-6">
          <div className="flex items-center justify-between">
            <h2 className="text-left text-[17px] font-semibold leading-snug tracking-[-0.02em] text-foreground">
              Storage
            </h2>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 text-[12px] font-medium tracking-[-0.02em] text-foreground transition-[color,background-color,box-shadow] duration-300 hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-[14px] w-[14px] opacity-80" />
              )}
              Refresh
            </button>
          </div>
          <DialogTitle className="sr-only">Storage</DialogTitle>
          <DialogDescription className="text-[13px] leading-tight text-muted-foreground">
            Disks, partitions, and volumes. Live snapshot from systeminformation
            plus df / lsblk.
          </DialogDescription>
        </div>

        <ScrollArea className="max-h-[72vh] px-5 pb-6">
          <div className="space-y-4 pb-2">
            {error && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-100">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard
                label="Disks"
                value={diskCount}
                icon={<HardDrive className="h-4 w-4" />}
              />
              <StatCard
                label="Partitions"
                value={partitionCount}
                icon={<HardDriveDownload className="h-4 w-4" />}
              />
              <StatCard
                label="Volumes"
                value={volumeCount}
                icon={<HardDrive className="h-4 w-4" />}
              />
            </div>

            {info && (
              <>
                <Section title="Disks">
                  {info.disks.length === 0 ? (
                    <EmptyMessage text="No disks detected." />
                  ) : (
                    <div className="space-y-2">
                      {info.disks.map((disk, idx) => (
                        <div
                          key={`${disk.device}-${idx}`}
                          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-3 text-sm text-foreground"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold truncate">
                              {disk.name || disk.device}
                            </p>
                            <p className="text-muted-foreground text-xs truncate">
                              {disk.vendor || "Unknown vendor"} ·{" "}
                              {disk.interfaceType || "?"}
                            </p>
                          </div>
                          <div className="text-foreground">
                            {formatBytes(disk.size)}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            Type: {disk.type || "Unknown"}
                          </div>
                          <div className="text-muted-foreground text-xs truncate">
                            Serial: {disk.serialNum || "N/A"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                <Section title="Partitions">
                  {info.partitions.length === 0 ? (
                    <EmptyMessage text="No partitions detected." />
                  ) : (
                    <div className="space-y-2">
                      {info.partitions.map((part) => (
                        <div
                          key={`${part.name}-${part.uuid ?? part.label ?? part.mount}`}
                          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-3 text-sm text-foreground"
                        >
                          <div className="truncate font-semibold">
                            {part.name}
                          </div>
                          <div className="text-foreground truncate">
                            {part.mount || "—"}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {part.fsType || "Unknown"}
                          </div>
                          <div className="text-muted-foreground text-xs truncate">
                            {part.label || part.uuid || "No label"}
                          </div>
                          <div className="text-foreground text-sm">
                            {formatBytes(Number(part.size) || 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                <Section title="Volumes">
                  {info.volumes.length === 0 ? (
                    <EmptyMessage text="No mounted volumes found." />
                  ) : (
                    <div className="space-y-2">
                      {info.volumes.map((vol) => (
                        <div
                          key={vol.fs}
                          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-3 text-sm text-foreground"
                        >
                          <div className="truncate font-semibold">{vol.fs}</div>
                          <div className="text-muted-foreground text-xs">
                            {vol.type || "Unknown"}
                          </div>
                          <div className="text-muted-foreground text-xs truncate">
                            {vol.mount || "—"}
                          </div>
                          <div className="text-foreground text-sm">
                            {formatBytes(vol.used)} / {formatBytes(vol.size)}{" "}
                            {vol.use ? `(${vol.use}%)` : ""}
                          </div>
                          <div className="text-muted-foreground text-xs truncate">
                            {vol.mount || vol.type || ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                <Section title="df -h">
                  <CommandOutput
                    output={info.dfOutput}
                    placeholder="df -h output unavailable."
                  />
                </Section>

                <Section title="lsblk -f">
                  <CommandOutput
                    output={info.lsblkOutput}
                    placeholder="lsblk output unavailable."
                  />
                </Section>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3 text-foreground flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
      <span className="rounded-full border border-border bg-secondary/60 p-2 text-foreground">
        {icon}
      </span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-[14px] font-medium leading-tight text-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function CommandOutput({
  output,
  placeholder,
}: {
  output: string | null;
  placeholder: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 text-muted-foreground font-mono text-xs p-3 overflow-x-auto whitespace-pre-wrap">
      {output || placeholder}
    </div>
  );
}
