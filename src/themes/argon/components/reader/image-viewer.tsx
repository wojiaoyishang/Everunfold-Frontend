"use client";
import { Button, Dialog } from "@/themes/argon/components/ui/primitives";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useModalDialog } from "../../hooks/use-modal-dialog";
import { Icon } from "../icon";

export interface GalleryImage {
  src: string;
  caption: string;
}
export function ImageViewer({
  items,
  initialIndex,
  onDismiss,
}: {
  items: GalleryImage[];
  initialIndex: number;
  onDismiss: () => void;
}) {
  const { dialog, open, close } = useModalDialog();
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [thumbs, setThumbs] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const pointer = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const selected = items[index];
  useEffect(() => {
    open();
  }, [open]);
  function select(next: number) {
    const destination = (next + items.length) % items.length;
    if (destination === index) return;
    setIndex(destination);
    setZoom(1);
    setFailed(false);
    setLoading(true);
    setAttempt(0);
    if (stage.current) stage.current.scrollTo(0, 0);
  }
  function dismiss() {
    if (document.fullscreenElement === dialog.current)
      void document.exitFullscreen().catch(() => {});
    close();
  }
  return (
    <Dialog
      ref={dialog}
      className="image-viewer enhanced-viewer"
      aria-label="图片查看器"
      onClose={() => {
        closeTimer.current = setTimeout(
          onDismiss,
          document.documentElement.dataset.motion === "reduced" ? 0 : 360,
        );
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
      onKeyDown={(event) => {
        if ((event.target as HTMLElement).closest("input")) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          select(index + (event.key === "ArrowLeft" ? -1 : 1));
        }
      }}
    >
      <div className="viewer-toolbar">
        <span>
          {index + 1} / {items.length}
        </span>
        <Button
          aria-label="缩小图片"
          disabled={zoom <= 1}
          onClick={() => setZoom(Math.max(1, zoom - 0.5))}
        >
          <Icon name="minus" />
        </Button>
        <Button aria-label="还原图片比例" onClick={() => setZoom(1)}>
          {Math.round(zoom * 100)}%
        </Button>
        <Button
          aria-label="放大图片"
          disabled={zoom >= 4}
          onClick={() => setZoom(Math.min(4, zoom + 0.5))}
        >
          <Icon name="plus" />
        </Button>
        <Button
          aria-label="切换全屏"
          onClick={async () => {
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else await dialog.current?.requestFullscreen();
            } catch {
              setNotice("当前浏览器不支持全屏，仍可放大查看。");
            }
          }}
        >
          <Icon name="expand" />
        </Button>
        {items.length > 1 && (
          <Button aria-pressed={thumbs} onClick={() => setThumbs(!thumbs)}>
            缩略图
          </Button>
        )}
        <Button aria-label="关闭图片" onClick={dismiss}>
          <Icon name="close" />
        </Button>
      </div>
      <div
        ref={stage}
        className="viewer-stage"
        data-zoomed={zoom > 1}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          pointer.current = {
            x: event.clientX,
            y: event.clientY,
            left: event.currentTarget.scrollLeft,
            top: event.currentTarget.scrollTop,
          };
          if (zoom > 1 && event.pointerType === "mouse")
            event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!pointer.current || zoom <= 1 || event.pointerType !== "mouse")
            return;
          event.currentTarget.scrollLeft =
            pointer.current.left + pointer.current.x - event.clientX;
          event.currentTarget.scrollTop =
            pointer.current.top + pointer.current.y - event.clientY;
        }}
        onPointerUp={(event) => {
          const before = pointer.current;
          pointer.current = null;
          if (
            before &&
            zoom === 1 &&
            event.pointerType === "touch" &&
            Math.abs(before.x - event.clientX) > 60 &&
            Math.abs(before.y - event.clientY) < 70
          )
            select(index + (before.x > event.clientX ? 1 : -1));
        }}
        onPointerCancel={() => {
          pointer.current = null;
        }}
      >
        {loading && !failed && (
          <span className="viewer-loading" role="status">
            图片正在展开…
          </span>
        )}
        {failed ? (
          <div className="viewer-error" role="alert">
            <p>这张图片暂时没有加载出来。</p>
            <Button
              onClick={() => {
                setFailed(false);
                setLoading(true);
                setAttempt(attempt + 1);
              }}
            >
              重新加载
            </Button>
          </div>
        ) : (
          <div
            className="viewer-image-frame"
            style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}
          >
            <Image
              key={`${index}-${attempt}`}
              src={selected.src}
              alt={selected.caption}
              width={1600}
              height={1200}
              unoptimized
              draggable={false}
              onLoad={() => setLoading(false)}
              onError={() => {
                setFailed(true);
                setLoading(false);
              }}
            />
          </div>
        )}
      </div>
      <div className="viewer-bottom">
        <Button
          disabled={items.length < 2}
          aria-label="上一张图片"
          onClick={() => select(index - 1)}
        >
          <Icon name="arrow-left" />
        </Button>
        <p>{selected.caption}</p>
        <Button
          disabled={items.length < 2}
          aria-label="下一张图片"
          onClick={() => select(index + 1)}
        >
          <Icon name="arrow" />
        </Button>
      </div>
      {thumbs && (
        <div className="viewer-thumbnails">
          {items.map((item, i) => (
            <Button
              key={`${i}-${item.src}`}
              aria-label={`查看第 ${i + 1} 张图片`}
              aria-pressed={i === index}
              onClick={() => select(i)}
            >
              <Image src={item.src} alt="" width={70} height={52} unoptimized />
            </Button>
          ))}
        </div>
      )}
      {notice && (
        <p role="status" className="viewer-notice">
          {notice}
        </p>
      )}
    </Dialog>
  );
}
