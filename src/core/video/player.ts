import type { MediaURL } from "@/core/contracts/content-admin";
import { resourceUrl } from "@/core/content/urls";
import { parseSiteMediaReference } from "@/core/media/references";
import { escapeMarkup } from "@/core/rendering/features/model";

export const minimumVideoWidth = 320;
export const maximumVideoWidth = 1920;
export const videoDefaults = {
  source: "",
  title: "",
  poster: "",
  captions: "",
  language: "zh-CN",
  max_width: 0,
  autoplay: false,
  loop: false,
};
export type VideoOptions = typeof videoDefaults;

export function videoOptions(values: Record<string, unknown>): VideoOptions {
  const string = (key: string) =>
    typeof values[key] === "string" ? values[key].trim() : "";
  const enabled = (key: string) =>
    values[key] === true || values[key] === "true";
  const width = Number(values.max_width);
  return {
    source: string("source"),
    title: string("title"),
    poster: string("poster"),
    captions: string("captions"),
    language: string("language") || videoDefaults.language,
    max_width:
      Number.isInteger(width) &&
      width >= minimumVideoWidth &&
      width <= maximumVideoWidth
        ? width
        : 0,
    autoplay: enabled("autoplay"),
    loop: enabled("loop"),
  };
}

type Embed = {
  provider: "bilibili" | "youtube";
  url: URL;
};

const youtubeHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
]);
const bilibiliHosts = new Set([
  "bilibili.com",
  "www.bilibili.com",
  "m.bilibili.com",
  "player.bilibili.com",
]);

function youtube(url: URL): Embed | null {
  const [, section, segment, extra] = url.pathname
    .replace(/\/$/, "")
    .split("/");
  const id =
    url.hostname === "youtu.be" && !segment
      ? section
      : section === "watch" && !segment
        ? url.searchParams.get("v")
        : ["shorts", "live", "embed"].includes(section) && !extra
          ? segment
          : null;
  if (!id || !/^[\w-]{11}$/.test(id)) return null;
  return {
    provider: "youtube",
    url: new URL(`https://www.youtube-nocookie.com/embed/${id}`),
  };
}

function bilibili(url: URL): Embed | null {
  const path = url.pathname.replace(/\/$/, "");
  const params = new URLSearchParams();
  const video = /^\/video\/(BV[A-Za-z0-9]{10}|av\d+)$/.exec(path)?.[1];
  const episode = /^\/bangumi\/play\/ep(\d+)$/.exec(path)?.[1];
  if (video?.startsWith("BV")) params.set("bvid", video);
  else if (video) params.set("aid", video.slice(2));
  else if (episode) params.set("episodeId", episode);
  else if (url.hostname === "player.bilibili.com" && path === "/player.html") {
    const bvid = url.searchParams.get("bvid") ?? "";
    const aid = url.searchParams.get("aid") ?? "";
    const episodeId = url.searchParams.get("episodeId") ?? "";
    if (/^\d+$/.test(episodeId)) params.set("episodeId", episodeId);
    else if (/^BV[A-Za-z0-9]{10}$/.test(bvid)) params.set("bvid", bvid);
    else if (/^\d+$/.test(aid)) params.set("aid", aid);
    else return null;
  } else return null;
  const page = url.searchParams.get("p") ?? url.searchParams.get("page") ?? "";
  if (/^[1-9]\d{0,5}$/.test(page)) params.set("p", page);
  return {
    provider: "bilibili",
    url: new URL(`https://player.bilibili.com/player.html?${params}`),
  };
}

/** Only registered providers can produce an iframe. Everything else uses the native player. */
export function videoSource(
  value: string,
): Embed | { provider: "direct" } | null {
  if (parseSiteMediaReference(value)) return { provider: "direct" };
  const source = resourceUrl(value);
  if (!source) return null;
  if (source.startsWith("/")) return { provider: "direct" };
  const url = new URL(source);
  if (youtubeHosts.has(url.hostname)) return youtube(url);
  if (bilibiliHosts.has(url.hostname)) return bilibili(url);
  if (url.hostname === "b23.tv") return null;
  return { provider: "direct" };
}

function mediaUrl(
  value: string,
  media: Record<string, MediaURL>,
  image = false,
) {
  const id = parseSiteMediaReference(value);
  if (!id) return resourceUrl(value);
  return (
    (image ? resourceUrl(media[id]?.webp) : null) ??
    resourceUrl(media[id]?.original)
  );
}

/** All three authoring formats use this renderer after their source is validated. */
export function videoMarkup(
  options: VideoOptions,
  media: Record<string, MediaURL> = {},
  preview = false,
) {
  const source = videoSource(options.source);
  if (!source) return "";
  const escape = escapeMarkup;
  const title = escape(options.title || "视频播放器");
  const autoplay = options.autoplay && !preview;
  let player: string;
  if (source.provider === "direct") {
    const src = mediaUrl(options.source, media);
    if (!src) return "";
    const poster = mediaUrl(options.poster, media, true);
    const captions = mediaUrl(options.captions, media);
    const language = escape(options.language);
    player = `<video aria-label="${title}" src="${escape(src)}" controls playsinline preload="${autoplay ? "auto" : "metadata"}"${autoplay ? " autoplay muted" : ""}${options.loop ? " loop" : ""}${poster ? ` poster="${escape(poster)}"` : ""}>${captions ? `<track kind="captions" src="${escape(captions)}" srclang="${language}" label="${language}">` : ""}</video>`;
  } else {
    const params = source.url.searchParams;
    params.set("autoplay", autoplay ? "1" : "0");
    if (source.provider === "bilibili") {
      if (autoplay) params.set("muted", "1");
    } else {
      params.set("playsinline", "1");
      if (autoplay) params.set("mute", "1");
      if (options.loop) {
        params.set("loop", "1");
        params.set("playlist", source.url.pathname.split("/").at(-1)!);
      }
    }
    player = `<iframe title="${title}" src="${escape(source.url.href)}" loading="${autoplay ? "eager" : "lazy"}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  }
  const width = options.max_width || null;
  return `<figure class="ef-video-player"${width ? ` style="max-inline-size:${width}px"` : ""}>${player}${options.title ? `<figcaption>${title}</figcaption>` : ""}</figure>`;
}
