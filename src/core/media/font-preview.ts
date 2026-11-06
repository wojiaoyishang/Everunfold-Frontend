"use client";
import { useEffect } from "react";
import type { FontAsset } from "@/core/contracts/settings";
const loaded = new Map<string, Promise<void>>();
/** Only requested catalog fonts load; a failed file can be retried after a fresh query. */
export function loadFont(font: FontAsset) {
  if (typeof FontFace === "undefined") return Promise.resolve();
  const key = `${font.css_family}:${font.url}`;
  const previous = loaded.get(key);
  if (previous) return previous;
  const face = new FontFace(
    font.css_family,
    `url(${JSON.stringify(font.url)})`,
    {
      style: font.info.style,
      weight: `${font.info.weight_min} ${font.info.weight_max}`,
      display: "swap",
    },
  );
  const pending = face
    .load()
    .then((value) => {
      document.fonts.add(value);
    })
    .catch(() => {
      loaded.delete(key);
    });
  loaded.set(key, pending);
  return pending;
}
export function useFontPreviews(fonts: readonly FontAsset[]) {
  useEffect(() => {
    for (const font of fonts) void loadFont(font);
  }, [fonts]);
}
