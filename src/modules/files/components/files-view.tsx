"use client";

import { FilesDialog } from "@/components/file-manager";

type FilesViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FilesView({ open, onOpenChange }: FilesViewProps) {
  return <FilesDialog open={open} onOpenChange={onOpenChange} />;
}
