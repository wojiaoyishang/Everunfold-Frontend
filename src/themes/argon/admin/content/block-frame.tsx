"use client";
import { useRef, type ReactNode } from "react";
import type { DraftBlock } from "@/generated/content-admin-contract";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import {
  useDragItem,
  useDropPosition,
  useReorderMotion,
} from "../../components/ui/drag-and-drop";
import { BlockHeader } from "./block-header";
import { MobileBlockLibrary } from "./block-library";
import { useBlockComposer } from "./block-composer";
import styles from "./block-composer.module.css";
import workspace from "./editor-workspace.module.css";

export function BlockPosition({
  before = null,
  end = false,
}: {
  before?: string | null;
  end?: boolean;
}) {
  const host = useBlockComposer(),
    { setNodeRef, active, over, source } = useDropPosition(
      before,
      host.disabled,
    );
  return (
    <div
      ref={setNodeRef}
      className={styles.position}
      data-end={end}
      data-drag-active={active}
      data-over={over}
    >
      <span className={styles.dropLine} aria-hidden="true">
        <span>{source?.kind === "palette" ? "添加区块" : "移到这里"}</span>
      </span>
      <Button
        className={styles.insertAt}
        disabled={host.disabled || host.body.length >= 128}
        aria-label={end ? "在末尾插入区块" : "在此处插入区块"}
        onClick={() => host.choose(before)}
      >
        <Icon name="plus" />
        {end ? "添加区块" : null}
      </Button>
      <MobileBlockLibrary
        before={before}
        label={end ? "添加区块" : "在此处插入区块"}
        className={styles.mobileInsert}
      />
    </div>
  );
}
export function BlockFrame({
  block,
  index,
  children,
  onFormat,
  onDelete,
}: {
  block: DraftBlock;
  index: number;
  children: ReactNode;
  onFormat: (format: "markdown" | "html") => void;
  onDelete: () => void;
}) {
  const host = useBlockComposer(),
    node = useRef<HTMLElement | null>(null);
  const drag = useDragItem(
    {
      kind: "block",
      id: block.id,
      label: block.type === "html" ? "HTML" : "Markdown",
    },
    host.disabled,
  );
  useReorderMotion(node, host.body.map((b) => b.id).join("|"));
  return (
    <>
      <BlockPosition before={block.id} />
      <section
        ref={(el) => {
          node.current = el;
          drag.ref(el);
        }}
        className={`${workspace.block} ${styles.frame}`}
        data-dragging={drag.dragging}
        data-arrived={host.moved === block.id}
        aria-label={`正文块 ${index + 1}`}
      >
        <BlockHeader
          block={block}
          index={index}
          total={host.body.length}
          disabled={host.disabled}
          handle={drag.handle}
          onFormat={onFormat}
          onDelete={onDelete}
          onMove={(position) => {
            const before =
              position === "first"
                ? host.body[0]?.id
                : position === "last"
                  ? null
                  : position === "up"
                    ? host.body[index - 1]?.id
                    : (host.body[index + 2]?.id ?? null);
            if (before !== undefined) host.move(block.id, before);
          }}
        />
        {children}
      </section>
    </>
  );
}
