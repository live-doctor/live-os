"use client";

import {
  getDefaultDirectories,
  getTrashInfo,
  readDirectory,
  type DefaultDirectory,
  type DirectoryContent,
  type FileSystemItem,
} from "@/app/actions/filesystem";
import { getFavorites } from "@/app/actions/favorites";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_ROOT, isTextLike, toDirectoryItem } from "./file-utils";
import { useFileEditor } from "./use-file-editor";
import { useFileNavigation } from "./use-file-navigation";
import { useFileOperations } from "./use-file-operations";

export interface ContextMenuState {
  x: number;
  y: number;
  item: FileSystemItem | null;
}

export function useFilesDialog(open: boolean) {
  const [homePath, setHomePath] = useState(DEFAULT_ROOT);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [content, setContent] = useState<DirectoryContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [shortcuts, setShortcuts] = useState<DefaultDirectory[]>([]);
  const [ready, setReady] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [trashPath, setTrashPath] = useState("");
  const [trashItemCount, setTrashItemCount] = useState(0);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    item: null,
  });
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  // Sub-hooks
  const nav = useFileNavigation(homePath);

  const loadDirectory = useCallback(
    async (path: string) => {
      setLoading(true);
      try {
        const result = await readDirectory(path);
        setContent(result);
        nav.setCurrentPath(result.currentPath);
      } catch (error) {
        toast.error((error as Error).message || "Failed to load directory");
      } finally {
        setLoading(false);
      }
    },
    [nav.setCurrentPath],
  );

  const editor = useFileEditor(nav.currentPath, loadDirectory);

  const refreshTrashInfo = useCallback(async () => {
    try {
      const result = await getTrashInfo();
      setTrashPath(result.path);
      setTrashItemCount(result.itemCount);
    } catch {
      // Silently fail
    }
  }, []);

  const ops = useFileOperations(nav.currentPath, trashPath, loadDirectory, refreshTrashInfo);

  // Load directory when path or open state changes
  useEffect(() => {
    if (open && ready) loadDirectory(nav.currentPath);
  }, [open, nav.currentPath, ready, loadDirectory]);

  useEffect(() => {
    if (!open) setReady(false);
  }, [open]);

  // Bootstrap: load defaults on open
  useEffect(() => {
    if (!open) return;
    const loadDefaults = async () => {
      try {
        const [dirResult, favResult, trashResult] = await Promise.all([
          getDefaultDirectories(),
          getFavorites(),
          getTrashInfo(),
        ]);
        const normalizedHome = dirResult.home || DEFAULT_ROOT;
        setHomePath(normalizedHome);
        setShortcuts(dirResult.directories);
        setFavorites(favResult.favorites);
        setTrashPath(trashResult.path);
        setTrashItemCount(trashResult.itemCount);
        nav.resetHistory(normalizedHome);
        setReady(true);
      } catch {
        toast.error("Failed to load default directories");
      }
    };
    loadDefaults();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Context menu outside click / escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        setContextMenu((prev) => ({ ...prev, item: null }));
      }
    };
    const handleKeyClose = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu((prev) => ({ ...prev, item: null }));
      }
    };
    window.addEventListener("click", handleClickOutside);
    window.addEventListener("keydown", handleKeyClose);
    return () => {
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("keydown", handleKeyClose);
    };
  }, []);

  const handleItemOpen = useCallback(
    (item: FileSystemItem) => {
      if (item.type === "directory") {
        nav.navigate(item.path);
        return;
      }
      if (isTextLike(item.name)) {
        editor.openFileInEditor(item.path);
        return;
      }
      nav.openNative(item.path);
    },
    [nav, editor],
  );

  const shortcutPath = useCallback(
    (name: string) => {
      const match = shortcuts.find(
        (dir) => dir.name.toLowerCase() === name.toLowerCase(),
      );
      if (match) return match.path;
      const trimmedHome = homePath.endsWith("/")
        ? homePath.slice(0, -1)
        : homePath;
      return `${trimmedHome}/${name}`;
    },
    [shortcuts, homePath],
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent, item: FileSystemItem) => {
      event.preventDefault();
      const menuWidth = 240;
      const menuHeight = 260;
      const posX = Math.min(
        Math.max(event.clientX, 8),
        window.innerWidth - menuWidth - 8,
      );
      const posY = Math.min(
        Math.max(event.clientY, 8),
        window.innerHeight - menuHeight - 8,
      );
      setContextMenu({ x: posX, y: posY, item });
    },
    [],
  );

  const handleShare = useCallback(async (item: FileSystemItem) => {
    try {
      await navigator.clipboard.writeText(item.path);
      toast.success("Path copied to clipboard");
    } catch {
      toast.error("Failed to copy path");
    }
  }, []);

  const showInfo = useCallback((item: FileSystemItem) => {
    toast.info(
      `${item.type === "directory" ? "Folder" : "File"} • ${item.path}`,
    );
  }, []);

  const refreshFavorites = useCallback(async () => {
    try {
      const result = await getFavorites();
      setFavorites(result.favorites);
    } catch {
      // Silently fail
    }
  }, []);

  const refresh = useCallback(() => {
    loadDirectory(nav.currentPath);
    refreshFavorites();
    refreshTrashInfo();
  }, [nav.currentPath, loadDirectory, refreshFavorites, refreshTrashInfo]);

  const filteredItems = useMemo(
    () => content?.items.filter((item) => showHidden || !item.isHidden) || [],
    [content?.items, showHidden],
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, item: null }));
  }, []);

  return {
    // state
    homePath,
    currentPath: nav.currentPath,
    viewMode,
    content,
    loading,
    openingNative: nav.openingNative,
    showHidden,
    creatingFolder: ops.creatingFolder,
    newFolderName: ops.newFolderName,
    creatingFile: ops.creatingFile,
    newFileName: ops.newFileName,
    historyIndex: nav.historyIndex,
    historyLength: nav.historyLength,
    shortcuts,
    favorites,
    trashPath,
    trashItemCount,
    filteredItems,
    breadcrumbs: nav.breadcrumbs,
    contextMenu,
    contextMenuRef,
    editorOpen: editor.editorOpen,
    editorPath: editor.editorPath,
    editorContent: editor.editorContent,
    editorOriginalContent: editor.editorOriginalContent,
    editorSaving: editor.editorSaving,
    editorLanguage: editor.editorLanguage,
    // actions
    setViewMode,
    setShowHidden,
    setNewFolderName: ops.setNewFolderName,
    setNewFileName: ops.setNewFileName,
    setEditorContent: editor.setEditorContent,
    setEditorOriginalContent: editor.setEditorOriginalContent,
    closeEditor: editor.closeEditor,
    navigate: nav.navigate,
    goToParent: () => nav.goToParent(content),
    back: nav.back,
    forward: nav.forward,
    openNative: nav.openNative,
    openItem: handleItemOpen,
    openContextMenu: handleContextMenu,
    share: handleShare,
    info: showInfo,
    openFileInEditor: editor.openFileInEditor,
    saveEditor: editor.saveEditor,
    createFolder: ops.createFolder,
    createFile: ops.createFile,
    deleteItem: ops.deleteItem,
    renameItem: ops.renameItem,
    moveItem: ops.moveItem,
    startFileCreation: ops.startFileCreation,
    toggleFolderCreation: ops.toggleFolderCreation,
    toggleFileCreation: ops.toggleFileCreation,
    cancelFolderCreation: ops.cancelFolderCreation,
    cancelFileCreation: ops.cancelFileCreation,
    shortcutPath,
    toDirectoryItem,
    closeContextMenu,
    isTextLike,
    refresh,
    refreshFavorites,
    emptyTrash: ops.emptyTrash,
  };
}
