"use client";

import { useState } from "react";
import { clearCaches, runDiagnostics } from "@/app/actions/maintenance/troubleshoot";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dialog as dialogTokens, text } from "@/components/ui/design-tokens";
import { DiagnosticsCard } from "./diagnostics-card";
import { ServicesCard } from "./services-card";
import { LogsCard } from "./logs-card";
import type { DiagnosticResult } from "./types";
import { Eraser, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TroubleshootDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TroubleshootDialog({ open, onOpenChange }: TroubleshootDialogProps) {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const runAllDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const result = await runDiagnostics();
      setDiagnostics(result);
      const status = result.overallStatus;
      if (status === "passed") toast.success("Diagnostics passed");
      else if (status === "warning") toast.warning("Diagnostics completed with warnings");
      else toast.error("Diagnostics failed");
    } catch (error) {
      console.error("Diagnostics failed", error);
      toast.error("Unable to run diagnostics");
    } finally {
      setDiagLoading(false);
    }
  };

  const handleClearCaches = async () => {
    setClearing(true);
    try {
      const res = await clearCaches();
      toast.success(res.message || "Caches cleared");
    } catch (error) {
      console.error("Clear caches failed", error);
      toast.error("Unable to clear caches");
    } finally {
      setClearing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(dialogTokens.content, dialogTokens.size.full, "sm:max-w-5xl", dialogTokens.padding.none)}
      >
        <div className="space-y-3 px-5 py-6">
          <DialogTitle className="sr-only">Troubleshoot & maintenance</DialogTitle>
          <DialogDescription className="sr-only">
            Run diagnostics, inspect services, clear caches, and view logs.
          </DialogDescription>
          <div className="flex items-center justify-between">
            <h2 className="text-left text-[17px] font-semibold leading-snug tracking-[-0.02em] text-foreground">
              Troubleshoot
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 text-[12px] font-medium tracking-[-0.02em] text-foreground transition-[color,background-color,box-shadow] duration-300 hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring/30"
              onClick={handleClearCaches}
              disabled={clearing}
            >
              {clearing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eraser className="h-[14px] w-[14px] opacity-80" />
              )}
              Clear caches
            </Button>
          </div>
          <p className="text-[13px] leading-tight text-muted-foreground">
            Run diagnostics, inspect services, clear caches, and view logs without leaving settings.
          </p>
        </div>

        <ScrollArea className="max-h-[72vh] px-5 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DiagnosticsCard
              diagnostics={diagnostics}
              loading={diagLoading}
              onRun={() => void runAllDiagnostics()}
            />
            <ServicesCard open={open} />
          </div>

          <div className="mt-4 grid grid-cols-1">
            <LogsCard />
          </div>
          <p className={`${text.muted} mt-3 text-center text-[11px]`}>
            Services list may be limited in development environments without systemd.
          </p>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
