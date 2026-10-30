import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Imported canonical paths may deliberately include a trailing slash.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
