"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { surface } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

export type CommandPaletteAction = {
  id: string;
  title: string;
  subtitle?: string;
  searchText?: string;
  icon: ReactNode;
  onSelect: () => void;
};

interface CommandPaletteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: CommandPaletteAction[];
  frequentActions?: CommandPaletteAction[];
}

export function CommandPaletteDialog({
  open,
  onOpenChange,
  actions,
  frequentActions = [],
}: CommandPaletteDialogProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((action) => {
      const haystack =
        `${action.title} ${action.subtitle ?? ""} ${action.searchText ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [actions, query]);

  const normalizedActiveIndex = Math.min(
    activeIndex,
    Math.max(filteredActions.length - 1, 0),
  );

  const visibleFrequentActions = useMemo(() => {
    if (query.trim().length > 0) return [];
    return frequentActions;
  }, [frequentActions, query]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setQuery("");
      setActiveIndex(0);
    } else {
      setActiveIndex(0);
    }
    onOpenChange(nextOpen);
  };

  const runSelected = (index: number) => {
    const action = filteredActions[index];
    if (!action) return;
    handleDialogOpenChange(false);
    action.onSelect();
  };

  const runAction = (action: CommandPaletteAction) => {
    handleDialogOpenChange(false);
    action.onSelect();
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`top-4 left-1/2 -translate-x-1/2 translate-y-0 gap-5 rounded-[20px] p-3 text-white ${surface.panel} duration-200 max-h-[calc(100%-16px)] w-full max-w-[calc(100%-40px)] sm:max-w-[700px] md:p-[30px] lg:top-[10%] z-[999]`}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((prev) =>
              Math.min(prev + 1, Math.max(filteredActions.length - 1, 0)),
            );
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((prev) => Math.max(prev - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            runSelected(normalizedActiveIndex);
          } else if (event.key === "Escape") {
            handleDialogOpenChange(false);
          }
        }}
      >
        <div className="h-full w-full overflow-hidden flex flex-col gap-3 md:gap-5">
          <div className="flex items-center pr-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for apps, settings, or actions"
              className={`flex w-full rounded-md bg-transparent p-2 text-[15px] tracking-[-0.02em] outline-none placeholder:text-white/25 disabled:cursor-not-allowed disabled:opacity-50 ${surface.label}`}
            />
            <button
              type="button"
              onClick={() => handleDialogOpenChange(false)}
              className="rounded-full opacity-30 outline-none ring-white/60 transition-opacity hover:opacity-40 focus-visible:opacity-40 focus-visible:ring-2"
              aria-label="Close search"
            >
              <X className="h-[18px] w-[18px] md:h-5 md:w-5" />
            </button>
          </div>

          <div className="h-[1px] w-full shrink-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="overflow-y-auto overflow-x-hidden max-h-[370px] scrollbar-hide">
            {visibleFrequentActions.length > 0 && (
              <div className="mb-3 flex flex-col gap-3 md:mb-5 md:gap-5">
                <div>
                  <h3 className="mb-5 ml-2 hidden text-[15px] font-semibold leading-tight tracking-[-0.02em] md:block">
                    Frequently used
                  </h3>
                  <div className="w-full overflow-x-auto whitespace-nowrap scrollbar-hide">
                    {visibleFrequentActions.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => runAction(action)}
                        className={`mr-2 inline-flex w-[75px] flex-col items-center gap-2 overflow-hidden rounded-[8px] border border-transparent p-1.5 outline-none ${surface.panelInteractive} focus-visible:border-white/10 md:w-[100px] md:p-2`}
                      >
                        <div className="flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-[10px] border border-slate-100/10 bg-white/10 text-white/85 lg:rounded-[15px]">
                          {action.icon}
                        </div>
                        <div
                          className={`w-full truncate text-[10px] tracking-[-0.02em] md:text-[13px] ${surface.labelMuted}`}
                        >
                          {action.title}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-[1px] w-full shrink-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            )}

            <div className="flex flex-col gap-0.5" role="listbox" aria-label="Suggestions">
              {filteredActions.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm text-white/45">
                  No results
                </div>
              ) : (
                filteredActions.map((action, index) => (
                  <button
                    key={action.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => runSelected(index)}
                    className={cn(
                      `group relative flex cursor-default select-none items-center gap-3 rounded-[8px] p-2 text-[13px] tracking-[-0.02em] text-left outline-none md:text-[15px] ${surface.label}`,
                      index === normalizedActiveIndex
                        ? "bg-white/[0.04]"
                        : "hover:bg-white/[0.03]",
                    )}
                    role="option"
                    aria-selected={index === normalizedActiveIndex}
                  >
                    <div className="flex h-6 w-6 min-h-6 min-w-6 items-center justify-center rounded-[6px] border border-slate-100/10 bg-white/10 sm:rounded-[8px]">
                      {action.icon}
                    </div>
                    <span>
                      {action.title}
                      {action.subtitle ? (
                        <span className="opacity-50"> {action.subtitle}</span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "ml-auto mr-1 text-xs tracking-widest text-white/30",
                        index === normalizedActiveIndex ? "block" : "hidden",
                      )}
                    >
                      ↵
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
