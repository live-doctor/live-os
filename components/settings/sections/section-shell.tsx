import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export const settingsCardClass =
  "bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25";

export const settingsActionButtonClass =
  "border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm";

export const settingsActionButtonWideClass =
  settingsActionButtonClass + " min-w-[136px] justify-center";

type SettingsSectionShellProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode | ReactNode[];
  children?: ReactNode;
  className?: string;
  badge?: ReactNode;
};

export function SettingsSectionShell({
  title,
  subtitle,
  icon,
  actions,
  children,
  className,
  badge,
}: SettingsSectionShellProps) {
  const normalizedActions = actions
    ? Array.isArray(actions)
      ? actions.filter(Boolean)
      : [actions]
    : [];

  return (
    <div className={cn(settingsCardClass, className)}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <span className="flex items-center justify-center rounded-full border border-white/15 bg-white/10 p-2 shrink-0">
              {icon}
            </span>
          )}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white -tracking-[0.01em] leading-5">
                {title}
              </h4>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
            {subtitle && (
              <p className="text-xs text-white/60 leading-relaxed line-clamp-2">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {normalizedActions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {normalizedActions.map((action, idx) => (
              <div key={idx} className="flex-shrink-0">
                {action}
              </div>
            ))}
          </div>
        )}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
