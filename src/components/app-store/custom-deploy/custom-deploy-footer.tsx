import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type CustomDeployFooterProps = {
  loading: boolean;
  onCancel: () => void;
  onDeploy: () => void;
};

export function CustomDeployFooter({ loading, onCancel, onDeploy }: CustomDeployFooterProps) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
      <Button
        variant="outline"
        onClick={onCancel}
        disabled={loading}
        className="border-border bg-secondary/60 text-foreground hover:bg-secondary"
      >
        Cancel
      </Button>
      <Button
        onClick={onDeploy}
        disabled={loading}
        className="rounded-lg bg-primary px-[15px] text-primary-foreground hover:bg-primary/90"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Deploying...
          </>
        ) : (
          "Deploy Application"
        )}
      </Button>
    </div>
  );
}
