"use client";

import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import type { ReactNode } from "react";

type PostSetupProps = {
  locationStatus: string;
  locationError: string | null;
  isLocating: boolean;
  onUseLocation: () => void;
  version: string;
  onFinish: () => void;
};

export function PostSetup({
  locationStatus,
  locationError,
  isLocating,
  onUseLocation,
  version,
  onFinish,
}: PostSetupProps) {
  return (
    <>
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-black/25 space-y-3">
        <CardHeader
          title="Location (optional)"
          description="Improves weather and widget defaults."
          icon={<MapPin className="h-5 w-5 text-white" />}
        />
        <Button
          variant="ghost"
          onClick={onUseLocation}
          className="w-full border border-white/15 text-white"
          disabled={isLocating}
        >
          Use my location
        </Button>
        {locationStatus && (
          <p className="text-xs text-white/60">{locationStatus}</p>
        )}
        {locationError && (
          <p className="text-xs text-red-400">{locationError}</p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-white/60 mt-4">
        <span>Version {version}</span>
        <Button
          onClick={onFinish}
          className="bg-white/10 text-white hover:bg-white/20 border border-white/15"
        >
          Go to login
        </Button>
      </div>
    </>
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
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10">
        {icon}
      </div>
      <div>
        <p className="text-white font-medium">{title}</p>
        <p className="text-sm text-white/60">{description}</p>
      </div>
    </div>
  );
}
