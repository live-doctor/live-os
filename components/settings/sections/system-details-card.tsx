import { Button } from "@/components/ui/button";
import { HardwareInfo, formatCpuLabel, formatCpuTemp } from "../hardware-utils";

type SystemDetailsCardProps = {
  hardware?: HardwareInfo;
  onOpenTabs: () => void;
};

export function SystemDetailsCard({
  hardware,
  onOpenTabs,
}: SystemDetailsCardProps) {
  const manufacturer = hardware?.system?.manufacturer || "Unknown";
  const cpuLabel = formatCpuLabel(hardware?.cpu);
  const cpuTempLabel = formatCpuTemp(hardware?.cpuTemperature);

  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-white -tracking-[0.01em] mb-1">
            System Details
          </h4>
          <p className="text-xs text-white/60">Live hardware snapshot</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
          onClick={onOpenTabs}
        >
          View tabs
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="flex flex-col">
          <span className="text-white/60 text-xs">Manufacturer</span>
          <span className="text-white">{manufacturer}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-white/60 text-xs">CPU</span>
          <span className="text-white">{cpuLabel}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-white/60 text-xs">CPU Temp</span>
          <span className="text-white">{cpuTempLabel}</span>
        </div>
      </div>
    </div>
  );
}
