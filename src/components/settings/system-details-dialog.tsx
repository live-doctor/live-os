import { Button } from "@/components/ui/button";
import { button, dialog as dialogTokens } from "@/components/ui/design-tokens";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { HardwareInfo } from "./hardware-utils";
import {
    BatteryTab,
    CpuTab,
    GraphicsTab,
    MemoryTab,
    NetworkTab,
    SystemTab,
    ThermalsTab,
} from "./tabs";
import { SettingsTabTrigger } from "./tabs/settings-tab-trigger";

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
        className={cn(
          dialogTokens.content,
          dialogTokens.size.full,
          dialogTokens.size.xl,
          "gap-0",
          dialogTokens.padding.none,
        )}
      >
        {/* Header */}
        <div className="space-y-3 px-5 py-6">
          <DialogTitle className="sr-only">System Details</DialogTitle>
          <DialogDescription className="sr-only">
            Detailed hardware information from systeminformation.
          </DialogDescription>
          <div className="flex items-center justify-between">
            <h2 className="text-left text-[17px] font-semibold leading-snug tracking-[-0.02em] text-foreground">
              Device Info
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className={`${button.closeIcon} h-[30px] w-[30px] rounded-full`}
            >
              <X className="h-[14px] w-[14px]" />
            </Button>
          </div>
          <div>
            <p className="text-[13px] leading-tight text-muted-foreground">
              Detailed hardware info from systeminformation
            </p>
          </div>
        </div>

        {/* Tabs Content */}
        <div className="px-5 pb-6">
          <Tabs defaultValue="system" className="space-y-4">
            <TabsList className="grid w-full grid-cols-7 rounded-lg bg-secondary/40 border border-border">
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
              <CpuTab
                hardware={hardware?.cpu}
                cpuUsage={cpuUsage}
                cpuPower={cpuPower}
              />
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
