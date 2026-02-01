"use client";

import {
  createDirectory,
  createFile,
  emptyTrash,
  moveItems,
  renameItem,
  trashItem,
  type FileSystemItem,
} from "@/app/actions/filesystem";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function useFileOperations(
  currentPath: string,
  trashPath: string,
  loadDirectory: (path: string) => Promise<void>,
  refreshTrashInfo: () => Promise<void>,
) {
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFile, setCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      toast.error("Please enter a folder name");
      return;
    }
    const result = await createDirectory(currentPath, newFolderName);
    if (result.success) {
      toast.success("Folder created successfully");
      setNewFolderName("");
      setCreatingFolder(false);
      loadDirectory(currentPath);
    } else {
      toast.error(result.error || "Failed to create folder");
    }
  }, [currentPath, newFolderName, loadDirectory]);

  const handleCreateFileSubmit = useCallback(async () => {
    if (!newFileName.trim()) {
      toast.error("Please enter a file name");
      return;
    }
    const result = await createFile(currentPath, newFileName);
    if (result.success) {
      toast.success("File created successfully");
      setNewFileName("");
      setCreatingFile(false);
      loadDirectory(currentPath);
    } else {
      toast.error(result.error || "Failed to create file");
    }
  }, [currentPath, newFileName, loadDirectory]);

  const handleDelete = useCallback(
    async (item: FileSystemItem) => {
      if (!confirm(`Move "${item.name}" to Trash?`)) return;
      const result = await trashItem(item.path);
      if (result.success) {
        toast.success("Item moved to Trash");
        loadDirectory(currentPath);
      } else {
        toast.error(result.error || "Failed to move item to Trash");
      }
    },
    [currentPath, loadDirectory],
  );

  const handleRename = useCallback(
    async (item: FileSystemItem) => {
      const newName = prompt(`Rename "${item.name}" to:`, item.name);
      if (!newName || newName === item.name) return;
      const result = await renameItem(item.path, newName);
      if (result.success) {
        toast.success("Item renamed successfully");
        loadDirectory(currentPath);
      } else {
        toast.error(result.error || "Failed to rename item");
      }
    },
    [currentPath, loadDirectory],
  );

  const handleMoveItem = useCallback(
    async (sourcePath: string, targetFolderPath: string) => {
      const result = await moveItems([sourcePath], targetFolderPath);
      if (result.success) {
        toast.success("Item moved successfully");
        loadDirectory(currentPath);
      } else {
        toast.error(result.error || "Failed to move item");
      }
    },
    [currentPath, loadDirectory],
  );

  const handleEmptyTrash = useCallback(async () => {
    if (
      !confirm(
        "Permanently delete all items in Trash? This cannot be undone.",
      )
    )
      return;
    const result = await emptyTrash();
    if (result.success) {
      toast.success(`Deleted ${result.deletedCount} item(s) from Trash`);
      refreshTrashInfo();
      if (currentPath === trashPath) loadDirectory(currentPath);
    } else {
      toast.error(result.error || "Failed to empty trash");
    }
  }, [currentPath, trashPath, loadDirectory, refreshTrashInfo]);

  const toggleFolderCreation = useCallback(() => {
    setCreatingFolder((prev) => {
      const next = !prev;
      if (next) {
        setCreatingFile(false);
        setNewFileName("");
      }
      return next;
    });
  }, []);

  const toggleFileCreation = useCallback(() => {
    setCreatingFile((prev) => {
      const next = !prev;
      if (next) {
        setCreatingFolder(false);
        setNewFolderName("");
      }
      return next;
    });
  }, []);

  const startFileCreation = useCallback(() => {
    setCreatingFolder(false);
    setNewFileName("");
    setCreatingFile(true);
  }, []);

  const cancelFolderCreation = useCallback(() => {
    setCreatingFolder(false);
    setNewFolderName("");
  }, []);

  const cancelFileCreation = useCallback(() => {
    setCreatingFile(false);
    setNewFileName("");
  }, []);

  return {
    creatingFolder,
    newFolderName,
    creatingFile,
    newFileName,
    setNewFolderName,
    setNewFileName,
    createFolder: handleCreateFolder,
    createFile: handleCreateFileSubmit,
    deleteItem: handleDelete,
    renameItem: handleRename,
    moveItem: handleMoveItem,
    emptyTrash: handleEmptyTrash,
    toggleFolderCreation,
    toggleFileCreation,
    startFileCreation,
    cancelFolderCreation,
    cancelFileCreation,
  };
}
