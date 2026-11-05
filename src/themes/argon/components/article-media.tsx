"use client";
import { UiText } from "@/core/i18n/provider";

import { Button } from "@/themes/argon/components/ui/primitives";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDetailsMotion } from "../hooks/use-details-motion";
import { ImageViewer, type GalleryImage } from "./reader/image-viewer";

function imageTarget(image: HTMLImageElement): string | null {
  const link = image.closest("a");
  if (!link) return image.currentSrc || image.src;
  try {
    return /\.(?:png|jpe?g|webp|avif|gif)$/i.test(new URL(link.href).pathname)
      ? link.href
      : null;
  } catch {
    return null;
  }
}

export function ArticleMedia({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const imageElements = useRef<HTMLImageElement[]>([]);
  const [failed, setFailed] = useState<number[]>([]);
  const [gallery, setGallery] = useState<{
    index: number;
    items: GalleryImage[];
  } | null>(null);
  useDetailsMotion(container, children);
  useEffect(() => {
    const element = container.current;
    const images = Array.from(
      element?.querySelectorAll<HTMLImageElement>(
        ".article-content img[src], .comment-formatted img[src]",
      ) ?? [],
    ).filter(
      (item) => !item.closest("button") && !item.hasAttribute("data-sticker"),
    );
    imageElements.current = images;
    const reset = requestAnimationFrame(() => setFailed([]));
    const cleanups = images.map((image, index) => {
      const previous = ["role", "tabindex", "aria-label"].map(
        (name) => [name, image.getAttribute(name)] as const,
      );
      if (imageTarget(image)) {
        image.setAttribute("role", "button");
        image.tabIndex = 0;
        image.setAttribute(
          "aria-label",
          `查看图片${image.alt ? `：${image.alt}` : ""}`,
        );
      }
      image.classList.add("reader-image");
      const load = () => {
        image.dataset.loadState = "loaded";
        setFailed((items) => items.filter((item) => item !== index));
      };
      const error = () => {
        image.dataset.loadState = "failed";
        setFailed((items) =>
          items.includes(index) ? items : [...items, index],
        );
      };
      image.addEventListener("load", load);
      image.addEventListener("error", error);
      image.dataset.loadState = "loading";
      const frame = requestAnimationFrame(() => {
        if (image.complete) {
          if (image.naturalWidth > 0) load();
          else error();
        }
      });
      return () => {
        cancelAnimationFrame(frame);
        image.removeEventListener("load", load);
        image.removeEventListener("error", error);
        image.classList.remove("reader-image");
        delete image.dataset.loadState;
        previous.forEach(([name, value]) => {
          if (value === null) image.removeAttribute(name);
          else image.setAttribute(name, value);
        });
      };
    });
    function show(event: Event) {
      const image = event.target as HTMLImageElement;
      if (!images.includes(image) || !imageTarget(image)) return;
      if (
        event instanceof MouseEvent &&
        (event.button ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey)
      )
        return;
      if (event instanceof KeyboardEvent && !["Enter", " "].includes(event.key))
        return;
      event.preventDefault();
      event.stopPropagation();
      image.focus({ preventScroll: true });
      const available = images.filter((item) => imageTarget(item));
      setGallery({
        index: available.indexOf(image),
        items: available.map((item) => ({
          src: imageTarget(item)!,
          caption:
            item.closest("figure")?.querySelector("figcaption")?.textContent ??
            item.alt,
        })),
      });
    }
    element?.addEventListener("click", show);
    element?.addEventListener("keydown", show);
    return () => {
      cancelAnimationFrame(reset);
      cleanups.forEach((cleanup) => cleanup());
      element?.removeEventListener("click", show);
      element?.removeEventListener("keydown", show);
    };
  }, [children]);
  return (
    <div ref={container}>
      {children}
      {failed.length > 0 && (
        <div className="media-failures" role="status">
          {failed.map((index) => (
            <p key={index}>
              <UiText text="第" />
              {index + 1} <UiText text="张图片暂时无法加载。" />{" "}
              <Button
                onClick={() => {
                  const image = imageElements.current[index];
                  if (image) {
                    image.dataset.loadState = "loading";
                    const source = image.src;
                    image.removeAttribute("src");
                    image.src = source;
                  }
                }}
              >
                <UiText text="重试" />
              </Button>
            </p>
          ))}
        </div>
      )}
      {gallery && (
        <ImageViewer
          items={gallery.items}
          initialIndex={gallery.index}
          onDismiss={() => setGallery(null)}
        />
      )}
    </div>
  );
}
