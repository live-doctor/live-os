export type DockApp = {
  id: string;
  name: string;
  icon: string;
};

export type DailyAppUsage = {
  day: string;
  counts: Record<string, number>;
};

export type AppStoreSearchItem = {
  id: string;
  title: string;
  tagline?: string;
  icon?: string;
};

export const DEFAULT_WALLPAPER = "/wallpapers/14.jpg";
export const LOCK_STORAGE_KEY = "homeio.locked";
export const DAILY_APP_USAGE_KEY = "homeio.daily-app-opens";
export const DAILY_FREQUENT_THRESHOLD = 6;

export const DOCK_APPS: DockApp[] = [
  {
    id: "finder",
    name: "Finder",
    icon: "https://img.icons8.com/?size=100&id=12775&format=png&color=000000",
  },
  {
    id: "terminal",
    name: "Terminal",
    icon: "https://img.icons8.com/?size=100&id=WbRVMGxHh74X&format=png&color=000000",
  },
  {
    id: "monitor",
    name: "Monitor",
    icon: "https://img.icons8.com/?size=100&id=MT51l0HSFpBZ&format=png&color=000000",
  },
  {
    id: "store",
    name: "Store",
    icon: "https://img.icons8.com/?size=100&id=chS9utjiN2xq&format=png&color=000000",
  },
  {
    id: "settings",
    name: "Settings",
    icon: "https://img.icons8.com/?size=100&id=12784&format=png&color=000000",
  },
];
