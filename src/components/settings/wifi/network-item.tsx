"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { iconBox, input, button } from "@/components/ui/design-tokens";
import { Loader2, Shield, Wifi } from "lucide-react";
import type { WifiNetwork } from "@/app/actions/network";

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
      className={`pointer-events-auto w-full text-left rounded-[12px] border p-4 transition-all ${
        selected || isConnected
          ? "border-white/25 bg-white/10"
          : "border-white/10 bg-white/6 hover:border-white/20 hover:bg-white/8"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`${iconBox.md} rounded-[8px] bg-white/10 border border-white/10`}>
            <Wifi className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-[14px] font-medium leading-tight text-white">
              {network.ssid || "Hidden network"}
            </div>
            <div className="text-[13px] leading-tight text-white/60 flex items-center gap-2">
              <span>{getSignalLabel(network.signal)}</span>
              {secured && (
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Secured
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-white/60">
          {isConnected && (
            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-white">
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
              className={`${button.ghost} h-[30px] rounded-full border border-white/20 bg-white/10 px-2.5 text-[12px] font-medium tracking-[-0.02em]`}
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
