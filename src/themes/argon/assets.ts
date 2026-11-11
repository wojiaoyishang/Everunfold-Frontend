/** Stable public URLs for theme-owned assets; files are emitted by tools/theme-assets.mjs. */
export const argonAssets = {
  backgroundImage: "/themes/argon/background/campfire.webp",
  backgroundVideo: "/themes/argon/background/campfire.webm",
  managementScene: "/themes/argon/auth/night-camp.webp",
  preview: "/themes/argon/preview.svg",
  stickers: "/themes/argon/stickers",
} as const;

const legacyAssets: Readonly<Record<string, string>> = {
  "/reference/campfire-background.webp": argonAssets.backgroundImage,
  "/reference/campfire-background.webm": argonAssets.backgroundVideo,
  "/reference/everunfold-night-camp.webp": argonAssets.managementScene,
};

/** Existing saved theme settings may still contain the old global reference path. */
export function argonAssetUrl(value: string): string {
  return legacyAssets[value] ?? value;
}
