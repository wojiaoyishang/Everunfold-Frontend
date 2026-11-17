import type { MediaURL } from "@/core/contracts/content-admin";
import { videoMarkup, videoOptions } from "@/core/video/player";

export function VideoPlayer({
  values,
  media,
  preview = false,
}: {
  values: Record<string, unknown>;
  media?: Record<string, MediaURL>;
  preview?: boolean;
}) {
  const html = videoMarkup(videoOptions(values), media, preview);
  return html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : null;
}
