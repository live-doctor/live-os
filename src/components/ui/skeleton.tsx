import { cn } from "@/lib/utils";
import * as React from "react";

export function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-lg bg-secondary/70", className)}
      {...props}
    />
  );
}
