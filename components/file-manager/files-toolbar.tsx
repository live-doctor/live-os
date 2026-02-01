'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FilePlus,
  Grid2x2,
  List,
  Search,
  X,
  Home,
  Upload,
  EyeOff as EyeSlash,
} from 'lucide-react';
import { type MouseEvent, type ReactNode } from 'react';

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
  onNavigate: (path: string) => void;
  onBreadcrumbContextMenu: (event: MouseEvent, path: string, label: string) => void;
  onBack: () => void;
  onForward: () => void;
  onGoToParent: () => void;
  onToggleHidden: (value: boolean) => void;
  onSetViewMode: (mode: 'grid' | 'list') => void;
  onToggleCreateFolder: () => void;
  onToggleCreateFile: () => void;
  onQuickCreateFile: () => void;
  onUpload: () => void;
  onClose: () => void;
}

export function FilesToolbar({
  breadcrumbs,
  historyIndex,
  historyLength,
  loading,
  showHidden,
  viewMode,
  canGoToParent,
  onNavigate,
  onBreadcrumbContextMenu,
  onBack,
  onForward,
  onGoToParent,
  onToggleHidden,
  onSetViewMode,
  onToggleCreateFolder,
  onToggleCreateFile,
  onQuickCreateFile,
  onUpload,
  onClose,
}: FilesToolbarProps) {
  const renderCrumb = (crumb: Breadcrumb, index: number): ReactNode => (
    <div key={crumb.path} className="flex items-center gap-1">
      {index === 0 ? (
        <Home className="h-4 w-4 text-white/80 flex-shrink-0" />
      ) : (
        <ChevronRight className="h-4 w-4 text-white/50 flex-shrink-0" />
      )}
      <button
        className={`px-2 py-1 rounded-md text-sm font-medium -tracking-[0.01em] transition-colors max-w-[160px] truncate border ${
          index === breadcrumbs.length - 1
            ? 'bg-white/15 text-white border-white/15'
            : 'hover:bg-white/10 text-white/80 border-transparent'
        }`}
        title={crumb.path}
        onClick={() => onNavigate(crumb.path)}
        onContextMenu={(event) => onBreadcrumbContextMenu(event, crumb.path, crumb.label)}
      >
        {crumb.label}
      </button>
    </div>
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-white/10 bg-gradient-to-r from-white/5 via-white/5 to-transparent backdrop-blur-xl">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-1.5 py-1 shadow-sm shadow-black/20">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            disabled={historyIndex === 0 || loading}
            className="h-8 w-8 rounded-md hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onForward}
            disabled={historyIndex >= historyLength - 1 || loading}
            className="h-8 w-8 rounded-md hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-white/10 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onGoToParent}
            disabled={!canGoToParent || loading}
            className="h-8 w-8 rounded-md hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 text-white min-w-0 overflow-hidden">
          <div className="flex items-center gap-1 min-w-0 overflow-x-auto overflow-y-hidden whitespace-nowrap pr-1 scrollbar-hide">
            {breadcrumbs.map(renderCrumb)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Search"
            className="h-9 w-52 pl-9 bg-white/8 border-white/15 text-white placeholder:text-white/40 text-sm rounded-xl shadow-inner shadow-black/20"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSetViewMode('grid')}
          className={`h-9 w-9 rounded-xl border ${
            viewMode === 'grid'
              ? 'border-white/50 bg-white/15 text-white'
              : 'border-white/15 bg-white/8 text-white/70 hover:text-white hover:bg-white/15'
          }`}
        >
          <Grid2x2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSetViewMode('list')}
          className={`h-9 w-9 rounded-xl border ${
            viewMode === 'list'
              ? 'border-white/50 bg-white/15 text-white'
              : 'border-white/15 bg-white/8 text-white/70 hover:text-white hover:bg-white/15'
          }`}
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-xl border ${
            showHidden
              ? 'border-amber-400/60 bg-amber-400/15 text-amber-100'
              : 'border-white/15 bg-white/8 text-white/70 hover:text-white'
          }`}
          onClick={() => onToggleHidden(!showHidden)}
        >
          <EyeSlash className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          onClick={onToggleCreateFolder}
          disabled={loading}
          className="h-9 px-4 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 text-white text-sm shadow-sm"
        >
          <FilePlus className="h-4 w-4 mr-2" />
          Folder
        </Button>
        <Button
          variant="ghost"
          onClick={onToggleCreateFile}
          disabled={loading}
          className="h-9 px-4 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 text-white text-sm shadow-sm"
        >
          <FilePlus className="h-4 w-4 mr-2" />
          File
        </Button>
        <Button
          variant="ghost"
          onClick={onUpload}
          disabled={loading}
          className="h-9 px-4 rounded-xl border border-cyan-500/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 text-sm shadow-sm"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl border border-white/15 bg-white/8 hover:bg-white/15 text-white/80"
          onClick={onQuickCreateFile}
        >
          <FilePlus className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-9 w-9 rounded-xl border border-white/15 bg-white/8 hover:bg-white/15 text-white/70 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
