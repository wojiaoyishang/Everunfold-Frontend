import type { CSSProperties } from "react";
import { builderProgressValue } from "@/core/builder/document";
import type { BuilderValues } from "@/core/builder/types";
import { hexColor } from "@/core/colors";
import styles from "./progress.module.css";

export function BuilderProgress({
  label,
  values,
}: {
  label: string;
  values: BuilderValues;
}) {
  const percent = builderProgressValue(values.value);
  const height =
    typeof values.height === "number" && Number.isFinite(values.height)
      ? Math.min(28, Math.max(4, values.height))
      : 8;
  const vars = {
    "--progress-height": `${height}px`,
    "--progress-value": `${percent}%`,
    "--progress-custom-fill": hexColor(values.fill_color),
    "--progress-custom-track": hexColor(values.track_color),
  } as CSSProperties;
  return (
    <div
      className={styles.progress}
      data-progress
      data-appearance={
        typeof values.appearance === "string" ? values.appearance : "solid"
      }
      data-tone={typeof values.tone === "string" ? values.tone : "theme"}
      data-shape={values.shape === "square" ? "square" : "round"}
      style={vars}
    >
      <div className={styles.label} aria-hidden="true">
        <span>{label}</span>
        {values.show_value !== false && <span>{percent}%</span>}
      </div>
      <div
        className={styles.track}
        data-progress-track
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span className={styles.fill} data-progress-fill />
      </div>
    </div>
  );
}
