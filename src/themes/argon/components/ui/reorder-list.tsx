"use client";
import { useRef, useState, type ReactNode } from "react";
import {
  DragAndDrop,
  useDragItem,
  useDropPosition,
  useReorderMotion,
} from "./drag-and-drop";
import { Button } from "./primitives";
import { Icon } from "../icon";
import { useT } from "@/core/i18n/provider";
import styles from "./reorder-list.module.css";

export function moveBefore<T extends { id: string }>(
  items: readonly T[],
  id: string,
  before: string | null,
): T[] {
  if (id === before) return [...items];
  const item = items.find((item) => item.id === id);
  if (!item || (before !== null && !items.some((item) => item.id === before)))
    return [...items];
  const rest = items.filter((item) => item.id !== id);
  rest.splice(
    before === null
      ? rest.length
      : rest.findIndex((item) => item.id === before),
    0,
    item,
  );
  return rest;
}
export function ReorderList<Id extends string>({
  items,
  onChange,
  label,
}: {
  items: { id: Id; label: string }[];
  onChange: (ids: Id[]) => void;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <DragAndDrop
      disabled={false}
      onBusyChange={setBusy}
      onDrop={(item, before) =>
        onChange(moveBefore(items, item.id, before).map((item) => item.id))
      }
      renderPreview={(item) => (
        <div className={styles.preview}>{item.label}</div>
      )}
    >
      <ol className={styles.list} aria-label={label}>
        {items.map((item, index) => (
          <ReorderRow
            key={item.id}
            id={item.id}
            label={item.label}
            index={index}
            order={items.map((item) => item.id).join(",")}
            busy={busy}
            last={index === items.length - 1}
            move={(offset) => {
              const next = [...items];
              [next[index], next[index + offset]] = [
                next[index + offset]!,
                next[index]!,
              ];
              onChange(next.map((item) => item.id));
            }}
          />
        ))}
      </ol>
      <ReorderDropEnd />
    </DragAndDrop>
  );
}
function ReorderDropEnd() {
  const { setNodeRef, over } = useDropPosition(null, false);
  return (
    <div
      ref={setNodeRef}
      className={styles.end}
      data-over={over || undefined}
    />
  );
}
function ReorderRow({
  id,
  label,
  index,
  order,
  busy,
  last,
  move,
}: {
  id: string;
  label: string;
  index: number;
  order: string;
  busy: boolean;
  last: boolean;
  move: (offset: number) => void;
}) {
  const t = useT();
  const ref = useRef<HTMLLIElement>(null);
  useReorderMotion(ref, order);
  const drag = useDragItem({ id, label, kind: "block" }, false),
    drop = useDropPosition(id, false);
  return (
    <li
      ref={(node) => {
        ref.current = node;
        drag.ref(node);
        drop.setNodeRef(node);
      }}
      className={styles.row}
      data-dragging={drag.dragging || undefined}
      data-over={drop.over || undefined}
    >
      <Button
        className={styles.handle}
        {...drag.handle}
        aria-label={t("拖动排序") + " " + label}
      >
        <Icon name="grip" />
      </Button>
      <span className={styles.number}>{index + 1}</span>
      <span className={styles.label}>{label}</span>
      <ReorderButtons
        label={label}
        first={index === 0}
        last={last}
        disabled={busy}
        onMove={move}
      />
    </li>
  );
}
export function ReorderButtons({
  label,
  first,
  last,
  disabled,
  onMove,
  children,
}: {
  label: string;
  first: boolean;
  last: boolean;
  disabled?: boolean;
  onMove: (offset: number) => void;
  children?: ReactNode;
}) {
  const t = useT();
  return (
    <span className={styles.actions}>
      <Button
        className="admin-icon-button"
        disabled={first || disabled}
        aria-label={t("上移") + " " + label}
        title={t("上移")}
        onClick={() => onMove(-1)}
      >
        <Icon name="chevron-up" />
      </Button>
      <Button
        className="admin-icon-button"
        disabled={last || disabled}
        aria-label={t("下移") + " " + label}
        title={t("下移")}
        onClick={() => onMove(1)}
      >
        <Icon name="chevron-down" />
      </Button>
      {children}
    </span>
  );
}
