"use client";

import { text } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";
import type { CustomWidgetData } from "../types";

interface CustomWidgetProps {
  data: CustomWidgetData;
}

export function CustomWidget({ data }: CustomWidgetProps) {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden p-3">
      <div
        className="absolute inset-x-0 top-0 h-1 opacity-90"
        style={{ backgroundColor: data.accent || "#38bdf8" }}
      />
      <div className="pt-1">
        <h3 className={cn(text.label, "uppercase tracking-wider mb-1")}>
          {data.title}
        </h3>
        <p className="text-sm leading-5 text-white/85 line-clamp-4">{data.body}</p>
      </div>
      {data.updatedAt ? (
        <p className={cn(text.muted, "mt-3")}>
          Updated {new Date(data.updatedAt).toLocaleDateString()}
        </p>
      ) : null}
    </div>
  );
}
