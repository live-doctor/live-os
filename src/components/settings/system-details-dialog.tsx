import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { button } from "@/components/ui/design-tokens";
import { X } from "lucide-react";
import type { HardwareInfo } from "./hardware-utils";
import { SettingsTabTrigger } from "./tabs/settings-tab-trigger";
import {
  SystemTab,
  CpuTab,
  MemoryTab,
  BatteryTab,
  GraphicsTab,
  NetworkTab,
  ThermalsTab,
} from "./tabs";

type SystemDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hardware?: HardwareInfo;
  cpuUsage?: number;
  cpuPower?: number;
  memory?: {
    total?: number;
    used?: number;
    free?: number;
    usage?: number;
  };
};

export function SystemDetailsDialog({
  open,
  onOpenChange,
  hardware,
  cpuUsage,
  cpuPower,
  memory,
}: SystemDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-[95vw] overflow-hidden rounded-[20px] border border-white/10 bg-[rgba(47,51,57,0.78)] p-0 gap-0 text-white shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-3xl sm:max-w-3xl"
      >
        {/* Header */}
        <div className="space-y-3 px-5 py-6">
          <DialogTitle className="sr-only">System Details</DialogTitle>
          <DialogDescription className="sr-only">
            Detailed hardware information from systeminformation.
          </DialogDescription>
          <div className="flex items-center justify-between">
            <h2 className="text-left text-[17px] font-semibold leading-snug tracking-[-0.02em] text-white">
              Device Info
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className={`${button.closeIcon} h-[30px] w-[30px] rounded-full border border-white/20 bg-white/10`}
            >
              <X className="h-[14px] w-[14px]" />
            </Button>
          </div>
          <div>
            <p className="text-[13px] leading-tight text-white opacity-45">
              Detailed hardware info from systeminformation
            </p>
          </div>
        </div>

        {/* Tabs Content */}
        <div className="px-5 pb-6">
          <Tabs defaultValue="system" className="space-y-4">
            <TabsList className="grid w-full grid-cols-7 rounded-[12px] bg-white/6 border border-white/10">
              <SettingsTabTrigger value="system">System</SettingsTabTrigger>
              <SettingsTabTrigger value="cpu">CPU</SettingsTabTrigger>
              <SettingsTabTrigger value="memory">Memory</SettingsTabTrigger>
              <SettingsTabTrigger value="battery">Battery</SettingsTabTrigger>
              <SettingsTabTrigger value="graphics">Graphics</SettingsTabTrigger>
              <SettingsTabTrigger value="network">Network</SettingsTabTrigger>
              <SettingsTabTrigger value="thermals">Thermals</SettingsTabTrigger>
            </TabsList>

            <TabsContent value="system">
              <SystemTab hardware={hardware?.system} />
            </TabsContent>

            <TabsContent value="cpu">
              <CpuTab hardware={hardware?.cpu} cpuUsage={cpuUsage} cpuPower={cpuPower} />
            </TabsContent>

            <TabsContent value="memory">
              <MemoryTab memory={memory} />
            </TabsContent>

            <TabsContent value="battery">
              <BatteryTab battery={hardware?.battery} />
            </TabsContent>

            <TabsContent value="graphics">
              <GraphicsTab graphics={hardware?.graphics} />
            </TabsContent>

            <TabsContent value="network">
              <NetworkTab
                network={hardware?.network}
                wifi={hardware?.wifi}
                bluetooth={hardware?.bluetooth}
              />
            </TabsContent>

            <TabsContent value="thermals">
              <ThermalsTab
                thermals={hardware?.thermals}
                cpuTemperature={hardware?.cpuTemperature}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
