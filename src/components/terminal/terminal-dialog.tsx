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
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { ChevronDown, Container, Server, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Terminal } from "xterm";
import type { FitAddon } from "xterm-addon-fit";
import type { WebLinksAddon } from "xterm-addon-web-links";

interface TerminalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TerminalDialog({ open, onOpenChange }: TerminalDialogProps) {
  const { installedApps } = useSystemStatus({ fast: true });
  const terminalRef = useRef<HTMLDivElement>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string>("host");

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
    if (!open) return;

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
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontWeight: 400,
        allowTransparency: true,
        letterSpacing: 0.1,
        theme: {
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
        },
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
      if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
      }
      ws?.close();
      term?.dispose();
    };
  }, [open, activeTarget?.id, activeTarget?.label]);

  const targetSelector = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 rounded-[10px] border border-white/8 bg-white/8 px-3 text-white/75 hover:border-white/12 hover:bg-white/12 hover:text-white"
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
        className="min-w-[220px] rounded-[12px] border border-white/10 bg-[rgba(35,40,54,0.88)] text-white backdrop-blur-xl"
      >
        <DropdownMenuLabel className="text-white/80">Connect to</DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            setTargetId("host");
            setStatusMessage(null);
          }}
          className="flex items-center gap-2 text-white/90"
        >
          <Server className="h-4 w-4 text-emerald-300" />
          <span>Homeio Host Shell</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        {targets.filter((t) => t.id !== "host").length === 0 && (
          <DropdownMenuItem disabled className="text-white/50">
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
              className="flex items-center gap-2 text-white/90"
            >
              <Container className="h-4 w-4 text-sky-300" />
              <div className="flex flex-col">
                <span>{target.label}</span>
                <span className="text-[11px] text-white/60">docker exec</span>
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
          <div
            ref={terminalRef}
            className="w-full min-h-0 flex-1 rounded-[14px] border border-white/10 bg-[linear-gradient(160deg,rgba(13,17,31,0.9),rgba(9,13,25,0.88))] p-3 backdrop-blur-xl scrollbar-hide terminal-scrollbar-hide md:p-4"
            style={{ overflow: "hidden" }}
          />
        </div>
        <div className="absolute bottom-3 right-3 z-20 md:bottom-5 md:right-[28px] xl:right-[40px]">
          {targetSelector}
        </div>
        {statusMessage && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-20 max-w-[min(420px,calc(100%-24px))] rounded-[10px] border border-amber-600/35 bg-amber-950/70 px-3 py-2 text-xs text-amber-100 shadow-lg backdrop-blur-md md:bottom-5 md:left-[28px] xl:left-[40px]">
            {statusMessage}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
