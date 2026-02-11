import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FlaskConical, Settings } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
    SettingsSectionShell,
    settingsActionButtonWideClass,
} from "./section-shell";

type AdvancedSettingsSectionProps = {
  onOpenDialog: () => void;
};

export function AdvancedSettingsSection({
  onOpenDialog,
}: AdvancedSettingsSectionProps) {
  return (
    <SettingsSectionShell
      icon={<Settings className="h-4 w-4 text-foreground" />}
      title="Advanced"
      subtitle="Network tweaks and maintenance tools"
      actions={
        <Button
          variant="ghost"
          size="sm"
          className={settingsActionButtonWideClass}
          onClick={onOpenDialog}
        >
          Open
        </Button>
      }
    />
  );
}

const advancedRowClass =
  "pointer-events-none flex items-start gap-x-2 rounded-lg border border-border bg-secondary/40 p-4";

const advancedActionClass =
  "pointer-events-auto inline-flex h-[30px] shrink-0 items-center justify-center gap-1.5 self-center rounded-full border border-border bg-secondary/60 px-2.5 text-[12px] font-medium tracking-[-0.02em] text-foreground transition-[color,background-color,box-shadow] duration-300 hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring/30";

function AdvancedToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "peer pointer-events-auto inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-[background,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        checked ? "bg-primary" : "bg-secondary/60",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

function AdvancedRow({
  title,
  description,
  action,
  titleSuffix,
}: {
  title: string;
  description: string;
  action: ReactNode;
  titleSuffix?: ReactNode;
}) {
  return (
    <div className={advancedRowClass}>
      <div className="flex-1 space-y-1">
        <h3 className="text-[14px] font-medium leading-tight text-foreground">
          {title}
          {titleSuffix}
        </h3>
        <p className="text-[13px] leading-tight text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function AdvancedSettingsContent() {
  const [betaEnabled, setBetaEnabled] = useState(false);
  const [cloudflareDnsEnabled, setCloudflareDnsEnabled] = useState(true);
  const [remoteTorEnabled, setRemoteTorEnabled] = useState(false);

  return (
    <div className="space-y-6 px-5 py-6">
      <div className="flex flex-col space-y-1.5">
        <h2 className="text-left text-[17px] font-semibold leading-snug tracking-[-0.02em] text-foreground">
          Advanced settings
        </h2>
      </div>

      <div className="flex flex-col gap-y-3">
        <AdvancedRow
          title="Terminal"
          description="Run custom commands on the host or within an app"
          action={
            <button type="button" className={advancedActionClass}>
              Open
            </button>
          }
        />

        <AdvancedRow
          title="Beta Program"
          titleSuffix={
            <FlaskConical className="ml-1 inline-block h-[14px] w-[14px] opacity-50" />
          }
          description="Opt in to receive beta updates, gain early access to new features, and help us refine them by providing your feedback. Beta updates might be unstable, and troubleshooting may require familiarity with terminal."
          action={
            <AdvancedToggle checked={betaEnabled} onChange={setBetaEnabled} />
          }
        />

        <AdvancedRow
          title="Cloudflare DNS"
          description="Cloudflare DNS offers better network reliability. Disable to use your router's DNS settings."
          action={
            <AdvancedToggle
              checked={cloudflareDnsEnabled}
              onChange={setCloudflareDnsEnabled}
            />
          }
        />

        <AdvancedRow
          title="Remote Tor access"
          description="Access your server from anywhere using a Tor browser"
          action={
            <AdvancedToggle
              checked={remoteTorEnabled}
              onChange={setRemoteTorEnabled}
            />
          }
        />

        <div className={advancedRowClass}>
          <div className="flex-1 space-y-1">
            <h3 className="text-[14px] font-medium leading-tight text-foreground">
              Factory Reset
            </h3>
            <p className="text-[13px] leading-tight text-muted-foreground">
              Erase all your data and apps, restoring Homeio to default settings
            </p>
          </div>
          <button
            type="button"
            className="pointer-events-auto inline-flex h-[30px] shrink-0 items-center justify-center gap-1.5 self-center rounded-full border border-destructive/40 bg-destructive/90 px-2.5 text-[12px] font-medium tracking-[-0.02em] text-destructive-foreground transition-[color,background-color,box-shadow] duration-300 hover:bg-destructive focus:outline-none focus:ring-2 focus:ring-destructive/40"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
