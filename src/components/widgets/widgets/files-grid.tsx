"use client";

import { FolderIcon } from "@/components/icons/files";
import { FAVORITES_WIDGET_MAX_FOLDERS } from "@/components/widgets/constants";
import { text } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";
import type { FilesGridData } from "../types";

interface FilesGridProps {
  data: FilesGridData;
}

export function FilesGridWidget({ data }: FilesGridProps) {
  const { folders, title = "Favorites" } = data;
  const displayFolders = folders.slice(0, FAVORITES_WIDGET_MAX_FOLDERS);

  return (
    <div className="flex flex-col h-full p-3">
      <h3 className={cn(text.label, "uppercase tracking-wider mb-2")}>
        {title}
      </h3>

      <div className="grid grid-cols-2 grid-rows-2 content-start gap-2.5 flex-1">
        {displayFolders.map((folder) => (
          <div
            key={folder.id}
            className="flex flex-col items-center justify-center gap-1.5"
          >
            <div
              className={cn(
                "flex h-10 w-12 items-center justify-center rounded-md",
                "bg-white/[0.06] hover:bg-white/[0.12] transition-colors cursor-pointer",
              )}
            >
              <FolderIcon className="w-full h-full drop-shadow" />
            </div>
            <span className={cn(text.muted, "truncate max-w-full text-center text-xs")}>
              {folder.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
