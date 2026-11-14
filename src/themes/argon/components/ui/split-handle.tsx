"use client";
import { useRef } from "react";
import { Button } from "./primitives";
export function SplitHandle({
  value,
  min,
  max,
  reset = 390,
  label,
  controls,
  className,
  onChange,
  onDragging,
}: {
  value: number;
  min: number;
  max: number;
  reset?: number;
  label: string;
  controls: string;
  className?: string;
  onChange: (value: number) => void;
  onDragging: (dragging: boolean) => void;
}) {
  const start = useRef({ x: 0, value });
  return (
    <Button
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-controls={controls}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      title={label}
      className={className}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        start.current = { x: event.clientX, value };
        event.currentTarget.setPointerCapture(event.pointerId);
        onDragging(true);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          onChange(
            Math.min(
              max,
              Math.max(
                min,
                start.current.value + event.clientX - start.current.x,
              ),
            ),
          );
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
        onDragging(false);
      }}
      onPointerCancel={() => onDragging(false)}
      onLostPointerCapture={() => onDragging(false)}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 64 : 16;
        const next =
          event.key === "ArrowLeft"
            ? value - step
            : event.key === "ArrowRight"
              ? value + step
              : event.key === "Home"
                ? min
                : event.key === "End"
                  ? max
                  : null;
        if (next !== null) {
          event.preventDefault();
          onChange(Math.min(max, Math.max(min, next)));
        }
      }}
      onDoubleClick={() => onChange(Math.min(max, Math.max(min, reset)))}
    />
  );
}
