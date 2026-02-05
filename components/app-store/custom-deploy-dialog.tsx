"use client";

import {
  convertDockerRunToCompose,
  deployApp,
} from "@/app/actions/docker";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  const [dockerCompose, setDockerCompose] = useState(
    initialData?.dockerCompose ?? "",
  );
  const [networkMode, setNetworkMode] = useState("");
  const [uiPort, setUiPort] = useState("");
  const isEditMode = Boolean(initialData?.appName && initialData?.dockerCompose);

  useEffect(() => {
    if (!open) return;
    setAppName(initialData?.appName ?? "");
    setDockerCompose(initialData?.dockerCompose ?? "");
  }, [open, initialData]);

  // Auto-detect web UI port and network mode from compose
  useEffect(() => {
    if (!dockerCompose.trim()) {
      setNetworkMode("");
      setUiPort("");
      return;
    }
    try {
      const doc = YAML.parse(dockerCompose);
      const services = doc?.services;
      const firstServiceName = services ? Object.keys(services)[0] : null;
      if (!firstServiceName) return;
      const service = services[firstServiceName];
      const firstPort = Array.isArray(service?.ports) ? service.ports[0] : null;
      if (typeof firstPort === "string") {
        const [host] = firstPort.split(":");
        setUiPort(host || "");
      } else if (firstPort && typeof firstPort === "object") {
        setUiPort(String(firstPort.published ?? ""));
      }
      setNetworkMode(service?.network_mode ?? "");
    } catch {
      /* ignore parse errors */
    }
  }, [dockerCompose]);

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

    setLoading(true);

    try {
      const result = await deployApp({
        appId: appName,
        composeContent: dockerCompose,
        storeId: initialData?.storeId,
        containerMeta: initialData?.containerMeta,
        meta: initialData?.appTitle
          ? { name: initialData.appTitle, icon: initialData.appIcon }
          : undefined,
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
        className="max-w-3xl max-h-[90vh] bg-zinc-900/95 text-white border border-white/10 backdrop-blur-xl shadow-2xl p-0 gap-0 overflow-hidden"
        aria-describedby="custom-deploy-description"
        style={{
          boxShadow: `
            0 4px 16px rgba(0, 0, 0, 0.4),
            0 2px 8px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.15),
            inset 0 -1px 0 rgba(0, 0, 0, 0.2)
          `,
        }}
      >
        <CustomDeployHeader
          data={initialData}
          descriptionId="custom-deploy-description"
          onClose={() => onOpenChange(false)}
        />

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="p-6 space-y-6">
            {/* App Name */}
            <div className="space-y-2">
              <Label htmlFor="app-name" className="text-zinc-200">
                App Name *
              </Label>
              <Input
                id="app-name"
                placeholder="my-custom-app"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="text-white placeholder:text-zinc-500"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
                disabled={loading || isEditMode}
              />
              <p className="text-xs text-zinc-400">
                This will be used as the container/app identifier
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
