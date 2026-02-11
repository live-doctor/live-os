"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, ExternalLink, Sparkles } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { AppDetailDialog } from "./app-detail-dialog";
import type { App, InstalledApp } from "./types";
import { getAppWebUI } from "@/app/actions/docker";
import { toast } from "sonner";

interface AppCardProps {
  app: App;
  installedApp?: InstalledApp | null;
  onInstallSuccess?: () => void;
}

export function AppCard({ app, installedApp, onInstallSuccess }: AppCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [iconSrc, setIconSrc] = useState(app.icon);

  const handleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = await getAppWebUI(app.id, window.location.origin);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      toast.error("Unable to determine app URL. Ensure the app is running.");
    }
  };

  return (
    <>
      <Card className="group relative overflow-hidden border border-border bg-card/80 text-foreground backdrop-blur-xl shadow-lg transition-all hover:-translate-y-1 hover:border-border/70 hover:shadow-xl h-full flex flex-col">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />

        <div
          onClick={() => setIsDetailOpen(true)}
          className="relative p-5 space-y-4 cursor-pointer flex-1"
        >
          <div className="flex items-start gap-4">
            {/* App Icon */}
            <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-border bg-secondary/60 shadow-inner">
              <Image
                src={iconSrc}
                alt={app.title}
                fill
                className="object-cover"
                onError={() => setIconSrc("/default-application-icon.png")}
              />
            </div>

            {/* App Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base truncate group-hover:text-foreground">
                  {app.title}
                </h3>
                {app.version && (
                  <span className="rounded-lg bg-secondary/60 px-2 py-0.5 text-[11px] uppercase tracking-wide border border-border text-muted-foreground">
                    v{app.version}
                  </span>
                )}
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {app.tagline || app.overview || "No description available"}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {app.category?.slice(0, 2).map((cat, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    <Sparkles className="h-3 w-3 text-primary" />
                    {cat}
                  </span>
                ))}
                {app.developer && (
                  <span className="text-xs text-muted-foreground truncate">
                    by {app.developer}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Install Button */}
          <div className="flex items-center justify-between gap-3 pt-1 px-5 pb-4">
            <Button
              onClick={
                installedApp
                  ? handleOpen
                  : (e) => {
                      e.stopPropagation();
                      setIsDetailOpen(true);
                    }
              }
              className="w-full bg-primary text-primary-foreground border border-primary/30 shadow-lg hover:bg-primary/90"
              size="sm"
            >
              {installedApp ? (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Install
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      <AppDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        app={app}
        installedApp={installedApp ?? undefined}
        onInstallSuccess={() => {
          onInstallSuccess?.();
        }}
      />
    </>
  );
}
