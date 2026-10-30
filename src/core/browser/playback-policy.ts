export type PlaybackPreference = "auto" | "play" | "pause";
export const PLAYBACK_STORAGE_KEY = "everunfold.background-playback.v2";

export function playbackPreference(value: unknown): PlaybackPreference {
  return value === "play" || value === "pause" ? value : "auto";
}

/** An explicit background choice wins; an untouched setting follows site motion. */
export function resolvePlayback(
  preference: PlaybackPreference,
  motionEnabled: boolean,
): boolean {
  return preference === "play" || (preference === "auto" && motionEnabled);
}
