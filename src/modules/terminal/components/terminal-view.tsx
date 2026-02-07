"use client";

import { TerminalDialog } from "@/components/terminal/terminal-dialog";

type TerminalViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TerminalView({ open, onOpenChange }: TerminalViewProps) {
  return <TerminalDialog open={open} onOpenChange={onOpenChange} />;
}
