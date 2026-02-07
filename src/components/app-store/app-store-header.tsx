"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Search } from "lucide-react";

interface AppStoreHeaderProps {
  searchQuery: string;
  categories: string[];
  selectedCategory: string;
  setSearchQuery: (value: string) => void;
  categoryLabel: (category: string) => string;
  onOpenSettings: () => void;
  onSelectCategory: (category: string) => void;
}

const pillBase =
  "inline-flex h-[40px] shrink-0 items-center justify-center rounded-full px-[15px] text-[15px] font-medium leading-none tracking-[-0.02em] transition-all";

export function AppStoreHeader({
  searchQuery,
  categories,
  selectedCategory,
  setSearchQuery,
  categoryLabel,
  onOpenSettings,
  onSelectCategory,
}: AppStoreHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4 md:gap-6">
      <div className="flex min-w-0 flex-col gap-x-4 gap-y-4 px-1 md:flex-row md:items-center md:px-0">
        <h2 className="flex-1 whitespace-nowrap text-[20px] font-bold capitalize leading-none tracking-[-0.03em] text-white/80 md:text-[32px]">
          App Store
        </h2>
        <div className="flex min-w-0 max-w-full flex-1 flex-row-reverse items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            className="h-10 w-10 rounded-full border border-white/15 bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
          <div className="-ml-2 flex min-w-0 items-center rounded-full border border-transparent bg-transparent pl-2 transition-colors hover:border-white/5 hover:bg-white/6 focus-within:border-white/5 focus-within:bg-white/6">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Search apps"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-auto w-[160px] border-0 bg-transparent p-1 text-[15px] text-white placeholder:text-white/40 focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      <div className="umbrel-fade-scroller-x scrollbar-hide -my-2 flex gap-[5px] overflow-x-auto py-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className={`${pillBase} ${
              selectedCategory === category
                ? "bg-white text-black ring-white/40"
                : "border border-white/20 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] hover:bg-white/15"
            }`}
          >
            {categoryLabel(category)}
          </button>
        ))}
      </div>
    </div>
  );
}
