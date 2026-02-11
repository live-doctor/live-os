import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowDownToLine, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

type DockerRunConverterProps = {
  loading: boolean;
  onConverted: (command: string) => Promise<void>;
};

export function DockerRunConverter({
  loading,
  onConverted,
}: DockerRunConverterProps) {
  const [command, setCommand] = useState("");
  const [converting, setConverting] = useState(false);

  const handleConvert = useCallback(async () => {
    if (!command.trim()) return;
    setConverting(true);
    try {
      await onConverted(command);
      setCommand("");
    } finally {
      setConverting(false);
    }
  }, [command, onConverted]);

  return (
    <div className="space-y-2">
      <Label className="text-foreground">
        Convert Docker Run Command (optional)
      </Label>
      <div className="flex gap-2">
        <Input
          placeholder="docker run -d --name myapp -p 8080:80 nginx:latest"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          className="flex-1 border-border bg-secondary/60 font-mono text-sm text-foreground placeholder:text-muted-foreground"
          disabled={loading || converting}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConvert();
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleConvert}
          disabled={loading || converting || !command.trim()}
          className="h-9 whitespace-nowrap border-border bg-secondary/60 text-foreground hover:bg-secondary"
        >
          {converting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <ArrowDownToLine className="h-4 w-4 mr-1" />
          )}
          Convert
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Paste a docker run command to auto-convert it to Compose format
      </p>
    </div>
  );
}
