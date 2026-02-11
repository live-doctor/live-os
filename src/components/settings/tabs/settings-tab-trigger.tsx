import { TabsTrigger } from "@/components/ui/tabs";

interface SettingsTabTriggerProps {
  value: string;
  children: React.ReactNode;
}

export function SettingsTabTrigger({ value, children }: SettingsTabTriggerProps) {
  return (
    <TabsTrigger
      value={value}
      className="data-[state=active]:bg-secondary/60 data-[state=active]:text-foreground text-muted-foreground"
    >
      {children}
    </TabsTrigger>
  );
}
