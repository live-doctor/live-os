"use client";

import type { FileSystemItem } from "@/app/actions/filesystem";

interface ContextMenuHeaderProps {
  item: FileSystemItem;
}

export function ContextMenuHeader({ item }: ContextMenuHeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/70">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  item.type === "directory" ? "bg-cyan-400" : "bg-amber-400"
                }`}
              />
              {item.type === "directory" ? "Folder" : "File"}
            </span>
            <span
              className="text-[11px] text-white/40 truncate"
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
