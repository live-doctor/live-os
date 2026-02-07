"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export type BorderStyle = "soft" | "balanced" | "strong";
export type BackgroundStyle = "subtle" | "balanced" | "deep";

type AppearanceContextValue = {
  borderStyle: BorderStyle;
  backgroundStyle: BackgroundStyle;
  setBorderStyle: (value: BorderStyle) => void;
  setBackgroundStyle: (value: BackgroundStyle) => void;
};

const BORDER_KEY = "homeio-border-style";
const BACKGROUND_KEY = "homeio-background-style";

const borderAlphaByStyle: Record<BorderStyle, string> = {
  soft: "0.12",
  balanced: "0.2",
  strong: "0.32",
};

const backgroundAlphaByStyle: Record<
  BackgroundStyle,
  { bg: string; hover: string }
> = {
  subtle: { bg: "0.58", hover: "0.68" },
  balanced: { bg: "0.7", hover: "0.8" },
  deep: { bg: "0.82", hover: "0.9" },
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function applyAppearanceVars(
  borderStyle: BorderStyle,
  backgroundStyle: BackgroundStyle,
) {
  const root = document.documentElement;
  root.style.setProperty("--surface-border-alpha", borderAlphaByStyle[borderStyle]);
  root.style.setProperty(
    "--surface-bg-alpha",
    backgroundAlphaByStyle[backgroundStyle].bg,
  );
  root.style.setProperty(
    "--surface-bg-hover-alpha",
    backgroundAlphaByStyle[backgroundStyle].hover,
  );
}

function AppearanceProvider({ children }: { children: ReactNode }) {
  const [borderStyle, setBorderStyleState] = useState<BorderStyle>(() => {
    if (typeof window === "undefined") return "balanced";
    const storedBorder = window.localStorage.getItem(BORDER_KEY);
    if (
      storedBorder === "soft" ||
      storedBorder === "balanced" ||
      storedBorder === "strong"
    ) {
      return storedBorder;
    }
    return "balanced";
  });
  const [backgroundStyle, setBackgroundStyleState] = useState<BackgroundStyle>(
    () => {
      if (typeof window === "undefined") return "balanced";
      const storedBackground = window.localStorage.getItem(BACKGROUND_KEY);
      if (
        storedBackground === "subtle" ||
        storedBackground === "balanced" ||
        storedBackground === "deep"
      ) {
        return storedBackground;
      }
      return "balanced";
    },
  );

  useEffect(() => {
    applyAppearanceVars(borderStyle, backgroundStyle);
    window.localStorage.setItem(BORDER_KEY, borderStyle);
    window.localStorage.setItem(BACKGROUND_KEY, backgroundStyle);
  }, [borderStyle, backgroundStyle]);

  const setBorderStyle = useCallback((value: BorderStyle) => {
    setBorderStyleState(value);
  }, []);

  const setBackgroundStyle = useCallback((value: BackgroundStyle) => {
    setBackgroundStyleState(value);
  }, []);

  const value = useMemo(
    () => ({
      borderStyle,
      backgroundStyle,
      setBorderStyle,
      setBackgroundStyle,
    }),
    [backgroundStyle, borderStyle, setBackgroundStyle, setBorderStyle],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AppearanceProvider>{children}</AppearanceProvider>
    </NextThemesProvider>
  );
}

export function useAppearanceTheme() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearanceTheme must be used inside AppThemeProvider");
  }
  return context;
}
