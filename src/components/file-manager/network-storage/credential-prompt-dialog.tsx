"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { NetworkShare } from "./types";

type CredentialPromptDialogProps = {
  share: NetworkShare | null;
  credForm: { username: string; password: string };
  onCredFormChange: (form: { username: string; password: string }) => void;
  busyShareId: string | null;
  onConnect: () => void;
  onClose: () => void;
};

export function CredentialPromptDialog({
  share,
  credForm,
  onCredFormChange,
  busyShareId,
  onConnect,
  onClose,
}: CredentialPromptDialogProps) {
  const busy = share ? busyShareId === share.id : false;

  return (
    <Dialog open={!!share} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] overflow-hidden rounded-[20px] border border-white/10 bg-[rgba(47,51,57,0.72)] p-0 text-white shadow-[0_28px_80px_rgba(0,0,0,0.48)] backdrop-blur-3xl sm:max-w-md">
        <div className="space-y-4 p-5">
          <DialogTitle className="text-[20px] font-bold leading-none tracking-[-0.03em] text-white/80">
            Connect to {share?.host}
          </DialogTitle>
          <div className="space-y-2">
            <Input
              placeholder="Username (leave blank for guest)"
              value={credForm.username}
              onChange={(e) =>
                onCredFormChange({ ...credForm, username: e.target.value })
              }
              className="h-9 border-white/15 bg-white/5 text-white placeholder:text-white/40"
            />
            <Input
              type="password"
              placeholder="Password (optional)"
              value={credForm.password}
              onChange={(e) =>
                onCredFormChange({ ...credForm, password: e.target.value })
              }
              className="h-9 border-white/15 bg-white/5 text-white placeholder:text-white/40"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} className="text-white">
              Cancel
            </Button>
            <Button
              onClick={onConnect}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
