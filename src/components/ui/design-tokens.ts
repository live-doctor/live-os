/**
 * Shared Design Tokens for consistent styling across all components
 * Follow these tokens to maintain design consistency
 */

// Card Styles
export const card = {
  base: "bg-card/95 text-card-foreground backdrop-blur-xl rounded-lg border border-border shadow-lg",
  padding: {
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
  },
  hover: "hover:border-border/70 hover:bg-secondary/60",
  selected: "bg-primary/10 border-primary/30 ring-1 ring-primary/20",
} as const;

// Shared glass surfaces used on home widgets, dock, and app tiles
export const surface = {
  panel: "homeio-glass-surface",
  panelInteractive:
    "homeio-glass-surface-interactive transition-[transform,box-shadow,border-color,background-color] duration-300 hover:shadow-[0_14px_42px_rgba(0,0,0,0.45)]",
  label: "homeio-surface-label",
  labelMuted: "homeio-surface-label-muted",
} as const;

// Dialog Styles
export const dialog = {
  content:
    "overflow-hidden rounded-lg border border-border bg-[color:var(--dialog-background)] text-foreground shadow-[0_28px_80px_rgba(0,0,0,0.48)] backdrop-blur-3xl",
  size: {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-[760px]",
    xl: "sm:max-w-3xl",
    full: "max-h-[90vh] max-w-[95vw]",
  },
  padding: {
    default: "p-6",
    roomy: "p-4 sm:p-6",
    none: "p-0",
  },
  header:
    "border-b border-border bg-gradient-to-r from-secondary/50 via-secondary/25 to-transparent backdrop-blur",
} as const;

// Typography
export const text = {
  // Labels
  label: "text-xs text-muted-foreground -tracking-[0.01em]",
  labelUppercase: "text-xs text-muted-foreground -tracking-[0.01em] uppercase",

  // Values
  value: "text-foreground",
  valueLarge: "text-2xl font-bold text-foreground -tracking-[0.02em]",
  valueSmall: "text-sm font-medium text-foreground -tracking-[0.01em]",

  // Headings
  heading: "text-lg font-semibold text-foreground -tracking-[0.01em]",
  headingLarge: "text-2xl font-semibold text-foreground",
  headingXL: "text-4xl font-semibold text-foreground leading-tight",

  // Subdued
  muted: "text-xs text-muted-foreground -tracking-[0.01em]",
  subdued: "text-sm text-muted-foreground",
} as const;

// Badge/Tag
export const badge = {
  base: "rounded-lg border border-border bg-secondary/60 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-muted-foreground",
} as const;

// Status Indicators
export const statusDot = {
  base: "w-2 h-2 rounded-full",
  live: "bg-cyan-500",
  connected: "bg-green-400",
  disconnected: "bg-red-400",
  warning: "bg-yellow-400",
} as const;

// Colors by type
export const colors = {
  cpu: "#06b6d4", // cyan
  memory: "#f59e0b", // amber/orange
  gpu: "#a855f7", // purple
  storage: "#10b981", // emerald/green
  network: {
    upload: "#8b5cf6", // violet
    download: "#ec4899", // pink
  },
} as const;

// Icon containers
export const iconBox = {
  sm: "h-8 w-8 rounded-lg bg-secondary/60 flex items-center justify-center",
  md: "h-10 w-10 rounded-lg bg-secondary/60 border border-border flex items-center justify-center",
  lg: "h-14 w-14 rounded-lg border border-border bg-secondary/60 flex items-center justify-center",
} as const;

// Theme option buttons
export const themeButton = {
  base: "rounded-lg border px-3 py-1.5 text-xs transition-colors",
  active:
    "border-primary/30 bg-primary/10 text-foreground font-medium ring-1 ring-primary/20",
  inactive:
    "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
} as const;

// Buttons
export const button = {
  ghost: "border border-border bg-secondary/60 hover:bg-secondary text-foreground",
  closeIcon:
    "h-10 w-10 rounded-lg border border-border bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors",
} as const;

// Alert boxes
export const alert = {
  error: "rounded-lg border border-red-500/30 bg-red-500/10 p-4",
  warning: "rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4",
  info: "rounded-lg border border-blue-500/30 bg-blue-500/10 p-4",
  success: "rounded-lg border border-green-500/30 bg-green-500/10 p-4",
} as const;

// Inputs
export const input = {
  base: "bg-input text-foreground border-border backdrop-blur",
  placeholder: "placeholder:text-muted-foreground",
} as const;

// Progress bars
export const progressBar = {
  track: "h-1 w-full overflow-hidden rounded-full bg-secondary/60",
  fill: "h-full transition-all duration-300",
} as const;

// Utility function to combine classes
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Get color based on percentage (for metrics)
export function getMetricColor(percentage: number): string {
  if (percentage < 80) return colors.cpu;
  if (percentage < 90) return "#f59e0b"; // yellow
  return "#ef4444"; // red
}
