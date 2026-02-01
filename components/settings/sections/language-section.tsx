import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageSection() {
  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-white/15 bg-white/10 p-2">
            <Globe className="h-4 w-4 text-white" />
          </span>
          <div>
            <h4 className="text-sm font-semibold text-white -tracking-[0.01em] mb-1">
              Language
            </h4>
            <p className="text-xs text-white/60">Your preferred language</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
        >
          <Globe className="h-4 w-4 mr-2" />
          English
        </Button>
      </div>
    </div>
  );
}
