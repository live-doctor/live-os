"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";

type ServerAuthPromptProps = {
  credentials: { username: string; password: string };
  onCredentialsChange: (creds: { username: string; password: string }) => void;
  onAuthenticate: () => void;
  onBrowseAsGuest: () => void;
};

export function ServerAuthPrompt({
  credentials,
  onCredentialsChange,
  onAuthenticate,
  onBrowseAsGuest,
}: ServerAuthPromptProps) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
      <div className="flex items-center gap-2 text-amber-200 text-sm">
        <Lock className="h-4 w-4" />
        <span>Enter credentials to browse shares</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Username"
          value={credentials.username}
          onChange={(e) =>
            onCredentialsChange({ ...credentials, username: e.target.value })
          }
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9"
        />
        <Input
          type="password"
          placeholder="Password"
          value={credentials.password}
          onChange={(e) =>
            onCredentialsChange({ ...credentials, password: e.target.value })
          }
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9"
        />
      </div>
      <Button
        size="sm"
        className="bg-amber-500 hover:bg-amber-600 text-white"
        onClick={onAuthenticate}
        disabled={!credentials.username.trim()}
      >
        Authenticate
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="border border-white/15 text-white/80 hover:bg-white/10"
        onClick={onBrowseAsGuest}
      >
        Browse as guest
      </Button>
    </div>
  );
}
