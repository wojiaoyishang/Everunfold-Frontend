"use client";

import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useDndMonitor, useDndContext } from "@dnd-kit/core";
import type {
  BuilderComponentDefinition,
  BuilderDocument,
  BuilderNode,
} from "@/core/builder/types";
import { builderEntries } from "@/core/builder/document";
import { UiText, useT } from "@/core/i18n/provider";
import {
  useDragItem,
  useDragState,
  useDropPosition,
} from "../../components/ui/drag-and-drop";
import { ConfirmPopover } from "../../components/ui/confirm-popover";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import type { MediaURL } from "@/core/contracts/content-admin";
import type { PublicShortcode } from "@/core/contracts/settings";
import dynamic from "next/dynamic";
import styles from "./live-canvas.module.css";

const InlineSource = dynamic(() => import("./inline-source"), { ssr: false });
const InlineHeading = dynamic(() => import("./inline-heading"), { ssr: false });

export interface LiveCanvasFrame {
  ref: RefObject<HTMLIFrameElement | null>;
  src: string;
  onLoad: () => void;
  status: string;
  retry: () => void;
}

type Point = { x: number; y: number };
type InlineRequest = { id: string; caret?: number };
type Area = { left: number; top: number; width: number; height: number };
type MeasuredNode = Area & {
  id: string;
  horizontal: boolean;
  inView: boolean;
  gridDrop?: Area;
};
type GridGuide = { id: string; host: HTMLElement; count: number };
type DropArea = { position: string; area: Area; kind?: "inside" | "side" };
type ContainerLayout = "column" | "row" | "grid";

const layouts = [
  { value: "column", label: "纵向", icon: "list" },
  { value: "row", label: "横向", icon: "sidebar" },
  { value: "grid", label: "网格", icon: "grid" },
] as const;

const documentSelector = "[data-builder-document]";
const nodeSelector = "[data-builder-id]";
const formControl =
  "a,button,input,textarea,select,form,[role=button],[contenteditable=true]";
const bottom = (area: Area) => area.top + area.height;

function sourceFormat(node?: BuilderNode) {
  return node?.type === "core.html"
    ? "html"
    : node?.type === "core.markdown"
      ? "markdown"
      : null;
}

