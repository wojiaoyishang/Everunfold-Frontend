import type { CSSProperties } from "react";
import type { BuilderDevice, BuilderValue, BuilderValues } from "./types";

export function layoutValues(value: BuilderValue | undefined): BuilderValues {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export function layoutRecord(props: BuilderValues, device: BuilderDevice) {
  return layoutValues(props[device === "desktop" ? "layout" : device]);
}

export const layoutFields = [
  { key: "gap", label: "间距", default: 16, max: 120 },
  { key: "padding", label: "内边距", default: 0, max: 160 },
  { key: "margin", label: "上方留白", default: 0, max: 160 },
] as const;

const positions: Record<string, string> = {
  start: "start",
  center: "center",
  end: "end",
  stretch: "stretch",
};

export function builderStyle(props: BuilderValues): CSSProperties {
  const style: Record<string, string> = {};
  for (const device of ["desktop", "tablet", "mobile"] as const) {
    const suffix = device === "desktop" ? "" : "-" + device;
    const layout = layoutRecord(props, device);
    const direction = layout.direction;
    if (direction === "row" || direction === "column" || direction === "grid") {
      style["--builder-display" + suffix] =
        direction === "grid" ? "grid" : "flex";
      style["--builder-direction" + suffix] =
        direction === "row" ? "row" : "column";
    }
    if (typeof layout.columns === "number" && Number.isFinite(layout.columns)) {
      const columns = Math.max(1, Math.min(6, Math.trunc(layout.columns)));
      style["--builder-columns" + suffix] =
        "repeat(" + columns + ", minmax(0, 1fr))";
    }
    if (
      typeof layout.align === "string" &&
      Object.hasOwn(positions, layout.align)
    ) {
      style["--builder-align" + suffix] = positions[layout.align];
      style["--builder-text-align" + suffix] =
        layout.align === "stretch" ? "start" : positions[layout.align];
    }
    for (const field of layoutFields) {
      const value = layout[field.key];
      if (typeof value === "number" && Number.isFinite(value))
        style["--builder-" + field.key + suffix] =
          Math.max(0, Math.min(field.max, value)) + "px";
    }
  }
  return style;
}
