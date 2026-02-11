"use client";

import { PinInput } from "@/components/auth/pin-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PIN_LENGTH } from "@/lib/config";
import { Loader2 } from "lucide-react";

type RegisterStepProps = {
  username: string;
  pin: string;
  confirmPin: string;
  loading: boolean;
  error: string;
  onUsernameChange: (value: string) => void;
  onPinChange: (value: string) => void;
  onConfirmPinChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
};

export function RegisterStep({
  username,
  pin,
  confirmPin,
  loading,
  error,
  onUsernameChange,
  onPinChange,
  onConfirmPinChange,
  onSubmit,
}: RegisterStepProps) {
  const pinMatch = pin.length === PIN_LENGTH && pin === confirmPin;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-lg border border-border bg-secondary/35 p-4 text-sm text-muted-foreground">
        This account has full system access. Choose a memorable username and a{" "}
        {PIN_LENGTH}-digit PIN.
      </div>

      <div className="space-y-2">
        <Label htmlFor="username" className="text-foreground">
          Username
        </Label>
        <Input
          id="username"
          type="text"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          placeholder="Choose a username"
          required
          minLength={3}
          autoComplete="username"
          className="border-border bg-secondary/55 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/35"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">At least 3 characters</p>
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Create PIN</Label>
        <div className="flex justify-center">
          <PinInput
            value={pin}
            onChange={onPinChange}
            disabled={loading}
            center
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Confirm PIN</Label>
        <div className="relative flex justify-center">
          <PinInput
            value={confirmPin}
            onChange={onConfirmPinChange}
            disabled={loading}
            center
          />
          {/* {pinMatch && (
            <CheckCircle2 className="absolute -right-8 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
          )} */}
        </div>
        {confirmPin.length === PIN_LENGTH && !pinMatch && (
          <p className="text-xs text-red-400 text-center">PINs do not match</p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading || !username || !pinMatch}
        className="w-full border border-border bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account…
          </>
        ) : (
          "Create admin account"
        )}
      </Button>
    </form>
  );
}
