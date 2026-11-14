"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type {
  BuilderComponentDefinition,
  BuilderDocument,
  BuilderNode,
} from "@/core/builder/types";
import { useT } from "@/core/i18n/provider";
import { builderIcon } from "../../builder/content";
import { Icon } from "../../components/icon";
import { Button } from "../../components/ui/primitives";
import styles from "./structure-navigator.module.css";

type Point = { x: number; y: number };
type Bounds = { x: number; y: number; width: number; height: number };
type Gesture = "move" | "resize";
const inset = 8;
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(max, min));

function position(bounds: Bounds, parent: HTMLElement): Bounds {
  const width = Math.min(
    bounds.width,
    Math.max(0, parent.clientWidth - inset * 2),
  );
  const height = Math.min(
    bounds.height,
    Math.max(0, parent.clientHeight - inset * 2),
  );
  return {
    width,
    height,
    x: clamp(bounds.x, inset, parent.clientWidth - width - inset),
    y: clamp(bounds.y, inset, parent.clientHeight - height - inset),
  };
}

function ancestry(
  nodes: readonly BuilderNode[],
  selected: string | null,
): string[] | undefined {
  for (const node of nodes) {
    if (node.id === selected) return [];
    const branch = node.children && ancestry(node.children, selected);
    if (branch) return [node.id, ...branch];
  }
}

const arrowDirection: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