/** Selection and drop overlays measure the actual reader DOM. */
export function LiveBuilderCanvas({
  frame: { ref: viewRef, src, onLoad, status, retry },
  document: value,
  definitions,
  selected,
  onSelect,
  disabled,
  device,
  interactive = false,
  canInsert = !disabled,
  onAdd,
  onInsertLayout,
  onTemplates,
  onRemove,
  onContextMenu,
  onInlineChange,
  onInlineActiveChange,
  inlineRequest,
  media,
  shortcodes,
}: {
  frame: LiveCanvasFrame;
  document: BuilderDocument;
  definitions: ReadonlyMap<string, BuilderComponentDefinition>;
  selected: string | null;
  onSelect: (id: string, revealPanel?: boolean) => void;
  disabled: boolean;
  device: string;
  interactive?: boolean;
  canInsert?: boolean;
  onAdd?: (parent?: string) => void;
  onInsertLayout?: (layout: ContainerLayout) => void;
  onTemplates?: () => void;
  onRemove?: (id: string) => void;
  onContextMenu?: (id: string, point: Point) => void;
  onInlineChange?: (id: string, source: string) => void;
  onInlineActiveChange?: (active: boolean) => void;
  inlineRequest?: InlineRequest | null;
  media?: Record<string, MediaURL>;
  shortcodes?: readonly PublicShortcode[];
}) {
  const t = useT();
  const [load, setLoad] = useState(0);
  const [areas, setAreas] = useState<MeasuredNode[]>([]);
  const [gridGuides, setGridGuides] = useState<GridGuide[]>([]);
  const [insertArea, setInsertArea] = useState<Area | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [editing, setEditing] = useState<InlineRequest | null>(null);
  const [inlineTarget, setInlineTarget] = useState<{
    id: string;
    host: HTMLElement;
  } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealed = useRef<string | null>(null);
  const scheduleMeasure = useRef<(() => void) | null>(null);
  const pointer = useRef<Point | null>(null);
  const nodes = useMemo(
    () => new Map(builderEntries(value.nodes).map((node) => [node.id, node])),
    [value.nodes],
  );
  const drag = useDragState();
  const dragging = !interactive && Boolean(drag.active);
  const { measureDroppableContainers } = useDndContext();
  const select = useEffectEvent(onSelect);
  const contextMenu = useEffectEvent((id: string, point: Point) =>
    onContextMenu?.(id, point),
  );
  const selection = useEffectEvent(() => selected);
  const isDragging = useEffectEvent(() => dragging);
  const isCurrentNode = useEffectEvent((id: string) => nodes.has(id));
  const signalInline = useEffectEvent((active: boolean) =>
    onInlineActiveChange?.(active),
  );
  const editFromFrame = useEffectEvent((id: string, event: MouseEvent) => {
    const node = nodes.get(id);
    if (!disabled && onInlineChange && node?.type === "core.heading") {
      const heading = (event.target as Element | null)?.closest(
        "h2, h3, h4, h5, h6",
      );
      onSelect(id, false);
      setEditing({ id, caret: heading ? headingCaret(heading, event) : 0 });
      signalInline(true);
    } else if (
      !disabled &&
      onInlineChange &&
      selected === id &&
      sourceFormat(node)
    ) {
      setEditing({ id });
      signalInline(true);
    } else select(id);
  });
  const inlineId =
    !disabled && !interactive && onInlineChange ? (editing?.id ?? null) : null;
  const editingNode = inlineId ? nodes.get(inlineId) : undefined;
  const inlineHost = inlineTarget?.id === inlineId ? inlineTarget.host : null;
  const format = sourceFormat(editingNode);
  const editingHeading = editingNode?.type === "core.heading";
  const inlineNodeId = useEffectEvent(() => inlineId);
  const canOpenContextMenu = !disabled && Boolean(onContextMenu);
  const setHover = (id: string | null) => {
    if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
    if (id) setHovered(id);
    else hoverTimer.current = setTimeout(() => setHovered(null), 100);
  };
  const hoverFromFrame = useEffectEvent(setHover);

  useDndMonitor({
    onDragMove(event) {
      const source = event.activatorEvent as MouseEvent | TouchEvent;
      const origin = "touches" in source ? source.touches[0] : source;
      if (origin && typeof origin.clientX === "number")
        pointer.current = {
          x: origin.clientX + event.delta.x,
          y: origin.clientY + event.delta.y,
        };
    },
    onDragEnd() {
      pointer.current = null;
    },
    onDragCancel() {
      pointer.current = null;
    },
    onDragOver({ activatorEvent, over }) {
      if (activatorEvent.type !== "keydown" || !over) return;
      const page = viewRef.current?.contentDocument;
      if (!page) return;
      const [parent, before] = String(over.data.current?.before ?? "").split(
        "/",
      );
      const node = before || parent;
      const target = node
        ? [
            ...page.querySelectorAll<HTMLElement>(
              `${documentSelector} ${nodeSelector}`,
            ),
          ].find((candidate) => candidate.dataset.builderId === node)
        : page.querySelector("[data-builder-insert]");
      const rect = target?.getBoundingClientRect();
      if (
        rect &&
        (rect.top < 38 || rect.top > page.documentElement.clientHeight - 40)
      )
        target?.scrollIntoView({
          block: before ? "center" : "end",
          behavior: "instant",
        });
    },
  });
  useEffect(() => {
    if (dragging) measureDroppableContainers([]);
  }, [areas, insertArea, dragging, measureDroppableContainers]);
  useEffect(() => {
    scheduleMeasure.current?.();
  }, [selected, value.nodes, dragging, inlineId]);
  useEffect(() => {
    if (inlineRequest) {
      let current = true;
      queueMicrotask(() => {
        if (!current) return;
        setEditing(inlineRequest);
      });
      return () => {
        current = false;
      };
    }
  }, [inlineRequest]);
  const inlineOpen = Boolean(
    inlineId && editingNode && (format || editingHeading),
  );
  useEffect(() => {
    if (inlineOpen) {
      signalInline(true);
      return () => signalInline(false);
    }
  }, [inlineOpen]);
  useEffect(
    () => () => {
      if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
    },
    [],
  );

  useEffect(() => {
    const root = viewRef.current?.contentDocument?.documentElement;
    if (!root || interactive) return;
    root.setAttribute("data-builder-device", device);
    return () => {
      root.removeAttribute("data-builder-device");
    };
  }, [device, interactive, load, viewRef]);

  useEffect(() => {
    const iframe = viewRef.current;
    const page = iframe?.contentDocument;
    if (interactive || !page || !iframe) return;
    page.documentElement.setAttribute(
      "data-builder-editor",
      canInsert ? "editable" : "readonly",
    );
    revealed.current = null;
    let animation = 0;
    const schedule = () => {
      cancelAnimationFrame(animation);
      animation = requestAnimationFrame(measure);
    };
    scheduleMeasure.current = schedule;
    const measure = () => {
      const moving = isDragging();
      const bounds = iframe.getBoundingClientRect();
      const nodeElements = [
        ...page.querySelectorAll<HTMLElement>(
          `${documentSelector} ${nodeSelector}`,
        ),
      ].filter((element) => isCurrentNode(element.dataset.builderId!));
      const activeId = selection();
      const inline = inlineNodeId();
      const found = inline
        ? nodeElements.find((element) => element.dataset.builderId === inline)
        : null;
      const host = found?.querySelector<HTMLElement>(
        ":scope > [data-builder-inline-host]",
      );
      setInlineTarget((previous) =>
        inline && host
          ? previous?.host === host
            ? previous
            : { id: inline, host }
          : null,
      );
      if (!activeId) revealed.current = null;
      else if (revealed.current !== activeId) {
        const element = nodeElements.find(
          (item) => item.dataset.builderId === activeId,
        );
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top < 45 || rect.top > iframe.clientHeight - 35)
            element.scrollIntoView({ block: "center", behavior: "instant" });
          revealed.current = activeId;
        }
      }
      const guides: GridGuide[] = [];
      const next = nodeElements.map((element) => {
        const container = element.querySelector(
          ":scope > [data-builder-container]",
        );
        const computed = container
          ? page.defaultView?.getComputedStyle(container)
          : null;
        const area = elementArea(element);
        let gridDrop: Area | undefined;
        if (canInsert && container && computed?.display === "grid") {
          const host = container.querySelector<HTMLElement>(
            ":scope > [data-builder-grid-guide-host]",
          );
          if (host) {
            // Use the resolved tracks so guides follow the iframe's responsive rules.
            const tracks = computed.gridTemplateColumns.trim();
            const columns = /^\d/.test(tracks) ? tracks.split(/\s+/).length : 0;
            const children = container.querySelectorAll(
              ":scope > [data-builder-id]",
            ).length;
            const count =
              columns && children
                ? (columns - (children % columns)) % columns
                : columns;
            if (count) {
              guides.push({ id: element.dataset.builderId!, host, count });
              const first = host.firstElementChild;
              const last = host.lastElementChild;
              if (first && last && host.childElementCount === count)
                gridDrop = unionArea(first, last);
            }
          }
        }
        return {
          ...area,
          id: element.dataset.builderId!,
          horizontal:
            computed?.display === "flex" && computed.flexDirection === "row",
          inView: area.top < iframe.clientHeight && bottom(area) > 0,
          gridDrop,
        };
      });
      setGridGuides((previous) =>
        previous.length === guides.length &&
        previous.every(
          ({ host, count }, index) =>
            host === guides[index].host && count === guides[index].count,
        )
          ? previous
          : guides,
      );
      setAreas((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
      const insert = page.querySelector("[data-builder-insert]");
      const nextInsert = insert ? elementArea(insert) : null;
      setInsertArea((previous) =>
        JSON.stringify(previous) === JSON.stringify(nextInsert)
          ? previous
          : nextInsert,
      );
      const point = pointer.current;
      if (
        moving &&
        point &&
        point.x >= bounds.left &&
        point.x <= bounds.right &&
        point.y >= bounds.top - 24 &&
        point.y <= bounds.bottom + 24
      ) {
        const delta =
          point.y < bounds.top + 44
            ? -12
            : point.y > bounds.bottom - 44
              ? 12
              : 0;
        if (delta) iframe.contentWindow?.scrollBy(0, delta);
      }
      if (moving) animation = requestAnimationFrame(measure);
    };
    const nodeAt = (target: EventTarget | null) => {
      const id = (target as Element | null)?.closest?.<HTMLElement>(
        nodeSelector,
      )?.dataset.builderId;
      return id && isCurrentNode(id) ? id : null;
    };
    const click = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest?.("[data-builder-inline-host]")) {
        if (target.closest("a")) event.preventDefault();
        return;
      }
      const id = nodeAt(event.target);
      if (id || target?.closest?.(formControl)) suppress(event);
      if (id && event.type === "click") editFromFrame(id, event);
    };
    const context = (event: MouseEvent) => {
      if (
        (event.target as Element | null)?.closest?.(
          "[data-builder-inline-host]",
        )
      )
        return;
      const id = nodeAt(event.target);
      if (!id || !canOpenContextMenu) return;
      suppress(event);
      const rect = iframe.getBoundingClientRect();
      contextMenu(id, {
        x: rect.left + event.clientX,
        y: rect.top + event.clientY,
      });
    };
    const hover = (event: PointerEvent) => {
      if (event.pointerType !== "touch") hoverFromFrame(nodeAt(event.target));
    };
    const leave = () => hoverFromFrame(null);
    const observer = new ResizeObserver(schedule);
    observer.observe(iframe);
    if (page.body) observer.observe(page.body);
    const mutation = new MutationObserver(schedule);
    mutation.observe(page.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    page.addEventListener("scroll", schedule, true);
    page.addEventListener("load", schedule, true);
    page.addEventListener("click", click, true);
    page.addEventListener("auxclick", click, true);
    page.addEventListener("submit", suppress, true);
    page.addEventListener("contextmenu", context, true);
    page.addEventListener("pointerover", hover, true);
    page.documentElement.addEventListener("pointerleave", leave);
    schedule();
    return () => {
      cancelAnimationFrame(animation);
      scheduleMeasure.current = null;
      observer.disconnect();
      mutation.disconnect();
      page.documentElement.removeAttribute("data-builder-editor");
      page.removeEventListener("scroll", schedule, true);
      page.removeEventListener("load", schedule, true);
      page.removeEventListener("click", click, true);
      page.removeEventListener("auxclick", click, true);
      page.removeEventListener("submit", suppress, true);
      page.removeEventListener("contextmenu", context, true);
      page.removeEventListener("pointerover", hover, true);
      page.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [viewRef, src, load, interactive, canInsert, canOpenContextMenu]);

  const byId = new Map(areas.map((area) => [area.id, area]));
  const targets: DropArea[] = [];
  const collect = (items: BuilderNode[], parentId?: string) => {
    const parent = parentId ? byId.get(parentId) : undefined;
    for (const item of items) {
      const area = byId.get(item.id);
      if (area)
        targets.push(
          parent?.horizontal
            ? {
                position: `${parentId}/${item.id}`,
                kind: "side",
                area: {
                  ...area,
                  left: area.left - 8,
                  width: 16,
                  height: Math.max(area.height, 16),
                },
              }
            : {
                position: `${parentId ?? ""}/${item.id}`,
                area: { ...area, top: area.top - 8, height: 16 },
              },
        );
      if (definitions.get(item.type)?.container || item.children?.length)
        collect(item.children ?? [], item.id);
    }
    if (!parent) return;
    targets.push(
      parent.gridDrop
        ? {
            position: `${parentId}/`,
            kind: "inside",
            area: parent.gridDrop,
          }
        : parent.horizontal && items.length
          ? {
              position: `${parentId}/`,
              kind: "side",
              area: {
                ...parent,
                left: parent.left + parent.width - 9,
                width: 18,
              },
            }
          : {
              position: `${parentId}/`,
              kind: items.length ? undefined : "inside",
              area: items.length
                ? { ...parent, top: bottom(parent) - 10, height: 20 }
                : parent,
            },
    );
  };
  collect(value.nodes);
  // On a small screen, the library overlays the canvas. Keep the sensor mounted
  // but let the pointer reach the iframe-sized drop slots when a drag starts.
  const canvasEnabled = !interactive && !disabled;
  const finishInline = (id: string, value?: string) => {
    if (value !== undefined) onInlineChange?.(id, value);
    setEditing((current) => (current?.id === id ? null : current));
  };

  return (
    <div
      className={styles.canvas}
      data-device={device}
      data-dragging={dragging || undefined}
    >
      <iframe
        ref={viewRef}
        src={src}
        title={t("前台实时预览")}
        onLoad={() => {
          setLoad((n) => n + 1);
          setEditing(null);
          setInlineTarget(null);
          onLoad();
        }}
      />
      {status === "error" && (
        <div className={styles.status} role="status">
          <UiText text="预览更新未完成，请重试。" />
          <Button onClick={retry}>
            <UiText text="重试" />
          </Button>
        </div>
      )}
      {status === "loading" && (
        <div className={styles.status} role="status">
          <Icon name="refresh" />
          <UiText text="正在载入预览…" />
        </div>
      )}
      {!interactive && (
        <div className={styles.overlay} aria-label={t("预览中的组件操作")}>
          {areas.map((area) => {
            const node = nodes.get(area.id);
            if (
              !node ||
              (node.id === inlineId && editingHeading) ||
              area.height < 1 ||
              area.width < 1
            )
              return null;
            const definition = definitions.get(node.type);
            return (
              <Outline
                key={node.id}
                area={area}
                id={node.id}
                label={definition?.label ?? node.type}
                container={Boolean(
                  definition?.container || node.children?.length,
                )}
                selected={selected === node.id}
                hovered={hovered === node.id}
                disabled={disabled}
                visible={area.inView || drag.active?.id === node.id}
                onHover={setHover}
                onSelect={() => {
                  if (
                    !disabled &&
                    onInlineChange &&
                    (sourceFormat(node) || node.type === "core.heading")
                  ) {
                    onSelect(node.id, false);
                    setEditing({ id: node.id });
                    onInlineActiveChange?.(true);
                  } else onSelect(node.id);
                }}
                onAdd={onAdd && (() => onAdd(node.id))}
                onRemove={onRemove && (() => onRemove(node.id))}
                onContextMenu={
                  onContextMenu && ((point) => onContextMenu(node.id, point))
                }
              />
            );
          })}
          {canvasEnabled &&
            targets.map((target) => (
              <PreviewDrop
                key={target.position}
                {...target}
                active={dragging}
              />
            ))}
          {!disabled && !inlineOpen && insertArea && (
            <InsertArea
              area={insertArea}
              onAdd={onAdd}
              onInsertLayout={onInsertLayout}
              onTemplates={onTemplates}
            />
          )}
        </div>
      )}
      {!interactive &&
        canInsert &&
        gridGuides.map(({ id, host, count }) =>
          createPortal(
            Array.from({ length: count }, (_, index) => (
              <span key={index} data-builder-grid-guide />
            )),
            host,
            id,
          ),
        )}
      {inlineHost && editingNode && format && onInlineChange && (
        <InlineSource
          key={editingNode.id}
          id={editingNode.id}
          host={inlineHost}
          source={
            typeof editingNode.props.source === "string"
              ? editingNode.props.source
              : ""
          }
          format={format}
          media={media}
          shortcodes={shortcodes}
          onFinish={(source) => finishInline(editingNode.id, source)}
        />
      )}
      {inlineHost && editingNode && editingHeading && onInlineChange && (
        <InlineHeading
          key={editingNode.id}
          host={inlineHost}
          level={editingNode.props.level}
          text={
            typeof editingNode.props.text === "string"
              ? editingNode.props.text
              : ""
          }
          caret={editing?.caret}
          onFinish={(text) => finishInline(editingNode.id, text)}
        />
      )}
    </div>
  );
}

function suppress(event: Event) {
  event.preventDefault();
  event.stopPropagation();
}

function headingCaret(heading: Element, event: MouseEvent) {
  const page = heading.ownerDocument;
  const caret = page.caretPositionFromPoint?.(event.clientX, event.clientY);
  const range = caret
    ? null
    : page.caretRangeFromPoint?.(event.clientX, event.clientY);
  const node = caret?.offsetNode ?? range?.startContainer;
  if (!node || !heading.contains(node)) return heading.textContent?.length ?? 0;
  const before = page.createRange();
  before.selectNodeContents(heading);
  before.setEnd(node, caret?.offset ?? range?.startOffset ?? 0);
  return before.toString().length;
}

function elementArea(element: Element): Area {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { left, top, width, height };
}

function unionArea(first: Element, last: Element): Area {
  const a = first.getBoundingClientRect();
  const b = last.getBoundingClientRect();
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  return {
    left,
    top,
    width: Math.max(a.right, b.right) - left,
    height: Math.max(a.bottom, b.bottom) - top,
  };
}

function boxStyle({ left, top, width, height }: Area): CSSProperties {
  return { left, top, width, height };
}

function PreviewDrop({
  position,
  area,
  kind,
  active,
}: DropArea & { active: boolean }) {
  const { setNodeRef, over, source } = useDropPosition(position, false);
  const [parent, before] = position.split("/");
  const valid = source?.id !== parent && source?.id !== before;
  return (
    <div
      ref={setNodeRef}
      className={styles.drop}
      style={boxStyle(area)}
      data-kind={kind}
      data-over={(over && valid) || undefined}
      data-active={active || undefined}
      aria-hidden="true"
    />
  );
}

function InsertArea({
  area,
  onAdd,
  onInsertLayout,
  onTemplates,
}: {
  area: Area;
  onAdd?: () => void;
  onInsertLayout?: (layout: ContainerLayout) => void;
  onTemplates?: () => void;
}) {
  const t = useT();
  const { setNodeRef, over } = useDropPosition("/", false);
  const [choosingLayout, setChoosingLayout] = useState(false);
  const add = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (choosingLayout) first.current?.focus({ preventScroll: true });
    else if (restoreFocus.current) {
      add.current?.focus({ preventScroll: true });
      restoreFocus.current = false;
    }
  }, [choosingLayout]);
  const close = () => {
    restoreFocus.current = true;
    setChoosingLayout(false);
  };
  return (
    <div
      ref={setNodeRef}
      className={styles.insert}
      style={boxStyle(area)}
      data-over={over || undefined}
      onKeyDown={(event) => {
        if (choosingLayout && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      {choosingLayout ? (
        <>
          <Button
            className={styles.cancelLayout}
            onClick={close}
            aria-label={t("取消")}
            title={t("取消")}
          >
            <Icon name="close" />
          </Button>
          <UiText text="选择容器布局" />
          <div
            className={styles.layoutOptions}
            role="group"
            aria-label={t("选择容器布局")}
          >
            {layouts.map((layout, index) => (
              <Button
                key={layout.value}
                ref={index === 0 ? first : undefined}
                onClick={() => {
                  close();
                  onInsertLayout?.(layout.value);
                }}
              >
                <Icon name={layout.icon} />
                <UiText text={layout.label} />
              </Button>
            ))}
          </div>
        </>
      ) : (
        <>
          {(onAdd || onInsertLayout || onTemplates) && (
            <div className={styles.insertActions}>
              {(onAdd || onInsertLayout) && (
                <Button
                  ref={add}
                  onClick={
                    onInsertLayout ? () => setChoosingLayout(true) : onAdd
                  }
                  aria-label={t("添加组件")}
                  title={t("添加组件")}
                >
                  <Icon name="plus" />
                </Button>
              )}
              {onTemplates && (
                <Button
                  onClick={onTemplates}
                  aria-label={t("插入模板")}
                  title={t("插入模板")}
                >
                  <Icon name="folder" />
                </Button>
              )}
            </div>
          )}
          <UiText text="将组件拖到这里" />
        </>
      )}
    </div>
  );
}

function Outline({
  area,
  id,
  label,
  container,
  selected,
  hovered,
  disabled,
  visible,
  onHover,
  onSelect,
  onAdd,
  onRemove,
  onContextMenu,
}: {
  area: Area;
  id: string;
  label: string;
  container: boolean;
  selected: boolean;
  hovered: boolean;
  disabled: boolean;
  visible: boolean;
  onHover: (id: string | null) => void;
  onSelect: () => void;
  onAdd?: () => void;
  onRemove?: () => void;
  onContextMenu?: (point: Point) => void;
}) {
  const t = useT();
  const name = t(label);
  const { ref, handle } = useDragItem(
    { id, kind: "block", label: name },
    disabled,
  );
  const editLabel = `${t("编辑组件")} · ${name}`;
  return (
    <div
      ref={ref}
      className={styles.outline}
      style={boxStyle(area)}
      data-canvas-node={id}
      data-container={container || undefined}
      data-selected={selected || undefined}
      data-hovered={hovered || undefined}
    >
      <div
        className={styles.tools}
        inert={!visible}
        data-edge={area.top < 40 || undefined}
        onPointerEnter={() => onHover(id)}
        onPointerLeave={() => onHover(null)}
        onContextMenu={
          disabled || !onContextMenu
            ? undefined
            : (event) => {
                event.preventDefault();
                onContextMenu({ x: event.clientX, y: event.clientY });
              }
        }
        onKeyDown={
          disabled || !onContextMenu
            ? undefined
            : (event) => {
                if (
                  event.key !== "ContextMenu" &&
                  !(event.shiftKey && event.key === "F10")
                )
                  return;
                event.preventDefault();
                const rect = event.currentTarget.getBoundingClientRect();
                onContextMenu({ x: rect.left, y: rect.bottom });
              }
        }
      >
        {container && !disabled && onAdd && (
          <Button
            className={styles.tool}
            onClick={onAdd}
            aria-label={t("在容器中添加组件")}
            title={t("在容器中添加组件")}
          >
            <Icon name="plus" />
          </Button>
        )}
        <Button
          {...(disabled ? {} : handle)}
          className={styles.tool}
          data-movable={!disabled || undefined}
          aria-label={
            container && !disabled ? `${t("移动组件")} · ${name}` : editLabel
          }
          title={container && !disabled ? t("拖动组件") : editLabel}
          onClick={onSelect}
          onKeyDown={(event) => {
            if (event.key !== "Enter") handle.onKeyDown?.(event);
          }}
        >
          <Icon name={container && !disabled ? "grip" : "edit"} />
        </Button>
        {container && !disabled && onRemove && (
          <ConfirmPopover
            label={`${t("移除组件")} · ${name}`}
            title={t("移除此组件？")}
            description={t("如果组件包含其他组件，子组件也会移除。")}
            triggerClassName={styles.tool}
            onConfirmed={onRemove}
          >
            <Icon name="close" />
          </ConfirmPopover>
        )}
      </div>
    </div>
  );
}
