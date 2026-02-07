"use client";

import {
    addFirewallRule,
    deleteFirewallRule,
    disableFirewall,
    enableFirewall,
    getFirewallStatus,
    resetFirewall,
} from "@/app/actions/network/firewall";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
    AlertTriangle,
    Loader2,
    RefreshCw,
    RotateCcw,
    Shield,
    ShieldOff,
    X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AddRuleForm } from "./add-rule-form";
import { RuleItem } from "./rule-item";
import type { AddRuleFormData, FirewallData } from "./types";

type FirewallDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FirewallDialog({ open, onOpenChange }: FirewallDialogProps) {
  const [data, setData] = useState<FirewallData>({
    status: {
      enabled: false,
      defaultIncoming: "unknown",
      defaultOutgoing: "unknown",
    },
    rules: [],
    loading: true,
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [deletingRule, setDeletingRule] = useState<number | null>(null);

  const fetchStatus = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true }));
    const result = await getFirewallStatus();
    setData({
      status: result.status,
      rules: result.rules,
      error: result.error,
      loading: false,
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      setData((prev) => ({ ...prev, loading: true }));
      const result = await getFirewallStatus();
      setData({
        status: result.status,
        rules: result.rules,
        error: result.error,
        loading: false,
      });
    };

    loadData();
  }, [open]);

  const handleToggleFirewall = async () => {
    const wasEnabled = data.status.enabled;
    const newEnabled = !wasEnabled;
    setActionLoading(true);

    const action = wasEnabled ? disableFirewall : enableFirewall;
    const result = await action();

    if (result.success) {
      // Update UI with new state - trust the action succeeded
      setData((prev) => ({
        ...prev,
        status: { ...prev.status, enabled: newEnabled },
        // Clear rules when disabling (they won't be accessible anyway)
        rules: newEnabled ? prev.rules : [],
      }));
      toast.success(wasEnabled ? "Firewall disabled" : "Firewall enabled");

      // If enabling, fetch rules after a delay
      if (newEnabled) {
        await new Promise((r) => setTimeout(r, 800));
        const freshResult = await getFirewallStatus();
        if (!freshResult.error) {
          setData((prev) => ({
            ...prev,
            rules: freshResult.rules,
            status: {
              ...prev.status,
              defaultIncoming: freshResult.status.defaultIncoming,
              defaultOutgoing: freshResult.status.defaultOutgoing,
            },
          }));
        }
      }
    } else {
      toast.error(result.error || "Failed to toggle firewall");
    }
    setActionLoading(false);
  };

  const handleAddRule = async (formData: AddRuleFormData) => {
    setActionLoading(true);
    const result = await addFirewallRule({
      port: formData.port,
      protocol: formData.protocol,
      action: formData.action,
      from: formData.from === "any" ? undefined : formData.from,
      direction: formData.direction,
    });

    if (result.success) {
      toast.success("Rule added successfully");
      await fetchStatus();
    } else {
      toast.error(result.error || "Failed to add rule");
    }
    setActionLoading(false);
  };

  const handleDeleteRule = async (ruleNumber: number) => {
    setDeletingRule(ruleNumber);
    const result = await deleteFirewallRule(ruleNumber);

    if (result.success) {
      toast.success("Rule deleted");
      await fetchStatus();
    } else {
      toast.error(result.error || "Failed to delete rule");
    }
    setDeletingRule(null);
  };

  const handleReset = async () => {
    if (!confirm("This will reset all firewall rules to default. Continue?"))
      return;

    setActionLoading(true);
    const result = await resetFirewall();

    if (result.success) {
      toast.success("Firewall reset to defaults");
      await fetchStatus();
    } else {
      toast.error(result.error || "Failed to reset firewall");
    }
    setActionLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[85vh] max-w-[95vw] overflow-hidden rounded-[20px] border border-white/10 bg-[rgba(47,51,57,0.78)] p-0 gap-0 text-white shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-3xl sm:max-w-2xl"
      >
        {/* Header */}
        <div className="space-y-3 px-5 py-6">
          <DialogTitle className="sr-only">Firewall</DialogTitle>
          <DialogDescription className="sr-only">
            Manage network traffic rules.
          </DialogDescription>
          <div className="flex items-center justify-between">
            <h2 className="text-left text-[17px] font-semibold leading-snug tracking-[-0.02em] text-white">
              Firewall
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchStatus}
                disabled={data.loading}
                className="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 text-[12px] font-medium tracking-[-0.02em] text-white transition-[color,background-color,box-shadow] duration-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-[14px] w-[14px] opacity-80 ${data.loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-[color,background-color,box-shadow] duration-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <X className="h-[14px] w-[14px] opacity-80" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[8px] bg-white/10 border border-white/15 flex items-center justify-center">
              {data.status.enabled ? (
                <Shield className="h-5 w-5 text-green-400" />
              ) : (
                <ShieldOff className="h-5 w-5 text-white/40" />
              )}
            </div>
            <div>
              <p className="text-[13px] leading-tight text-white opacity-45">
                Manage network traffic rules and defaults.
              </p>
            </div>
          </div>
        </div>

        <ScrollArea className="h-[calc(85vh-110px)] px-5 pb-6">
          <div className="space-y-6">
            {/* Error state */}
            {data.error && (
              <div className="flex items-start gap-3 p-4 rounded-[12px] bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-[13px] text-red-300 whitespace-pre-wrap">
                  {data.error}
                </div>
              </div>
            )}

            {/* Loading state */}
            {data.loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-white/40 animate-spin" />
              </div>
            )}

            {/* Main content */}
            {!data.loading && !data.error && (
              <>
                {/* Status & Toggle */}
                <div className="flex items-center justify-between p-4 rounded-[12px] bg-white/6 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        data.status.enabled ? "bg-green-400" : "bg-white/30"
                      }`}
                    />
                    <div>
                      <div className="text-[14px] font-medium leading-tight text-white">
                        Firewall is{" "}
                        {data.status.enabled ? "enabled" : "disabled"}
                      </div>
                      <div className="text-[12px] text-white/50">
                        Default: {data.status.defaultIncoming} incoming,{" "}
                        {data.status.defaultOutgoing} outgoing
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={data.status.enabled}
                    onCheckedChange={handleToggleFirewall}
                    disabled={actionLoading}
                  />
                </div>

                {/* Add Rule Form */}
                {data.status.enabled && (
                  <div>
                    <h3 className="mb-3 text-[14px] font-medium leading-tight text-white">
                      Add New Rule
                    </h3>
                    <AddRuleForm
                      onAdd={handleAddRule}
                      loading={actionLoading}
                    />
                  </div>
                )}

                {/* Rules List */}
                {data.status.enabled && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[14px] font-medium leading-tight text-white">
                        Active Rules ({data.rules.length})
                      </h3>
                      {data.rules.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleReset}
                          disabled={actionLoading}
                          className="h-8 text-xs text-white/50 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                          Reset all
                        </Button>
                      )}
                    </div>
                    {data.rules.length === 0 ? (
                      <div className="text-center py-8 text-sm text-white/40">
                        No active rules. Add one above.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {data.rules.map((rule, index) => (
                          <RuleItem
                            key={rule.id}
                            rule={rule}
                            index={index}
                            onDelete={handleDeleteRule}
                            deleting={deletingRule === index + 1}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
