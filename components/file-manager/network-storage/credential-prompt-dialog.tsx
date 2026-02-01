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
      <DialogContent className="max-w-sm bg-zinc-950/90 border border-white/10 text-white">
        <DialogTitle className="text-lg font-semibold">
          Connect to {share?.host}
        </DialogTitle>
        <div className="space-y-2">
          <Input
            placeholder="Username (leave blank for guest)"
            value={credForm.username}
            onChange={(e) =>
              onCredFormChange({ ...credForm, username: e.target.value })
            }
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9"
          />
          <Input
            type="password"
            placeholder="Password (optional)"
            value={credForm.password}
            onChange={(e) =>
              onCredFormChange({ ...credForm, password: e.target.value })
            }
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="text-white">
            Cancel
          </Button>
          <Button
            onClick={onConnect}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
            disabled={busy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
