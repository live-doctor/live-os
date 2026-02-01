"use client";

import { readFileContent, writeFileContent } from "@/app/actions/filesystem";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { guessLanguage } from "./file-utils";

export function useFileEditor(
  currentPath: string,
  loadDirectory: (path: string) => Promise<void>,
) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorPath, setEditorPath] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [editorOriginalContent, setEditorOriginalContent] = useState("");
  const [editorSaving, setEditorSaving] = useState(false);

  const editorLanguage = useMemo(() => guessLanguage(editorPath), [editorPath]);

  const openFileInEditor = useCallback(async (filePath: string) => {
    try {
      const result = await readFileContent(filePath);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setEditorPath(filePath);
      setEditorContent(result.content);
      setEditorOriginalContent(result.content);
      setEditorOpen(true);
    } catch {
      toast.error("Failed to open file");
    }
  }, []);

  const saveEditor = useCallback(async () => {
    setEditorSaving(true);
    const result = await writeFileContent(editorPath, editorContent);
    setEditorSaving(false);
    if (result.success) {
      toast.success("File saved");
      loadDirectory(currentPath);
      setEditorOriginalContent(editorContent);
      setEditorOpen(false);
    } else {
      toast.error(result.error || "Failed to save file");
    }
  }, [currentPath, editorContent, editorPath, loadDirectory]);

  useEffect(() => {
    if (!editorOpen) return;
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveEditor();
      }
      if (event.key === "Escape") {
        setEditorOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editorOpen, saveEditor]);

  return {
    editorOpen,
    editorPath,
    editorContent,
    editorOriginalContent,
    editorSaving,
    editorLanguage,
    setEditorContent,
    setEditorOriginalContent,
    closeEditor: () => setEditorOpen(false),
    openFileInEditor,
    saveEditor,
  };
}
