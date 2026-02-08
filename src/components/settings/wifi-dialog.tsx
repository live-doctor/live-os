"use client";

import {
  connectToWifi,
  listWifiNetworks,
  setWifiRadio,
  getWifiRadioState,
  type WifiNetwork,
  type WifiRadioState,
} from "@/app/actions/network";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { WifiDialogHeader, NetworkItem, StatusMessage } from "./wifi";

type WifiDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WifiDialog({ open, onOpenChange }: WifiDialogProps) {
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [selectedSsid, setSelectedSsid] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [radio, setRadio] = useState<WifiRadioState>({ enabled: null });
  const [toggling, setToggling] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setScanError(null);
    setWarning(null);
    setConnectError(null);
    try {
      const radioState = await getWifiRadioState();
      setRadio(radioState);

      if (radioState.enabled === false) {
        setNetworks([]);
        setLoading(false);
        return;
      }

      const result = await listWifiNetworks();
      setNetworks(result.networks);
      const connected = result.networks.find((n) => n.connected);
      if (connected?.ssid) {
        setSelectedSsid(connected.ssid);
      }
      if (result.error) {
        setScanError(result.error);
      } else if (result.warning) {
        setWarning(result.warning);
      }
    } catch (err) {
      setScanError("Failed to load Wi-Fi networks: " + ((err as Error)?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleRadio = useCallback(async () => {
    if (radio.enabled === null) return;
    setToggling(true);
    const next = !(radio.enabled ?? false);
    const result = await setWifiRadio(next);
    setRadio(result);
    setToggling(false);
    if (result.enabled) {
      refresh();
    } else {
      setNetworks([]);
    }
  }, [radio.enabled, refresh]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const handleConnect = async (network: WifiNetwork) => {
    if (network.connected) {
      setConnectError("Already connected to this network");
      return;
    }
    const needsPassword = network.security && network.security !== "--";
    if (needsPassword && password.trim().length === 0) {
      setConnectError("Password required for secured network");
      return;
    }

    setConnecting(true);
    setConnectError(null);
    const result = await connectToWifi(network.ssid, needsPassword ? password : undefined);
    setConnecting(false);

    if (result.success) {
      setPassword("");
      onOpenChange(false);
    } else {
      setConnectError(result.error || "Failed to connect");
    }
  };

  const handleSelectNetwork = (ssid: string) => {
    setSelectedSsid(ssid);
    setConnectError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px] p-0">
        <DialogTitle className="sr-only">Wi-Fi</DialogTitle>
        <DialogDescription className="sr-only">
          Connect to and manage available Wi-Fi networks.
        </DialogDescription>
        <ScrollArea className="max-h-[78vh]">
          <div className="space-y-6 px-5 py-6">
            <WifiDialogHeader
              loading={loading}
              onRefresh={refresh}
              radioEnabled={radio.enabled}
              toggling={toggling}
              onToggleRadio={handleToggleRadio}
            />
            {/* Loading state */}
            {loading && (
              <div className="flex items-center gap-2 rounded-[12px] bg-white/6 p-4 text-[13px] text-white/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning for networks...
              </div>
            )}

            {/* Error state */}
            {!loading && scanError && (
              <StatusMessage type="error" title="WiFi Scan Failed" message={scanError} />
            )}

            {/* Warning state */}
            {!loading && !scanError && warning && networks.length === 0 && (
              <StatusMessage type="warning" title="No Networks Found" message={warning} />
            )}

            {/* Empty state */}
            {!loading && !scanError && !warning && networks.length === 0 && (
              <StatusMessage type="empty" title="" message="No networks found." />
            )}

            {/* Network list */}
            {networks.map((network) => (
              <NetworkItem
                key={network.ssid}
                network={network}
                selected={selectedSsid === network.ssid}
                password={password}
                connecting={connecting}
                connected={network.connected}
                onSelect={() => handleSelectNetwork(network.ssid)}
                onPasswordChange={setPassword}
                onConnect={() => handleConnect(network)}
              />
            ))}

            {/* Connect error */}
            {connectError && (
              <div className="rounded-[12px] border border-red-500/30 bg-red-500/10 px-3 py-2">
                <p className="text-[13px] text-red-300">{connectError}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
