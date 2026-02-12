"use client";

import { useState } from "react";
import { fixAvahiMdns } from "@/app/actions/maintenance/troubleshoot";
import { Button } from "@/components/ui/button";
import { card, text } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";
import { Wifi, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function AvahiFixCard() {
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: string[];
  } | null>(null);

  const handleFix = async () => {
    setFixing(true);
    setResult(null);

    try {
      const res = await fixAvahiMdns();
      setResult(res);

      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setResult({
        success: false,
        message: `Failed to fix Avahi mDNS: ${errorMessage}`,
      });
      toast.error("Failed to fix Avahi mDNS");
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className={cn(card.base, card.padding.md, "space-y-3")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/10">
            <Wifi className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h3 className={cn(text.label, "font-semibold")}>
              Fix mDNS Resolution
            </h3>
            <p className={cn(text.muted, "text-[11px]")}>
              Resolve .local domain issues
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleFix}
          disabled={fixing}
          className="h-8 px-3 text-xs"
        >
          {fixing ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Fixing...
            </>
          ) : (
            <>
              <Wifi className="mr-1.5 h-3.5 w-3.5" />
              Run Fix
            </>
          )}
        </Button>
      </div>

      <div className="space-y-2">
        <p className={cn(text.muted, "text-[12px] leading-relaxed")}>
          This fix resolves intermittent <code className="rounded bg-muted px-1 py-0.5 text-[11px]">.local</code> domain resolution issues by:
        </p>
        <ul className={cn(text.muted, "ml-4 space-y-1 text-[11px] list-disc")}>
          <li>Disabling systemd-resolved mDNS conflicts</li>
          <li>Removing <code className="rounded bg-muted px-1 py-0.5">.local</code> entries from <code className="rounded bg-muted px-1 py-0.5">/etc/hosts</code></li>
          <li>Creating Avahi HTTP service advertisement</li>
          <li>Restarting Avahi daemon</li>
        </ul>
      </div>

      {result && (
        <div
          className={cn(
            "rounded-lg border p-3 text-[12px]",
            result.success
              ? "border-green-500/20 bg-green-500/5"
              : "border-red-500/20 bg-red-500/5"
          )}
        >
          <div className="flex items-start gap-2">
            {result.success ? (
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            )}
            <div className="flex-1 space-y-2">
              <p
                className={cn(
                  "font-medium",
                  result.success
                    ? "text-green-700 dark:text-green-300"
                    : "text-red-700 dark:text-red-300"
                )}
              >
                {result.message}
              </p>
              {result.details && result.details.length > 0 && (
                <div className="space-y-0.5">
                  {result.details.map((detail, index) => (
                    <p
                      key={index}
                      className={cn(
                        text.muted,
                        "text-[11px] leading-relaxed font-mono"
                      )}
                    >
                      {detail}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={cn(text.muted, "text-[10px] leading-relaxed pt-1")}>
        <strong>Note:</strong> If issues persist after running this fix, try rebooting your server
        to fully clear any cached DNS entries.
      </div>
    </div>
  );
}
