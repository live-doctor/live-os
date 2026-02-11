"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type SettingsSidebarCategory = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type SettingsSidebarProps = {
  categories: SettingsSidebarCategory[];
  activeCategoryId: string;
  onSelect: (id: string) => void;
};

export function SettingsSidebar({
  categories,
  activeCategoryId,
  onSelect,
}: SettingsSidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-fit rounded-lg border border-border bg-secondary/35 p-2 lg:block">
      <div className="mb-2 px-2 pt-1">
        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Categories
        </p>
      </div>
      <div className="space-y-1">
        {categories.map((category) => {
          const active = category.id === activeCategoryId;
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors",
                active
                  ? "border-primary/30 bg-primary/10 text-foreground ring-1 ring-primary/20"
                  : "border-transparent bg-transparent text-muted-foreground hover:border-border/70 hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {category.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
