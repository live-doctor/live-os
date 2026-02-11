"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  InstallProgress,
  SSEInstallProgressMessage,
  SSEMessage,
  SharedState,
  Subscriber,
  UseSystemStatusReturn,
} from "./system-status-types";

const subscribers = new Set<Subscriber>();
let sharedState: SharedState = {
  systemStats: null,
  storageStats: null,
  networkStats: null,
  runningApps: [],
  installedApps: [],
  otherContainers: [],
  installProgress: [],
  connected: false,
  error: null,
};

let eventSource: EventSource | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let currentFastMode = false;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;
const TERMINAL_PROGRESS_TTL_MS = 2500;
const installRemovalTimers = new Map<string, ReturnType<typeof setTimeout>>();

function normalizeId(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

type InstalledMatch = SharedState["installedApps"][number];

function buildInstalledLookup(installedApps: SharedState["installedApps"]) {
  const lookup = new Map<string, InstalledMatch>();

  const indexKey = (value: string | undefined, installed: InstalledMatch) => {
    if (!value) return;
    lookup.set(value, installed);
    const normalized = normalizeId(value);
    if (normalized) {
      lookup.set(normalized, installed);
    }
  };

  for (const installed of installedApps) {
    indexKey(installed.containerName, installed);
    indexKey(installed.appId, installed);
    for (const containerName of installed.containers ?? []) {
      indexKey(containerName, installed);
    }
  }

  return lookup;
}

function matchInstalledApp(
  lookup: Map<string, InstalledMatch>,
  appId: string,
): InstalledMatch | undefined {
  const direct = lookup.get(appId);
  if (direct) return direct;
  const normalized = normalizeId(appId);
  return normalized ? lookup.get(normalized) : undefined;
}

function notifySubscribers() {
  subscribers.forEach(({ callback }) => callback(sharedState));
}

function updateSharedState(update: Partial<SharedState>) {
  const nextState: SharedState = { ...sharedState, ...update };
  const changed = (Object.keys(nextState) as (keyof SharedState)[]).some(
    (key) => sharedState[key] !== nextState[key],
  );

  if (!changed) return;

  sharedState = nextState;
  notifySubscribers();
}

function scheduleInstallRemoval(appId: string) {
  const existing = installRemovalTimers.get(appId);
  if (existing) {
    clearTimeout(existing);
  }
  const timer = setTimeout(() => {
    installRemovalTimers.delete(appId);
    updateSharedState({
      installProgress: sharedState.installProgress.filter((p) => p.appId !== appId),
    });
  }, TERMINAL_PROGRESS_TTL_MS);
  installRemovalTimers.set(appId, timer);
}

function updateInstallProgress(
  prev: InstallProgress[],
  update: InstallProgress | SSEInstallProgressMessage,
): InstallProgress[] {
  const installId = (update.appId || update.containerName || "").trim();
  if (!installId) return prev;

  const normalizedUpdate: InstallProgress = {
    appId: installId,
    containerName: update.containerName || installId,
    name: update.name,
    icon: update.icon,
    progress: update.progress,
    status: update.status,
    message: update.message,
  };

  const existingTimer = installRemovalTimers.get(normalizedUpdate.appId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    installRemovalTimers.delete(normalizedUpdate.appId);
  }
  const filtered = prev.filter((p) => p.appId !== normalizedUpdate.appId);

  if (
    normalizedUpdate.status === "completed" ||
    normalizedUpdate.status === "error"
  ) {
    scheduleInstallRemoval(normalizedUpdate.appId);
  }

  return [...filtered, normalizedUpdate];
}

function stopEventSource() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  currentFastMode = false;
}

function scheduleReconnect() {
  if (subscribers.size === 0) return;
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    updateSharedState({ error: "Connection lost. Please refresh the page." });
    return;
  }

  reconnectAttempts++;
  reconnectTimeout = setTimeout(() => syncEventSource(), RECONNECT_DELAY);
}

