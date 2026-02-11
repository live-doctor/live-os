import { Button } from "@/components/ui/button";
import { dialog as dialogTokens } from "@/components/ui/design-tokens";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";
import { useState } from "react";
import {
    SettingsSectionShell,
    settingsActionButtonWideClass,
} from "./section-shell";

export function LanguageSection() {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState("English");

  return (
    <>
      <SettingsSectionShell
        icon={<Globe className="h-4 w-4 text-foreground" />}
        title="Language"
        subtitle="Your preferred language"
        actions={
          <Button
            variant="ghost"
            size="sm"
            className={settingsActionButtonWideClass}
            onClick={() => setOpen(true)}
          >
            <Globe className="h-4 w-4 mr-2" />
            {language}
          </Button>
        }
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(dialogTokens.content, "max-w-[520px]", dialogTokens.padding.none)}
        >
          <div className="space-y-6 px-5 py-6">
            <DialogTitle className="sr-only">Language</DialogTitle>
            <DialogDescription className="sr-only">
              Choose your preferred interface language.
            </DialogDescription>
            <h2 className="text-left text-[17px] font-semibold leading-snug tracking-[-0.02em] text-foreground">
              Language
            </h2>
            <div className="space-y-3">
              {["English", "French", "Spanish"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLanguage(item)}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-[14px] transition-all ${
                    language === item
                      ? "border-border bg-secondary/60 text-foreground"
                      : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/60"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
