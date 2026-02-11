"use client";

import { text } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";
import type { SystemPillsData } from "../types";

interface SystemPillsWidgetProps {
  data: SystemPillsData;
}

function CpuGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
      <path d="M8 8V12H12V8H8Z" fill="currentColor" fillOpacity="0.9" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 1C9 0.45 8.55 0 8 0C7.45 0 7 0.45 7 1V3H4C3.73 3 3.48 3.11 3.29 3.29C3.11 3.48 3 3.73 3 4V7H1C0.45 7 0 7.45 0 8C0 8.55 0.45 9 1 9H3V11H1C0.45 11 0 11.45 0 12C0 12.55 0.45 13 1 13H3V16C3 16.27 3.11 16.52 3.29 16.71C3.48 16.89 3.73 17 4 17H7V19C7 19.55 7.45 20 8 20C8.55 20 9 19.55 9 19V17H11V19C11 19.55 11.45 20 12 20C12.55 20 13 19.55 13 19V17H16C16.27 17 16.52 16.89 16.71 16.71C16.89 16.52 17 16.27 17 16V13H19C19.55 13 20 12.55 20 12C20 11.45 19.55 11 19 11H17V9H19C19.55 9 20 8.55 20 8C20 7.45 19.55 7 19 7H17V4C17 3.73 16.89 3.48 16.71 3.29C16.52 3.11 16.27 3 16 3H13V1C13 0.45 12.55 0 12 0C11.45 0 11 0.45 11 1V3H9V1ZM6 7C6 6.45 6.45 6 7 6H13C13.55 6 14 6.45 14 7V13C14 13.55 13.55 14 13 14H7C6.45 14 6 13.55 6 13V7Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
    </svg>
  );
}

function MemoryGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
      <rect x="1.5" y="5.5" width="17" height="9" rx="2" fill="currentColor" fillOpacity="0.9" />
      <rect x="3.5" y="7.2" width="2.3" height="1.8" rx="0.2" fill="currentColor" fillOpacity="0.35" />
      <rect x="6.3" y="7.2" width="2.3" height="1.8" rx="0.2" fill="currentColor" fillOpacity="0.35" />
      <rect x="9.1" y="7.2" width="2.3" height="1.8" rx="0.2" fill="currentColor" fillOpacity="0.35" />
      <rect x="11.9" y="7.2" width="2.3" height="1.8" rx="0.2" fill="currentColor" fillOpacity="0.35" />
      <rect x="14.7" y="7.2" width="1.8" height="1.8" rx="0.2" fill="currentColor" fillOpacity="0.35" />
      <rect x="3.5" y="2.4" width="1.6" height="2" rx="0.2" fill="currentColor" fillOpacity="0.75" />
      <rect x="7.1" y="2.4" width="1.6" height="2" rx="0.2" fill="currentColor" fillOpacity="0.75" />
      <rect x="10.7" y="2.4" width="1.6" height="2" rx="0.2" fill="currentColor" fillOpacity="0.75" />
      <rect x="14.3" y="2.4" width="1.6" height="2" rx="0.2" fill="currentColor" fillOpacity="0.75" />
      <rect x="3.5" y="15.6" width="1.6" height="2" rx="0.2" fill="currentColor" fillOpacity="0.75" />
      <rect x="7.1" y="15.6" width="1.6" height="2" rx="0.2" fill="currentColor" fillOpacity="0.75" />
      <rect x="10.7" y="15.6" width="1.6" height="2" rx="0.2" fill="currentColor" fillOpacity="0.75" />
      <rect x="14.3" y="15.6" width="1.6" height="2" rx="0.2" fill="currentColor" fillOpacity="0.75" />
    </svg>
  );
}

function StorageGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 2H14L18 6V16C18 16.53 17.79 17.04 17.41 17.41C17.04 17.79 16.53 18 16 18H4C3.47 18 2.96 17.79 2.59 17.41C2.21 17.04 2 16.53 2 16V4C2 3.47 2.21 2.96 2.59 2.59C2.96 2.21 3.47 2 4 2ZM7.88 10.88C8.44 10.32 9.2 10 10 10C10.8 10 11.56 10.32 12.12 10.88C12.68 11.44 13 12.2 13 13C13 13.8 12.68 14.56 12.12 15.12C11.56 15.68 10.8 16 10 16C9.2 16 8.44 15.68 7.88 15.12C7.32 14.56 7 13.8 7 13C7 12.2 7.32 11.44 7.88 10.88ZM10 12C9.73 12 9.48 12.11 9.29 12.29C9.11 12.48 9 12.73 9 13C9 13.27 9.11 13.52 9.29 13.71C9.48 13.89 9.73 14 10 14C10.27 14 10.52 13.89 10.71 13.71C10.89 13.52 11 13.27 11 13C11 12.73 10.89 12.48 10.71 12.29C10.52 12.11 10.27 12 10 12ZM4 3H13.4V6C13.4 6.55 12.95 7 12.4 7H5C4.45 7 4 6.55 4 6V3Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
    </svg>
  );
}

function NetworkGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M3 7.5C4.7 5.7 7.2 4.75 10 4.75C12.8 4.75 15.3 5.7 17 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeOpacity="0.9"
      />
      <path
        d="M5.75 10.25C6.8 9.2 8.3 8.65 10 8.65C11.7 8.65 13.2 9.2 14.25 10.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeOpacity="0.9"
      />
      <path
        d="M8.5 13C8.9 12.6 9.43 12.4 10 12.4C10.57 12.4 11.1 12.6 11.5 13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeOpacity="0.9"
      />
      <circle cx="10" cy="15.75" r="1.25" fill="currentColor" fillOpacity="0.9" />
    </svg>
  );
}

const GLYPHS = [CpuGlyph, MemoryGlyph, StorageGlyph, NetworkGlyph] as const;

export function SystemPillsWidget({ data }: SystemPillsWidgetProps) {
  return (
    <div className="grid h-full grid-cols-2 grid-rows-2 gap-2 p-2">
      {data.stats.map((stat, index) => {
        const Glyph = GLYPHS[index] ?? CpuGlyph;
        return (
          <div
            key={`${stat.label}-${index}`}
            className="flex min-w-0 items-center overflow-hidden rounded-lg bg-secondary/60 px-2 py-1.5 text-left sm:flex-col sm:justify-center"
          >
            <div className="h-5 w-5 text-foreground sm:mb-2">
              <Glyph />
            </div>
            <div className="flex w-full flex-row justify-between sm:flex-col sm:text-center">
              <p
                className={cn(
                  text.label,
                  "max-w-full truncate text-[11px] leading-snug sm:text-[12px]",
                )}
              >
                {stat.label}
              </p>
                <p
                  className={cn(
                    text.valueSmall,
                    "max-w-full truncate text-[11px] font-semibold leading-snug tracking-[-0.02em] text-foreground sm:text-[12px]",
                  )}
                >
                {stat.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
