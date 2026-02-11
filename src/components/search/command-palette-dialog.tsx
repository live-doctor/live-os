"use client";

import { dialog as dialogTokens, surface } from "@/components/ui/design-tokens";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  const hasQuery = query.trim().length > 0;
  const resultsHeightClass = hasQuery
    ? "max-h-[460px] min-h-[320px]"
    : "max-h-[420px] min-h-[260px]";

  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
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

  const visibleFrequentActions = useMemo<CommandPaletteAction[]>(() => {
    if (hasQuery) return [];
    return frequentActions;
  }, [frequentActions, hasQuery]);

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
        className={cn(
          dialogTokens.content,
          "top-4 left-1/2 -translate-x-1/2 translate-y-0 gap-5 p-3 duration-200 max-h-[calc(100%-16px)] w-full max-w-[calc(100%-40px)] sm:max-w-[700px] md:p-[30px] lg:top-[10%] z-[999]",
        )}
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
          <div className="flex items-center rounded-lg border border-border bg-secondary/40 px-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for apps, settings, or actions"
              className={`h-9 w-full rounded-md bg-transparent px-1.5 text-[14px] tracking-[-0.02em] text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 ${surface.label}`}
            />
            <button
              type="button"
              onClick={() => handleDialogOpenChange(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground opacity-60 outline-none ring-ring/60 transition-opacity hover:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="h-[1px] w-full shrink-0 bg-gradient-to-r from-transparent via-border to-transparent" />

          <div
            className={cn(
              "overflow-y-auto overflow-x-hidden scrollbar-hide transition-[max-height,min-height] duration-300 ease-out",
              resultsHeightClass,
            )}
          >
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
                        className={`mr-2 inline-flex w-[75px] flex-col items-center gap-2 overflow-hidden rounded-lg border border-transparent p-1.5 outline-none ${surface.panelInteractive} focus-visible:border-white/10 md:w-[100px] md:p-2`}
                      >
                        <div className="flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-lg border border-slate-100/10 bg-white/10 text-white/85 lg:rounded-[15px]">
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

            <div
              className="flex flex-col gap-0.5"
              role="listbox"
              aria-label="Suggestions"
            >
              {!hasQuery ? (
                visibleFrequentActions.length === 0 ? (
                  <div className="px-3 py-10 text-center text-sm text-white/45">
                    Start typing to search apps, settings, or actions
                  </div>
                ) : null
              ) : filteredActions.length === 0 ? (
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
                      `group relative flex cursor-default select-none items-start gap-3 rounded-lg p-2 text-left outline-none`,
                      index === normalizedActiveIndex
                        ? "bg-white/[0.04]"
                        : "hover:bg-white/[0.03]",
                    )}
                    role="option"
                    aria-selected={index === normalizedActiveIndex}
                  >
                    <div className="flex h-6 w-6 min-h-6 min-w-6 items-center justify-center rounded-[6px] border border-slate-100/10 bg-white/10 sm:rounded-lg">
                      {action.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "truncate text-[13px] md:text-[15px]",
                          surface.label,
                        )}
                      >
                        {action.title}
                      </div>
                      {action.subtitle ? (
                        <div className="mt-0.5 truncate text-[11px] leading-tight text-white/45">
                          {action.subtitle}
                        </div>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "ml-auto mt-1 mr-1 text-xs tracking-widest text-white/30",
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
