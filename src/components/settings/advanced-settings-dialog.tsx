"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdvancedSettingsContent } from "./sections";

type AdvancedSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdvancedSettingsDialog({
  open,
  onOpenChange,
}: AdvancedSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px] p-0">
        <DialogTitle className="sr-only">Advanced settings</DialogTitle>
        <DialogDescription className="sr-only">
          Network tweaks, terminal access, and maintenance tools.
        </DialogDescription>
        <ScrollArea className="max-h-[78vh]">
          <AdvancedSettingsContent />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
