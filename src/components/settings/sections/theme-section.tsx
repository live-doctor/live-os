import {
  type BackgroundStyle,
  type BorderStyle,
  useAppearanceTheme,
} from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { surface } from "@/components/ui/design-tokens";
import { useTheme } from "next-themes";
import { Palette } from "lucide-react";
import { useState } from "react";
import {
  SettingsSectionShell,
  settingsActionButtonWideClass,
  settingsCardClass,
} from "./section-shell";

const modeOptions = [
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
] as const;

const borderOptions = [
  { value: "soft", label: "Soft" },
  { value: "balanced", label: "Balanced" },
  { value: "strong", label: "Strong" },
] as const;

const backgroundOptions = [
  { value: "subtle", label: "Subtle" },
  { value: "balanced", label: "Balanced" },
  { value: "deep", label: "Deep" },
] as const;

function OptionGroup({
  title,
  options,
  selectedValue,
  onSelect,
}: {
  title: string;
  options: readonly { value: string; label: string }[];
  selectedValue?: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className={`text-xs ${surface.labelMuted}`}>{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selectedValue === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                active
                  ? "border-black/30 bg-black/15 text-black dark:border-white/40 dark:bg-white/20 dark:text-white"
                  : "border-black/20 bg-black/5 text-black/70 hover:bg-black/10 dark:border-white/15 dark:bg-white/10 dark:text-white/75 dark:hover:bg-white/15"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ThemeSection() {
  const { theme, setTheme } = useTheme();
  const { borderStyle, backgroundStyle, setBorderStyle, setBackgroundStyle } =
    useAppearanceTheme();
  const [open, setOpen] = useState(false);

  const modeLabel =
    theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";
  const borderLabel =
    borderStyle.charAt(0).toUpperCase() + borderStyle.slice(1);
  const backgroundLabel =
    backgroundStyle.charAt(0).toUpperCase() + backgroundStyle.slice(1);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/25 rounded-[12px]"
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <SettingsSectionShell
          icon={<Palette className="h-4 w-4 text-white" />}
          title="Theme"
          subtitle={`Mode: ${modeLabel} • Border: ${borderLabel} • Background: ${backgroundLabel}`}
          className={settingsCardClass}
          actions={
            <Button
              variant="ghost"
              size="sm"
              className={settingsActionButtonWideClass}
              onClick={() => setOpen(true)}
            >
              <Palette className="h-[14px] w-[14px] opacity-80" />
              Customize
            </Button>
          }
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Theme</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <OptionGroup
              title="Mode"
              options={modeOptions}
              selectedValue={theme}
              onSelect={(value) => setTheme(value)}
            />
            <OptionGroup
              title="Border"
              options={borderOptions}
              selectedValue={borderStyle}
              onSelect={(value) => setBorderStyle(value as BorderStyle)}
            />
            <OptionGroup
              title="Background"
              options={backgroundOptions}
              selectedValue={backgroundStyle}
              onSelect={(value) => setBackgroundStyle(value as BackgroundStyle)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