function shouldUseFast() {
  for (const subscriber of subscribers) {
    if (subscriber.fast) return true;
  }
  return false;
}

function connectEventSource(wantFast: boolean) {
  if (subscribers.size === 0) return;
  if (eventSource && currentFastMode === wantFast) return;

  if (eventSource) {
    stopEventSource();
  }

  try {
    const es = new EventSource(`/api/system/stream${wantFast ? "?fast=1" : ""}`);
    eventSource = es;
    currentFastMode = wantFast;

    es.onopen = () => {
      reconnectAttempts = 0;
      updateSharedState({ connected: true, error: null });
    };

    es.onmessage = (event) => {
      try {
        const data: SSEMessage = JSON.parse(event.data);

        if (data.type === "metrics") {
          const nextInstalled = data.installedApps ?? sharedState.installedApps;
          const nextOtherContainers = data.otherContainers ?? sharedState.otherContainers;
          const rawRunning = data.runningApps ?? sharedState.runningApps;
          const installedLookup = buildInstalledLookup(nextInstalled);
          const runningWithIcons = rawRunning.map((app) => {
            const match = matchInstalledApp(installedLookup, app.id);
            return match ? { ...app, icon: match.icon, name: match.name } : app;
          });

          updateSharedState({
            systemStats: data.systemStatus ?? sharedState.systemStats,
            storageStats: data.storageInfo ?? sharedState.storageStats,
            networkStats: data.networkStats ?? sharedState.networkStats,
            installedApps: nextInstalled,
            otherContainers: nextOtherContainers,
            runningApps: runningWithIcons,
            error: null,
          });
        } else if (data.type === "install-progress") {
          updateSharedState({
            installProgress: updateInstallProgress(
              sharedState.installProgress,
              data,
            ),
          });
        } else if (data.type === "error") {
          console.error("[SystemStatus] Server error:", data.message);
          updateSharedState({ error: data.message || "Unknown error" });
        }
      } catch (parseError) {
        console.error("[SystemStatus] Failed to parse SSE message:", parseError);
      }
    };

    es.onerror = () => {
      console.log("[SystemStatus] SSE error/disconnected");
      updateSharedState({ connected: false });
      stopEventSource();
      scheduleReconnect();
    };
  } catch (err) {
    console.error("[SystemStatus] Failed to create EventSource:", err);
    updateSharedState({
      error: "Failed to connect to system metrics stream",
      connected: false,
    });
  }
}

function syncEventSource() {
  if (subscribers.size === 0) {
    stopEventSource();
    return;
  }
  connectEventSource(shouldUseFast());
}

function subscribeToSystemStatus(
  callback: (state: SharedState) => void,
  fast: boolean,
) {
  const subscriber: Subscriber = { callback, fast };
  subscribers.add(subscriber);
  callback(sharedState);

  syncEventSource();

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) {
      reconnectAttempts = 0;
      stopEventSource();
      return;
    }
    syncEventSource();
  };
}

export function useSystemStatus(
  options: { fast?: boolean; enabled?: boolean } = {},
): UseSystemStatusReturn {
  const [state, setState] = useState<SharedState>(sharedState);
  const fast = options.fast ?? false;
  const enabled = options.enabled ?? true;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    return subscribeToSystemStatus(setState, fast);
  }, [enabled, fast]);

  const pushInstallProgress = useCallback(
    (update: InstallProgress) => {
      updateSharedState({
        installProgress: updateInstallProgress(sharedState.installProgress, update),
      });
    },
    [],
  );

  return {
    systemStats: state.systemStats,
    storageStats: state.storageStats,
    networkStats: state.networkStats,
    runningApps: state.runningApps,
    installedApps: state.installedApps,
    otherContainers: state.otherContainers,
    installProgress: state.installProgress,
    connected: state.connected,
    error: state.error,
    pushInstallProgress,
  };
}
