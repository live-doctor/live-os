"use client";

import { type FileSystemItem } from "@/app/actions/filesystem";
import { FilesContentSkeleton } from "@/components/file-manager/files-content-skeleton";
import { FolderIcon, getFileIcon } from "@/components/icons/files";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FilePlus, HardDrive, Upload } from "lucide-react";
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
  itemCountLabel: string;
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
  onEmptyUpload?: () => void;
  onEmptyCreateFolder?: () => void;
  selectedPath?: string | null;
}

const formatSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024)
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const formatModifiedLabel = (value: string | number) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
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
  selected: boolean;
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
  selected,
}: FileGridItemProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suppressNextClickRef = useRef(false);
  const openedByMouseDownRef = useRef(false);
  const isRenaming = renameTargetPath === item.path;

  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    // On macOS, Ctrl+Click triggers context menu; ignore it as an open action.
    if (event.ctrlKey || event.button !== 0) return;
    if (isRenaming) return;
    onOpen(item);
  }, [isRenaming, onOpen, item]);

  const openContextForItem = useCallback(
    (event: MouseEvent) => {
      suppressNextClickRef.current = true;
      onContext(event, item);
    },
    [onContext, item],
  );

  const handleMouseDown = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (event.button !== 2) return;
      openedByMouseDownRef.current = true;
      openContextForItem(event);
    },
    [openContextForItem],
  );

  const handleContext = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      if (openedByMouseDownRef.current) {
        openedByMouseDownRef.current = false;
        return;
      }
      openContextForItem(event);
    },
    [openContextForItem],
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
      type="button"
      draggable={!isRenaming && item.type !== "directory"}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onContextMenu={handleContext}
      className={`flex select-none flex-col items-center gap-3 group transition-all ${
        isDragOver && item.type === "directory"
          ? "bg-primary/10 rounded-lg ring-2 ring-primary/30 scale-105"
          : selected
            ? "rounded-lg border border-primary/30 bg-primary/10"
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
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-lg border border-border bg-background/70 backdrop-blur-sm text-[9px] uppercase tracking-wider text-muted-foreground">
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
              className="w-32 rounded-lg border border-border bg-background px-2 py-1 text-sm font-medium text-foreground shadow focus:outline-none"
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
            <div className="text-[11px] text-muted-foreground">
              Press Enter to save, Esc to cancel
            </div>
          </div>
        ) : (
          <>
            <div
              className="text-sm font-medium text-foreground -tracking-[0.01em] truncate"
              onDoubleClick={handleRenameStart}
            >
              {item.displayName || item.name}
            </div>
            <div className="text-xs text-muted-foreground -tracking-[0.01em]">
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
  selected: boolean;
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
  selected,
}: FileListItemProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suppressNextClickRef = useRef(false);
  const openedByMouseDownRef = useRef(false);
  const isRenaming = renameTargetPath === item.path;

  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    // On macOS, Ctrl+Click triggers context menu; ignore it as an open action.
    if (event.ctrlKey || event.button !== 0) return;
    if (isRenaming) return;
    onOpen(item);
  }, [isRenaming, onOpen, item]);
  const openContextForItem = useCallback(
    (event: MouseEvent) => {
      suppressNextClickRef.current = true;
      onContext(event, item);
    },
    [onContext, item],
  );

  const handleMouseDown = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (event.button !== 2) return;
      openedByMouseDownRef.current = true;
      openContextForItem(event);
    },
    [openContextForItem],
  );

  const handleContext = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      if (openedByMouseDownRef.current) {
        openedByMouseDownRef.current = false;
        return;
      }
      openContextForItem(event);
    },
    [openContextForItem],
  );

  const handleRenameStart = useCallback(() => {
    if (onRename) {
      onRename(item);
    }
  }, [item, onRename]);

  const modifiedLabel = useMemo(() => formatModifiedLabel(item.modified), [item.modified]);
  const sizeLabel = useMemo(
    () => (item.type === "directory" ? "-" : formatSize(item.size)),
    [item.type, item.size],
  );
  const typeLabel = useMemo(
    () => (item.type === "directory" ? "Folder" : extLabel || "File"),
    [item.type, extLabel],
  );

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
      type="button"
      draggable={!isRenaming && item.type !== "directory"}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onContextMenu={handleContext}
      className={`w-full select-none rounded-lg transition-colors ${
        isDragOver && item.type === "directory"
          ? "bg-primary/10 ring-2 ring-primary/30"
          : selected
            ? "border border-primary/30 bg-primary/10"
            : "hover:bg-secondary/60"
      }`}
    >
      <div className="flex items-center">
        <div className="flex-[5] p-2.5 whitespace-nowrap overflow-hidden text-ellipsis text-left">
          <div className="flex items-center gap-1.5">
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
                    <span className="absolute bottom-0 -right-2 px-1 py-[2px] text-[7px] font-bold uppercase tracking-[0.12em] text-muted-foreground leading-none">
                      {extLabel}
                    </span>
                  )}
                </div>
              </div>
            )}
            {isRenaming ? (
              <input
                ref={inputRef}
                className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm font-medium text-foreground shadow focus:outline-none"
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
              <span
                className="flex min-w-0 text-[12px] font-medium"
                title={item.displayName || item.name}
                onDoubleClick={handleRenameStart}
              >
                <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {item.displayName || item.name}
                </span>
              </span>
            )}
          </div>
        </div>
        <div className="flex-[2] p-2.5 whitespace-nowrap overflow-hidden text-ellipsis text-[12px] font-medium text-muted-foreground">
          {modifiedLabel}
        </div>
        <div className="flex-1 p-2.5 whitespace-nowrap overflow-hidden text-ellipsis text-[12px] font-medium text-muted-foreground">
          {sizeLabel}
        </div>
        <div className="flex-[2] p-2.5 whitespace-nowrap overflow-hidden text-ellipsis text-[12px] font-medium text-muted-foreground">
          {typeLabel}
        </div>
      </div>
    </button>
  );
});

const ListHeader = memo(function ListHeader() {
  return (
    <div className="flex-none">
      <div className="relative w-full overflow-auto">
        <div className="w-full">
          <div className="border-none">
            <div className="cursor-default transition-colors">
              <div className="flex">
                <button className="flex flex-[5] items-center justify-between overflow-hidden whitespace-nowrap p-2.5 text-[12px] font-medium text-muted-foreground">
                  Name
                </button>
                <button className="flex flex-[2] items-center justify-between overflow-hidden whitespace-nowrap p-2.5 text-[12px] font-medium text-muted-foreground">
                  Modified
                </button>
                <button className="flex flex-1 items-center justify-between overflow-hidden whitespace-nowrap p-2.5 text-[12px] font-medium text-muted-foreground">
                  Size
                </button>
                <button className="flex flex-[2] items-center justify-between overflow-hidden whitespace-nowrap p-2.5 text-[12px] font-medium text-muted-foreground">
                  Type
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export function FilesContent({
  loading,
  viewMode,
  items,
  itemCountLabel,
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
  onEmptyUpload,
  onEmptyCreateFolder,
  selectedPath,
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
    <div className="relative h-full rounded-lg border border-border bg-card/80 p-2 pt-3 md:p-3 md:pt-3 lg:p-4 lg:pt-3">
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        {viewMode === "list" && items.length > 0 && <ListHeader />}
        <ScrollArea className="flex-1">
          <div className="homeio-files-fade-scroller h-full w-full overflow-auto">
            <div className="p-0">
              {loading ? (
                <FilesContentSkeleton viewMode={viewMode} />
              ) : items.length === 0 ? (
                <div className="flex min-h-[320px] items-center justify-center p-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-20">
                      <FolderIcon className="h-full w-full drop-shadow-lg" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      No items in this folder
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={onEmptyUpload}
                        className="h-[34px] rounded-lg bg-primary px-4 text-[14px] font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                        Upload
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={onEmptyCreateFolder}
                        className="h-[34px] rounded-lg border border-border bg-secondary/60 px-4 text-[14px] font-semibold text-foreground hover:bg-secondary"
                      >
                        <FilePlus className="mr-1.5 h-3.5 w-3.5" />
                        Folder
                      </Button>
                    </div>
                  </div>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5 xl:grid-cols-6">
                  {itemsWithMeta.map(({ item, FileIcon, extLabel }) => (
                    <FileGridItem
                      key={item.path}
                      item={item}
                      FileIcon={FileIcon}
                      extLabel={extLabel}
                      selected={selectedPath === item.path}
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
                <div className="divide-y divide-border/40">
                  {itemsWithMeta.map(({ item, FileIcon, extLabel }) => (
                    <FileListItem
                      key={item.path}
                      item={item}
                      FileIcon={FileIcon}
                      extLabel={extLabel}
                      selected={selectedPath === item.path}
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
          </div>
        </ScrollArea>
      </div>
      <span className="absolute bottom-2 right-3 text-[11px] font-medium text-muted-foreground">
        {itemCountLabel}
      </span>
    </div>
  );
}
