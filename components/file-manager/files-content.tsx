"use client";

import { type FileSystemItem } from "@/app/actions/filesystem";
import { FolderIcon, getFileIcon } from "@/components/icons/files";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HardDrive, Loader2 } from "lucide-react";
import {
  type DragEvent,
  memo,
  type MouseEvent,
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from "react";

interface FilesContentProps {
  loading: boolean;
  viewMode: "grid" | "list";
  items: FileSystemItem[];
  onOpenItem: (item: FileSystemItem) => void;
  onContextMenu: (event: MouseEvent, item: FileSystemItem) => void;
  onMoveItem?: (sourcePath: string, targetFolderPath: string) => void;
  onRenameStart?: (item: FileSystemItem) => void;
  renameTargetPath?: string | null;
  renameValue?: string;
  onRenameValueChange?: (value: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
  renaming?: boolean;
}

const formatSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024)
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const getExtensionLabel = (name: string) => {
  if (/^dockerfile$/i.test(name)) return "DOCKER";
  const parts = name.toLowerCase().split(".");
  const ext = parts.length > 1 ? parts.pop() || "" : "";
  if (!ext) return "FILE";
  return ext.toUpperCase().slice(0, 4);
};

// Memoized grid item component to prevent re-renders
interface FileGridItemProps {
  item: FileSystemItem;
  FileIcon: ReturnType<typeof getFileIcon> | undefined;
  extLabel: string | null;
  onOpen: (item: FileSystemItem) => void;
  onContext: (event: MouseEvent, item: FileSystemItem) => void;
  onMoveItem?: (sourcePath: string, targetFolderPath: string) => void;
  onRename?: (item: FileSystemItem) => void;
  renameTargetPath?: string | null;
  renameValue?: string;
  onRenameValueChange?: (value: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
  renaming?: boolean;
}

const FileGridItem = memo(function FileGridItem({
  item,
  FileIcon,
  extLabel,
  onOpen,
  onContext,
  onMoveItem,
  onRename,
  renameTargetPath,
  renameValue,
  onRenameValueChange,
  onRenameSubmit,
  onRenameCancel,
  renaming,
}: FileGridItemProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isRenaming = renameTargetPath === item.path;

  const handleClick = useCallback(() => {
    if (isRenaming) return;
    onOpen(item);
  }, [isRenaming, onOpen, item]);

  const handleContext = useCallback(
    (event: MouseEvent) => onContext(event, item),
    [onContext, item],
  );

  const handleRenameStart = useCallback(() => {
    if (onRename) onRename(item);
  }, [onRename, item]);

  // Drag handlers - make item draggable
  const handleDragStart = useCallback(
    (e: DragEvent) => {
      if (isRenaming) return;
      e.dataTransfer.setData("text/plain", item.path);
      e.dataTransfer.effectAllowed = "move";
    },
    [isRenaming, item.path],
  );

  // Drop handlers - only for directories
  const handleDragOver = useCallback(
    (e: DragEvent) => {
      if (item.type !== "directory") return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    },
    [item.type],
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (item.type !== "directory" || !onMoveItem) return;

      const sourcePath = e.dataTransfer.getData("text/plain");
      if (sourcePath && sourcePath !== item.path) {
        onMoveItem(sourcePath, item.path);
      }
    },
    [item.type, item.path, onMoveItem],
  );

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  return (
    <button
      draggable={!isRenaming}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onDoubleClick={handleClick}
      onContextMenu={handleContext}
      className={`flex flex-col items-center gap-3 group transition-all ${
        isDragOver && item.type === "directory"
          ? "bg-cyan-500/20 rounded-xl ring-2 ring-cyan-500/50 scale-105"
          : ""
      }`}
    >
      {item.type === "directory" ? (
        <div className="w-16 h-14 transition-transform group-hover:scale-105">
          {item.isMount ? (
            <HardDrive className="w-full h-full drop-shadow-lg text-cyan-200" />
          ) : (
            <FolderIcon className="w-full h-full drop-shadow-lg" />
          )}
        </div>
      ) : (
        <div className="w-12 h-14 transition-transform group-hover:scale-105 relative">
          {FileIcon && <FileIcon className="w-full h-full drop-shadow-lg" />}
          {extLabel && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-sm text-[9px] uppercase tracking-wider text-white/70">
              {extLabel}
            </div>
          )}
        </div>
      )}

      <div className="text-center max-w-full">
        {isRenaming ? (
          <div className="flex flex-col items-center gap-1">
            <input
              ref={inputRef}
              className="w-32 rounded-md bg-white/90 text-black px-2 py-1 text-sm font-medium shadow focus:outline-none"
              value={renameValue ?? ""}
              onChange={(e) => onRenameValueChange?.(e.target.value)}
              onBlur={() => onRenameSubmit?.()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onRenameSubmit?.();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  onRenameCancel?.();
                }
              }}
              disabled={renaming}
            />
            <div className="text-[11px] text-white/60">
              Press Enter to save, Esc to cancel
            </div>
          </div>
        ) : (
          <>
            <div
              className="text-sm font-medium text-white/90 -tracking-[0.01em] truncate cursor-text"
              onDoubleClick={handleRenameStart}
            >
              {item.displayName || item.name}
            </div>
            <div className="text-xs text-white/40 -tracking-[0.01em]">
              {item.type === "directory" ? "Folder" : formatSize(item.size)}
            </div>
          </>
        )}
      </div>
    </button>
  );
});

