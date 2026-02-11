"use client";

import { Button } from "@/components/ui/button";
import {
  HOMEIO_DIALOG_CLOSE_BUTTON_CLASS,
  HOMEIO_DIALOG_CONTENT_GUTTER_CLASS,
  HOMEIO_DIALOG_SHELL_CLASS,
  HOMEIO_DIALOG_SUBTITLE_CLASS,
  HOMEIO_DIALOG_TITLE_CLASS,
} from "@/components/ui/dialog-chrome";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { ChevronDown, Container, Server, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Terminal } from "xterm";
import type { FitAddon } from "xterm-addon-fit";
import type { WebLinksAddon } from "xterm-addon-web-links";

interface TerminalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TerminalDialog({ open, onOpenChange }: TerminalDialogProps) {
  const { installedApps } = useSystemStatus({ fast: true, enabled: open });
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const terminalRef = useRef<HTMLDivElement>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string>("host");
  const [terminalReady, setTerminalReady] = useState(false);

  const terminalTheme = useMemo(
    () =>
      isDark
        ? {
            background: "#00000000",
            foreground: "#E6EAF2",
            cursor: "#9FB3FF",
            cursorAccent: "#11172A",
            selectionBackground: "#7F90FF40",
            black: "#151A2E",
            red: "#FF6E7D",
            green: "#7BE3A6",
            yellow: "#F4CA78",
            blue: "#87A9FF",
            magenta: "#D39BFF",
            cyan: "#82DBFF",
            white: "#DFE6F6",
            brightBlack: "#5A6785",
            brightRed: "#FF8D98",
            brightGreen: "#98F0BE",
            brightYellow: "#FFD995",
            brightBlue: "#A6BEFF",
            brightMagenta: "#E0B6FF",
            brightCyan: "#A2E6FF",
            brightWhite: "#F4F7FF",
          }
        : {
            background: "#00000000",
            foreground: "#2D3748",
            cursor: "#E05D38",
            cursorAccent: "#FFFFFF",
            selectionBackground: "#E05D3826",
            black: "#1F2937",
            red: "#DC2626",
            green: "#16A34A",
            yellow: "#CA8A04",
            blue: "#2563EB",
            magenta: "#7C3AED",
            cyan: "#0891B2",
            white: "#F9FAFB",
            brightBlack: "#64748B",
            brightRed: "#EF4444",
            brightGreen: "#22C55E",
            brightYellow: "#F59E0B",
            brightBlue: "#3B82F6",
            brightMagenta: "#8B5CF6",
            brightCyan: "#06B6D4",
            brightWhite: "#FFFFFF",
          },
    [isDark],
  );

  const targets = useMemo(() => {
    const hostTarget = {
      id: "host",
      label: "Homeio Host",
      badge: "OS",
      icon: <Server className="h-4 w-4 text-emerald-300" />,
    };

    const dockerTargets =
      installedApps
        ?.filter((app) => app.status === "running")
        .map((app) => ({
          id: app.containerName,
          label: app.name,
          badge: "Docker",
          icon: <Container className="h-4 w-4 text-sky-300" />,
        })) ?? [];

    return [hostTarget, ...dockerTargets];
  }, [installedApps]);

  const activeTarget = targets.find((t) => t.id === targetId) ?? targets[0];

