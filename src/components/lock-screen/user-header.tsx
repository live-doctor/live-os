"use client";

import { iconBox, text } from "@/components/ui/design-tokens";
import { Lock } from "lucide-react";

interface UserHeaderProps {
  username: string;
  loading?: boolean;
}

export function UserHeader({ username, loading }: UserHeaderProps) {
  const displayName = loading ? "Loading user..." : username;

  return (
    <div className="flex items-center gap-3">
      <div className={iconBox.lg}>
        <Lock className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Locked</p>
        <p className="text-[24px] font-semibold leading-tight tracking-[-0.03em] text-white/85 md:text-[28px]">
          {displayName}
        </p>
        <p className={text.subdued}>Press Cmd + L anytime to lock the screen</p>
      </div>
    </div>
  );
}
