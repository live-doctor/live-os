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
      className={`w-full rounded-lg px-2.5 py-1.5 text-left text-[14px] leading-tight -tracking-[0.015em] transition-colors ${
        disabled
          ? 'cursor-default text-muted-foreground'
          : danger
            ? 'text-destructive hover:bg-destructive/10'
            : 'text-foreground hover:bg-secondary/60'
      }`}
      disabled={disabled}
      onClick={() => onClick(id)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon
            className={`h-3.5 w-3.5 shrink-0 ${
              disabled
                ? "text-muted-foreground"
                : danger
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          />
          <span className="truncate font-medium">{label}</span>
        </div>
        {shortcut && (
          <span
            className={`shrink-0 text-[11px] font-medium ${
              disabled ? 'text-muted-foreground' : 'text-muted-foreground'
            }`}
          >
            {shortcut}
          </span>
        )}
      </div>
    </button>
  );
}
