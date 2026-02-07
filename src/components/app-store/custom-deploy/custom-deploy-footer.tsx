import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type CustomDeployFooterProps = {
  loading: boolean;
  onCancel: () => void;
  onDeploy: () => void;
};

export function CustomDeployFooter({ loading, onCancel, onDeploy }: CustomDeployFooterProps) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
      <Button
        variant="outline"
        onClick={onCancel}
        disabled={loading}
        className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
      >
        Cancel
      </Button>
      <Button
        onClick={onDeploy}
        disabled={loading}
        className="rounded-full bg-brand px-[15px] text-white hover:bg-brand-lighter"
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