/** Mount in the positioned preview area. The parent owns open state and trigger focus. */
export function StructureNavigator({
  document,
  definitions,
  selected,
  onSelect,
  onClose,
  onContextMenu,
}: {
  document: BuilderDocument;
  definitions: ReadonlyMap<string, BuilderComponentDefinition>;
  selected: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onContextMenu?: (id: string, point: Point) => void;
}) {
  const t = useT();
  const id = useId();
  const panel = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const start = useRef<{ point: Point; bounds: Bounds }>(null);
  const [bounds, setBounds] = useState<Bounds>();
  const [closing, setClosing] = useState(false);
  const finishClosing = useEffectEvent(onClose);
  const [collapsed, setCollapsed] = useState(new Map<string, string | null>());
  const selectedPath = selected
    ? ancestry(document.nodes, selected)
    : undefined;

  useEffect(() => {
    const parent = panel.current?.offsetParent;
    if (!(parent instanceof HTMLElement)) return;
    const observer = new ResizeObserver(() => {
      setBounds((previous) => previous && position(previous, parent));
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = list.current;
    const item = viewport?.querySelector('[aria-pressed="true"]');
    if (!item || !viewport) return;
    const itemRect = item.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    if (itemRect.top < viewportRect.top)
      viewport.scrollTop -= viewportRect.top - itemRect.top;
    else if (itemRect.bottom > viewportRect.bottom)
      viewport.scrollTop += itemRect.bottom - viewportRect.bottom;
  }, [selected]);

  useEffect(() => {
    if (!closing) return;
    // A parent motion preference may disable the exit animation altogether.
    const animation = panel.current?.getAnimations()[0];
    if (!animation) {
      finishClosing();
      return;
    }
    let active = true;
    void animation.finished.then(
      () => {
        if (active) finishClosing();
      },
      () => {
        if (active) finishClosing();
      },
    );
    return () => {
      active = false;
    };
  }, [closing]);

  function apply(action: Gesture, original: Bounds, change: Point) {
    const parent = panel.current?.offsetParent;
    if (!(parent instanceof HTMLElement)) return;
    if (action === "move") {
      setBounds(
        position(
          {
            ...original,
            x: original.x + change.x,
            y: original.y + change.y,
          },
          parent,
        ),
      );
      return;
    }
    const right = original.x + original.width;
    const availableWidth = right - inset;
    const availableHeight = parent.clientHeight - original.y - inset;
    const width = clamp(
      original.width - change.x,
      Math.min(180, availableWidth),
      availableWidth,
    );
    const height = clamp(
      original.height + change.y,
      Math.min(125, availableHeight),
      availableHeight,
    );
    setBounds(
      position({ ...original, x: right - width, width, height }, parent),
    );
  }

  function measure(): Bounds | undefined {
    const area = panel.current;
    if (!area) return;
    return {
      x: area.offsetLeft,
      y: area.offsetTop,
      width: area.offsetWidth,
      height: area.offsetHeight,
    };
  }

  function beginGesture(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const original = measure();
    if (!original) return;
    start.current = {
      point: { x: event.clientX, y: event.clientY },
      bounds: original,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateGesture(
    event: PointerEvent<HTMLButtonElement>,
    action: Gesture,
  ) {
    const origin = start.current;
    if (!origin || !event.currentTarget.hasPointerCapture(event.pointerId))
      return;
    apply(action, origin.bounds, {
      x: event.clientX - origin.point.x,
      y: event.clientY - origin.point.y,
    });
  }

  function stopGesture() {
    start.current = null;
  }

  function keyboardGesture(
    event: KeyboardEvent<HTMLButtonElement>,
    action: Gesture,
  ) {
    const direction = arrowDirection[event.key];
    if (!direction) return;
    const original = measure();
    if (!original) return;
    event.preventDefault();
    const step = event.shiftKey ? 32 : 8;
    apply(action, original, {
      x: direction.x * step,
      y: direction.y * step,
    });
  }

  function branch(nodes: readonly BuilderNode[]) {
    return (
      <ul className={styles.tree}>
        {nodes.map((node) => {
          const definition = definitions.get(node.type);
          const name = definition ? t(definition.label) : node.type;
          const expandable = Boolean(node.children?.length);
          const expanded =
            !collapsed.has(node.id) ||
            (selectedPath?.includes(node.id) &&
              collapsed.get(node.id) !== selected);
          return (
            <li key={node.id}>
              <div className={styles.row}>
                {expandable ? (
                  <Button
                    className={styles.disclosure}
                    aria-label={`${t(expanded ? "收起" : "展开")} · ${name}`}
                    aria-expanded={Boolean(expanded)}
                    aria-controls={`${id}-${node.id}`}
                    onClick={() =>
                      setCollapsed((previous) => {
                        const next = new Map(previous);
                        if (expanded) next.set(node.id, selected);
                        else next.delete(node.id);
                        return next;
                      })
                    }
                  >
                    <Icon name="chevron" />
                  </Button>
                ) : (
                  <span className={styles.spacer} />
                )}
                <Button
                  className={styles.node}
                  aria-pressed={selected === node.id}
                  title={name}
                  onClick={() => onSelect(node.id)}
                  onContextMenu={
                    onContextMenu
                      ? (event) => {
                          event.preventDefault();
                          onSelect(node.id);
                          const rectangle =
                            event.currentTarget.getBoundingClientRect();
                          onContextMenu(node.id, {
                            x: event.clientX || rectangle.left,
                            y: event.clientY || rectangle.bottom,
                          });
                        }
                      : undefined
                  }
                >
                  <Icon name={builderIcon(definition ?? node)} />
                  <span>{name}</span>
                </Button>
              </div>
              {expandable && (
                <div
                  className={styles.children}
                  hidden={!expanded}
                  id={`${id}-${node.id}`}
                >
                  {expanded && branch(node.children!)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  const geometry =
    bounds &&
    ({
      "--navigator-left": `${bounds.x}px`,
      "--navigator-top": `${bounds.y}px`,
      "--navigator-width": `${bounds.width}px`,
      "--navigator-height": `${bounds.height}px`,
    } as CSSProperties);

  return (
    <aside
      ref={panel}
      aria-labelledby={id}
      className={styles.panel}
      style={geometry}
      data-positioned={Boolean(bounds) || undefined}
      data-closing={closing || undefined}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          setClosing(true);
        }
      }}
    >
      <header className={styles.header}>
        <Button
          className={styles.move}
          aria-label={t("移动结构面板")}
          onPointerDown={beginGesture}
          onPointerMove={(event) => updateGesture(event, "move")}
          onLostPointerCapture={stopGesture}
          onKeyDown={(event) => keyboardGesture(event, "move")}
        >
          <Icon name="grip" />
          <span id={id}>{t("结构")}</span>
        </Button>
        <Button
          className={styles.close}
          aria-label={t("关闭结构面板")}
          title={t("关闭结构面板")}
          onClick={() => setClosing(true)}
        >
          <Icon name="close" />
        </Button>
      </header>
      <div className={styles.body} ref={list}>
        {document.nodes.length ? (
          branch(document.nodes)
        ) : (
          <p>{t("暂无组件")}</p>
        )}
      </div>
      <Button
        className={styles.resize}
        aria-label={t("调整结构面板大小")}
        title={t("调整结构面板大小")}
        onPointerDown={beginGesture}
        onPointerMove={(event) => updateGesture(event, "resize")}
        onLostPointerCapture={stopGesture}
        onKeyDown={(event) => keyboardGesture(event, "resize")}
      >
        <Icon name="expand" />
      </Button>
    </aside>
  );
}
