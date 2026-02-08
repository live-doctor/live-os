"use client";

import { getCurrentUser, verifyPin, type AuthUser } from "@/app/actions/auth";
import {
  HOMEIO_DIALOG_CONTENT_GUTTER_CLASS,
  HOMEIO_GLASS_HEADER_CLASS,
  HOMEIO_GLASS_PANEL_CLASS,
} from "@/components/ui/dialog-chrome";
import { cn } from "@/lib/utils";
import { PIN_LENGTH } from "@/lib/config";
import { useEffect, useState } from "react";
import { PinInputForm } from "./pin-input-form";
import { UserHeader } from "./user-header";

type LockScreenProps = {
  open: boolean;
  onUnlock: () => void;
};

export function LockScreen({ open, onUnlock }: LockScreenProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Clear entry state when lock screen is shown
  useEffect(() => {
    if (open) {
      setPin("");
      setError("");
    }
  }, [open]);

  // Load current user
  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        // Silently fail - will show "User" as fallback
      })
      .finally(() => {
        if (active) setLoadingUser(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const friendlyName =
    user?.username ?? (loadingUser ? "Loading user..." : "User");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pin.length !== PIN_LENGTH || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const result = await verifyPin(pin);
      if (result.success) {
        setPin("");
        setError("");
        onUnlock();
      } else {
        setError(result.error || "Invalid PIN");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4 backdrop-blur-md">
      <div className={cn("w-full max-w-xl", HOMEIO_GLASS_PANEL_CLASS)}>
        <div className={cn("py-4 md:py-5", HOMEIO_GLASS_HEADER_CLASS, HOMEIO_DIALOG_CONTENT_GUTTER_CLASS)}>
          <UserHeader username={friendlyName} loading={loadingUser} />
        </div>
        <div className={cn("py-6 md:py-7", HOMEIO_DIALOG_CONTENT_GUTTER_CLASS)}>
          <PinInputForm
            pin={pin}
            onPinChange={setPin}
            error={error}
            submitting={submitting}
            username={friendlyName}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
