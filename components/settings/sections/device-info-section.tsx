import { Button } from "@/components/ui/button";
import { VERSION } from "@/lib/config";
import { LogOut, Power, RotateCw } from "lucide-react";
import type { SystemInfo } from "../types";

type DeviceInfoSectionProps = {
  systemInfo?: SystemInfo;
  uptimeLabel?: string;
  onLogout?: () => void;
  onRestart?: () => void;
  onShutdown?: () => void;
};

export function DeviceInfoSection({
  systemInfo,
  uptimeLabel,
  onLogout,
  onRestart,
  onShutdown,
}: DeviceInfoSectionProps) {
  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white -tracking-[0.01em]">
            {systemInfo?.username || "User"}&apos;s{" "}
            <span className="text-white/60">LiveOS</span>
          </h3>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
            onClick={onRestart}
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Restart
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/15 bg-white/10 hover:bg-[#E22C2C]/20 text-[#F53737] hover:text-[#F53737] text-xs shadow-sm"
            onClick={onShutdown}
          >
            <Power className="h-4 w-4 mr-2" />
            Shut down
          </Button>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex">
          <span className="w-32 text-white/60">Device</span>
          <span className="text-white">
            {systemInfo?.hostname || "LiveOS Server"}
          </span>
        </div>
        <div className="flex">
          <span className="w-32 text-white/60">LiveOS</span>
          <span className="text-white">{VERSION}</span>
        </div>
        <div className="flex">
          <span className="w-32 text-white/60">Local IP</span>
          <span className="text-white">{systemInfo?.ip ?? "Detecting..."}</span>
        </div>
        <div className="flex">
          <span className="w-32 text-white/60">Uptime</span>
          <span className="text-white">{uptimeLabel || "..."}</span>
        </div>
      </div>
    </div>
  );
}
