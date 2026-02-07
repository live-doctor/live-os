import type { ShortcutSection } from "@/components/keyboard-shortcuts/keyboard-shortcuts-dialog";

type ShortcutHandlers = {
  openSearch: () => void;
  openSettings: () => void;
  lockHome: () => void;
  openShortcuts: () => void;
  openFiles: () => void;
  openTerminal: () => void;
  openMonitor: () => void;
  openWidgetSelector: () => void;
};

export function buildHomeShortcutSections(
  handlers: ShortcutHandlers,
): ShortcutSection[] {
  return [
    {
      title: "Global",
      items: [
        {
          title: "Open search",
          description: "Search apps, settings, actions",
          keys: ["Cmd", "K"],
          onSelect: handlers.openSearch,
        },
        {
          title: "Open settings",
          description: "Tweak Homeio preferences",
          keys: ["Cmd", ","],
          onSelect: handlers.openSettings,
        },
        {
          title: "Lock Homeio",
          description: "Quickly lock your desktop",
          keys: ["Cmd", "L"],
          onSelect: handlers.lockHome,
        },
        {
          title: "Show shortcuts",
          description: "Reveal this cheat sheet",
          keys: ["Cmd", "/"],
          onSelect: handlers.openShortcuts,
        },
      ],
    },
    {
      title: "Apps",
      items: [
        {
          title: "Files",
          description: "Open file manager",
          keys: ["Cmd", "F"],
          onSelect: handlers.openFiles,
        },
        {
          title: "Terminal",
          description: "Toggle the terminal",
          keys: ["Cmd", "T"],
          onSelect: handlers.openTerminal,
        },
        {
          title: "System Monitor",
          description: "Inspect system stats",
          keys: ["Cmd", "M"],
          onSelect: handlers.openMonitor,
        },
        {
          title: "Edit widgets",
          description: "Customize dashboard layout",
          keys: ["Cmd", "E"],
          onSelect: handlers.openWidgetSelector,
        },
      ],
    },
  ];
}
