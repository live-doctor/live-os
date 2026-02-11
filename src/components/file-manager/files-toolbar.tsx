"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  EyeOff as EyeSlash,
  FilePlus,
  FolderPlus,
  Grid2x2,
  Home,
  List,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { type MouseEvent } from "react";

interface Breadcrumb {
  label: string;
  path: string;
}

interface FilesToolbarProps {
  showTitle?: boolean;
  breadcrumbs: Breadcrumb[];
  historyIndex: number;
  historyLength: number;
  loading: boolean;
  showHidden: boolean;
  viewMode: "grid" | "list";
  canGoToParent: boolean;
  isTrashView: boolean;
  trashItemCount: number;
  onNavigate: (path: string) => void;
  onBreadcrumbContextMenu: (
    event: MouseEvent,
    path: string,
    label: string,
  ) => void;
  onBack: () => void;
  onForward: () => void;
  onGoToParent: () => void;
  onToggleHidden: (value: boolean) => void;
  onSetViewMode: (mode: "grid" | "list") => void;
  onToggleCreateFolder: () => void;
  onToggleCreateFile: () => void;
  onUpload: () => void;
  onEmptyTrash: () => void;
}

export function FilesToolbar({
  showTitle = true,
  breadcrumbs,
  historyIndex,
  historyLength,
  loading,
  showHidden,
  viewMode,
  canGoToParent,
  isTrashView,
  trashItemCount,
  onNavigate,
  onBreadcrumbContextMenu,
  onBack,
  onForward,
  onGoToParent,
  onToggleHidden,
  onSetViewMode,
  onToggleCreateFolder,
  onToggleCreateFile,
  onUpload,
  onEmptyTrash,
}: FilesToolbarProps) {
  const breadcrumbLabels = breadcrumbs.map((crumb, index) =>
    index === 0 ? "Home" : crumb.label,
  );
  const breadcrumbPathText =
    breadcrumbLabels.length <= 4
      ? breadcrumbLabels.join(" / ")
      : `Home / ... / ${breadcrumbLabels.slice(-3).join(" / ")}`;
  const currentCrumb = breadcrumbs[breadcrumbs.length - 1];

  return (
    <div className="flex min-w-0 items-center gap-3 md:gap-4 w-[82.5%] ml-[19%] ">
      {showTitle && (
        <h2 className="shrink-0 text-[18px] font-semibold leading-none tracking-[-0.02em] text-foreground md:text-[28px]">
          Files
        </h2>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-2 pb-1 pr-4">
        <div className="flex shrink-0 items-center gap-1 px-1 py-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            disabled={historyIndex === 0 || loading}
            className="h-7 w-7 rounded-lg border border-border bg-secondary/60 hover:bg-secondary disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onForward}
            disabled={historyIndex >= historyLength - 1 || loading}
            className="h-7 w-7 rounded-lg border border-border bg-secondary/60 hover:bg-secondary disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-5 w-px bg-border/60" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onGoToParent}
            disabled={!canGoToParent || loading}
            className="h-7 w-7 rounded-lg border border-border bg-secondary/60 hover:bg-secondary disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>

        {currentCrumb ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-w-0 flex-1 justify-start rounded-lg border border-border bg-secondary/55 px-2 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            title={currentCrumb.path}
            onClick={() => onNavigate(currentCrumb.path)}
            onContextMenu={(event) =>
              onBreadcrumbContextMenu(
                event,
                currentCrumb.path,
                currentCrumb.label,
              )
            }
          >
            <Home className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{breadcrumbPathText}</span>
          </Button>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:gap-2">
          {isTrashView ? (
            <Button
              variant="ghost"
              onClick={onEmptyTrash}
              disabled={loading || trashItemCount === 0}
              aria-label="Empty trash"
              title="Empty trash"
              className="h-[28px] shrink-0 rounded-lg border border-border bg-secondary/60 px-2.5 text-[10px] font-semibold text-foreground shadow-button-highlight-soft-hpx hover:bg-secondary disabled:opacity-50 sm:h-[30px] sm:text-[11px]"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Empty Trash
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={onToggleCreateFolder}
                disabled={loading}
                aria-label="Create folder"
                title="Create folder"
                className="h-[28px] w-[28px] shrink-0 rounded-lg border border-border bg-secondary/60 p-0 text-[10px] font-semibold text-foreground shadow-button-highlight-soft-hpx hover:bg-secondary sm:h-[30px] sm:w-auto sm:px-2.5 sm:text-[11px]"
              >
                <FolderPlus className="h-3.5 w-3.5 md:mr-1" />
                <span className="hidden md:inline">Folder</span>
              </Button>
              <Button
                variant="ghost"
                onClick={onToggleCreateFile}
                disabled={loading}
                aria-label="Create file"
                title="Create file"
                className="h-[28px] w-[28px] shrink-0 rounded-lg border border-border bg-secondary/60 p-0 text-[10px] font-semibold text-foreground shadow-button-highlight-soft-hpx hover:bg-secondary sm:h-[30px] sm:w-auto sm:px-2.5 sm:text-[11px]"
              >
                <FilePlus className="h-3.5 w-3.5 md:mr-1" />
                <span className="hidden md:inline">File</span>
              </Button>
              <Button
                onClick={onUpload}
                disabled={loading}
                aria-label="Upload"
                title="Upload"
                className="h-[28px] w-[28px] shrink-0 rounded-lg p-0 text-[10px] font-semibold shadow-button-highlight-soft-hpx sm:h-[30px] sm:w-auto sm:px-2.5 sm:text-[11px]"
              >
                <Upload className="h-3.5 w-3.5 md:mr-1" />
                <span className="hidden md:inline">Upload</span>
              </Button>

              <div className="relative min-w-0 shrink-0">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search"
                  className="h-[28px] w-24 rounded-lg border border-border bg-secondary/60 pl-8 text-[10px] font-semibold text-foreground placeholder:text-muted-foreground shadow-button-highlight-soft-hpx sm:h-[30px] sm:w-32 sm:text-[11px] md:w-36"
                />
              </div>
            </>
          )}

          <div className="inline-flex min-w-[96px] shrink-0 items-center gap-1 rounded-lg border border-border bg-secondary/60 p-0.5 shadow-button-highlight-soft-hpx sm:min-w-[112px]">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => onSetViewMode("grid")}
              className={`h-[26px] w-[32px] rounded-lg border transition-all sm:h-[28px] sm:w-[48px] ${
                viewMode === "grid"
                  ? "border-transparent ring-2 ring-primary/45"
                  : "border-border bg-secondary/60 opacity-85 hover:bg-secondary hover:opacity-100"
              }`}
            >
              <Grid2x2 className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => onSetViewMode("list")}
              className={`h-[26px] w-[32px] rounded-lg border transition-all sm:h-[28px] sm:w-[48px] ${
                viewMode === "list"
                  ? "border-transparent ring-2 ring-primary/45"
                  : "border-border bg-secondary/60 opacity-85 hover:bg-secondary hover:opacity-100"
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className={`h-[28px] w-[28px] shrink-0 rounded-lg border border-border bg-secondary/60 hover:bg-secondary sm:h-[30px] sm:w-[30px] ${
              showHidden ? "ring-2 ring-primary/45" : "opacity-90"
            }`}
            onClick={() => onToggleHidden(!showHidden)}
          >
            <EyeSlash className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
