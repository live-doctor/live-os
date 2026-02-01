import type { NetworkShare } from "@/app/actions/network-storage";

export type NetworkStorageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type DiscoveredHost = {
  name: string;
  host: string;
  ip?: string;
};

export type ServerInfo = {
  host: string;
  isLiveOS: boolean;
  liveOSVersion?: string;
  shares: string[];
  requiresAuth: boolean;
  error?: string;
};

export type ShareForm = {
  host: string;
  share: string;
  username: string;
  password: string;
};

export type ViewState = "list" | "server-shares" | "manual-add";

export type { NetworkShare };
