"use client";

import { useCallback, useRef } from "react";
import type { BuilderComponentDefinition } from "@/core/builder/types";
import { UiText, useT } from "@/core/i18n/provider";
import { builderIcon } from "../../builder/content";
import { Icon } from "../../components/icon";
import { useDragItem } from "../../components/ui/drag-and-drop";
import { Button } from "../../components/ui/primitives";
import styles from "./editor.module.css";
import itemStyles from "./palette-item.module.css";

export function PaletteItem({
  definition,
  disabled,
  onAdd,
}: {
  definition: BuilderComponentDefinition;
  disabled: boolean;
  onAdd: () => void;
}) {
  const t = useT();
  const origin = useRef<{ x: number; y: number }>(null);
  const {
    ref,
    dragging,
    handle: { ref: activator, onKeyDown, ...dragProps },
  } = useDragItem(
    {
      id: definition.type,
      kind: "palette",
      label: t(definition.label),
    },
    disabled,
  );
  const setNode = useCallback(
    (node: HTMLButtonElement | null) => {
      ref(node);
      activator(node);
    },
    [ref, activator],
  );
  return (
    <Button
      {...dragProps}
      ref={setNode}
      className={`${styles.paletteItem} ${styles.paletteAdd} ${itemStyles.card}`}
      disabled={disabled}
      data-dragging={dragging || undefined}
      aria-keyshortcuts="Enter Space"
      title={t("点击添加，拖到页面")}
      onPointerDown={(event) => {
        origin.current = { x: event.clientX, y: event.clientY };
      }}
      onKeyDown={(event) => {
        // Enter retains the native add action. Space starts the shared keyboard drag.
        if (event.code === "Space" && !event.repeat) onKeyDown?.(event);
      }}
      onClick={(event) => {
        const point = origin.current;
        if (
          event.detail &&
          point &&
          Math.hypot(event.clientX - point.x, event.clientY - point.y) > 6
        )
          return;
        onAdd();
      }}
    >
      <Icon name={builderIcon(definition)} />
      <UiText text={definition.label} />
    </Button>
  );
}
