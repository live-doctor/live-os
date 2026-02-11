import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Upload } from "lucide-react";
import type { ChangeEvent } from "react";

type DockerComposeTabProps = {
  loading: boolean;
  dockerCompose: string;
  onDockerComposeChange: (value: string) => void;
  onFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
};

export function DockerComposeTab({
  loading,
  dockerCompose,
  onDockerComposeChange,
  onFileUpload,
}: DockerComposeTabProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="compose-file" className="text-foreground">
            Docker Compose Configuration *
          </Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("file-upload")?.click()}
            disabled={loading}
            className="h-8 border-border bg-secondary/60 text-foreground hover:bg-secondary"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
          <input
            id="file-upload"
            type="file"
            accept=".yml,.yaml"
            onChange={onFileUpload}
            className="hidden"
          />
        </div>
        <Textarea
          id="compose-file"
          placeholder="version: '3.8'\nservices:\n  myapp:\n    image: nginx:latest\n    ports:\n      - '8080:80'\n    volumes:\n      - ./data:/data"
          value={dockerCompose}
          onChange={(e) => onDockerComposeChange(e.target.value)}
          className="min-h-[300px] w-full max-w-full whitespace-pre-wrap break-all break-words border-border bg-secondary/60 font-mono text-sm text-foreground placeholder:text-muted-foreground"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Paste your docker-compose.yml content or upload a file
        </p>
      </div>

      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-blue-700 dark:text-blue-200">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-300 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1 text-foreground">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Ensure ports don&apos;t conflict with existing apps</li>
              <li>Use absolute paths for volume mounts</li>
              <li>Container will restart automatically unless specified</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
