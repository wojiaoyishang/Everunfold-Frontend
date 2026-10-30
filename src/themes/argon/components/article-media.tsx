"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { useModalDialog } from "../hooks/use-modal-dialog";
import { Icon } from "./icon";
import { useDetailsMotion } from "../hooks/use-details-motion";

interface Gallery {
  index: number;
  items: { src: string; caption: string }[];
}

export function ArticleMedia({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  useDetailsMotion(container, children);
  const { dialog, open: openModal, close } = useModalDialog();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  useEffect(() => {
    const element = container.current;
    const images = Array.from(
      element?.querySelectorAll<HTMLImageElement>(
        ".article-content img[src]",
      ) ?? [],
    ).filter((image) => !image.closest("a, button"));
    const previous = images.map((image) => ({
      image,
      role: image.getAttribute("role"),
      tab: image.getAttribute("tabindex"),
      label: image.getAttribute("aria-label"),
    }));
    for (const image of images) {
      image.setAttribute("role", "button");
      image.tabIndex = 0;
      image.setAttribute(
        "aria-label",
        `查看图片${image.alt ? `：${image.alt}` : ""}`,
      );
    }
    function open(event: Event) {
      const index = images.indexOf(event.target as HTMLImageElement);
      if (index < 0) return;
      if (event instanceof KeyboardEvent && !["Enter", " "].includes(event.key))
        return;
      event.preventDefault();
      images[index].focus({ preventScroll: true });
      setGallery({
        index,
        items: images.map((image) => ({
          src: image.currentSrc || image.src,
          caption:
            image.closest("figure")?.querySelector("figcaption")?.textContent ??
            image.alt,
        })),
      });
      openModal();
    }
    element?.addEventListener("click", open);
    element?.addEventListener("keydown", open);
    return () => {
      element?.removeEventListener("click", open);
      element?.removeEventListener("keydown", open);
      for (const item of previous)
        for (const [attribute, value] of [
          ["role", item.role],
          ["tabindex", item.tab],
          ["aria-label", item.label],
        ]) {
          if (value === null) item.image.removeAttribute(attribute!);
          else item.image.setAttribute(attribute!, value!);
        }
    };
  }, [children, openModal]);
  const selected = gallery?.items[gallery.index];
  function move(direction: number) {
    setGallery((current) =>
      current
        ? {
            ...current,
            index:
              (current.index + direction + current.items.length) %
              current.items.length,
          }
        : current,
    );
  }
  return (
    <div ref={container}>
      {children}
      <dialog
        ref={dialog}
        className="image-viewer"
        aria-label="图片查看器"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        <button
          type="button"
          className="viewer-close icon-button"
          aria-label="关闭图片"
          onClick={close}
        >
          <Icon name="close" />
        </button>
        {selected && (
          <figure>
            <Image
              key={selected.src}
              src={selected.src}
              alt={selected.caption}
              width={1600}
              height={1200}
              unoptimized
            />
            <figcaption>
              {selected.caption}
              <span>
                {gallery.index + 1} / {gallery.items.length}
              </span>
            </figcaption>
          </figure>
        )}
        {gallery && gallery.items.length > 1 && (
          <div className="viewer-navigation">
            <button
              type="button"
              className="icon-button"
              aria-label="上一张图片"
              onClick={() => move(-1)}
            >
              <Icon name="chevron" />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="下一张图片"
              onClick={() => move(1)}
            >
              <Icon name="chevron" />
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}
