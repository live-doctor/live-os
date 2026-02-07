"use client";

import type { DirectoryContent } from "@/app/actions/filesystem";
import { openPath } from "@/app/actions/filesystem";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_ROOT, MAX_HISTORY } from "./file-utils";

export function useFileNavigation(homePath: string) {
  const [currentPath, setCurrentPath] = useState(DEFAULT_ROOT);
  const [history, setHistory] = useState<string[]>([DEFAULT_ROOT]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [openingNative, setOpeningNative] = useState(false);

  const handleNavigate = useCallback(
    (path: string) => {
      if (!path) return;
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(path);
        return newHistory.slice(-MAX_HISTORY);
      });
      setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
      setCurrentPath(path);
    },
    [historyIndex],
  );

  const handleBack = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentPath(history[historyIndex - 1]);
    }
  }, [historyIndex, history]);

  const handleForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentPath(history[historyIndex + 1]);
    }
  }, [historyIndex, history]);

  const handleGoToParent = useCallback(
    (content: DirectoryContent | null) => {
      if (content?.parent) {
        handleNavigate(content.parent);
      }
    },
    [handleNavigate],
  );

  const handleOpenNative = useCallback(async (pathToOpen: string) => {
    if (!pathToOpen) return;
    setOpeningNative(true);
    try {
      const result = await openPath(pathToOpen);
      if (result.success) {
        toast.success("Opened in your OS");
      } else {
        toast.error(result.error || "Failed to open");
      }
    } catch {
      toast.error("Failed to open");
    } finally {
      setOpeningNative(false);
    }
  }, []);

  const breadcrumbs = useMemo(() => {
    const normalizedHome = homePath.endsWith("/")
      ? homePath.slice(0, -1)
      : homePath || "/";
    const relative = currentPath.startsWith(normalizedHome)
      ? currentPath.slice(normalizedHome.length)
      : currentPath;

    const parts = relative.split("/").filter(Boolean);
    const trail: { label: string; path: string }[] = [];
    trail.push({
      label: normalizedHome.split("/").filter(Boolean).pop() || "Home",
      path: normalizedHome || "/",
    });

    let accum = normalizedHome || "/";
    parts.forEach((part) => {
      accum = `${accum}/${part}`.replace(/\/+/g, "/");
      trail.push({ label: part, path: accum });
    });

    return trail;
  }, [currentPath, homePath]);

  return {
    currentPath,
    setCurrentPath,
    historyIndex,
    historyLength: history.length,
    openingNative,
    breadcrumbs,
    navigate: handleNavigate,
    back: handleBack,
    forward: handleForward,
    goToParent: handleGoToParent,
    openNative: handleOpenNative,
    resetHistory: (path: string) => {
      setHistory([path]);
      setHistoryIndex(0);
      setCurrentPath(path);
    },
  };
}
