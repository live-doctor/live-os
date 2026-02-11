"use client";

import { updateCredentials } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  dialog as dialogTokens,
  input as inputTokens,
} from "@/components/ui/design-tokens";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Key, User } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  SettingsSectionShell,
  settingsActionButtonWideClass,
} from "./section-shell";

export function AccountSection() {
  const [nameOpen, setNameOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [currentPinForName, setCurrentPinForName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPinForPin, setCurrentPinForPin] = useState("");
  const [pending, startTransition] = useTransition();

  const handleChangeName = () => {
    startTransition(async () => {
      if (!newName.trim()) {
        toast.error("Enter a new username");
        return;
      }
      if (!currentPinForName.trim()) {
        toast.error("Enter your current PIN");
        return;
      }
      const res = await updateCredentials({
        newUsername: newName.trim(),
        currentPin: currentPinForName,
      });
      if (res.success) {
        toast.success("Username updated");
        setNameOpen(false);
        setNewName("");
        setCurrentPinForName("");
      } else {
        toast.error(res.error || "Failed to update username");
      }
    });
  };

  const handleChangePin = () => {
    startTransition(async () => {
      if (!newPin.trim() || !confirmPin.trim()) {
        toast.error("Enter and confirm the new PIN");
        return;
      }
      if (newPin !== confirmPin) {
        toast.error("PINs do not match");
        return;
      }
      if (!currentPinForPin.trim()) {
        toast.error("Enter your current PIN");
        return;
      }
      const res = await updateCredentials({
        newPin,
        currentPin: currentPinForPin,
      });
      if (res.success) {
        toast.success("PIN updated");
        setPinOpen(false);
        setNewPin("");
        setConfirmPin("");
        setCurrentPinForPin("");
      } else {
        toast.error(res.error || "Failed to update PIN");
      }
    });
  };

  return (
    <>
      <SettingsSectionShell
        icon={<User className="h-4 w-4 text-foreground" />}
        title="Account"
        subtitle="Your name and password"
        actions={[
          <Button
            key="name"
            variant="ghost"
            size="sm"
            className={settingsActionButtonWideClass}
            onClick={() => setNameOpen(true)}
          >
            <User className="h-4 w-4 mr-2" />
            Change name
          </Button>,
          <Button
            key="pin"
            variant="ghost"
            size="sm"
            className={settingsActionButtonWideClass}
            onClick={() => setPinOpen(true)}
          >
            <Key className="h-4 w-4 mr-2" />
            Change password
          </Button>,
        ]}
      />

      <Dialog open={nameOpen} onOpenChange={setNameOpen}>
        <DialogContent
          className={cn(dialogTokens.content, dialogTokens.size.sm)}
        >
          <DialogHeader>
            <DialogTitle>Change username</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground">New username</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. alice"
                className={cn(
                  inputTokens.base,
                  inputTokens.placeholder,
                  "border border-border",
                )}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Current PIN</Label>
              <Input
                value={currentPinForName}
                onChange={(e) => setCurrentPinForName(e.target.value)}
                placeholder="Enter current PIN"
                type="password"
                className={cn(
                  inputTokens.base,
                  inputTokens.placeholder,
                  "border border-border",
                )}
                inputMode="numeric"
              />
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleChangeName}
              disabled={pending}
            >
              {pending ? "Saving..." : "Save username"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent
          className={cn(dialogTokens.content, dialogTokens.size.sm)}
        >
          <DialogHeader>
            <DialogTitle>Change PIN</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground">New PIN</Label>
              <Input
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="6-digit PIN"
                type="password"
                inputMode="numeric"
                className={cn(
                  inputTokens.base,
                  inputTokens.placeholder,
                  "border border-border",
                )}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Confirm new PIN</Label>
              <Input
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Repeat PIN"
                type="password"
                inputMode="numeric"
                className={cn(
                  inputTokens.base,
                  inputTokens.placeholder,
                  "border border-border",
                )}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Current PIN</Label>
              <Input
                value={currentPinForPin}
                onChange={(e) => setCurrentPinForPin(e.target.value)}
                placeholder="Enter current PIN"
                type="password"
                inputMode="numeric"
                className={cn(
                  inputTokens.base,
                  inputTokens.placeholder,
                  "border border-border",
                )}
              />
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleChangePin}
              disabled={pending}
            >
              {pending ? "Saving..." : "Save PIN"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
