"use client";

import { useEffect } from "react";

type HomeShortcutActions = {
  openSearch: () => void;
  openSettings: () => void;
  lockHome: () => void;
  openShortcuts: () => void;
  openTerminal: () => void;
  openWidgetSelector: () => void;
  openFiles: () => void;
  openMonitor: () => void;
};

const isTypingElement = (el: Element | null) => {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    (el as HTMLElement).isContentEditable ||
    tag === "select"
  );
};

export function useHomeKeyboardShortcuts(actions: HomeShortcutActions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingElement(event.target as Element | null)) return;
      const key = event.key.toLowerCase();

      if (event.metaKey && key === "l") {
        event.preventDefault();
        actions.lockHome();
        return;
      }
      if (event.metaKey && key === "k") {
        event.preventDefault();
        actions.openSearch();
        return;
      }
      if (event.metaKey && key === ",") {
        event.preventDefault();
        actions.openSettings();
        return;
      }
      if (event.metaKey && (key === "/" || event.key === "?")) {
        event.preventDefault();
        actions.openShortcuts();
        return;
      }
      if (!event.metaKey && (event.key === "?" || (key === "/" && event.shiftKey))) {
        event.preventDefault();
        actions.openShortcuts();
        return;
      }
      if (event.metaKey && key === "t") {
        event.preventDefault();
        actions.openTerminal();
        return;
      }
      if (event.metaKey && key === "e") {
        event.preventDefault();
        actions.openWidgetSelector();
        return;
      }
      if (event.metaKey && key === "f") {
        event.preventDefault();
        actions.openFiles();
        return;
      }
      if (event.metaKey && key === "m") {
        event.preventDefault();
        actions.openMonitor();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions]);

  useEffect(() => {
    window.addEventListener("openShortcuts", actions.openShortcuts);
    return () => window.removeEventListener("openShortcuts", actions.openShortcuts);
  }, [actions]);

  useEffect(() => {
    window.addEventListener("homeio:open-app-search", actions.openSearch);
    return () =>
      window.removeEventListener("homeio:open-app-search", actions.openSearch);
  }, [actions]);
}
