'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FilePlus,
  FolderPlus,
  Grid2x2,
  List,
  Search,
  Home,
  Upload,
  EyeOff as EyeSlash,
  Trash2,
} from 'lucide-react';
import { type MouseEvent } from 'react';

interface Breadcrumb {
  label: string;
  path: string;
}

interface FilesToolbarProps {
  breadcrumbs: Breadcrumb[];
  historyIndex: number;
  historyLength: number;
  loading: boolean;
  showHidden: boolean;
  viewMode: 'grid' | 'list';
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
  onSetViewMode: (mode: 'grid' | 'list') => void;
  onToggleCreateFolder: () => void;
  onToggleCreateFile: () => void;
  onUpload: () => void;
  onEmptyTrash: () => void;
}

export function FilesToolbar({
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
  const currentCrumb = breadcrumbs[breadcrumbs.length - 1];
  const currentLabel =
    currentCrumb?.label.toLowerCase() === 'home'
      ? (currentCrumb.path.split('/').filter(Boolean).pop() ?? currentCrumb.label)
      : currentCrumb?.label;

  return (
    <div className="flex min-w-0 items-center gap-3 md:gap-4">
      <h2 className="shrink-0 text-[18px] font-semibold leading-none tracking-[-0.02em] text-white/90 md:text-[28px]">
        Files
      </h2>

      <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max items-center gap-2 pb-1 pr-8">
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/8 px-1 py-0.5 shadow-sm shadow-black/20">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              disabled={historyIndex === 0 || loading}
              className="h-7 w-7 rounded-md text-white/70 hover:bg-white/15 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onForward}
              disabled={historyIndex >= historyLength - 1 || loading}
              className="h-7 w-7 rounded-md text-white/70 hover:bg-white/15 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="mx-1 h-5 w-px bg-white/10" />
            <Button
              variant="ghost"
              size="icon"
              onClick={onGoToParent}
              disabled={!canGoToParent || loading}
              className="h-7 w-7 rounded-md text-white/70 hover:bg-white/15 hover:text-white disabled:opacity-30"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>

          {currentCrumb && (
            <div className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/8 px-2 py-0.5 text-white">
              <Home className="h-3 w-3 flex-shrink-0 text-white/70" />
              <button
                className="max-w-[112px] truncate rounded-md border border-white/10 bg-white/12 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.02em] text-white/90 transition-colors hover:bg-white/20 sm:max-w-[140px]"
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
                {currentLabel}
              </button>
            </div>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:gap-2">
            {isTrashView ? (
              <Button
                variant="ghost"
                onClick={onEmptyTrash}
                disabled={loading || trashItemCount === 0}
                aria-label="Empty trash"
                title="Empty trash"
                className="h-[28px] shrink-0 rounded-full border border-red-400/35 bg-red-500/10 px-2.5 text-[10px] font-semibold text-red-200 shadow-button-highlight-soft-hpx hover:bg-red-500/20 disabled:opacity-50 sm:h-[30px] sm:text-[11px]"
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
                  className="h-[28px] w-[28px] shrink-0 rounded-full border border-white/20 bg-white/10 p-0 text-[10px] font-semibold text-white shadow-button-highlight-soft-hpx hover:bg-white/20 sm:h-[30px] sm:w-auto sm:px-2.5 sm:text-[11px]"
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
                  className="h-[28px] w-[28px] shrink-0 rounded-full border border-white/20 bg-white/10 p-0 text-[10px] font-semibold text-white shadow-button-highlight-soft-hpx hover:bg-white/20 sm:h-[30px] sm:w-auto sm:px-2.5 sm:text-[11px]"
                >
                  <FilePlus className="h-3.5 w-3.5 md:mr-1" />
                  <span className="hidden md:inline">File</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={onUpload}
                  disabled={loading}
                  aria-label="Upload"
                  title="Upload"
                  className="h-[28px] w-[28px] shrink-0 rounded-full border border-white/20 bg-white/10 p-0 text-[10px] font-semibold text-white shadow-button-highlight-soft-hpx hover:bg-white/20 sm:h-[30px] sm:w-auto sm:px-2.5 sm:text-[11px]"
                >
                  <Upload className="h-3.5 w-3.5 md:mr-1" />
                  <span className="hidden md:inline">Upload</span>
                </Button>

                <div className="relative min-w-0 shrink-0">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
                  <Input
                    placeholder="Search"
                    className="h-[28px] w-24 rounded-full border border-white/20 bg-white/10 pl-8 text-[10px] font-semibold text-white placeholder:text-white/40 shadow-button-highlight-soft-hpx sm:h-[30px] sm:w-32 sm:text-[11px] md:w-36"
                  />
                </div>
              </>
            )}

            <div className="inline-flex min-w-[96px] shrink-0 items-center gap-1 rounded-full border border-white/20 bg-white/10 p-0.5 shadow-button-highlight-soft-hpx sm:min-w-[112px]">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSetViewMode('grid')}
                className={`h-[26px] w-[32px] rounded-full transition-colors sm:h-[28px] sm:w-[48px] ${
                  viewMode === 'grid'
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                    : 'text-white/70 hover:bg-white/15 hover:text-white'
                }`}
              >
                <Grid2x2 className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSetViewMode('list')}
                className={`h-[26px] w-[32px] rounded-full transition-colors sm:h-[28px] sm:w-[48px] ${
                  viewMode === 'list'
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                    : 'text-white/70 hover:bg-white/15 hover:text-white'
                }`}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className={`h-[28px] w-[28px] shrink-0 rounded-full border sm:h-[30px] sm:w-[30px] ${
                showHidden
                  ? 'border-white/30 bg-white/20 text-white'
                  : 'border-white/20 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }`}
              onClick={() => onToggleHidden(!showHidden)}
            >
              <EyeSlash className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
