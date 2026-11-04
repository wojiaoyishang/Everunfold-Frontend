"use client";
import { Button } from "../../../components/ui/primitives";
import { Icon } from "../../../components/icon";
import styles from "./rich-editor.module.css";

type ViewMode = "source" | "visual" | "split";
const labels = { source: "源码", visual: "可视化", split: "分屏" };
const icons = { source: "code", visual: "eye", split: "sidebar" } as const;

export function EditorViewToggle({
  current,
  next,
  onToggle,
}: {
  current: ViewMode;
  next: ViewMode;
  onToggle: () => void;
}) {
  const label = `切换到${labels[next]}`;
  return (
    <Button
      className={styles.viewToggle}
      aria-label={label}
      aria-description={`当前为${labels[current]}视图`}
      title={label}
      data-mode={current}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onToggle}
    >
      <Icon name={icons[next]} />
    </Button>
  );
}
