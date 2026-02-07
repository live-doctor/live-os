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
  danger,
  disabled = false,
  onClick,
}: ContextMenuItemProps) {
  return (
    <button
      className={`w-full rounded-md px-3 py-2 text-left text-[16px] leading-tight -tracking-[0.015em] transition-colors ${
        disabled
          ? 'cursor-default text-white/35'
          : danger
            ? 'text-red-400 hover:bg-white/6'
            : 'text-white hover:bg-white/6'
      }`}
      disabled={disabled}
      onClick={() => onClick(id)}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="truncate font-medium">{label}</span>
        {shortcut && (
          <span
            className={`shrink-0 text-[12px] font-medium ${
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
