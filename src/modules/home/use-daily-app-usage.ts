"use client";

import { useCallback, useState } from "react";
import { DAILY_APP_USAGE_KEY, type DailyAppUsage } from "./domain";

const todayDayKey = () => new Date().toISOString().slice(0, 10);

const readDailyAppUsage = (): DailyAppUsage => {
  if (typeof window === "undefined") {
    return { day: todayDayKey(), counts: {} };
  }

  try {
    const raw = window.localStorage.getItem(DAILY_APP_USAGE_KEY);
    if (!raw) return { day: todayDayKey(), counts: {} };

    const parsed = JSON.parse(raw) as DailyAppUsage;
    const isValid =
      parsed &&
      typeof parsed.day === "string" &&
      parsed.day === todayDayKey() &&
      parsed.counts &&
      typeof parsed.counts === "object";

    return isValid ? parsed : { day: todayDayKey(), counts: {} };
  } catch {
    return { day: todayDayKey(), counts: {} };
  }
};

export function useDailyAppUsage() {
  const [dailyAppUsage, setDailyAppUsage] = useState<DailyAppUsage>(
    readDailyAppUsage,
  );

  const trackAppOpen = useCallback((appId: string) => {
    setDailyAppUsage((prev) => {
      const today = todayDayKey();
      const baseCounts = prev.day === today ? prev.counts : {};
      const nextUsage = {
        day: today,
        counts: {
          ...baseCounts,
          [appId]: (baseCounts[appId] ?? 0) + 1,
        },
      };
      window.localStorage.setItem(DAILY_APP_USAGE_KEY, JSON.stringify(nextUsage));
      return nextUsage;
    });
  }, []);

  return { dailyAppUsage, trackAppOpen };
}
