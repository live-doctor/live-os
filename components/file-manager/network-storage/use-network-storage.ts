import {
    addNetworkShare,
    connectNetworkShare,
    disconnectNetworkShare,
    discoverSmbHosts,
    getServerInfo,
    listNetworkShares,
    removeNetworkShare,
} from "@/app/actions/filesystem/network-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
    DiscoveredHost,
    NetworkShare,
    ServerInfo,
    ShareForm,
    ViewState,
} from "./types";

const emptyForm: ShareForm = {
  host: "",
  share: "",
  username: "",
  password: "",
};

export function useNetworkStorage(open: boolean) {
  // Data state
  const [shares, setShares] = useState<NetworkShare[]>([]);
  const [discovered, setDiscovered] = useState<DiscoveredHost[]>([]);
  const [selectedServer, setSelectedServer] = useState<DiscoveredHost | null>(
    null,
  );
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [discoverStatus, setDiscoverStatus] = useState("");

  // UI state
  const [view, setView] = useState<ViewState>("list");
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [loadingServerInfo, setLoadingServerInfo] = useState(false);
  const [serverInfoLoaded, setServerInfoLoaded] = useState(false);
  const [busyShareId, setBusyShareId] = useState<string | null>(null);
  const [addingShare, setAddingShare] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<ShareForm>(emptyForm);
  const [serverCredentials, setServerCredentials] = useState({
    username: "",
    password: "",
  });

  // Error/feedback
  const [formError, setFormError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Credential prompt for connecting
  const [credPrompt, setCredPrompt] = useState<NetworkShare | null>(null);
  const [credForm, setCredForm] = useState({ username: "", password: "" });

  const sortedShares = useMemo(
    () =>
      [...shares].sort(
        (a, b) =>
          a.host.localeCompare(b.host) || a.share.localeCompare(b.share),
      ),
    [shares],
  );

  const upsertShare = useCallback((next: NetworkShare) => {
    setShares((prev) => {
      const idx = prev.findIndex((item) => item.id === next.id);
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = next;
        return clone;
      }
      return [...prev, next];
    });
  }, []);

  const discover = useCallback(async () => {
    setDiscovering(true);
    setDiscoverStatus("Discovering network devices...");
    try {
      const { hosts } = await discoverSmbHosts();
      setDiscovered(hosts);
      setDiscoverStatus(
        hosts.length > 0
          ? `Found ${hosts.length} server${hosts.length === 1 ? "" : "s"}`
          : "No servers found during discovery",
      );
    } catch {
      setDiscovered([]);
      setDiscoverStatus("Discovery failed");
    } finally {
      setDiscovering(false);
    }
  }, []);

  const loadShares = useCallback(async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const result = await listNetworkShares();
      setShares(result.shares);
    } catch (err) {
      setGlobalError(
        "Failed to load network shares: " +
          ((err as Error)?.message || "Unknown error"),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadServerInfo = useCallback(
    async (
      host: DiscoveredHost,
      credentials?: { username: string; password: string },
      allowGuest = false,
    ) => {
      const username = credentials?.username?.trim();
      if (!username && !allowGuest) {
        setServerInfoLoaded(true);
        setServerInfo({
          host: host.host,
          isHOMEIO: false,
          shares: [],
          requiresAuth: true,
          error: "Authentication required",
        });
        return;
      }
      setServerInfoLoaded(true);
      setLoadingServerInfo(true);
      setServerInfo(null);
      try {
        const info = await getServerInfo(
          host.host,
          host.ip,
          credentials,
          allowGuest,
        );
        setServerInfo(info);
      } catch (err) {
        setServerInfo({
          host: host.host,
          isHOMEIO: false,
          shares: [],
          requiresAuth: false,
          error: (err as Error)?.message || "Failed to get server info",
        });
      } finally {
        setLoadingServerInfo(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (open) {
      loadShares();
      discover();
      setView("list");
      setSelectedServer(null);
      setServerInfo(null);
      setServerInfoLoaded(false);
      setDiscoverStatus("");
    }
  }, [open, loadShares, discover]);

  const handleSelectServer = useCallback((host: DiscoveredHost) => {
    setSelectedServer(host);
    setView("server-shares");
    setServerCredentials({ username: "", password: "" });
    setServerInfo(null);
    setServerInfoLoaded(false);
  }, []);

  const handleRetryWithCredentials = useCallback(() => {
    if (selectedServer)
      loadServerInfo(selectedServer, serverCredentials, false);
  }, [selectedServer, serverCredentials, loadServerInfo]);

  const handleBrowseAsGuest = useCallback(() => {
    if (selectedServer) loadServerInfo(selectedServer, serverCredentials, true);
  }, [selectedServer, serverCredentials, loadServerInfo]);

  const handleAddShareFromServer = useCallback(
    async (shareName: string) => {
      if (!selectedServer) return;
      setAddingShare(shareName);
      setFormError(null);
      try {
        const result = await addNetworkShare({
          host: selectedServer.host,
          ip: selectedServer.ip,
          share: shareName,
          username: serverCredentials.username || undefined,
          password: serverCredentials.password || undefined,
        });
        if (result.share) upsertShare(result.share);
        if (!result.success)
          setFormError(result.error || "Failed to add share");
      } catch (err) {
        setFormError((err as Error)?.message || "Failed to add share");
      } finally {
        setAddingShare(null);
      }
    },
    [selectedServer, serverCredentials, upsertShare],
  );

  const handleManualAdd = useCallback(async () => {
    if (!form.host.trim() || !form.share.trim()) {
      setFormError("Host and share are required");
      return;
    }
    setAddingShare("manual");
    setFormError(null);
    try {
      const result = await addNetworkShare({
        host: form.host.trim(),
        share: form.share.trim(),
        username: form.username.trim() || undefined,
        password: form.password,
      });
      if (result.share) upsertShare(result.share);
      if (!result.success) {
        setFormError(result.error || "Failed to add share");
      } else {
        setForm(emptyForm);
        setView("list");
      }
    } catch (err) {
      setFormError((err as Error)?.message || "Failed to add share");
    } finally {
      setAddingShare(null);
    }
  }, [form, upsertShare]);

  const handleToggle = useCallback(
    async (share: NetworkShare) => {
      setBusyShareId(share.id);
      setGlobalError(null);
      try {
        if (share.status === "connected") {
          const result = await disconnectNetworkShare(share.id);
          if (result.share) upsertShare(result.share);
        } else {
          setCredPrompt(share);
        }
      } catch (err) {
        setGlobalError((err as Error)?.message || "Failed to update share");
      } finally {
        setBusyShareId(null);
      }
    },
    [upsertShare],
  );

  const handleConnectWithPrompt = useCallback(async () => {
    if (!credPrompt) return;
    setBusyShareId(credPrompt.id);
    setGlobalError(null);
    try {
      const result = await connectNetworkShare(credPrompt.id, {
        username: credForm.username.trim() || undefined,
        password: credForm.password,
      });
      if (result.share) upsertShare(result.share);
      if (!result.success && result.error) {
        setGlobalError(result.error);
      } else {
        setCredPrompt(null);
        setCredForm({ username: "", password: "" });
      }
    } catch (err) {
      setGlobalError((err as Error)?.message || "Failed to connect");
    } finally {
      setBusyShareId(null);
    }
  }, [credPrompt, credForm, upsertShare]);

  const handleRemove = useCallback(async (share: NetworkShare) => {
    setBusyShareId(share.id);
    setGlobalError(null);
    try {
      await removeNetworkShare(share.id);
      setShares((prev) => prev.filter((s) => s.id !== share.id));
    } catch (err) {
      setGlobalError((err as Error)?.message || "Failed to remove share");
    } finally {
      setBusyShareId(null);
    }
  }, []);

  const navigateBack = useCallback(() => {
    setView("list");
    setSelectedServer(null);
    setServerInfo(null);
    setServerInfoLoaded(false);
    setFormError(null);
  }, []);

  const isShareAdded = useCallback(
    (shareName: string) => {
      if (!selectedServer) return false;
      return shares.some(
        (s) =>
          s.host.toLowerCase() === selectedServer.host.toLowerCase() &&
          s.share.toLowerCase() === shareName.toLowerCase(),
      );
    },
    [shares, selectedServer],
  );

  const shouldShowAuthPrompt =
    view === "server-shares" &&
    !!selectedServer &&
    (!serverInfoLoaded || serverInfo?.requiresAuth === true);

  return {
    // Data
    sortedShares,
    discovered,
    selectedServer,
    serverInfo,
    discoverStatus,
    // UI
    view,
    setView,
    loading,
    discovering,
    loadingServerInfo,
    busyShareId,
    addingShare,
    shouldShowAuthPrompt,
    // Form
    form,
    setForm,
    serverCredentials,
    setServerCredentials,
    formError,
    globalError,
    // Credential prompt
    credPrompt,
    setCredPrompt,
    credForm,
    setCredForm,
    // Actions
    loadShares,
    discover,
    handleSelectServer,
    handleRetryWithCredentials,
    handleBrowseAsGuest,
    handleAddShareFromServer,
    handleManualAdd,
    handleToggle,
    handleConnectWithPrompt,
    handleRemove,
    navigateBack,
    isShareAdded,
  };
}
