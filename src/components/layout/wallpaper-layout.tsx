"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { applyWallpaperBrandCssVars } from "./wallpaper-theme";

interface WallpaperLayoutProps {
  children: React.ReactNode;
  className?: string;
  wallpaper?: string;
}

const WALLPAPER_STORAGE_KEY = "homeio.wallpaper";
const DEFAULT_WALLPAPER = "/wallpapers/14.jpg";

function loadPersistedWallpaper() {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(WALLPAPER_STORAGE_KEY);
  return stored && stored.startsWith("/wallpapers/") ? stored : null;
}

function preloadImage(src: string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });
}

export function WallpaperLayout({
  children,
  className = "",
  wallpaper: externalWallpaper,
}: WallpaperLayoutProps) {
  const [activeWallpaper, setActiveWallpaper] = useState(() => {
    if (externalWallpaper) return externalWallpaper;
    return loadPersistedWallpaper() ?? DEFAULT_WALLPAPER;
  });
  const [transitionWallpaper, setTransitionWallpaper] = useState<string | null>(
    null,
  );

  const targetWallpaper = useMemo(
    () => externalWallpaper ?? loadPersistedWallpaper() ?? DEFAULT_WALLPAPER,
    [externalWallpaper],
  );

  useEffect(() => {
    if (!targetWallpaper || targetWallpaper === activeWallpaper) return;
    let cancelled = false;

    void preloadImage(targetWallpaper).then((ok) => {
      if (cancelled) return;
      if (ok) {
        setTransitionWallpaper(targetWallpaper);
        return;
      }
      setActiveWallpaper(targetWallpaper);
    });

    return () => {
      cancelled = true;
    };
  }, [activeWallpaper, targetWallpaper]);

  useEffect(() => {
    window.localStorage.setItem(WALLPAPER_STORAGE_KEY, activeWallpaper);
    applyWallpaperBrandCssVars(activeWallpaper);
  }, [activeWallpaper]);

  const handleTransitionComplete = () => {
    if (!transitionWallpaper) return;
    setActiveWallpaper(transitionWallpaper);
    setTransitionWallpaper(null);
  };

  const isLocalWallpaper = (path: string) => path.startsWith("/wallpapers/");

  return (
    <div
      className={`relative min-h-screen overflow-hidden ${className}`}
      onContextMenu={(event) => event.preventDefault()}
    >
      {/* Dynamic Background Image */}
      <div className="fixed inset-0 -z-10">
        <AnimatePresence mode="sync">
          <motion.div
            key={activeWallpaper}
            initial={{ opacity: 0.8, scale: 1.03, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0.35, scale: 1.04, filter: "blur(6px)" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <Image
              src={activeWallpaper}
              alt="Homeio Background"
              priority
              fill
              sizes="100vw"
              className="object-cover"
              unoptimized={isLocalWallpaper(activeWallpaper)}
            />
          </motion.div>
        </AnimatePresence>

        {transitionWallpaper && (
          <motion.div
            key={transitionWallpaper}
            initial={{ opacity: 0.4, scale: 1.05, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0.35, scale: 1.04, filter: "blur(6px)" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute inset-0"
            onAnimationComplete={handleTransitionComplete}
          >
            <Image
              src={transitionWallpaper}
              alt="Homeio Background"
              fill
              sizes="100vw"
              priority={false}
              className="object-cover"
              unoptimized={isLocalWallpaper(transitionWallpaper)}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/30 animate-pulse" />
          </motion.div>
        )}
      </div>

      {children}
    </div>
  );
}
