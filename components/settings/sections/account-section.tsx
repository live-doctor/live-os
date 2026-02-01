import { Button } from "@/components/ui/button";
import { Key, User } from "lucide-react";

export function AccountSection() {
  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-white -tracking-[0.01em] mb-1">
            Account
          </h4>
          <p className="text-xs text-white/60">Your name and password</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
          >
            <User className="h-4 w-4 mr-2" />
            Change name
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
          >
            <Key className="h-4 w-4 mr-2" />
            Change password
          </Button>
        </div>
      </div>
    </div>
  );
}
