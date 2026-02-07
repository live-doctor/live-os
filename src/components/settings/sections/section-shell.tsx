import { surface } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export const settingsCardClass = "";
export const settingsRowsContainerClass =
  "rounded-[12px] bg-white/5 overflow-hidden divide-y divide-white/10";

export const settingsActionButtonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 h-[30px] text-[12px] font-medium tracking-[-0.02em] text-white transition-[color,background-color,box-shadow] duration-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/25";

export const settingsActionButtonWideClass =
  settingsActionButtonClass;

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
  icon: _icon,
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
    <div
      tabIndex={-1}
      className={cn(
        "bg-gradient-to-r from-transparent to-transparent px-3 py-4 outline-none hover:via-white/4 lg:px-6",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-x-4 gap-y-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <h4 className={`text-[14px] font-medium leading-none tracking-[-0.02em] ${surface.label}`}>
                {title}
              </h4>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
            {subtitle && (
              <p className={`text-[12px] leading-tight tracking-[-0.02em] line-clamp-2 ${surface.labelMuted}`}>
                {subtitle}
              </p>
            )}
        </div>
        {normalizedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-3">
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
