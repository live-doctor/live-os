 
"use client";

import { getAppComposeContent, getAppMedia } from "@/app/actions/appstore";
import { getAppWebUI, deployApp } from "@/app/actions/docker";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getDefaultInstallConfig } from "./app-install-dialog";
import { AppDetailView } from "./app-detail-view";
import {
  CustomDeployDialog,
  type CustomDeployInitialData,
} from "./custom-deploy-dialog";
import type { InstallProgress } from "@/hooks/system-status-types";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { clamp01 } from "@/lib/utils";
import { getRecommendationsFor } from "./utils";
import type { App, InstalledApp } from "./types";

interface AppDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: App;
  onInstallSuccess?: () => void;
  installedApp?: InstalledApp;
  installProgress?: InstallProgress | null;
  allApps?: App[];
  onSelectApp?: (app: App) => void;
}

export function AppDetailDialog({
  open,
  onOpenChange,
  app,
  onInstallSuccess,
  installedApp,
  installProgress,
  allApps = [],
  onSelectApp,
}: AppDetailDialogProps) {
  const [installing, setInstalling] = useState(false);
  const [loadingCompose, setLoadingCompose] = useState(false);
  const [customDeployOpen, setCustomDeployOpen] = useState(false);
  const [customDeployData, setCustomDeployData] =
    useState<CustomDeployInitialData | null>(null);
  const [mediaScreens, setMediaScreens] = useState<string[]>(
    app.screenshots ?? [],
  );
  const [loadingMedia, setLoadingMedia] = useState(false);
  const { pushInstallProgress } = useSystemStatus({ fast: true });
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInstalled = Boolean(installedApp);
  const activeProgress =
    installProgress && installProgress.appId === app.id
      ? installProgress
      : null;
  const progressValue =
    activeProgress && typeof activeProgress.progress === "number"
      ? clamp01(activeProgress.progress)
      : null;
  const progressPercent =
    progressValue !== null ? Math.round(progressValue * 100) : null;
  const isProgressActive = Boolean(
    activeProgress &&
      activeProgress.status !== "completed" &&
      activeProgress.status !== "error",
  );
  const recommendations = useMemo(
    () => getRecommendationsFor(allApps, app.id, 4),
    [allApps, app.id],
  );

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, []);

  const handleQuickInstall = async () => {
    setInstalling(true);
    pushInstallProgress({
      appId: app.id,
      name: app.title || app.name,
      icon: app.icon,
      progress: 0,
      status: "starting",
      message: "Starting install…",
    });
    let optimistic = 0.08;
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      optimistic = Math.min(0.9, optimistic + 0.05);
      pushInstallProgress({
        appId: app.id,
        name: app.title || app.name,
        icon: app.icon,
        progress: optimistic,
        status: "running",
        message: "Installing…",
      });
    }, 1200);
    try {
      const config = getDefaultInstallConfig(app);
      const result = await deployApp({
        appId: app.id,
        composePath: app.composePath,
        config,
        meta: { name: app.title || app.name, icon: app.icon },
        storeId: app.storeId,
      });

      if (result.success) {
        toast.success("Application installed successfully!");
        onInstallSuccess?.();
        await handleOpen();
        onOpenChange(false);
        pushInstallProgress({
          appId: app.id,
          name: app.title || app.name,
          icon: app.icon,
          progress: 1,
          status: "completed",
          message: "Installation complete",
        });
      } else {
        toast.error(result.error || "Failed to install application");
        pushInstallProgress({
          appId: app.id,
          name: app.title || app.name,
          icon: app.icon,
          progress: 1,
          status: "error",
          message: result.error || "Install failed",
        });
      }
    } catch {
      toast.error("Failed to install application");
      pushInstallProgress({
        appId: app.id,
        name: app.title || app.name,
        icon: app.icon,
        progress: 1,
        status: "error",
        message: "Install failed",
      });
    } finally {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setInstalling(false);
    }
  };

  const handleOpen = async () => {
    const url = await getAppWebUI(app.id);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    toast.error("Unable to determine app URL. Ensure the app is running.");
  };

  const handleCustomInstall = async () => {
    setLoadingCompose(true);
    try {
      let composeContent: string | undefined;

      if (app.composePath) {
        const result = await getAppComposeContent(app.composePath);
        if (result.success && result.content) {
          composeContent = result.content;
        }
      }

      setCustomDeployData({
        appName: app.id,
        dockerCompose: composeContent,
        appIcon: app.icon,
        appTitle: app.title,
        storeId: app.storeId,
      });

      setCustomDeployOpen(true);
    } catch {
      toast.error("Failed to load compose file");
    } finally {
      setLoadingCompose(false);
    }
  };

  useEffect(() => {
    const baseScreens = app.screenshots ?? [];
    setMediaScreens(baseScreens);

    if (!open) return;
    if (baseScreens.length > 0) return;

    setLoadingMedia(true);
    getAppMedia(app.id)
      .then((result) => {
        if (result.success) {
          setMediaScreens(result.screenshots ?? baseScreens);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMedia(false));
  }, [app, open]);

  const screenshots = mediaScreens;

  return (
    <>
      <AppDetailView
        open={open}
        onOpenChange={onOpenChange}
        app={app}
        isInstalled={isInstalled}
        screenshots={screenshots}
        loadingMedia={loadingMedia}
        loadingCompose={loadingCompose}
        installing={installing}
        isProgressActive={isProgressActive}
        progressPercent={progressPercent}
        onCustomInstall={handleCustomInstall}
        onQuickInstall={handleQuickInstall}
        onOpen={handleOpen}
        recommendations={recommendations}
        onSelectRecommendation={onSelectApp}
      />

      {customDeployData && (
        <CustomDeployDialog
          open={customDeployOpen}
          onOpenChange={setCustomDeployOpen}
          initialData={customDeployData}
          onDeploySuccess={() => {
            setCustomDeployOpen(false);
            onOpenChange(false);
            onInstallSuccess?.();
          }}
        />
      )}
    </>
  );
}
