"use client";
import { useEffect, useRef, useState } from "react";
import { usePublicFontScale } from "@/core/themes/font-scale";
import {
  layoutWords,
  type CloudWord,
  type CloudLayoutOptions,
  type PlacedWord,
} from "@/core/taxonomy/cloud-layout";

/** Both public and admin clouds measure the active font before packing words. */
export function useWordCloud(
  words: readonly CloudWord[],
  desktopHeight = 440,
  mobileHeight = 360,
  options?: CloudLayoutOptions,
) {
  const ref = useRef<HTMLDivElement>(null);
  const scale = usePublicFontScale() / 100;
  const [placed, setPlaced] = useState<PlacedWord[]>([]);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let alive = true;
    const update = () => {
      if (!alive) return;
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return;
      const width = root.clientWidth;
      const sizing =
        scale === 1
          ? options
          : {
              ...options,
              minSize: (options?.minSize ?? 16) * scale,
              maxSize: (options?.maxSize ?? (width < 500 ? 34 : 52)) * scale,
            };
      setPlaced(
        layoutWords(
          words,
          width,
          width < 500 ? mobileHeight : desktopHeight,
          (text, size) => {
            ctx.font = `600 ${size}px ${getComputedStyle(root).fontFamily}`;
            return ctx.measureText(text).width;
          },
          sizing,
        ),
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(root);
    void document.fonts.ready.then(update);
    document.fonts.addEventListener("loadingdone", update);
    return () => {
      alive = false;
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", update);
    };
  }, [words, desktopHeight, mobileHeight, options, scale]);
  return { ref, placed };
}
