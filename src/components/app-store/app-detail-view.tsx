"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ExternalLink, Loader2, Settings2, X } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  AppDetailAboutCard,
  AppDetailInfoCard,
  AppDetailWhatsNewCard,
} from "./app-detail-sections";
import { RecommendationsSection } from "./recommendations-section";
import type { App } from "./types";

type AppDetailViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: App;
  isInstalled: boolean;
  screenshots: string[];
  loadingMedia: boolean;
  loadingCompose: boolean;
  installing: boolean;
  isProgressActive: boolean;
  progressPercent: number | null;
  onCustomInstall: () => void;
  onQuickInstall: () => void;
  onOpen: () => void;
  recommendations: App[];
  onSelectRecommendation?: (app: App) => void;
};

export function AppDetailView({
  open,
  onOpenChange,
  app,
  isInstalled,
  screenshots,
  loadingMedia,
  loadingCompose,
  installing,
  isProgressActive,
  progressPercent,
  onCustomInstall,
  onQuickInstall,
  onOpen,
  recommendations,
  onSelectRecommendation,
}: AppDetailViewProps) {
  const [iconSrc, setIconSrc] = useState(app.icon);
  const screenshotsList = useMemo(
    () => screenshots.filter((image) => typeof image === "string" && image.length > 0),
    [screenshots],
  );
  const supportUrl = app.repo ? `${app.repo.replace(/\/$/, "")}/issues` : undefined;
  const isInstalling = installing || Boolean(isProgressActive);

  const installButton = (
    <Button
      onClick={isInstalled ? onOpen : onQuickInstall}
      disabled={isInstalled ? false : isInstalling}
      className="h-[40px] rounded-full px-[15px] text-[15px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] hover:brightness-110 max-md:h-[30px] max-md:w-full max-md:text-[13px]"
      style={{ backgroundColor: "hsl(var(--color-brand, 211 100% 50%))" }}
    >
      {isInstalled ? (
        <>
          <ExternalLink className="h-4 w-4" />
          Open
        </>
      ) : isInstalling ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {progressPercent !== null ? `Installing ${progressPercent}%` : "Installing..."}
        </>
      ) : (
        "Install"
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92vh] max-w-[95vw] overflow-hidden rounded-[20px] border border-white/10 bg-[rgba(47,51,57,0.72)] p-0 text-white shadow-[0_28px_80px_rgba(0,0,0,0.48)] backdrop-blur-3xl sm:max-w-[1280px]"
      >
        <DialogTitle className="sr-only">{app.title}</DialogTitle>
        <DialogDescription className="sr-only">{app.tagline}</DialogDescription>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="absolute right-5 top-5 z-20 h-8 w-8 cursor-pointer rounded-full border border-white/15 bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>

        <ScrollArea className="h-[92vh] w-full min-w-0" viewportClassName="homeio-scrollarea-fit h-full w-full [&>div]:!block [&>div]:!w-full [&>div]:!min-w-0 [&>div]:!max-w-full [&>div]:!overflow-x-hidden">
          <div className="flex min-w-0 max-w-full flex-col gap-5 overflow-hidden px-3 pb-8 pt-6 md:px-[40px] md:pt-12 xl:px-[70px]">
            <div className="flex flex-col gap-8">
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="flex flex-col items-stretch gap-5 md:flex-row md:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 max-md:px-2.5 md:gap-5">
                    <div className="relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded-[12px] border border-slate-100/10 bg-white/10 lg:rounded-[20px]">
                      <Image
                        src={iconSrc}
                        alt={app.title}
                        fill
                        className="object-cover"
                        onError={() => setIconSrc("/default-application-icon.png")}
                      />
                    </div>
                    <div className="flex min-w-0 flex-col items-start gap-1.5 py-1 md:gap-2">
                      <h1 className="flex flex-wrap items-center gap-2 text-[16px] font-semibold leading-tight md:text-[24px]">
                        {app.title}
                      </h1>
                      <p className="line-clamp-2 w-full text-[12px] leading-tight text-white/50 md:line-clamp-1 md:text-[16px]">
                        {app.tagline}
                      </p>
                      <div className="flex-1" />
                      <div className="text-[12px] md:text-[13px]">{app.developer}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 max-md:w-full">
                    {!isInstalled && (
                      <Button
                        onClick={onCustomInstall}
                        variant="outline"
                        size="icon"
                        disabled={loadingCompose}
                        className="h-[40px] w-[40px] rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 max-md:h-[30px] max-md:w-[30px]"
                        title="Customize install"
                      >
                        {loadingCompose ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Settings2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {installButton}
                  </div>
                </div>
              </div>

              {screenshotsList.length > 0 && (
                <div className="scrollbar-hide flex gap-2 overflow-x-auto md:gap-5">
                  {screenshotsList.map((screenshot, index) => (
                    <a
                      key={`${screenshot}-${index}`}
                      href={screenshot}
                      target="_blank"
                      rel="noreferrer"
                      className="group aspect-[1.6] h-[200px] shrink-0 overflow-hidden rounded-[12px] bg-white/10 outline-none ring-inset ring-white/80 transition-opacity focus-visible:ring-4 md:h-[292px]"
                    >
                      <Image
                        src={screenshot}
                        alt={`${app.title} screenshot ${index + 1}`}
                        width={960}
                        height={600}
                        className="h-full w-full object-cover transition-opacity duration-500 group-focus-visible:opacity-80"
                        unoptimized
                      />
                    </a>
                  ))}
                </div>
              )}
              {screenshotsList.length === 0 && loadingMedia && (
                <p className="text-[13px] text-white/60">Loading screenshots...</p>
              )}

              <div className="hidden flex-row gap-5 lg:flex">
                <div className="flex flex-1 flex-col gap-5">
                  <AppDetailAboutCard overview={app.overview} tagline={app.tagline} />
                  <AppDetailWhatsNewCard
                    version={app.version}
                    releaseNotes={app.releaseNotes}
                    changelog={app.changelog}
                  />
                </div>
                <div className="flex max-w-sm flex-col gap-5">
                  <AppDetailInfoCard
                    version={app.version}
                    repo={app.repo}
                    website={app.website}
                    developer={app.developer}
                    supportUrl={supportUrl}
                    stable={app.stable}
                    deprecated={app.deprecated}
                    stars={app.stars}
                    monthlyPulls={app.monthlyPulls}
                  />
                  <RecommendationsSection
                    recommendations={recommendations}
                    onAppClick={(nextApp) => onSelectRecommendation?.(nextApp)}
                  />
                </div>
              </div>

              <div className="space-y-5 lg:hidden">
                <AppDetailAboutCard overview={app.overview} tagline={app.tagline} />
                <AppDetailInfoCard
                  version={app.version}
                  repo={app.repo}
                  website={app.website}
                  developer={app.developer}
                  supportUrl={supportUrl}
                  stable={app.stable}
                  deprecated={app.deprecated}
                  stars={app.stars}
                  monthlyPulls={app.monthlyPulls}
                />
                <AppDetailWhatsNewCard
                  version={app.version}
                  releaseNotes={app.releaseNotes}
                  changelog={app.changelog}
                />
                <RecommendationsSection
                  recommendations={recommendations}
                  onAppClick={(nextApp) => onSelectRecommendation?.(nextApp)}
                />
              </div>
            </div>
            <div className="mt-4 h-[84px] w-full shrink-0" />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
