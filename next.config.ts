import type { NextConfig } from "next";

const buildWorkers = process.env.FRONTEND_BUILD_WORKERS;
const buildCPUs = buildWorkers === undefined ? undefined : Number(buildWorkers);
if (
  buildCPUs !== undefined &&
  (!Number.isSafeInteger(buildCPUs) || buildCPUs < 1)
) {
  throw new Error("FRONTEND_BUILD_WORKERS must be a positive integer.");
}

const nextConfig: NextConfig = {
  // Agent instructions live under docs/handoff.
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true,
  // Keep canonical, robots and social metadata inside the initial HTML head.
  htmlLimitedBots: /.*/,
  experimental: {
    turbopackFileSystemCacheForDev: false,
    ...(buildCPUs === undefined ? {} : { cpus: buildCPUs }),
  },
  // Only hostnames explicitly supplied by the local deployment may use dev assets.
  allowedDevOrigins: (process.env.EVERUNFOLD_DEV_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean),
  // Imported canonical paths may deliberately include a trailing slash.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
