"use client";

import {
  convertDockerRunToCompose,
  deployApp,
} from "@/app/actions/docker";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { HOMEIO_DIALOG_SHELL_CLASS } from "@/components/ui/dialog-chrome";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type ChangeEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { CustomDeployFooter } from "./custom-deploy/custom-deploy-footer";
import { CustomDeployHeader } from "./custom-deploy/custom-deploy-header";
import { DockerComposeTab } from "./custom-deploy/docker-compose-tab";
import { DockerRunConverter } from "./custom-deploy/docker-run-converter";
import YAML from "yaml";

export interface CustomDeployInitialData {
  appName?: string;
  dockerCompose?: string;
  appIcon?: string;
  appTitle?: string;
  /** Preserve store association on redeploy */
  storeId?: string;
  /** Preserve container metadata on redeploy */
  containerMeta?: Record<string, unknown>;
  /** Stored Web UI port from previous deploy */
  webUIPort?: string;
}

interface CustomDeployDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: CustomDeployInitialData;
  onDeploySuccess?: () => void;
}

export function CustomDeployDialog({
  open,
  onOpenChange,
  initialData,
  onDeploySuccess,
}: CustomDeployDialogProps) {
  const [loading, setLoading] = useState(false);
  const [appName, setAppName] = useState(initialData?.appName ?? "");
  const [iconUrl, setIconUrl] = useState(initialData?.appIcon ?? "");
  const [dockerCompose, setDockerCompose] = useState(
    initialData?.dockerCompose ?? "",
  );
  const [networkMode, setNetworkMode] = useState("");
  const [uiPort, setUiPort] = useState("");
  const isEditMode = Boolean(initialData?.appName && initialData?.dockerCompose);

  useEffect(() => {
    if (!open) return;
    setAppName(initialData?.appName ?? "");
    setIconUrl(initialData?.appIcon ?? "");
    setDockerCompose(initialData?.dockerCompose ?? "");
    // Pre-fill stored port so user sees the current value
    if (initialData?.webUIPort) {
      setUiPort(initialData.webUIPort);
    }
  }, [open, initialData]);

  // Auto-detect web UI port and network mode from compose
  // Skip auto-detection if a stored port was provided (user can still change it)
  useEffect(() => {
    if (!dockerCompose.trim()) {
      setNetworkMode("");
      if (!initialData?.webUIPort) setUiPort("");
      return;
    }
    try {
      const doc = YAML.parse(dockerCompose);
      const services = doc?.services;
      const firstServiceName = services ? Object.keys(services)[0] : null;
      if (!firstServiceName) return;
      const service = services[firstServiceName];
      // Only auto-detect port if no stored value was provided
      if (!initialData?.webUIPort) {
        const firstPort = Array.isArray(service?.ports)
          ? service.ports[0]
          : null;
        if (typeof firstPort === "string") {
          const [host] = firstPort.split(":");
          setUiPort(host || "");
        } else if (firstPort && typeof firstPort === "object") {
          setUiPort(String(firstPort.published ?? ""));
        }
      }
      setNetworkMode(service?.network_mode ?? "");
    } catch {
      /* ignore parse errors */
    }
  }, [dockerCompose, initialData?.webUIPort]);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setDockerCompose(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleConvertDockerRun = async (command: string) => {
    const result = await convertDockerRunToCompose(command);
    if (result.success && result.yaml) {
      setDockerCompose(result.yaml);
      toast.success("Converted docker run command to Compose");
    } else {
      toast.error(result.error || "Failed to convert command");
    }
  };

  const handleDeploy = async () => {
    if (!appName.trim()) {
      toast.error("Please provide an app name");
      return;
    }

    if (!dockerCompose.trim()) {
      toast.error("Please provide docker-compose configuration");
      return;
    }

    const normalizedIcon = normalizeIconUrl(iconUrl);
    if (normalizedIcon === null) {
      toast.error("Icon URL must be an absolute http(s) URL or start with /");
      return;
    }

    setLoading(true);

    try {
      const metaName = (initialData?.appTitle || appName).trim();
      const metaIcon = normalizedIcon ?? initialData?.appIcon;
      const result = await deployApp({
        appId: appName,
        composeContent: dockerCompose,
        storeId: initialData?.storeId,
        containerMeta: initialData?.containerMeta,
        meta: {
          name: metaName,
          ...(metaIcon ? { icon: metaIcon } : {}),
        },
        config: {
          ports: [],
          volumes: [],
          environment: [],
          webUIPort: uiPort || undefined,
          networkMode: networkMode || undefined,
        },
      });

      if (result.success) {
        toast.success(`Successfully deployed ${appName}`);
        onOpenChange(false);
        setAppName("");
        setIconUrl("");
        setDockerCompose("");
        onDeploySuccess?.();
      } else {
        toast.error(result.error || "Failed to deploy application");
      }
    } catch {
      toast.error("Failed to deploy application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`${HOMEIO_DIALOG_SHELL_CLASS} sm:max-w-3xl`}
        aria-describedby="custom-deploy-description"
      >
        <CustomDeployHeader
          data={initialData}
          iconPreview={iconUrl}
          fallbackTitle={appName}
          descriptionId="custom-deploy-description"
          onClose={() => onOpenChange(false)}
        />

        <ScrollArea
          className="h-[calc(92vh-160px)] w-full min-w-0"
          viewportClassName="homeio-scrollarea-fit h-full w-full [&>div]:!block [&>div]:!w-full [&>div]:!min-w-0 [&>div]:!max-w-full [&>div]:!overflow-x-hidden"
        >
          <div className="min-w-0 max-w-full space-y-5 overflow-hidden px-3 pb-6 pt-4 md:px-6 md:pt-5">
            {/* App Name */}
            <div className="space-y-2">
              <Label htmlFor="app-name" className="text-foreground">
                App Name *
              </Label>
              <Input
                id="app-name"
                placeholder="my-custom-app"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="border-border bg-secondary/60 text-foreground placeholder:text-muted-foreground"
                disabled={loading || isEditMode}
              />
              <p className="text-xs text-muted-foreground">
                This will be used as the container/app identifier
              </p>
            </div>

            {/* Icon URL */}
            <div className="space-y-2">
              <Label htmlFor="icon-url" className="text-foreground">
                Icon URL (optional)
              </Label>
              <Input
                id="icon-url"
                placeholder="https://example.com/icon.png"
                value={iconUrl}
                onChange={(event) => setIconUrl(event.target.value)}
                className="border-border bg-secondary/60 text-foreground placeholder:text-muted-foreground"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Supports absolute http(s) URLs and local paths like /icons/my-app.png
              </p>
            </div>

            {/* Web UI Port */}
            <div className="space-y-2">
              <Label htmlFor="webui-port" className="text-foreground">
                Web UI Port
              </Label>
              <Input
                id="webui-port"
                type="number"
                placeholder="e.g. 8096"
                value={uiPort}
                onChange={(e) => setUiPort(e.target.value)}
                className="border-border bg-secondary/60 text-foreground placeholder:text-muted-foreground"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Port used to access the web interface. Auto-detected from
                compose, but you can override it here.
              </p>
            </div>

            {/* Docker Run Converter — only for new deploys */}
            {!isEditMode && (
              <DockerRunConverter
                loading={loading}
                onConverted={handleConvertDockerRun}
              />
            )}

            {/* Docker Compose Editor */}
            <DockerComposeTab
              loading={loading}
              dockerCompose={dockerCompose}
              onDockerComposeChange={setDockerCompose}
              onFileUpload={handleFileUpload}
            />
          </div>
        </ScrollArea>

        <CustomDeployFooter
          loading={loading}
          onCancel={() => onOpenChange(false)}
          onDeploy={handleDeploy}
        />
      </DialogContent>
    </Dialog>
  );
}

function normalizeIconUrl(value: string): string | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") return trimmed;
    return null;
  } catch {
    return null;
  }
}
