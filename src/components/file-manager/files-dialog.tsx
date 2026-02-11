"use client";

import type { FileSystemItem } from "@/app/actions/filesystem";
import { trashItem } from "@/app/actions/filesystem";
import {
  FileClipboardProvider,
  FilesContextMenu,
  useFileClipboard,
} from "@/components/file-manager/context-menu";
import { FileCreationRow } from "@/components/file-manager/file-creation-row";
import { FileEditorModal } from "@/components/file-manager/file-editor-modal";
import { FileUploadZone } from "@/components/file-manager/file-upload-zone";
import {
  FileViewer,
  getViewerType,
} from "@/components/file-manager/file-viewer";
import { FilesContent } from "@/components/file-manager/files-content";
import { FilesSidebar } from "@/components/file-manager/files-sidebar";
import { FilesToolbar } from "@/components/file-manager/files-toolbar";
import { NetworkStorageDialog } from "@/components/file-manager/network-storage";
import { SmbShareDialog } from "@/components/file-manager/smb-share-dialog";
import { useFilesDialog } from "@/components/file-manager/use-files-dialog";
import { Button } from "@/components/ui/button";
import { button, dialog as dialogTokens } from "@/components/ui/design-tokens";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HOMEIO_DIALOG_SHELL_CLASS,
  HOMEIO_DIALOG_SUBTITLE_CLASS,
  HOMEIO_DIALOG_TITLE_CLASS,
} from "@/components/ui/dialog-chrome";
import { Loader2, Trash2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";

type InteractOutsideEvent = {
  target: EventTarget | null;
  detail?: { originalEvent?: Event };
  preventDefault: () => void;
};

interface FilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FilesDialogContent({ open, onOpenChange }: FilesDialogProps) {
  const {
    homePath,
    currentPath,
    viewMode,
    content,
    loading,
    showHidden,
    creatingFolder,
    newFolderName,
    creatingFile,
    newFileName,
    historyIndex,
    historyLength,
    shortcuts,
    favorites,
    trashPath,
    trashItemCount,
    filteredItems,
    breadcrumbs,
    contextMenu,
    contextMenuRef,
    editorOpen,
    editorPath,
    editorContent,
    editorOriginalContent,
    editorSaving,
    editorLanguage,
    setViewMode,
    setShowHidden,
    setNewFolderName,
    setNewFileName,
    setEditorContent,
    closeEditor,
    navigate,
    goToParent,
    back,
    forward,
    openItem,
    openContextMenu,
    openFileInEditor,
    saveEditor,
    createFolder,
    createFile,
    renameItem,
    moveItem,
    toggleFolderCreation,
    toggleFileCreation,
    cancelFolderCreation,
    cancelFileCreation,
    shortcutPath,
    toDirectoryItem,
    closeContextMenu,
    refresh,
    emptyTrash,
  } = useFilesDialog(open);

  const { clipboard, cut, copy, clear: clearClipboard } = useFileClipboard();
  const [networkDialogOpen, setNetworkDialogOpen] = useState(false);
  const [smbShareDialogOpen, setSmbShareDialogOpen] = useState(false);
  const [shareTargetItem, setShareTargetItem] = useState<FileSystemItem | null>(
    null,
  );
  const [viewerItem, setViewerItem] = useState<FileSystemItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const [trashTarget, setTrashTarget] = useState<FileSystemItem | null>(null);
  const [trashing, setTrashing] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileSystemItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const portalAnchorRef = useCallback((node: HTMLDivElement | null) => {
    setPortalContainer(node);
  }, []);
  const selectedItem = contextMenu.item;

  const isDirty = editorContent !== editorOriginalContent;

  // Handle upload button click
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file selection from input
  const handleFileSelect = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const formData = new FormData();
      formData.append("targetDir", currentPath);
      Array.from(files).forEach((file) => formData.append("files", file));

      try {
        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });
        const result = await response.json();

        if (result.success) {
          toast.success(result.message);
          refresh();
        } else {
          toast.error(result.error || "Upload failed");
        }
      } catch {
        toast.error("Upload failed - network error");
      }

      // Reset input
      e.target.value = "";
    },
    [currentPath, refresh],
  );

  // Handle opening files - check if viewable first
  const handleOpenItem = useCallback(
    (item: FileSystemItem) => {
      const isImage =
        item.type === "file" && getViewerType(item.name) === "image";
      if (isImage) {
        setViewerItem(item);
      } else {
        openItem(item);
      }
    },
    [openItem],
  );

  // Handle SMB share dialog
  const handleShareNetwork = useCallback((item: FileSystemItem) => {
    setShareTargetItem(item);
    setSmbShareDialogOpen(true);
  }, []);

  // Handle rename lifecycle
  const handleRename = useCallback((item: FileSystemItem) => {
    setRenameTarget(item);
    setRenameValue(item.name);
  }, []);

  const handleRenameSubmit = useCallback(async () => {
    if (!renameTarget) return;
    const next = renameValue.trim();
    if (!next || next === renameTarget.name) {
      setRenameTarget(null);
      return;
    }
    setRenaming(true);
    await renameItem(renameTarget, next);
    setRenaming(false);
    setRenameTarget(null);
  }, [renameItem, renameTarget, renameValue]);

  const handleRenameCancel = useCallback(() => {
    if (renaming) return;
    setRenameTarget(null);
    setRenameValue("");
  }, [renaming]);

  // Keyboard shortcuts for clipboard operations
  useEffect(() => {
    if (!open || editorOpen) return;

    const handleKeyDown = async (event: KeyboardEvent) => {
      const isMeta = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const target = contextMenu.item || selectedItem;

      // Cut: Cmd+X
      if (isMeta && key === "x" && target) {
        event.preventDefault();
        cut([target]);
        toast.success("Item ready to move");
        return;
      }

      // Copy: Cmd+C
      if (isMeta && key === "c" && target) {
        event.preventDefault();
        copy([target]);
        toast.success("Item copied to clipboard");
        return;
      }

      // Paste: Cmd+V
      if (isMeta && key === "v" && clipboard.items.length > 0) {
        event.preventDefault();
        // Paste handled by context menu actions hook
        return;
      }

      // Trash: Cmd+Backspace
      if (isMeta && event.key === "Backspace" && target) {
        event.preventDefault();
        setTrashTarget(target);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    open,
    editorOpen,
    contextMenu.item,
    selectedItem,
    clipboard,
    cut,
    copy,
    refresh,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={HOMEIO_DIALOG_SHELL_CLASS}
        aria-describedby="files-description"
        onInteractOutside={(event: InteractOutsideEvent) => {
          const originalTarget = (event.detail?.originalEvent?.target ||
            event.target) as Node | null;
          const target = originalTarget ?? null;
          if (target && contextMenuRef.current?.contains(target)) {
            event.preventDefault();
          }
        }}
      >
        <div ref={portalAnchorRef} className="relative h-[92vh] w-full">
          <DialogTitle className="sr-only">Files</DialogTitle>
          <DialogDescription id="files-description" className="sr-only">
            File manager for browsing and managing files.
          </DialogDescription>

          <div className="flex h-full flex-col gap-3 p-3 md:gap-4 md:p-4">
            <div className="flex items-start justify-between gap-3 px-1">
              <div className="min-w-0">
                <h2 className={HOMEIO_DIALOG_TITLE_CLASS}>Files</h2>
                <p className={HOMEIO_DIALOG_SUBTITLE_CLASS}>
                  Search, browse, and manage your files.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className={button.closeIcon}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <FilesToolbar
              showTitle={false}
              breadcrumbs={breadcrumbs}
              historyIndex={historyIndex}
              historyLength={historyLength}
              loading={loading}
              showHidden={showHidden}
              viewMode={viewMode}
              canGoToParent={Boolean(content?.parent)}
              isTrashView={currentPath === trashPath}
              trashItemCount={trashItemCount}
              onNavigate={navigate}
              onBreadcrumbContextMenu={(event, path, label) =>
                openContextMenu(event, toDirectoryItem(path, label))
              }
              onBack={back}
              onForward={forward}
              onGoToParent={goToParent}
              onToggleHidden={setShowHidden}
              onSetViewMode={setViewMode}
              onToggleCreateFolder={toggleFolderCreation}
              onToggleCreateFile={toggleFileCreation}
              onUpload={handleUploadClick}
              onEmptyTrash={emptyTrash}
            />

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="hidden min-h-0 rounded-lg border border-border bg-secondary/30 p-2 lg:block">
                <FilesSidebar
                  homePath={homePath}
                  shortcuts={shortcuts}
                  favorites={favorites}
                  trashPath={trashPath}
                  trashItemCount={trashItemCount}
                  currentPath={currentPath}
                  onNavigate={navigate}
                  getShortcutPath={shortcutPath}
                  onOpenNetwork={() => setNetworkDialogOpen(true)}
                />
              </div>

              <div className="flex min-h-0 flex-col rounded-lg border border-border bg-secondary/20 p-2 ">
                {/* Hidden file input for upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {creatingFolder && (
                  <FileCreationRow
                    label="Folder"
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={setNewFolderName}
                    onSubmit={createFolder}
                    onCancel={cancelFolderCreation}
                  />
                )}

                {creatingFile && (
                  <FileCreationRow
                    label="File"
                    placeholder="File name"
                    value={newFileName}
                    onChange={setNewFileName}
                    onSubmit={createFile}
                    onCancel={cancelFileCreation}
                  />
                )}

                <FileUploadZone
                  targetDir={currentPath}
                  onUploadComplete={refresh}
                >
                  <FilesContent
                    loading={loading}
                    viewMode={viewMode}
                    items={filteredItems}
                    selectedPath={contextMenu.item?.path ?? null}
                    itemCountLabel={`${filteredItems.length} items${
                      showHidden
                        ? ` (${content?.items.length ?? filteredItems.length} total)`
                        : ""
                    }`}
                    onOpenItem={handleOpenItem}
                    onContextMenu={openContextMenu}
                    onMoveItem={moveItem}
                    onRenameStart={handleRename}
                    renameTargetPath={renameTarget?.path ?? null}
                    renameValue={renameValue}
                    onRenameValueChange={setRenameValue}
                    onRenameSubmit={handleRenameSubmit}
                    onRenameCancel={handleRenameCancel}
                    renaming={renaming}
                    onEmptyUpload={handleUploadClick}
                    onEmptyCreateFolder={toggleFolderCreation}
                  />
                </FileUploadZone>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      <FileEditorModal
        open={editorOpen}
        path={editorPath}
        content={editorContent}
        language={editorLanguage}
        saving={editorSaving}
        isDirty={isDirty}
        onClose={closeEditor}
        onChangeContent={setEditorContent}
        onSave={saveEditor}
      />

      <NetworkStorageDialog
        open={networkDialogOpen}
        onOpenChange={setNetworkDialogOpen}
      />

      <SmbShareDialog
        open={smbShareDialogOpen}
        onOpenChange={setSmbShareDialogOpen}
        targetPath={shareTargetItem?.path || ""}
        targetName={shareTargetItem?.name || ""}
      />

      {viewerItem && (
        <FileViewer
          item={viewerItem}
          onClose={() => setViewerItem(null)}
          allItems={filteredItems}
          onNavigate={setViewerItem}
        />
      )}

      <FilesContextMenu
        contextMenu={contextMenu}
        menuRef={contextMenuRef}
        portalContainer={portalContainer}
        currentPath={currentPath}
        clipboard={clipboard}
        favorites={favorites}
        onCut={cut}
        onCopy={copy}
        onClearClipboard={clearClipboard}
        onRefresh={refresh}
        onOpen={handleOpenItem}
        onOpenInEditor={openFileInEditor}
        onPreview={(item) => setViewerItem(item)}
        onRename={handleRename}
        onShareNetwork={handleShareNetwork}
        onConfirmTrash={(item) => setTrashTarget(item)}
        onClose={closeContextMenu}
      />

      {/* Trash confirmation dialog */}
      <Dialog
        open={!!trashTarget}
        onOpenChange={(next) => {
          if (!next && !trashing) setTrashTarget(null);
        }}
      >
        <DialogContent
          className={`${dialogTokens.content} ${dialogTokens.size.sm}`}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-400" />
              Move to trash?
            </DialogTitle>
            <DialogDescription>
              {trashTarget
                ? `“${trashTarget.name}” will be moved to trash. You can restore it later.`
                : "Selected item will be moved to trash."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setTrashTarget(null)}
              disabled={trashing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!trashTarget) return;
                setTrashing(true);
                const result = await trashItem(trashTarget.path);
                if (result.success) {
                  toast.success("Item moved to trash");
                  refresh();
                } else {
                  toast.error(result.error || "Failed to move item to trash");
                }
                setTrashing(false);
                setTrashTarget(null);
              }}
              disabled={trashing}
            >
              {trashing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Move to trash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

export function FilesDialog(props: FilesDialogProps) {
  return (
    <FileClipboardProvider>
      <FilesDialogContent {...props} />
    </FileClipboardProvider>
  );
}
