"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HOMEIO_DIALOG_TITLE_CLASS } from "@/components/ui/dialog-chrome";
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
  "inline-flex h-[38px] shrink-0 items-center justify-center rounded-full px-[14px] text-[14px] font-medium leading-none tracking-[-0.02em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35";

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
    <div className="flex min-w-0 flex-col gap-3 md:gap-5">
      <div className="flex min-w-0 flex-col gap-x-4 gap-y-3 px-1 md:flex-row md:items-center md:px-0">
        <h2
          className={`flex-1 whitespace-nowrap capitalize ${HOMEIO_DIALOG_TITLE_CLASS}`}
        >
          App Store
        </h2>
        <div className="flex min-w-0 max-w-full flex-1 flex-row-reverse items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            className="h-[38px] w-[38px] rounded-full border border-white/12 bg-white/8 text-white/70 transition-colors hover:border-white/20 hover:bg-white/14 hover:text-white"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
          <div className="flex min-w-0 items-center rounded-full border border-white/10 bg-white/8 pl-3 transition-colors hover:border-white/20 hover:bg-white/12 focus-within:border-white/25 focus-within:bg-white/14">
            <Search className="h-4 w-4 shrink-0 text-white/45" />
            <Input
              placeholder="Search apps"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-[36px] w-[170px] border-0 bg-transparent px-2 py-0 text-[14px] text-white placeholder:text-white/40 focus-visible:ring-0 md:w-[220px]"
            />
          </div>
        </div>
      </div>

      <div className="umbrel-fade-scroller-x scrollbar-hide -my-1.5 flex gap-[5px] overflow-x-auto py-1.5">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className={`${pillBase} ${
              selectedCategory === category
                ? "bg-white text-black ring-1 ring-white/40"
                : "border border-white/18 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/16"
            }`}
          >
            {categoryLabel(category)}
          </button>
        ))}
      </div>
    </div>
  );
}
