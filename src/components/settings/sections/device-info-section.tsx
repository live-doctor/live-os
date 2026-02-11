import { VERSION } from "@/lib/config";
import type { SystemInfo } from "../types";

type DeviceInfoSectionProps = {
  systemInfo?: SystemInfo;
  uptimeLabel?: string;
};

export function DeviceInfoSection({
  systemInfo,
  uptimeLabel,
}: DeviceInfoSectionProps) {
  return (
    <div className="rounded-lg bg-secondary/40 px-3 py-4 lg:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-5">
        <div>
          <h3 className="text-[24px] font-bold leading-none tracking-[-0.04em] text-foreground">
            {systemInfo?.username || "User"}&apos;s{" "}
            <span className="text-muted-foreground">Homeio</span>
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-[auto_auto] items-center gap-x-5 gap-y-2 text-[14px] leading-none tracking-[-0.02em]">
        <div className="text-muted-foreground">Device</div>
        <div className="text-foreground">
          {systemInfo?.hostname || "Homeio Server"}
        </div>
        <div className="text-muted-foreground">Homeio</div>
        <div className="text-foreground">{VERSION}</div>
        <div className="text-muted-foreground">Local IP</div>
        <div className="text-foreground">
          {systemInfo?.ip ?? "Detecting..."}
        </div>
        <div className="text-muted-foreground">Uptime</div>
        <div className="text-foreground">{uptimeLabel || "..."}</div>
      </div>
    </div>
  );
}
