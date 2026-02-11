"use client";

import {
    getServiceStatus,
    getSystemServices,
    restartService,
    startService,
    stopService,
} from "@/app/actions/maintenance/troubleshoot";
import { Button } from "@/components/ui/button";
import { card, cn, text } from "@/components/ui/design-tokens";
import { Input } from "@/components/ui/input";
import { Loader2, Play, RefreshCw, RotateCw, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { SystemService } from "./types";

const serviceBadge = {
  running: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30",
  stopped: "bg-red-500/15 text-red-200 border border-red-500/30",
  error: "bg-red-500/15 text-red-200 border border-red-500/30",
  unknown: "bg-secondary/60 text-muted-foreground border-border",
};

type Props = {
  open: boolean;
};

export function ServicesCard({ open }: Props) {
  const [critical, setCritical] = useState<SystemService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [restarting, setRestarting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searched, setSearched] = useState<SystemService | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchCritical = async () => {
    setServicesLoading(true);
    try {
      setCritical(await getSystemServices());
    } catch (error) {
      console.error("Failed to load services", error);
      setCritical([]);
    } finally {
      setServicesLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void fetchCritical();
  }, [open]);

  const handleRestart = async (name: string) => {
    setRestarting(name);
    try {
      const res = await restartService(name);
      if (res.success) {
        toast.success(res.message || `Restarted ${name}`);
        await fetchCritical();
        if (searched?.name === name) {
          setSearched(await getServiceStatus(name));
        }
      } else {
        toast.error(res.message || `Failed to restart ${name}`);
      }
    } catch (error) {
      console.error("Restart failed", error);
      toast.error(`Failed to restart ${name}`);
    } finally {
      setRestarting(null);
    }
  };

  const handleToggle = async (service: SystemService) => {
    setToggling(service.name);
    try {
      const action = service.status === "running" ? stopService : startService;
      const res = await action(service.name);
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
      await fetchCritical();
      if (searched?.name === service.name) {
        setSearched(await getServiceStatus(service.name));
      }
    } catch (error) {
      console.error("Toggle failed", error);
      toast.error(`Failed to update ${service.name}`);
    } finally {
      setToggling(null);
    }
  };

  const handleSearch = async () => {
    const term = searchTerm.trim();
    if (!term) return;
    setSearchLoading(true);
    try {
      const result = await getServiceStatus(term);
      setSearched(result);
    } catch (error) {
      console.error("Search service failed", error);
      toast.error("Service lookup failed");
      setSearched(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const renderRow = (service: SystemService) => (
    <div
      key={service.name}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2"
    >
      <div className="space-y-1 min-w-0">
        <p className="text-foreground text-sm font-semibold truncate">
          {service.displayName}
        </p>
        <p className="text-muted-foreground text-xs truncate">{service.name}</p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize border",
            serviceBadge[service.status],
          )}
        >
          {service.status}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="border border-border bg-secondary/60 hover:bg-secondary text-foreground text-xs"
          onClick={() => void handleToggle(service)}
          disabled={toggling === service.name}
        >
          {toggling === service.name ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : service.status === "running" ? (
            <Square className="h-4 w-4 mr-2" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {service.status === "running" ? "Stop" : "Start"}
        </Button>
        {service.canRestart && (
          <Button
            variant="ghost"
            size="sm"
            className="border border-border bg-secondary/60 hover:bg-secondary text-foreground text-xs"
            onClick={() => void handleRestart(service.name)}
            disabled={restarting === service.name}
          >
            {restarting === service.name ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4 mr-2" />
            )}
            Restart
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <section className={cn(card.base, card.padding.md, "space-y-3")}>
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <p className={cn(text.labelUppercase, "tracking-[0.18em]")}>
            Services
          </p>
          <h3 className={text.heading}>Critical daemons</h3>
          <p className={text.muted}>Homeio, Docker, and on-demand lookup</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="border border-border bg-secondary/60 hover:bg-secondary text-foreground text-xs"
            onClick={() => void fetchCritical()}
            disabled={servicesLoading}
          >
            {servicesLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </header>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">
          Lookup a service (press Enter)
        </label>
        <div className="flex items-center gap-2">
          <Input
            placeholder="e.g. cloudflared.service or docker"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSearch();
              }
            }}
            className="bg-input text-foreground border-border"
          />
          <Button
            variant="ghost"
            size="sm"
            className="border border-border bg-secondary/60 hover:bg-secondary text-foreground text-xs"
            onClick={() => void handleSearch()}
            disabled={searchLoading}
          >
            {searchLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Check
          </Button>
        </div>
        {searched && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1">Search result</p>
            {renderRow(searched)}
          </div>
        )}
      </div>

      <div className="space-y-2 mt-3">
        <p className={text.muted}>Critical services</p>
        {servicesLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking services...
          </div>
        )}
        {!servicesLoading && critical.length === 0 && (
          <div className="text-muted-foreground text-sm">No services detected.</div>
        )}
        {critical.map(renderRow)}
      </div>
    </section>
  );
}
