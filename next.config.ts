import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow remote icon URLs for custom deploys and external stores.
    // We keep images unoptimized, so this is only used for URL allowlisting.
    remotePatterns: [
      { protocol: "https", hostname: "**", pathname: "/**" },
      { protocol: "http", hostname: "**", pathname: "/**" },
    ],
    dangerouslyAllowSVG: true,
    unoptimized: true,
  },
};

export default nextConfig;