  useEffect(() => {
    if (!open) {
      setTerminalReady(false);
      return;
    }
    setTerminalReady(false);

    let disposed = false;
    let term: Terminal | null = null;
    let fitAddon: FitAddon | null = null;
    let webLinksAddon: WebLinksAddon | null = null;
    let ws: WebSocket | null = null;
    let resizeHandler: (() => void) | null = null;
    let rafId: number | null = null;

    // Dynamically import and initialize xterm to avoid SSR issues
    const initTerminal = async () => {
      if (disposed) return;
      const container = terminalRef.current;
      if (!container) {
        if (!disposed) {
          rafId = requestAnimationFrame(initTerminal);
        }
        return;
      }

      const [{ Terminal }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
        import("xterm"),
        import("xterm-addon-fit"),
        import("xterm-addon-web-links"),
      ]);
      if (disposed) return;

      // Initialize xterm.js
      term = new Terminal({
        cursorBlink: true,
        fontSize: 12.5,
        fontFamily:
          'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontWeight: 400,
        allowTransparency: true,
        letterSpacing: 0.1,
        theme: terminalTheme,
        cols: 80,
        rows: 24,
      });

      // Initialize addons
      fitAddon = new FitAddon();
      webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);

      // Open terminal in the DOM
      if (terminalRef.current) {
        term.open(terminalRef.current);
        fitAddon.fit();
        setTerminalReady(true);
      }

      // Connect to WebSocket
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${window.location.host}/api/terminal`);
      if (disposed) {
        ws.close();
        term.dispose();
        return;
      }

      ws.onopen = () => {
        if (disposed) return;
        setStatusMessage(null);
        term?.writeln("\x1b[1;32mConnected to server terminal\x1b[0m");
        if (activeTarget?.id && activeTarget.id !== "host") {
          term?.writeln(
            `\x1b[1;34mAttaching to ${activeTarget.label} (docker exec -it ${activeTarget.id})\x1b[0m`,
          );
          ws!.send(
            JSON.stringify({
              type: "attach",
              target: activeTarget.id,
            }),
          );
        }
        term?.writeln("");
      };

      ws.onmessage = (event) => {
        if (disposed) return;
        if (
          typeof event.data === "string" &&
          event.data.includes("Terminal unavailable")
        ) {
          setStatusMessage(event.data.toString());
        }
        term?.write(event.data);
      };

      ws.onerror = () => {
        if (disposed) return;
        setStatusMessage(
          "Connection error. Ensure node-pty is installed on the server.",
        );
        term?.writeln("\x1b[1;31mConnection error\x1b[0m");
      };

      ws.onclose = () => {
        if (disposed) return;
        setStatusMessage(
          (prev) =>
            prev ||
            "Terminal disconnected. If this persists, rebuild node-pty on the server.",
        );
        term?.writeln("");
        term?.writeln("\x1b[1;31mDisconnected from server\x1b[0m");
      };

      // Handle terminal input
      term.onData((data) => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      // Handle window resize
      const handleResize = () => {
        if (disposed) return;
        fitAddon?.fit();
        if (ws?.readyState === WebSocket.OPEN && term) {
          ws.send(
            JSON.stringify({
              type: "resize",
              cols: term.cols,
              rows: term.rows,
            }),
          );
        }
      };

      window.addEventListener("resize", handleResize);
      resizeHandler = handleResize;

      // Store cleanup function
    };

    // Initialize terminal
    initTerminal().catch(() => {
      setStatusMessage("Failed to initialize terminal.");
    });

    // Cleanup on unmount
    return () => {
      disposed = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      setTerminalReady(false);
      if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
      }
      ws?.close();
      term?.dispose();
    };
  }, [open, activeTarget?.id, activeTarget?.label, terminalTheme]);

  const targetSelector = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 rounded-lg border border-border bg-secondary/60 px-3 text-foreground hover:bg-secondary"
        >
          <div className="flex items-center gap-2">
            {activeTarget?.icon}
            <span className="max-w-[120px] truncate text-xs font-medium">
              {activeTarget?.label || "Select"}
            </span>
            <ChevronDown className="h-3 w-3" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[220px] rounded-lg border border-border bg-popover/95 text-popover-foreground backdrop-blur-xl"
      >
        <DropdownMenuLabel className="text-muted-foreground">
          Connect to
        </DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            setTargetId("host");
            setStatusMessage(null);
          }}
          className="flex items-center gap-2"
        >
          <Server className="h-4 w-4 text-emerald-300" />
          <span>Homeio Host Shell</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/70" />
        {targets.filter((t) => t.id !== "host").length === 0 && (
          <DropdownMenuItem disabled className="text-muted-foreground">
            No running Docker apps
          </DropdownMenuItem>
        )}
        {targets
          .filter((t) => t.id !== "host")
          .map((target) => (
            <DropdownMenuItem
              key={target.id}
              onSelect={(event) => {
                event.preventDefault();
                setTargetId(target.id);
                setStatusMessage(`Connecting to ${target.label}...`);
              }}
              className="flex items-center gap-2"
            >
              <Container className="h-4 w-4 text-sky-300" />
              <div className="flex flex-col">
                <span>{target.label}</span>
                <span className="text-[11px] text-muted-foreground">
                  docker exec
                </span>
              </div>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`${HOMEIO_DIALOG_SHELL_CLASS} flex flex-col gap-0 scrollbar-hide transition-all`}
        aria-describedby="terminal-description"
      >
        <DialogTitle className="sr-only">Terminal</DialogTitle>
        <DialogDescription id="terminal-description" className="sr-only">
          Interactive terminal for host and running containers.
        </DialogDescription>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className={HOMEIO_DIALOG_CLOSE_BUTTON_CLASS}
        >
          <X className="h-4 w-4" />
        </Button>
        <div
          className={`flex min-w-0 items-start pt-4 pr-14 md:pt-7 md:pr-[84px] xl:pr-[96px] ${HOMEIO_DIALOG_CONTENT_GUTTER_CLASS}`}
        >
          <div className="flex min-w-0 flex-col gap-0.5 px-1">
            <h2 className={HOMEIO_DIALOG_TITLE_CLASS}>
              Terminal
            </h2>
            <p className={HOMEIO_DIALOG_SUBTITLE_CLASS}>
              Interactive shell for host and running containers.
            </p>
          </div>
        </div>
        {/* Terminal Container */}
        <div
          className={`flex min-h-0 flex-1 pb-3 md:pb-5 ${HOMEIO_DIALOG_CONTENT_GUTTER_CLASS}`}
        >
          <div className="relative w-full min-h-0 flex-1">
            <div
              ref={terminalRef}
              className="h-full w-full min-h-0 flex-1 rounded-lg border border-border bg-card/70 p-3 backdrop-blur-xl scrollbar-hide terminal-scrollbar-hide md:p-4"
              style={{ overflow: "hidden" }}
            />
            {!terminalReady && (
              <div className="pointer-events-none absolute inset-0 rounded-lg border border-border/70 bg-card/60 p-4 backdrop-blur-sm">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="absolute bottom-3 right-3 z-20 md:bottom-5 md:right-[28px] xl:right-[40px]">
          {targetSelector}
        </div>
        {statusMessage && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-20 max-w-[min(420px,calc(100%-24px))] rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 shadow-lg backdrop-blur-md dark:text-amber-200 md:bottom-5 md:left-[28px] xl:left-[40px]">
            {statusMessage}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
