"use client";

import Image from "next/image";
import { useState } from "react";
import type { App } from "./types";

interface RecommendationsSectionProps {
  recommendations: App[];
  onAppClick: (app: App) => void;
}

/**
 * Displays recommended apps based on category matching.
 * Shows up to 4 apps in a horizontal row.
 */
export function RecommendationsSection({
  recommendations,
  onAppClick,
}: RecommendationsSectionProps) {
  if (recommendations.length === 0) return null;

  return (
    <section className="rounded-[12px] bg-white/4 px-5 py-[30px] md:px-[26px] md:py-[36px]">
      <h2 className="text-[12px] font-semibold uppercase tracking-normal text-white/50">
        You might also like
      </h2>
      <div className="mt-5 space-y-3">
        {recommendations.map((app) => (
          <RecommendationCard
            key={app.id}
            app={app}
            onClick={() => onAppClick(app)}
          />
        ))}
      </div>
    </section>
  );
}

interface RecommendationCardProps {
  app: App;
  onClick: () => void;
}

function RecommendationCard({ app, onClick }: RecommendationCardProps) {
  const [iconSrc, setIconSrc] = useState(app.icon);

  return (
    <button
      onClick={onClick}
      className="group flex w-full cursor-pointer items-center gap-2.5 text-left"
    >
      <div className="relative h-[50px] w-[50px] shrink-0 overflow-hidden rounded-[10px] border border-slate-100/10 bg-white/10">
        <Image
          src={iconSrc}
          alt={app.title}
          fill
          className="object-cover"
          onError={() => setIconSrc("/default-application-icon.png")}
        />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[14px] font-semibold leading-tight tracking-[-0.03em]">
          {app.title}
        </h3>
        <p className="line-clamp-2 text-[12px] leading-tight text-white/40">
          {app.tagline || app.overview}
        </p>
      </div>
    </button>
  );
}
