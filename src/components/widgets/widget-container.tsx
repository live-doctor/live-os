"use client";

import { card, surface } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";

interface WidgetContainerProps {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function WidgetContainer({
  children,
  selected = false,
  onClick,
  className,
}: WidgetContainerProps) {
  const isClickable = !!onClick;

  return (
    <div
      className={cn(
        `h-[160px] w-full overflow-hidden rounded-lg ring-1 ring-white/20 sm:rounded-lg ${surface.panel}`,
        isClickable &&
          `cursor-pointer ${surface.panelInteractive} hover:scale-[1.02] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 active:scale-[0.99]`,
        selected && card.selected,
        className,
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
