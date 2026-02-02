import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import {
  SettingsSectionShell,
  settingsActionButtonWideClass,
} from "./section-shell";

export function LanguageSection() {
  return (
    <SettingsSectionShell
      icon={<Globe className="h-4 w-4 text-white" />}
      title="Language"
      subtitle="Your preferred language"
      actions={
        <Button
          variant="ghost"
          size="sm"
          className={settingsActionButtonWideClass}
        >
          <Globe className="h-4 w-4 mr-2" />
          English
        </Button>
      }
    />
  );
}
