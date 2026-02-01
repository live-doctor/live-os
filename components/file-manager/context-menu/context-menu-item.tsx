'use client';

import type { ContextMenuAction } from './types';

interface ContextMenuItemProps {
  id: ContextMenuAction;
  label: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  onClick: (id: ContextMenuAction) => void;
}

export function ContextMenuItem({
  id,
  label,
  shortcut,
  icon: Icon,
  danger,
  onClick,
}: ContextMenuItemProps) {
  return (
    <button
      className={`group relative w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 overflow-hidden transition-colors ${
        danger
          ? 'text-red-300 hover:text-red-200'
          : 'text-white hover:text-white'
      }`}
      onClick={() => onClick(id)}
    >
      <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-white/5 via-cyan-500/10 to-transparent" />
      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-px bg-gradient-to-b from-cyan-400/60 via-cyan-300/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div
        className={`relative flex h-7 w-7 items-center justify-center rounded-md border ${
          danger ? 'border-red-400/40 bg-red-500/10' : 'border-white/10 bg-white/5'
        }`}
      >
        <Icon className={`h-4 w-4 ${danger ? '' : 'text-white/80'}`} />
      </div>

      <span className="relative flex-1 font-medium -tracking-[0.01em]">
        {label}
      </span>
      {shortcut && (
        <span className="relative text-[11px] text-white/50 font-mono">
          {shortcut}
        </span>
      )}
    </button>
  );
}
