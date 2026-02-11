"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { MapPin, Store } from "lucide-react";
import type { ReactNode } from "react";

type PostSetupProps = {
  locationStatus: string;
  locationError: string | null;
  isLocating: boolean;
  onUseLocation: () => void;
  includeLinuxServerStore: boolean;
  onIncludeLinuxServerStoreChange: (checked: boolean) => void;
  linuxServerStatus: string;
  linuxServerError: string | null;
  isFinishing: boolean;
  version: string;
  onFinish: () => void;
};

export function PostSetup({
  locationStatus,
  locationError,
  isLocating,
  onUseLocation,
  includeLinuxServerStore,
  onIncludeLinuxServerStoreChange,
  linuxServerStatus,
  linuxServerError,
  isFinishing,
  version,
  onFinish,
}: PostSetupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="space-y-5"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04, duration: 0.18 }}
        className="space-y-3 rounded-lg border border-border bg-secondary/35 p-6 shadow-inner"
      >
        <CardHeader
          title="Location (optional)"
          description="Improves weather and widget defaults."
          icon={<MapPin className="h-5 w-5 text-muted-foreground" />}
        />
        <Button
          variant="ghost"
          onClick={onUseLocation}
          className="w-full border border-border bg-secondary/55 text-foreground hover:bg-secondary"
          disabled={isLocating}
        >
          Use my location
        </Button>
        {locationStatus && <p className="text-xs text-muted-foreground">{locationStatus}</p>}
        {locationError && (
          <p className="text-xs text-red-400/90">{locationError}</p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.09, duration: 0.18 }}
        className="space-y-3 rounded-lg border border-border bg-secondary/35 p-6 shadow-inner"
      >
        <CardHeader
          title="LinuxServer.io catalog (optional)"
          description="Import LinuxServer.io apps during setup."
          icon={<Store className="h-5 w-5 text-muted-foreground" />}
        />
        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/55 px-3 py-2">
          <p className="text-sm text-foreground">Include LinuxServer.io apps</p>
          <Switch
            checked={includeLinuxServerStore}
            onCheckedChange={onIncludeLinuxServerStoreChange}
            disabled={isFinishing}
          />
        </div>
        {linuxServerStatus && <p className="text-xs text-muted-foreground">{linuxServerStatus}</p>}
        {linuxServerError && (
          <p className="text-xs text-red-400/90">{linuxServerError}</p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.18 }}
        className="mt-4 flex items-center justify-between text-sm text-muted-foreground"
      >
        <span>Version {version}</span>
        <Button
          onClick={onFinish}
          disabled={isFinishing}
          className="border border-border bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isFinishing ? "Finishing setup…" : "Go to login"}
        </Button>
      </motion.div>
    </motion.div>
  );
}

function CardHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary/55",
        )}
      >
        {icon}
      </div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
