"use client";

import { Button } from "@/components/ui/button";
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
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
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

    let term: Terminal | null = null;
    let fitAddon: FitAddon | null = null;
    let webLinksAddon: WebLinksAddon | null = null;
    let ws: WebSocket | null = null;
    let resizeHandler: (() => void) | null = null;
    let rafId: number | null = null;

    // Dynamically import and initialize xterm to avoid SSR issues
    const initTerminal = async () => {
      const container = terminalRef.current;
      if (!container) {
        rafId = requestAnimationFrame(initTerminal);
        return;
      }

      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("xterm-addon-fit");
      const { WebLinksAddon } = await import("xterm-addon-web-links");

      // Initialize xterm.js
      term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: "#000000",
          foreground: "#00ff00",
          cursor: "#00ff00",
          cursorAccent: "#000000",
          black: "#000000",
          red: "#ff5555",
          green: "#50fa7b",
          yellow: "#f1fa8c",
          blue: "#bd93f9",
          magenta: "#ff79c6",
          cyan: "#8be9fd",
          white: "#bfbfbf",
          brightBlack: "#4d4d4d",
          brightRed: "#ff6e67",
          brightGreen: "#5af78e",
          brightYellow: "#f4f99d",
          brightBlue: "#caa9fa",
          brightMagenta: "#ff92d0",
          brightCyan: "#9aedfe",
          brightWhite: "#e6e6e6",
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

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      // Connect to WebSocket
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${window.location.host}/api/terminal`);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatusMessage(null);
        term?.writeln("\x1b[1;32mConnected to server terminal\x1b[0m");
        if (activeTarget?.id && activeTarget.id !== "host") {
          term?.writeln(
            `\x1b[1;34mAttaching to ${activeTarget.label} (docker exec -it ${activeTarget.id})\x1b[0m`,
          );
          ws!.send(`docker exec -it ${activeTarget.id} /bin/sh\n`);
        }
        term?.writeln("");
      };

      ws.onmessage = (event) => {
        if (
          typeof event.data === "string" &&
          event.data.includes("Terminal unavailable")
        ) {
          setStatusMessage(event.data.toString());
        }
        term?.write(event.data);
      };

      ws.onerror = () => {
        setStatusMessage(
          "Connection error. Ensure node-pty is installed on the server.",
        );
        term?.writeln("\x1b[1;31mConnection error\x1b[0m");
      };

      ws.onclose = () => {
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
          className="h-10 rounded-full border border-white/15 bg-white/10 px-3 text-white/80 hover:bg-white/15 hover:text-white"
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
        className="min-w-[220px] border-white/10 bg-white/10 text-white backdrop-blur-xl"
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
        className="max-h-[92vh] max-w-[95vw] flex flex-col gap-0 overflow-hidden rounded-[20px] border border-white/10 bg-[rgba(47,51,57,0.72)] p-0 text-white shadow-[0_28px_80px_rgba(0,0,0,0.48)] backdrop-blur-3xl scrollbar-hide transition-all sm:max-w-[1280px]"
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
          className="absolute right-5 top-5 z-20 h-8 w-8 cursor-pointer rounded-full border border-white/15 bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="flex min-w-0 items-start justify-between gap-3 pl-3 pr-14 pt-4 md:pl-[28px] md:pr-[84px] md:pt-7 xl:pl-[40px] xl:pr-[96px]">
          <div className="flex min-w-0 flex-col gap-0.5 px-1">
            <h2 className="text-[20px] font-bold leading-none tracking-[-0.03em] text-white/80 md:text-[32px]">
              Terminal
            </h2>
          </div>
          <div className="hidden shrink-0 md:block">
            {targetSelector}
          </div>
        </div>
        <div className="px-3 pb-3 md:hidden">{targetSelector}</div>

        {/* Terminal Container */}
        <div className="flex min-h-0 flex-1 px-3 pb-3 md:px-[28px] md:pb-5 xl:px-[40px]">
          <div
            ref={terminalRef}
            className="w-full min-h-0 flex-1 rounded-[12px] border border-white/10 bg-black/70 p-3 backdrop-blur-xl scrollbar-hide terminal-scrollbar-hide md:p-4"
            style={{ overflow: "hidden" }}
          />
        </div>
        {statusMessage && (
          <div className="mx-3 mb-3 rounded-md border border-amber-700/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-300 md:mx-[28px] xl:mx-[40px]">
            {statusMessage}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
