"use client";

import type { FileSystemItem } from "@/app/actions/filesystem";

interface ContextMenuHeaderProps {
  item: FileSystemItem;
}

export function ContextMenuHeader({ item }: ContextMenuHeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-border bg-secondary/40 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  item.type === "directory" ? "bg-cyan-400" : "bg-amber-400"
                }`}
              />
              {item.type === "directory" ? "Folder" : "File"}
            </span>
            <span
              className="text-[11px] text-muted-foreground truncate"
              title={item.path}
            >
              {item.path}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
