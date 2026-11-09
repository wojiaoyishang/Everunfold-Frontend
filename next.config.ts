import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: { turbopackFileSystemCacheForDev: false },
  // Only hostnames explicitly supplied by the local deployment may use dev assets.
  allowedDevOrigins: (process.env.EVERUNFOLD_DEV_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean),
  // Imported canonical paths may deliberately include a trailing slash.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
