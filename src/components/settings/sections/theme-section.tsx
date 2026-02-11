import {
    type BackgroundStyle,
    type BorderStyle,
    type DialogBackground,
    useAppearanceTheme,
} from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { dialog as dialogTokens, surface, themeButton } from "@/components/ui/design-tokens";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Palette } from "lucide-react";
import { useTheme } from "next-themes";
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

const dialogBackgroundOptions = [
  { value: "background", label: "Background", swatch: "bg-background" },
  { value: "card", label: "Card", swatch: "bg-card" },
  { value: "secondary", label: "Secondary", swatch: "bg-secondary" },
  { value: "accent", label: "Accent", swatch: "bg-accent" },
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
              className={`${themeButton.base} ${
                active ? themeButton.active : themeButton.inactive
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
  const {
    borderStyle,
    backgroundStyle,
    dialogBackground,
    setBorderStyle,
    setBackgroundStyle,
    setDialogBackground,
  } = useAppearanceTheme();
  const [open, setOpen] = useState(false);

  const modeLabel =
    theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";
  const borderLabel =
    borderStyle.charAt(0).toUpperCase() + borderStyle.slice(1);
  const backgroundLabel =
    backgroundStyle.charAt(0).toUpperCase() + backgroundStyle.slice(1);
  const dialogLabel =
    dialogBackground.charAt(0).toUpperCase() + dialogBackground.slice(1);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/25 rounded-lg"
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <SettingsSectionShell
          icon={<Palette className="h-4 w-4 text-foreground" />}
          title="Theme"
          subtitle={`Mode: ${modeLabel} • Border: ${borderLabel} • Background: ${backgroundLabel} • Dialog: ${dialogLabel}`}
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
        <DialogContent className={cn(dialogTokens.content, dialogTokens.size.sm)}>
          <DialogHeader>
            <DialogTitle>Theme</DialogTitle>
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
            <div className="space-y-2">
              <p className={`text-xs ${surface.labelMuted}`}>
                Dialog background
              </p>
              <div className="grid grid-cols-2 gap-2">
                {dialogBackgroundOptions.map((option) => {
                  const active = dialogBackground === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setDialogBackground(option.value as DialogBackground)
                      }
                      className={`${themeButton.base} ${
                        active ? themeButton.active : themeButton.inactive
                      } flex items-center gap-2`}
                    >
                      <span
                        className={`h-4 w-4 rounded-full border border-border ${option.swatch}`}
                      />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
