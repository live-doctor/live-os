"use client";

import { Button } from "@/components/ui/button";
import {
    AlertCircle,
    BadgeCheck,
    Folder,
    Loader2,
    Plus,
    Server,
} from "lucide-react";
import { ServerAuthPrompt } from "./server-auth-prompt";
import type { DiscoveredHost, ServerInfo } from "./types";

type ServerSharesViewProps = {
  server: DiscoveredHost;
  serverInfo: ServerInfo | null;
  loadingServerInfo: boolean;
  shouldShowAuthPrompt: boolean;
  serverCredentials: { username: string; password: string };
  onCredentialsChange: (creds: { username: string; password: string }) => void;
  onAuthenticate: () => void;
  onBrowseAsGuest: () => void;
  addingShare: string | null;
  formError: string | null;
  isShareAdded: (shareName: string) => boolean;
  onAddShare: (shareName: string) => void;
};

export function ServerSharesView({
  server,
  serverInfo,
  loadingServerInfo,
  shouldShowAuthPrompt,
  serverCredentials,
  onCredentialsChange,
  onAuthenticate,
  onBrowseAsGuest,
  addingShare,
  formError,
  isShareAdded,
  onAddShare,
}: ServerSharesViewProps) {
  if (loadingServerInfo) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-6 justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-200" />
        <span className="text-sm text-white/70">
          Loading shares from {server.host}...
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Server info header */}
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="h-12 w-12 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center">
          <Server className="h-6 w-6 text-cyan-200" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold">
              {server.name || server.host}
            </span>
            {serverInfo?.isHOMEIO && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 text-cyan-200 text-[10px] px-2 py-0.5 uppercase tracking-wide">
                Homeio
              </span>
            )}
          </div>
          <div className="text-xs text-white/60">
            {server.ip || server.host}
            {(serverInfo?.shares.length ?? 0) > 0 &&
              ` • ${serverInfo?.shares.length} share${serverInfo?.shares.length !== 1 ? "s" : ""} available`}
          </div>
        </div>
      </div>

      {shouldShowAuthPrompt && (
        <ServerAuthPrompt
          credentials={serverCredentials}
          onCredentialsChange={onCredentialsChange}
          onAuthenticate={onAuthenticate}
          onBrowseAsGuest={onBrowseAsGuest}
        />
      )}

      {serverInfo?.error && !serverInfo.requiresAuth && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>{serverInfo.error}</div>
        </div>
      )}

      {serverInfo &&
        !serverInfo.requiresAuth &&
        serverInfo.shares.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-white/60 uppercase tracking-[0.2em] px-1">
              Available Shares
            </div>
            {serverInfo.shares.map((shareName) => {
              const alreadyAdded = isShareAdded(shareName);
              return (
                <div
                  key={shareName}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3"
                >
                  <div className="h-10 w-10 rounded-lg bg-blue-500/15 border border-blue-400/30 flex items-center justify-center">
                    <Folder className="h-5 w-5 text-blue-200" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium">
                      {shareName}
                    </div>
                    <div className="text-[11px] text-white/60">
                      {`//${server.host}/${shareName}`}
                    </div>
                  </div>
                  {alreadyAdded ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-200 text-[11px] px-3 py-1">
                      <BadgeCheck className="h-3 w-3" /> Added
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-cyan-500 hover:bg-cyan-600 text-white"
                      onClick={() => onAddShare(shareName)}
                      disabled={addingShare === shareName}
                    >
                      {addingShare === shareName ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-1" />
                      )}
                      Add
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

      {serverInfo &&
        !serverInfo.requiresAuth &&
        !serverInfo.error &&
        serverInfo.shares.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center">
            <Folder className="h-8 w-8 text-white/30" />
            <div className="text-sm text-white/70">
              No shares found on this server
            </div>
          </div>
        )}

      {formError && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>{formError}</div>
        </div>
      )}
    </>
  );
}
