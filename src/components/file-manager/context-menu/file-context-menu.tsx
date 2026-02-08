"use client";

import type { FileSystemItem } from "@/app/actions/filesystem";
import { type RefObject, useMemo } from "react";
import { createPortal } from "react-dom";
import { HOMEIO_CONTEXT_MENU_SURFACE_CLASS } from "@/components/ui/dialog-chrome";
import { menuSections } from "./constants";
import { ContextMenuItem } from "./context-menu-item";
import { ContextMenuSeparator } from "./context-menu-separator";
import type {
  ClipboardState,
  ContextMenuAction,
  ContextMenuSectionConfig,
} from "./types";
import { useContextMenuActions } from "./use-context-menu-actions";

interface ContextMenuState {
  x: number;
  y: number;
  item: FileSystemItem | null;
}

interface FilesContextMenuProps {
  contextMenu: ContextMenuState;
  menuRef: RefObject<HTMLDivElement | null>;
  portalContainer?: HTMLElement | null;
  currentPath: string;
  clipboard: ClipboardState;
  favorites: string[];
  onCut: (items: FileSystemItem[]) => void;
  onCopy: (items: FileSystemItem[]) => void;
  onClearClipboard: () => void;
  onRefresh: () => void;
  onOpen: (item: FileSystemItem) => void;
  onPreview?: (item: FileSystemItem) => void;
  onOpenInEditor: (path: string) => void;
  onRename: (item: FileSystemItem) => void;
  onShareNetwork: (item: FileSystemItem) => void;
  onConfirmTrash?: (item: FileSystemItem) => void;
  onClose: () => void;
}

export function FilesContextMenu({
  contextMenu,
  menuRef,
  portalContainer,
  currentPath,
  clipboard,
  favorites,
  onCut,
  onCopy,
  onClearClipboard,
  onRefresh,
  onOpen,
  onPreview,
  onOpenInEditor,
  onRename,
  onShareNetwork,
  onConfirmTrash,
  onClose,
}: FilesContextMenuProps) {
  const { handleAction } = useContextMenuActions({
    currentPath,
    clipboard,
    onCut,
    onCopy,
    onClearClipboard,
    onRefresh,
    onOpen,
    onPreview,
    onOpenInEditor,
    onRename,
    onShareNetwork,
    onConfirmTrash,
    onClose,
  });

  const item = contextMenu.item;
  const isFavorite = item ? favorites.includes(item.path) : false;

  // Filter sections based on conditions
  const visibleSections = useMemo(() => {
    if (!item) return [];

    return menuSections
      .map((section: ContextMenuSectionConfig) => ({
        ...section,
        items: section.items
          .filter((menuItem) => {
            if (!menuItem.condition) return true;
            return menuItem.condition(item, clipboard, isFavorite);
          })
          .map((menuItem) => ({
            ...menuItem,
            disabled: menuItem.enabled
              ? !menuItem.enabled(item, clipboard, isFavorite)
              : false,
          })),
      }))
      .filter((section) => section.items.length > 0);
  }, [item, clipboard, isFavorite]);

  if (!item) return null;

  const handleItemClick = (actionId: ContextMenuAction) => {
    handleAction(actionId, item);
  };

  // Keep the menu in the dialog content container so pointer coordinates can be
  // clamped relative to the visible files window (Finder-like behavior).
  const target = portalContainer ?? document.body;
  const isBodyTarget = target === document.body;
  const containerRect = isBodyTarget
    ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
    : target.getBoundingClientRect();
  const menuWidth = 176;
  const menuHeight = 420;
  const relativeLeft = contextMenu.x - containerRect.left;
  const relativeTop = contextMenu.y - containerRect.top;
  const left = Math.min(
    Math.max(relativeLeft, 8),
    Math.max(containerRect.width - menuWidth - 8, 8),
  );
  const top = Math.min(
    Math.max(relativeTop, 8),
    Math.max(containerRect.height - menuHeight - 8, 8),
  );

  return createPortal(
    <>
      <div
        ref={menuRef}
        className={`z-[150] min-w-[168px] ${HOMEIO_CONTEXT_MENU_SURFACE_CLASS}`}
        style={{
          position: isBodyTarget ? "fixed" : "absolute",
          top,
          left,
        }}
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="p-1">
          {visibleSections.map((section, sectionIndex) => (
            <div key={section.id}>
              {sectionIndex > 0 && <ContextMenuSeparator />}
              {section.items.map((menuItem) => (
                <ContextMenuItem
                  key={menuItem.id}
                  id={menuItem.id}
                  label={menuItem.label}
                  shortcut={menuItem.shortcut}
                  icon={menuItem.icon}
                  danger={menuItem.danger}
                  disabled={menuItem.disabled}
                  onClick={menuItem.disabled ? () => {} : handleItemClick}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>,
    target,
  );
}
