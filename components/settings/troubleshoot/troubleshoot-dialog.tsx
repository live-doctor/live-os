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
import { text } from "@/components/ui/design-tokens";
import { DiagnosticsCard } from "./diagnostics-card";
import { ServicesCard } from "./services-card";
import { LogsCard } from "./logs-card";
import type { DiagnosticResult } from "./types";
import { Eraser, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

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
      <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[90vh] bg-white/5 backdrop-blur-xl border border-white/10 p-0 overflow-hidden shadow-2xl shadow-black/40">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/70">
              <ShieldCheck className="h-3.5 w-3.5" />
              Troubleshoot
            </div>
            <DialogTitle className="text-xl font-semibold text-white">Troubleshoot & maintenance</DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Run diagnostics, inspect services, clear caches, and view logs without leaving settings.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
            onClick={handleClearCaches}
            disabled={clearing}
          >
            {clearing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Eraser className="h-4 w-4 mr-2" />
            )}
            Clear caches
          </Button>
        </div>

        <ScrollArea className="max-h-[75vh] px-6 pb-6 pt-4">
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
