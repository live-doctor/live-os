import { dialog } from "./design-tokens";

export const HOMEIO_DIALOG_SHELL_CLASS =
  `${dialog.content} max-h-[92vh] max-w-[95vw] p-0 sm:max-w-[1280px]`;

export const HOMEIO_DIALOG_CLOSE_BUTTON_CLASS =
  "absolute right-5 top-5 z-20 h-8 w-8 cursor-pointer rounded-lg border border-border bg-secondary/50 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

export const HOMEIO_DIALOG_CONTENT_GUTTER_CLASS =
  "px-3 md:px-[28px] xl:px-[40px]";

export const HOMEIO_DIALOG_TITLE_CLASS =
  "text-[20px] font-bold leading-none tracking-[-0.03em] text-foreground md:text-[32px]";

export const HOMEIO_DIALOG_SUBTITLE_CLASS = "text-[13px] text-muted-foreground";

export const HOMEIO_GLASS_PANEL_CLASS =
  dialog.content;

export const HOMEIO_GLASS_HEADER_CLASS =
  "border-b border-border bg-gradient-to-r from-secondary/50 via-secondary/25 to-transparent backdrop-blur";

export const HOMEIO_CONTEXT_MENU_SURFACE_CLASS =
  "overflow-hidden rounded-lg border border-border bg-popover/98 text-popover-foreground shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-3xl";
