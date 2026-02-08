'use client';

import type { ContextMenuAction } from './types';

interface ContextMenuItemProps {
  id: ContextMenuAction;
  label: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  disabled?: boolean;
  onClick: (id: ContextMenuAction) => void;
}

export function ContextMenuItem({
  id,
  label,
  shortcut,
  icon: Icon,
  danger,
  disabled = false,
  onClick,
}: ContextMenuItemProps) {
  return (
    <button
      className={`w-full rounded-md px-2.5 py-1.5 text-left text-[14px] leading-tight -tracking-[0.015em] transition-colors ${
        disabled
          ? 'cursor-default text-white/35'
          : danger
            ? 'text-red-400 hover:bg-white/6'
            : 'text-white hover:bg-white/6'
      }`}
      disabled={disabled}
      onClick={() => onClick(id)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon
            className={`h-3.5 w-3.5 shrink-0 ${
              disabled ? "text-white/28" : danger ? "text-red-400/90" : "text-white/60"
            }`}
          />
          <span className="truncate font-medium">{label}</span>
        </div>
        {shortcut && (
          <span
            className={`shrink-0 text-[11px] font-medium ${
              disabled ? 'text-white/28' : 'text-white/45'
            }`}
          >
            {shortcut}
          </span>
        )}
      </div>
    </button>
  );
}
