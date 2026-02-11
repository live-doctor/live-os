"use client";

import type { WifiNetwork } from "@/app/actions/network";
import { Button } from "@/components/ui/button";
import { button, iconBox, input } from "@/components/ui/design-tokens";
import { Input } from "@/components/ui/input";
import { Loader2, Shield, Wifi } from "lucide-react";

interface NetworkItemProps {
  network: WifiNetwork;
  selected: boolean;
  password: string;
  connecting: boolean;
  connected?: boolean;
  onSelect: () => void;
  onPasswordChange: (value: string) => void;
  onConnect: () => void;
}

function getSignalLabel(signal: number): string {
  if (signal >= 80) return "Excellent";
  if (signal >= 60) return "Good";
  if (signal >= 40) return "Fair";
  return "Weak";
}

export function NetworkItem({
  network,
  selected,
  password,
  connecting,
  connected,
  onSelect,
  onPasswordChange,
  onConnect,
}: NetworkItemProps) {
  const secured = network.security && network.security !== "--";
  const isConnected = connected || network.connected;

  return (
    <button
      onClick={onSelect}
      className={`pointer-events-auto w-full text-left rounded-lg border p-4 transition-all ${
        selected || isConnected
          ? "border-border bg-secondary/60"
          : "border-border bg-secondary/40 hover:border-border/80 hover:bg-secondary/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`${iconBox.md} rounded-lg`}>
            <Wifi className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <div className="text-[14px] font-medium leading-tight text-foreground">
              {network.ssid || "Hidden network"}
            </div>
            <div className="text-[13px] leading-tight text-muted-foreground flex items-center gap-2">
              <span>{getSignalLabel(network.signal)}</span>
              {secured && (
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Secured
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          {isConnected && (
            <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-foreground">
              Connected
            </span>
          )}
          <span>{network.signal}%</span>
        </div>
      </div>

      {selected && !isConnected && (
        <div className="mt-3 space-y-2">
          {secured && (
            <Input
              type="password"
              placeholder="Network password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className={`${input.base} ${input.placeholder}`}
            />
          )}
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onConnect();
              }}
              disabled={connecting}
              className={`${button.ghost} h-[30px] rounded-full px-2.5 text-[12px] font-medium tracking-[-0.02em]`}
            >
              {connecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </div>
        </div>
      )}
    </button>
  );
}
