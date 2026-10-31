import type { ComponentPropsWithRef, CSSProperties } from "react";

export function RangeField({
  min = 0,
  max = 100,
  value,
  className = "",
  style,
  ...props
}: Omit<ComponentPropsWithRef<"input">, "type" | "defaultValue" | "value"> & {
  value: number;
}) {
  const amount = value;
  const span = Number(max) - Number(min);
  const progress =
    span > 0
      ? Math.max(0, Math.min(100, ((amount - Number(min)) / span) * 100))
      : 0;
  return (
    <input
      {...props}
      type="range"
      min={min}
      max={max}
      value={value}
      className={`ui-range ${className}`}
      style={{ ...style, "--range-progress": `${progress}%` } as CSSProperties}
    />
  );
}
