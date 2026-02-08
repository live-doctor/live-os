"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { App } from "./types";

interface FeaturedAppCardProps {
  app: App;
  index?: number;
  onClick?: () => void;
}

export function FeaturedAppCard({
  app,
  index = 0,
  onClick,
}: FeaturedAppCardProps) {
  const [imageSrc, setImageSrc] = useState(
    app.thumbnail || app.screenshots?.[0] || "",
  );
  const storeBadge = app.storeName?.trim() || app.storeSlug?.trim() || null;

  const gradient = useMemo(() => {
    const hash = app.id
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `linear-gradient(130deg, hsla(${hue}, 30%, 26%, 0.9), hsla(${(hue + 50) % 360}, 26%, 16%, 0.9))`;
  }, [app.id]);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      className="group relative aspect-[2.25] w-[min(92vw,700px)] min-w-[260px] shrink-0 overflow-hidden rounded-[20px] bg-white/10 outline-none ring-inset ring-white/80 transition-transform hover:scale-[1.01] focus-visible:ring-4 sm:w-[min(86vw,680px)] md:w-[min(62vw,620px)] lg:w-[min(54vw,600px)] xl:w-[560px]"
      style={!imageSrc ? { background: gradient } : undefined}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={app.title}
          fill
          className="object-cover transition-opacity duration-300 group-hover:opacity-95"
          onError={() => setImageSrc("")}
          unoptimized
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full p-4 md:p-6">
        <h3 className="truncate text-[18px] font-bold leading-tight text-white md:text-[28px]">
          {app.title}
        </h3>
        <p className="line-clamp-2 text-[12px] text-white/75 md:text-[15px]">
          {app.tagline || app.overview}
        </p>
      </div>
      {storeBadge ? (
        <span className="pointer-events-none absolute bottom-3 right-3 max-w-[140px] truncate rounded-md bg-black/45 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-white/65 md:bottom-4 md:right-4 md:text-[9px]">
          {storeBadge}
        </span>
      ) : null}
    </motion.button>
  );
}
