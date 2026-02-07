"use client";

import { ReactNode } from "react";

interface DiscoverSectionProps {
  label?: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DiscoverSection({
  label,
  title,
  action,
  children,
  className = "",
}: DiscoverSectionProps) {
  return (
    <section className={`space-y-4 ${className}`}>
      <div className="rounded-[20px] bg-gradient-to-b from-[#24242499] to-[#18181899] px-2 py-2 md:px-[26px] md:py-[36px]">
        <div className="flex items-end justify-between gap-4 p-2.5">
          <div>
            {label && (
              <p className="mb-1.5 mt-1 text-[12px] font-bold uppercase leading-tight text-white/50 md:mb-2 md:text-[15px]">
                {label}
              </p>
            )}
            <h3 className="text-[18px] font-bold leading-tight md:text-[32px]">
              {title}
            </h3>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

export function FeaturedCardsRow({ children }: { children: ReactNode }) {
  return (
    <div className="umbrel-hide-scrollbar flex w-full gap-3 overflow-x-auto py-1 pr-1 md:gap-5">
      {children}
    </div>
  );
}

export function AppListGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-x-5 gap-y-3 md:gap-y-5 ${className}`}>
      {children}
    </div>
  );
}
