"use client";
import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
  type ComponentPropsWithRef,
} from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";

const noSubscription = () => () => {};

export type DragItem = { id: string; kind: "block" | "palette"; label: string };
const touchHold = { delay: 180, tolerance: 10 };

const DragState = createContext<{
  active: DragItem | null;
  over: string | null;
}>({ active: null, over: null });
type KeyboardTarget = { id: string; before: string | null };
function keyboardCoordinates(
  select: (target: KeyboardTarget) => void,
  selected: () => string | undefined,
): KeyboardCoordinateGetter {
  return (event, { context, currentCoordinates }) => {
    if (
      ![
        "ArrowDown",
        "ArrowUp",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ].includes(event.code)
    )
      return;
    event.preventDefault();
    const slots = [...context.droppableContainers.getEnabled()]
      .filter((d) => d.data.current?.slot)
      .map((d) => ({
        id: d.id,
        rect: context.droppableRects.get(d.id),
        before: d.data.current?.before ?? null,
        node: d.node.current,
      }))
      .filter((d) => d.rect)
      .sort((a, b) => a.rect!.top - b.rect!.top);
    const source = context.active?.data.current as DragItem | undefined;
    const sourceIndex =
      source?.kind === "block"
        ? slots.findIndex((d) => d.id === `position:${source.id}`)
        : -1;
    const candidates = slots.filter(
      (_, index) =>
        sourceIndex < 0 || (index !== sourceIndex && index !== sourceIndex + 1),
    );
    const collision = context.collisionRect;
    if (!collision) return;
    const currentRect = slots.find(
      (d) => d.id === (selected() ?? context.over?.id),
    )?.rect;
    const baseline = currentRect
      ? currentRect.top + currentRect.height / 2
      : collision.top + collision.height / 2;
    const forward = event.code === "ArrowDown" || event.code === "ArrowRight";
    const picked =
      event.code === "Home"
        ? candidates[0]
        : event.code === "End"
          ? candidates.at(-1)
          : forward
            ? candidates.find(
                (d) => d.rect!.top + d.rect!.height / 2 > baseline + 1,
              )
            : candidates.findLast(
                (d) => d.rect!.top + d.rect!.height / 2 < baseline - 1,
              );
    const target = picked?.rect;
    if (target && collision && picked) {
      select({ id: String(picked.id), before: picked.before });
      if (target.top < 90 || target.bottom > window.innerHeight - 36)
        requestAnimationFrame(() =>
          picked.node?.scrollIntoView({ block: "center", behavior: "instant" }),
        );
      return {
        x:
          currentCoordinates.x +
          target.left +
          target.width / 2 -
          (collision.left + collision.width / 2),
        y:
          currentCoordinates.y +
          target.top +
          target.height / 2 -
          (collision.top + collision.height / 2),
      };
    }
  };
}
const slotCollision =
  (nested: boolean): CollisionDetection =>
  (args) => {
    const available = args.droppableContainers.filter(
      (d) => d.data.current?.slot,
    );
    const rects = available
      .map((d) => args.droppableRects.get(d.id))
      .filter((r) => r !== undefined);
    const p = args.pointerCoordinates;
    if (
      p &&
      rects.length &&
      (p.x < Math.min(...rects.map((r) => r.left)) - 20 ||
        p.x > Math.max(...rects.map((r) => r.right)) + 20 ||
        p.y < Math.min(...rects.map((r) => r.top)) - 64 ||
        p.y > Math.max(...rects.map((r) => r.bottom)) + 64)
    )
      return [];
    if (p) {
      return available
        .flatMap((container) => {
          const rect = args.droppableRects.get(container.id);
          return rect
            ? [
                {
                  id: container.id,
                  data: {
                    droppableContainer: container,
                    value: nested
                      ? Math.hypot(
                          Math.max(rect.left - p.x, 0, p.x - rect.right),
                          Math.max(rect.top - p.y, 0, p.y - rect.bottom),
                        ) +
                        Math.abs(p.y - (rect.top + rect.height / 2)) / 100
                      : Math.abs(p.y - (rect.top + rect.height / 2)),
                  },
                },
              ]
            : [];
        })
        .sort((a, b) => a.data.value - b.data.value)
        .slice(0, 1);
    }
    return closestCenter({ ...args, droppableContainers: available });
  };
const collision = slotCollision(false);
const nestedCollision = slotCollision(true);

