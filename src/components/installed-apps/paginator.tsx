"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function useSnapPaginator(pageCount: number) {
  const [page, setPage] = useState(0);
  const scrollContainer = useRef<HTMLDivElement>(null);
  const programmaticScroll = useRef(false);

  const toPage = (nextPage: number) => {
    const maxPage = Math.max(pageCount - 1, 0);
    const target = clamp(nextPage, 0, maxPage);
    setPage(target);
    const container = scrollContainer.current;
    if (!container) return;
    programmaticScroll.current = true;
    container.scrollTo({
      left: target * container.clientWidth,
      behavior: "smooth",
    });
  };

  const prevPage = () => toPage(page - 1);
  const nextPage = () => toPage(page + 1);

  useEffect(() => {
    const container = scrollContainer.current;
    if (!container) return;
    let releaseTimer: ReturnType<typeof setTimeout> | undefined;

    const handleScroll = () => {
      const index = Math.round(container.scrollLeft / container.clientWidth);
      setPage(clamp(index, 0, Math.max(pageCount - 1, 0)));

      if (releaseTimer) clearTimeout(releaseTimer);
      releaseTimer = setTimeout(() => {
        programmaticScroll.current = false;
      }, 140);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (releaseTimer) clearTimeout(releaseTimer);
    };
  }, [pageCount]);

  const safePage = clamp(page, 0, Math.max(pageCount - 1, 0));

  return {
    page: safePage,
    scrollContainer,
    toPage,
    prevPage,
    nextPage,
    prevDisabled: safePage <= 0,
    nextDisabled: safePage >= pageCount - 1,
  };
}

export function PaginationArrows({
  show,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}: {
  show: boolean;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
}) {
  if (!show) return null;

  const buttonClass =
    "grid h-10 w-10 place-items-center rounded-lg border border-border bg-secondary/60 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:bg-secondary disabled:pointer-events-none disabled:text-muted-foreground/60";

  return (
    <>
      <button
        type="button"
        className={`absolute top-1/2 left-0 z-10 -translate-y-1/2 -translate-x-[120%] ${buttonClass} hidden lg:grid`}
        onClick={onPrev}
        disabled={prevDisabled}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        className={`absolute top-1/2 right-0 z-10 -translate-y-1/2 translate-x-[120%] ${buttonClass} hidden lg:grid`}
        onClick={onNext}
        disabled={nextDisabled}
        aria-label="Next page"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </>
  );
}

export function PaginationPills({
  pageCount,
  currentPage,
  onSelectPage,
}: {
  pageCount: number;
  currentPage: number;
  onSelectPage: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-center gap-1.5">
      {Array.from({ length: pageCount }).map((_, index) => {
        const active = index === currentPage;
        return (
          <button
            key={`apps-page-${index}`}
            type="button"
            onClick={() => onSelectPage(index)}
            aria-label={`Go to apps page ${index + 1}`}
            className={`h-2.5 rounded-full transition-all ${
              active
                ? "w-5 bg-foreground/85"
                : "w-2.5 bg-muted-foreground/35 hover:bg-muted-foreground/55"
            }`}
          />
        );
      })}
    </div>
  );
}