// Memoized list item component to prevent re-renders
interface FileListItemProps {
  item: FileSystemItem;
  FileIcon: ReturnType<typeof getFileIcon> | undefined;
  extLabel: string | null;
  onOpen: (item: FileSystemItem) => void;
  onContext: (event: MouseEvent, item: FileSystemItem) => void;
  onMoveItem?: (sourcePath: string, targetFolderPath: string) => void;
  onRename?: (item: FileSystemItem) => void;
  renameTargetPath?: string | null;
  renameValue?: string;
  onRenameValueChange?: (value: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
  renaming?: boolean;
}

const FileListItem = memo(function FileListItem({
  item,
  FileIcon,
  extLabel,
  onOpen,
  onRename,
  onContext,
  onMoveItem,
  renameTargetPath,
  renameValue,
  onRenameValueChange,
  onRenameSubmit,
  onRenameCancel,
  renaming,
}: FileListItemProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isRenaming = renameTargetPath === item.path;

  const handleClick = useCallback(() => {
    if (isRenaming) return;
    onOpen(item);
  }, [isRenaming, onOpen, item]);
  const handleContext = useCallback(
    (event: MouseEvent) => onContext(event, item),
    [onContext, item],
  );

  const handleRenameStart = useCallback(() => {
    if (onRename) {
      onRename(item);
    }
  }, [item, onRename]);

  // Memoize formatted values
  const formattedInfo = useMemo(() => {
    const date = new Date(item.modified);
    const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    if (item.type === "directory") return `Folder • ${dateStr}`;
    return `${formatSize(item.size)} • ${dateStr}`;
  }, [item.type, item.size, item.modified]);

  // Drag handlers
  const handleDragStart = useCallback(
    (e: DragEvent) => {
      if (isRenaming) return;
      e.dataTransfer.setData("text/plain", item.path);
      e.dataTransfer.effectAllowed = "move";
    },
    [isRenaming, item.path],
  );

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      if (item.type !== "directory") return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    },
    [item.type],
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (item.type !== "directory" || !onMoveItem) return;

      const sourcePath = e.dataTransfer.getData("text/plain");
      if (sourcePath && sourcePath !== item.path) {
        onMoveItem(sourcePath, item.path);
      }
    },
    [item.type, item.path, onMoveItem],
  );

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  return (
    <button
      draggable={!isRenaming}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onContextMenu={handleContext}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
        isDragOver && item.type === "directory"
          ? "bg-cyan-500/10 ring-2 ring-cyan-500/40"
          : "hover:bg-white/5"
      }`}
    >
      {item.type === "directory" ? (
        <div className="w-8 h-7 flex-shrink-0">
          {item.isMount ? (
            <HardDrive className="w-full h-full text-cyan-200" />
          ) : (
            <FolderIcon className="w-full h-full" />
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-7 h-8 flex-shrink-0 relative">
            {FileIcon && <FileIcon className="w-full h-full" />}
            {extLabel && (
              <span className="absolute bottom-0 -right-2 px-1 py-[2px]  text-[7px] font-bold uppercase tracking-[0.12em] text-white/70 leading-none">
                {extLabel}
              </span>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 text-left min-w-0">
        {isRenaming ? (
          <input
            ref={inputRef}
            className="w-full rounded-md bg-white/90 text-black px-2 py-1 text-sm font-medium shadow focus:outline-none"
            value={renameValue ?? ""}
            onChange={(e) => onRenameValueChange?.(e.target.value)}
            onBlur={() => onRenameSubmit?.()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onRenameSubmit?.();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onRenameCancel?.();
              }
            }}
            disabled={renaming}
          />
        ) : (
          <div
            className="text-sm font-medium text-white/90 -tracking-[0.01em] truncate cursor-text"
            onDoubleClick={handleRenameStart}
          >
            {item.displayName || item.name}
          </div>
        )}
      </div>
      <div className="text-xs text-white/50 -tracking-[0.01em] flex-shrink-0">
        {formattedInfo}
      </div>
    </button>
  );
});

export function FilesContent({
  loading,
  viewMode,
  items,
  onOpenItem,
  onContextMenu,
  onMoveItem,
  onRenameStart,
  renameTargetPath,
  renameValue,
  onRenameValueChange,
  onRenameSubmit,
  onRenameCancel,
  renaming,
}: FilesContentProps) {
  // Pre-compute icons and extension labels for all files
  const itemsWithMeta = useMemo(() => {
    return items.map((item) => ({
      item,
      FileIcon: item.type !== "directory" ? getFileIcon(item.name) : undefined,
      extLabel: item.type !== "directory" ? getExtensionLabel(item.name) : null,
    }));
  }, [items]);

  return (
    <ScrollArea className="flex-1">
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-white/40">Empty directory</div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {itemsWithMeta.map(({ item, FileIcon, extLabel }) => (
              <FileGridItem
                key={item.path}
                item={item}
                FileIcon={FileIcon}
                extLabel={extLabel}
                onOpen={onOpenItem}
                onContext={onContextMenu}
                onMoveItem={onMoveItem}
                onRename={onRenameStart}
                renameTargetPath={renameTargetPath}
                renameValue={renameValue}
                onRenameValueChange={onRenameValueChange}
                onRenameSubmit={onRenameSubmit}
                onRenameCancel={onRenameCancel}
                renaming={renaming}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-white/8">
            {itemsWithMeta.map(({ item, FileIcon, extLabel }) => (
              <FileListItem
                key={item.path}
                item={item}
                FileIcon={FileIcon}
                extLabel={extLabel}
                onOpen={onOpenItem}
                onContext={onContextMenu}
                onMoveItem={onMoveItem}
                onRename={onRenameStart}
                renameTargetPath={renameTargetPath}
                renameValue={renameValue}
                onRenameValueChange={onRenameValueChange}
                onRenameSubmit={onRenameSubmit}
                onRenameCancel={onRenameCancel}
                renaming={renaming}
              />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
