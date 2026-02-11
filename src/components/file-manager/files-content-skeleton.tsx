"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface FilesContentSkeletonProps {
  viewMode: "grid" | "list";
}

export function FilesContentSkeleton({ viewMode }: FilesContentSkeletonProps) {
  if (viewMode === "list") {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={`list-skeleton-${index}`} className="grid grid-cols-12 gap-2">
            <Skeleton className="col-span-4 h-9" />
            <Skeleton className="col-span-3 h-9" />
            <Skeleton className="col-span-2 h-9" />
            <Skeleton className="col-span-3 h-9" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-2 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={`grid-skeleton-${index}`} className="flex flex-col items-center gap-3 py-2">
          <Skeleton className="h-14 w-14" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
