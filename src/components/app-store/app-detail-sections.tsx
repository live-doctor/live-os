"use client";

import type { AppChangelogEntry } from "./types";

interface AboutCardProps {
  overview?: string;
  tagline?: string;
}

export function AppDetailAboutCard({ overview, tagline }: AboutCardProps) {
  return (
    <section className="rounded-[12px] bg-white/4 px-5 py-[30px] md:px-[26px] md:py-[36px]">
      <h2 className="text-[12px] font-semibold uppercase tracking-normal text-white/50">
        About
      </h2>
      <div className="mt-2.5 text-[15px] leading-snug text-white/85">
        <p className="whitespace-pre-wrap break-words">{overview || tagline}</p>
      </div>
    </section>
  );
}

interface WhatsNewCardProps {
  version?: string;
  releaseNotes?: string;
  changelog?: AppChangelogEntry[];
}

export function AppDetailWhatsNewCard({
  version,
  releaseNotes,
  changelog = [],
}: WhatsNewCardProps) {
  const hasReleaseNotes = Boolean(releaseNotes && releaseNotes.trim().length > 0);
  const hasChangelog = changelog.length > 0;
  if (!hasReleaseNotes && !hasChangelog) return null;

  return (
    <section className="rounded-[12px] bg-white/4 px-5 py-[30px] md:px-[26px] md:py-[36px]">
      <h2 className="text-[12px] font-semibold uppercase tracking-normal text-white/50">
        What&apos;s New
      </h2>
      {version && <h3 className="mt-2.5 text-[16px] font-semibold">Version {version}</h3>}
      {hasReleaseNotes && (
        <div className="mt-2.5 text-[15px] leading-snug text-white/85">
          <p className="whitespace-pre-wrap break-words">{releaseNotes}</p>
        </div>
      )}
      {hasChangelog && (
        <ul className="mt-3 space-y-2 text-[14px] leading-snug text-white/80">
          {changelog.slice(0, 8).map((entry, index) => (
            <li key={`${entry.date ?? "no-date"}-${index}`}>
              {entry.date ? <span className="text-white/50">{entry.date}: </span> : null}
              <span>{entry.desc}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface InfoCardProps {
  version?: string;
  repo?: string;
  website?: string;
  developer: string;
  supportUrl?: string;
  stable?: boolean;
  deprecated?: boolean;
  stars?: number;
  monthlyPulls?: number;
}

export function AppDetailInfoCard({
  version,
  repo,
  website,
  developer,
  supportUrl,
  stable,
  deprecated,
  stars,
  monthlyPulls,
}: InfoCardProps) {
  const numberFormatter = new Intl.NumberFormat();

  return (
    <section className="rounded-[12px] bg-white/4 px-5 py-[30px] md:px-[26px] md:py-[36px]">
      <h2 className="text-[12px] font-semibold uppercase tracking-normal text-white/50">
        Info
      </h2>
      <dl className="mt-5 space-y-3">
        <div className="flex items-center gap-2">
          <dt className="flex-1 text-[14px] text-white/50">Version</dt>
          <dd className="text-right text-[14px] font-medium">{version || "Unknown"}</dd>
        </div>
        {repo && (
          <div className="flex items-center gap-2">
            <dt className="flex-1 text-[14px] text-white/50">Source Code</dt>
            <dd className="text-right text-[14px] font-medium">
              <a
                href={repo}
                target="_blank"
                rel="noreferrer"
                className="text-brand-lighter transition-colors hover:text-brand hover:underline underline-offset-4 decoration-brand/30"
              >
                Public
              </a>
            </dd>
          </div>
        )}
        <div className="flex items-center gap-2">
          <dt className="flex-1 text-[14px] text-white/50">Developer</dt>
          <dd className="text-right text-[14px] font-medium">
            {website ? (
              <a
                href={website}
                target="_blank"
                rel="noreferrer"
                className="text-brand-lighter transition-colors hover:text-brand hover:underline underline-offset-4 decoration-brand/30"
              >
                {developer}
              </a>
            ) : (
              developer
            )}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="flex-1 text-[14px] text-white/50">Compatibility</dt>
          <dd className="text-right text-[14px] font-medium">Compatible</dd>
        </div>
        {typeof stable === "boolean" && (
          <div className="flex items-center gap-2">
            <dt className="flex-1 text-[14px] text-white/50">Stable</dt>
            <dd className="text-right text-[14px] font-medium">
              {stable ? "Yes" : "No"}
            </dd>
          </div>
        )}
        {typeof deprecated === "boolean" && (
          <div className="flex items-center gap-2">
            <dt className="flex-1 text-[14px] text-white/50">Deprecated</dt>
            <dd className="text-right text-[14px] font-medium">
              {deprecated ? "Yes" : "No"}
            </dd>
          </div>
        )}
        {typeof stars === "number" && (
          <div className="flex items-center gap-2">
            <dt className="flex-1 text-[14px] text-white/50">Stars</dt>
            <dd className="text-right text-[14px] font-medium">
              {numberFormatter.format(stars)}
            </dd>
          </div>
        )}
        {typeof monthlyPulls === "number" && (
          <div className="flex items-center gap-2">
            <dt className="flex-1 text-[14px] text-white/50">Monthly pulls</dt>
            <dd className="text-right text-[14px] font-medium">
              {numberFormatter.format(monthlyPulls)}
            </dd>
          </div>
        )}
      </dl>
      {supportUrl && (
        <a
          href={supportUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex text-[14px] font-medium text-brand-lighter transition-colors hover:text-brand"
        >
          Get support
        </a>
      )}
    </section>
  );
}
