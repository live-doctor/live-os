"use client";

import Image from "next/image";

const DEFAULT_APP_ICON = "/default-application-icon.png";

type AppSearchResultIconProps = {
  icon?: string;
  title: string;
};

export function AppSearchResultIcon({ icon, title }: AppSearchResultIconProps) {
  return (
    <span className="relative block h-full w-full overflow-hidden rounded-[6px] sm:rounded-lg">
      <Image
        src={icon || DEFAULT_APP_ICON}
        alt={`${title} icon`}
        fill
        sizes="24px"
        className="object-cover"
        onError={(event) => {
          event.currentTarget.src = DEFAULT_APP_ICON;
        }}
      />
    </span>
  );
}
