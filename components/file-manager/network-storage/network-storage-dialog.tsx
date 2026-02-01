"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import { CredentialPromptDialog } from "./credential-prompt-dialog";
import { DiscoveredServers } from "./discovered-servers";
import { ManualAddForm } from "./manual-add-form";
import { NetworkStorageHeader } from "./network-storage-header";
import { ServerSharesView } from "./server-shares-view";
import { ShareList } from "./share-list";
import type { NetworkStorageDialogProps } from "./types";
import { useNetworkStorage } from "./use-network-storage";

export function NetworkStorageDialog({
  open,
  onOpenChange,
}: NetworkStorageDialogProps) {
  const ns = useNetworkStorage(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-xl sm:max-w-2xl max-h-[50vh] bg-black/70 border border-white/10 backdrop-blur-xl shadow-xl p-0 gap-0 overflow-hidden ring-1 ring-white/10 rounded-2xl"
        aria-describedby="network-storage-description"
      >
        <NetworkStorageHeader
          view={ns.view}
          selectedServer={ns.selectedServer}
          loading={ns.loading}
          discovering={ns.discovering}
          onBack={ns.navigateBack}
          onAddManual={() => ns.setView("manual-add")}
          onRefresh={() => {
            ns.loadShares();
            ns.discover();
          }}
          onClose={() => onOpenChange(false)}
        />

        <ScrollArea className="h-[calc(85vh-72px)]">
          <div className="p-4 space-y-4">
            {ns.globalError && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>{ns.globalError}</div>
              </div>
            )}

            {ns.view === "list" && (
              <>
                <DiscoveredServers
                  hosts={ns.discovered}
                  discovering={ns.discovering}
                  onSelect={ns.handleSelectServer}
                />
                <ShareList
                  shares={ns.sortedShares}
                  loading={ns.loading}
                  busyShareId={ns.busyShareId}
                  onToggle={ns.handleToggle}
                  onRemove={ns.handleRemove}
                />
              </>
            )}

            {ns.view === "server-shares" && ns.selectedServer && (
              <ServerSharesView
                server={ns.selectedServer}
                serverInfo={ns.serverInfo}
                loadingServerInfo={ns.loadingServerInfo}
                shouldShowAuthPrompt={ns.shouldShowAuthPrompt}
                serverCredentials={ns.serverCredentials}
                onCredentialsChange={ns.setServerCredentials}
                onAuthenticate={ns.handleRetryWithCredentials}
                onBrowseAsGuest={ns.handleBrowseAsGuest}
                addingShare={ns.addingShare}
                formError={ns.formError}
                isShareAdded={ns.isShareAdded}
                onAddShare={ns.handleAddShareFromServer}
              />
            )}

            {ns.view === "manual-add" && (
              <ManualAddForm
                form={ns.form}
                onFormChange={ns.setForm}
                formError={ns.formError}
                addingShare={ns.addingShare}
                onSubmit={ns.handleManualAdd}
                onCancel={ns.navigateBack}
              />
            )}
          </div>
        </ScrollArea>

        {ns.discoverStatus && ns.view === "list" && (
          <div className="pointer-events-none absolute bottom-3 right-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[11px] text-white/70">
            {ns.discovering && (
              <Loader2 className="h-3 w-3 animate-spin text-cyan-200" />
            )}
            <span>{ns.discoverStatus}</span>
          </div>
        )}
      </DialogContent>

      <CredentialPromptDialog
        share={ns.credPrompt}
        credForm={ns.credForm}
        onCredFormChange={ns.setCredForm}
        busyShareId={ns.busyShareId}
        onConnect={ns.handleConnectWithPrompt}
        onClose={() => ns.setCredPrompt(null)}
      />
    </Dialog>
  );
}
