"use client";
import { useRef, type ReactNode } from "react";
import type { WorkspaceCardPlacement } from "@/core/contracts/operations";
import type { WorkspaceCardDefinition } from "@/core/workspace/types";
import { UiText, useT } from "@/core/i18n/provider";
import { Icon } from "../../components/icon";
import { Button } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import {
  useDragItem,
  useDropPosition,
  useReorderMotion,
} from "../../components/ui/drag-and-drop";
import { ReorderButtons } from "../../components/ui/reorder-list";
import styles from "./workspace.module.css";

export function EndSlot() {
  const { setNodeRef, over } = useDropPosition(null, false);
  return (
    <div
      className={styles.endSlot}
      ref={setNodeRef}
      data-over={over || undefined}
    />
  );
}
export function WorkspaceTile({
  placement,
  definition,
  order,
  editing,
  disabled,
  first,
  last,
  onMove,
  onWidth,
  onRemove,
  children,
}: {
  placement: WorkspaceCardPlacement;
  definition: WorkspaceCardDefinition;
  order: string;
  editing: boolean;
  disabled: boolean;
  first: boolean;
  last: boolean;
  onMove: (offset: number) => void;
  onWidth: (width: 1 | 2 | 3 | 6) => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  const t = useT(),
    ref = useRef<HTMLElement>(null);
  useReorderMotion(ref, order);
  const drag = useDragItem(
      { id: placement.id, label: t(definition.label), kind: "block" },
      !editing,
    ),
    drop = useDropPosition(placement.id, !editing);
  return (
    <section
      aria-label={t(definition.label)}
      className={styles.tile}
      data-width={placement.width}
      data-over={drop.over || undefined}
      data-dragging={drag.dragging || undefined}
      ref={(node) => {
        ref.current = node;
        drag.ref(node);
        drop.setNodeRef(node);
      }}
    >
      <header
        className={
          !editing && ["write", "media"].includes(definition.component)
            ? "sr-only"
            : styles.heading
        }
      >
        {editing ? (
          <Button
            {...drag.handle}
            className={styles.handle}
            aria-label={t("拖动排序") + " " + t(definition.label)}
          >
            <Icon name="grip" />
          </Button>
        ) : (
          <Icon name={definition.icon ?? "puzzle"} />
        )}
        <h2>
          <UiText text={definition.label} />
        </h2>
        {editing && (
          <Button
            className="admin-icon-button"
            disabled={disabled}
            aria-label={t("移除卡片") + " " + t(definition.label)}
            onClick={onRemove}
          >
            <Icon name="close" />
          </Button>
        )}
      </header>
      <div
        className={styles.body}
        data-shortcut={
          ["write", "media"].includes(definition.component) || undefined
        }
      >
        {children}
      </div>
      {editing && (
        <div className={styles.editControls}>
          <ReorderButtons
            label={t(definition.label)}
            first={first}
            last={last}
            disabled={disabled}
            onMove={onMove}
          />
          <Select
            name={`width-${placement.id}`}
            label={t(definition.label) + " " + t("卡片宽度")}
            value={String(placement.width)}
            options={[
              { value: "1", label: t("小") },
              { value: "2", label: t("三分之一") },
              { value: "3", label: t("半行") },
              { value: "6", label: t("整行") },
            ]}
            onValueChange={(value) => onWidth(Number(value) as 1 | 2 | 3 | 6)}
            disabled={disabled}
          />
        </div>
      )}
    </section>
  );
}
