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
    <div className="rounded-[12px] bg-white/5 px-3 py-4 lg:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-5">
        <div>
          <h3 className="text-[24px] font-bold leading-none tracking-[-0.04em] text-white">
            {systemInfo?.username || "User"}&apos;s{" "}
            <span className="text-white/40">Homeio</span>
          </h3>
        </div>
        <div className="flex w-full flex-col items-stretch gap-2.5 md:w-auto md:flex-row">
          <Button
            variant="ghost"
            size="sm"
            className="inline-flex h-[50px] rounded-[10px] border border-white/20 bg-white/10 px-[15px] text-[13px] font-medium tracking-[-0.02em] text-white hover:bg-white/10"
            onClick={onLogout}
          >
            <LogOut className="mr-1.5 h-[13px] w-[13px] opacity-80" />
            Log out
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="inline-flex h-[50px] rounded-[10px] border border-white/20 bg-white/10 px-[15px] text-[13px] font-medium tracking-[-0.02em] text-white hover:bg-white/10"
            onClick={onRestart}
          >
            <RotateCw className="mr-1.5 h-[13px] w-[13px] opacity-80" />
            Restart
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="inline-flex h-[50px] rounded-[10px] border border-white/20 bg-white/10 px-[15px] text-[13px] font-medium tracking-[-0.02em] text-red-300 hover:bg-red-500/20 hover:text-red-200"
            onClick={onShutdown}
          >
            <Power className="mr-1.5 h-[13px] w-[13px] opacity-80" />
            Shut down
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[auto_auto] items-center gap-x-5 gap-y-2 text-[14px] leading-none tracking-[-0.02em]">
        <div className="text-white/40">Device</div>
        <div className="text-white">
            {systemInfo?.hostname || "Homeio Server"}
        </div>
        <div className="text-white/40">Homeio</div>
        <div className="text-white">{VERSION}</div>
        <div className="text-white/40">Local IP</div>
        <div className="text-white">{systemInfo?.ip ?? "Detecting..."}</div>
        <div className="text-white/40">Uptime</div>
        <div className="text-white">{uptimeLabel || "..."}</div>
      </div>
    </div>
  );
}