/** Theme-owned interaction boundary. Dragging never mutates application data. */
export function DragAndDrop({
  children,
  disabled,
  onDrop,
  onBusyChange,
  renderPreview,
  nested = false,
}: {
  children: ReactNode;
  disabled: boolean;
  onDrop: (item: DragItem, before: string | null) => void;
  onBusyChange: (busy: boolean) => void;
  renderPreview: (item: DragItem) => ReactNode;
  nested?: boolean;
}) {
  const id = useId(),
    [active, setActive] = useState<DragItem | null>(null),
    [over, setOver] = useState<string | null>(null);
  const layer = useSyncExternalStore(
    noSubscription,
    () => document.querySelector(".admin-root"),
    () => null,
  );
  const keyboardTarget = useRef<KeyboardTarget | null>(null);
  const coordinates: KeyboardCoordinateGetter = useCallback(
    (event, args) =>
      keyboardCoordinates(
        (target) => {
          keyboardTarget.current = target;
          setOver(target.id);
        },
        () => keyboardTarget.current?.id,
      )(event, args),
    [],
  );
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: touchHold,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: coordinates,
      scrollBehavior: "auto",
    }),
  );
  const reset = () => {
    keyboardTarget.current = null;
    setActive(null);
    setOver(null);
    onBusyChange(false);
  };
  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={nested ? nestedCollision : collision}
      autoScroll={{
        canScroll: (e) => e === document.scrollingElement,
        threshold: { x: 0, y: 0.15 },
      }}
      accessibility={{
        screenReaderInstructions: {
          draggable: "按空格拾起，方向键选择插入位置，再按空格放下；Esc取消。",
        },
        announcements: {
          onDragStart: ({ active }) =>
            `已拾起${active.data.current?.label ?? "区块"}`,
          onDragOver: ({ over }) =>
            over ? "已选择插入位置" : "移到正文区域以放下",
          onDragEnd: () => "拖动结束",
          onDragCancel: () => "已取消拖动",
        },
      }}
      onDragStart={({ active }) => {
        if (disabled) return;
        keyboardTarget.current = null;
        setActive(active.data.current as DragItem);
        onBusyChange(true);
      }}
      onDragOver={({ over }) =>
        setOver(keyboardTarget.current?.id ?? (over ? String(over.id) : null))
      }
      onDragCancel={reset}
      onDragEnd={({ active, over }) => {
        if (!disabled && (keyboardTarget.current || over))
          onDrop(
            active.data.current as DragItem,
            keyboardTarget.current
              ? keyboardTarget.current.before
              : (over?.data.current?.before ?? null),
          );
        reset();
      }}
    >
      <DragState value={{ active, over }}>
        {children}
        {layer &&
          createPortal(
            <DragOverlay dropAnimation={null}>
              {active ? renderPreview(active) : null}
            </DragOverlay>,
            layer,
          )}
      </DragState>
    </DndContext>
  );
}
export function useDragItem(item: DragItem, disabled: boolean) {
  const drag = useDraggable({
    id: `${item.kind}:${item.id}`,
    data: item,
    disabled,
  });
  const handle: ComponentPropsWithRef<"button"> & {
    ref: typeof drag.setActivatorNodeRef;
  } = {
    ...drag.attributes,
    ...drag.listeners,
    ref: drag.setActivatorNodeRef,
  };
  return {
    ref: drag.setNodeRef,
    dragging: drag.isDragging,
    handle,
  };
}
export function useDropPosition(before: string | null, disabled: boolean) {
  const id = `position:${before ?? "end"}`;
  const { setNodeRef } = useDroppable({
    id,
    data: { slot: true, before },
    disabled,
  });
  const state = useContext(DragState);
  return {
    setNodeRef,
    active: Boolean(state.active),
    over: state.over === id,
    source: state.active,
  };
}
export const useDragState = () => useContext(DragState);

/** FLIP only on structural order changes; no second editor or document is mounted. */
export function useReorderMotion(
  ref: RefObject<HTMLElement | null>,
  order: string,
) {
  const prior = useRef<{ order: string; top: number } | null>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const top = node.getBoundingClientRect().top + window.scrollY,
      old = prior.current;
    const root = node.closest<HTMLElement>(".admin-root"),
      preference = root?.dataset.adminMotion;
    const reduced =
      preference === "reduced" ||
      (preference !== "full" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (old && old.order !== order && Math.abs(old.top - top) > 1 && !reduced)
      node.animate(
        [
          { transform: `translateY(${old.top - top}px)` },
          { transform: "translateY(0)" },
        ],
        { duration: 240, easing: "cubic-bezier(.22,1,.36,1)" },
      );
    prior.current = { order, top };
  });
}
