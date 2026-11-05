"use client";
import { UiText } from "@/core/i18n/provider";

import { useRef, useState, type PointerEvent } from "react";
import type { CropRect } from "@/generated/settings-contract";
import { clampCrop, type ImageSize } from "@/core/media/image-editor";
/** Encapsulated pointer interaction; exact numeric fields provide the keyboard equivalent. */
export function ImageCropSurface({
  url,
  source,
  size,
  matrix,
  crop,
  onCrop,
  disabled,
}: {
  url: string;
  source: ImageSize;
  size: ImageSize;
  matrix: string;
  crop: CropRect | null;
  onCrop: (crop: CropRect) => void;
  disabled: boolean;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<CropRect | null>(null);
  const [failed, setFailed] = useState(false);
  const point = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(
          size.width,
          ((event.clientX - bounds.left) / bounds.width) * size.width,
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          size.height,
          ((event.clientY - bounds.top) / bounds.height) * size.height,
        ),
      ),
    };
  };
  const selection = draft ?? crop;
  const area = (event: PointerEvent<SVGSVGElement>) => {
    const end = point(event);
    const begin = start.current!;
    return clampCrop(
      {
        x: Math.min(begin.x, end.x),
        y: Math.min(begin.y, end.y),
        width: Math.abs(begin.x - end.x),
        height: Math.abs(begin.y - end.y),
      },
      size,
    );
  };
  if (failed)
    return (
      <p role="status">
        <UiText text="图片预览暂时不可用，请关闭后重试。" />
      </p>
    );
  return (
    <svg
      className={`admin-crop-surface${crop && !disabled ? " is-cropping" : ""}`}
      width={size.width}
      height={size.height}
      viewBox={`0 0 ${size.width} ${size.height}`}
      role="img"
      aria-label="图片编辑预览"
      onPointerDown={(event) => {
        if (!crop || disabled || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        start.current = point(event);
      }}
      onPointerMove={(event) => {
        if (start.current) setDraft(area(event));
      }}
      onPointerUp={(event) => {
        if (!start.current) return;
        const next = area(event);
        start.current = null;
        setDraft(null);
        event.currentTarget.releasePointerCapture(event.pointerId);
        if (next.width > 1 && next.height > 1) onCrop(next);
      }}
      onPointerCancel={() => {
        start.current = null;
        setDraft(null);
      }}
    >
      <image
        href={url}
        width={source.width}
        height={source.height}
        transform={matrix}
        onError={() => setFailed(true)}
      />
      {selection && (
        <g pointerEvents="none">
          <path
            className="admin-crop-shade"
            fillRule="evenodd"
            d={`M0 0H${size.width}V${size.height}H0Z M${selection.x} ${selection.y}h${selection.width}v${selection.height}h${-selection.width}Z`}
          />
          <rect
            className="admin-crop-outline"
            x={selection.x}
            y={selection.y}
            width={selection.width}
            height={selection.height}
            vectorEffect="non-scaling-stroke"
          />
          {[1, 2].map((n) => (
            <path
              key={n}
              className="admin-crop-grid"
              vectorEffect="non-scaling-stroke"
              d={`M${selection.x + (selection.width * n) / 3} ${selection.y}v${selection.height}M${selection.x} ${selection.y + (selection.height * n) / 3}h${selection.width}`}
            />
          ))}
        </g>
      )}
    </svg>
  );
}
