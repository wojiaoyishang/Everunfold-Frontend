"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type {
  BuilderDevice,
  BuilderDocument,
  BuilderNode,
} from "@/core/builder/types";
import {
  cloneBuilderNode,
  createBuilderNode,
  emptyBuilderDocument,
  findBuilderNode,
  insertBuilderNode,
  moveBuilderNode,
  removeBuilderNode,
  updateBuilderNode,
  type BuilderPosition,
} from "@/core/builder/document";
import type {
  LiveBuilderChange,
  LiveBuilderState,
} from "@/core/preview/builder";
import { UiText, useT } from "@/core/i18n/provider";
import { Icon } from "../../components/icon";
import { Button, Popover, TextField } from "../../components/ui/primitives";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { DragAndDrop, type DragItem } from "../../components/ui/drag-and-drop";
import { useBuilderComponents } from "../../builder/content";
import { LiveBuilderCanvas, type LiveCanvasFrame } from "./live-canvas";
import { BuilderInspector } from "./inspector";
import { StructureNavigator } from "./structure-navigator";
import { PaletteItem } from "./palette-item";
import { BuilderTemplates } from "./templates";
import { LiveToolbar } from "../../preview/live-toolbar";
import layout from "../../preview/live-workspace.module.css";
import styles from "./editor.module.css";

const groups = [
  { id: "layout", label: "布局" },
  { id: "content", label: "基础组件" },
  { id: "media", label: "媒体" },
  { id: "interactive", label: "互动" },
] as const;

export type LivePanel =
  "content" | "library" | "properties" | "settings" | "parameters";
const endPosition: BuilderPosition = { parentId: null, beforeId: null };
function after(
  nodes: BuilderNode[],
  id: string,
  parentId: string | null = null,
): BuilderPosition | undefined {
  const index = nodes.findIndex((node) => node.id === id);
  if (index >= 0) return { parentId, beforeId: nodes[index + 1]?.id ?? null };
  for (const node of nodes) {
    const position = after(node.children ?? [], id, node.id);
    if (position) return position;
  }
}

export function LiveEditorSurface({
  builder,
  changeBuilder,
  frame,
  editor,
  editorPanelId,
  ready,
  saveBlocked,
  onOpenPreview,
  previewDisabled,
  onInlineActiveChange,
  title,
  published,
  kind,
  busy,
  panel,
  setPanel,
  onExit,
}: {
  builder: LiveBuilderState | null;
  changeBuilder: (change: LiveBuilderChange) => void;
  frame: LiveCanvasFrame;
  editor: ReactNode;
  editorPanelId: string;
  ready: boolean;
  saveBlocked: boolean;
  onOpenPreview: () => void;
  previewDisabled: boolean;
  onInlineActiveChange: (active: boolean) => void;
  title: string;
  published: boolean | null;
  kind: "page" | "template" | "article" | "shuoshuo";
  busy: boolean;
  panel: LivePanel;
  setPanel: (next: LivePanel) => void;
  onExit: () => void;
}) {
  const t = useT();
  const definitions = useBuilderComponents();
  const value = builder?.document ?? emptyBuilderDocument;
  const readOnly = !builder || builder.disabled || builder.linked;
  const [device, setDevice] = useState<BuilderDevice>("desktop");
  const [selected, setSelected] = useState<string | null>(null);
  const [target, setTarget] = useState<BuilderPosition>(endPosition);
  const [dragging, setDragging] = useState(false);
  const [structure, setStructure] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showOnMobile, setShowOnMobile] = useState(false);
  const [inlineRequest, setInlineRequest] = useState<{ id: string } | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [templates, setTemplates] = useState(false);
  const [remove, setRemove] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const panesRef = useRef<HTMLDivElement>(null);
  const structureRef = useRef<HTMLButtonElement>(null);
  const [history, setHistory] = useState<{
    before: BuilderDocument[];
    after: BuilderDocument[];
  }>({ before: [], after: [] });
  const current = selected ? findBuilderNode(value.nodes, selected) : undefined;
  const currentDefinition = current && definitions.get(current.type);
  // The layout always exists; only the contents of the left rail are selected after hydration.
  const activePanel =
    panel === "content" && builder
      ? builder.linked
        ? "parameters"
        : "library"
      : panel;
  const embedded = activePanel === "settings" || !builder;
  const awaitingEditor = !ready && frame.status !== "error";
  const canInsertTemplate = kind === "page" || kind === "template";

  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!menu || !element) return;
    if (!element.matches(":popover-open")) element.showPopover();
    const owner = element.ownerDocument;
    const bounds = element.getBoundingClientRect();
    element.style.left = `${Math.max(4, Math.min(menu.x, owner.documentElement.clientWidth - bounds.width - 4))}px`;
    element.style.top = `${Math.max(4, Math.min(menu.y, owner.documentElement.clientHeight - bounds.height - 4))}px`;
    element.querySelector("button")?.focus({ preventScroll: true });

    const dismiss = () => {
      if (element.matches(":popover-open")) element.hidePopover();
    };
    const outside = (event: PointerEvent) => {
      if (!event.composedPath().includes(element)) dismiss();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !element.matches(":popover-open")) return;
      event.preventDefault();
      event.stopPropagation();
      dismiss();
    };
    owner.addEventListener("pointerdown", outside, true);
    // Native popover dismissal only sees events in its own document.
    const frames = [
      ...(panesRef.current?.querySelectorAll("iframe") ?? []),
    ].flatMap((iframe) => {
      const page = iframe.contentDocument;
      return page ? [{ iframe, page }] : [];
    });
    for (const { iframe, page } of frames) {
      page.addEventListener("pointerdown", outside, true);
      page.addEventListener("keydown", escape, true);
      iframe.addEventListener("load", dismiss);
    }
    return () => {
      owner.removeEventListener("pointerdown", outside, true);
      for (const { iframe, page } of frames) {
        page.removeEventListener("pointerdown", outside, true);
        page.removeEventListener("keydown", escape, true);
        iframe.removeEventListener("load", dismiss);
      }
    };
  }, [menu]);

  const openPanel = (next: LivePanel) => {
    setPanel(next);
    setCollapsed(false);
    setShowOnMobile(true);
  };
  const select = (id: string, revealPanel = true) => {
    const node = findBuilderNode(value.nodes, id);
    if (!node) return;
    setSelected(id);
    if (builder?.linked || !revealPanel) return;
    openPanel("properties");
  };
  const openLibrary = (parentId: string | null = null) => {
    setTarget({ parentId, beforeId: null });
    setQuery("");
    openPanel(builder?.linked ? "parameters" : "library");
  };
  const change = (nodes: BuilderNode[]) => {
    if (readOnly) return;
    setHistory(({ before }) => ({
      before: [...before.slice(-39), value],
      after: [],
    }));
    changeBuilder({ document: { version: 1, nodes } });
  };
  const changeInlineContent = (id: string, content: string) => {
    const node = findBuilderNode(value.nodes, id);
    if (
      !node ||
      !["core.heading", "core.markdown", "core.html"].includes(node.type)
    )
      return;
    const field = node.type === "core.heading" ? "text" : "source";
    if ((node.props[field] ?? "") === content) return;
    change(
      updateBuilderNode(value.nodes, id, (node) => ({
        ...node,
        props: { ...node.props, [field]: content },
      })),
    );
  };
  const historyStep = (direction: "before" | "after") => {
    const next = history[direction].at(-1);
    if (!next || readOnly) return;
    setHistory(
      direction === "before"
        ? {
            before: history.before.slice(0, -1),
            after: [...history.after, value],
          }
        : {
            before: [...history.before, value],
            after: history.after.slice(0, -1),
          },
    );
    changeBuilder({ document: next });
  };
  const added = (node: BuilderNode, position: BuilderPosition) => {
    if (readOnly) return;
    change(insertBuilderNode(value.nodes, position, node));
    setSelected(node.id);
    openPanel("properties");
  };
  const insertLayout = (direction: "column" | "row" | "grid") => {
    const definition = definitions.get(
      direction === "grid" ? "core.grid" : "core.container",
    );
    if (!definition) return;
    const node = createBuilderNode(definition);
    node.props.layout = {
      direction,
      ...(direction === "grid" ? { columns: 2 } : {}),
    };
    added(node, endPosition);
  };
  const drop = (item: DragItem, destination: string | null) => {
    if (!destination || readOnly) return;
    const [parentId, beforeId] = destination.split("/");
    const position = { parentId: parentId || null, beforeId: beforeId || null };
    if (item.kind === "palette") {
      const definition = definitions.get(item.id);
      if (definition) added(createBuilderNode(definition), position);
      return;
    }
    const nodes = moveBuilderNode(value.nodes, item.id, position);
    if (nodes) change(nodes);
  };
  const duplicate = (node: BuilderNode, position: BuilderPosition) =>
    added(cloneBuilderNode(node), position);
  const removeNode = (id: string) => {
    const nodes = removeBuilderNode(value.nodes, id);
    change(nodes);
    if (selected && !findBuilderNode(nodes, selected)) {
      setSelected(null);
      setPanel("content");
    }
  };
  const openMenu = (id: string, point: { x: number; y: number }) => {
    if (!readOnly) setMenu({ id, ...point });
  };
  const menuNode = menu && findBuilderNode(value.nodes, menu.id);
  const panelTitle = !ready
    ? t("编辑")
    : activePanel === "settings"
      ? t("页面设置")
      : activePanel === "parameters"
        ? t("页面参数")
        : !builder
          ? t(
              activePanel === "library" &&
                (kind === "article" || kind === "shuoshuo")
                ? "区块"
                : kind === "page" || kind === "template"
                  ? "页面源码"
                  : "正文",
            )
          : activePanel === "properties" && current
            ? `${t("编辑")} ${currentDefinition ? t(currentDefinition.label) : current.type}`
            : t("组件");
  const visible = builder
    ? [...definitions.values()].filter(
        (definition) =>
          (builder.allowComments || definition.type !== "core.comments") &&
          `${t(definition.label)} ${definition.type}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      )
    : [];

  return (
    <>
      <LiveToolbar
        title={title}
        published={published}
        ready={ready}
        saveBlocked={saveBlocked}
        kind={kind}
        builderMode={Boolean(builder)}
        panel={activePanel}
        onAdd={() => {
          if (!builder && (kind === "page" || kind === "template"))
            openPanel("content");
          else if (activePanel === "library" && !builder) openPanel("content");
          else openLibrary();
        }}
        onSettings={() =>
          openPanel(activePanel === "settings" ? "content" : "settings")
        }
        onParameters={builder ? () => openPanel("parameters") : undefined}
        structure={structure}
        structureRef={structureRef}
        onStructure={() => setStructure((open) => !open)}
        device={device}
        onDevice={(next) => {
          setDevice(next);
          setShowOnMobile(false);
        }}
        collapsed={collapsed}
        onOpenPreview={onOpenPreview}
        previewDisabled={previewDisabled}
        onPreview={() => {
          setCollapsed(!collapsed);
          setShowOnMobile(collapsed);
        }}
        onUndo={
          readOnly || !history.before.length
            ? undefined
            : () => historyStep("before")
        }
        onRedo={
          readOnly || !history.after.length
            ? undefined
            : () => historyStep("after")
        }
        onSaveTemplate={
          builder?.canSaveTemplate && !readOnly && value.nodes.length
            ? () => {
                changeBuilder({ saveTemplate: true });
              }
            : undefined
        }
        onExit={onExit}
        busy={busy}
      />
      <DragAndDrop
        disabled={readOnly}
        nested
        onDrop={drop}
        onBusyChange={setDragging}
        renderPreview={(item) => (
          <span className={styles.dragPreview}>
            <Icon name="grip" />
            {item.label}
          </span>
        )}
      >
        <div
          ref={panesRef}
          className={layout.panes}
          data-collapsed={collapsed}
          data-mobile-panel={showOnMobile}
          data-dragging={dragging || undefined}
        >
          <aside
            id={editorPanelId}
            className={layout.rail}
            aria-label={panelTitle}
          >
            <h2 className={layout.panelTitle}>{panelTitle}</h2>
            <div
              className={layout.editorHost}
              data-active={embedded && !awaitingEditor}
              inert={!embedded || awaitingEditor}
            >
              {editor}
            </div>
            {awaitingEditor ? (
              <div className={layout.panelBody} role="status">
                <UiText text="正在读取…" />
              </div>
            ) : builder && !embedded ? (
              activePanel === "parameters" ||
              (activePanel === "properties" && current) ? (
                <div
                  className={layout.panelBody}
                  key={activePanel === "properties" ? selected : "parameters"}
                >
                  <BuilderInspector
                    document={value}
                    node={current}
                    definitions={definitions}
                    view={activePanel === "parameters" ? "parameters" : "props"}
                    disabled={builder.disabled}
                    linked={builder.linked}
                    parameters={builder.parameters}
                    onParametersChange={(parameters) =>
                      changeBuilder({ parameters })
                    }
                    device={device}
                    context={{
                      media: builder.media,
                      shortcodes: builder.shortcodes,
                    }}
                    onMedia={(media) => changeBuilder({ media })}
                    onInlineEdit={(id) => {
                      setInlineRequest({ id });
                      setShowOnMobile(false);
                    }}
                    onChange={change}
                    onSelect={select}
                    onCopy={duplicate}
                    onRemove={(node) => removeNode(node.id)}
                    onMove={(node, position) => {
                      const nodes = moveBuilderNode(
                        value.nodes,
                        node.id,
                        position,
                      );
                      if (nodes) change(nodes);
                    }}
                  />
                </div>
              ) : (
                <div className={layout.panelBody}>
                  <div className={styles.panelBody}>
                    <div className={styles.search}>
                      <Icon name="search" />
                      <TextField
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t("搜索组件")}
                        aria-label={t("搜索组件")}
                      />
                    </div>
                    {!visible.length && (
                      <p className={styles.tip}>
                        <UiText text="没有找到组件" />
                      </p>
                    )}
                    {groups.map((group) => {
                      const entries = visible.filter(
                        (item) => (item.group ?? "content") === group.id,
                      );
                      return entries.length ? (
                        <details
                          key={group.id}
                          className={styles.paletteGroup}
                          open
                        >
                          <summary>
                            <Icon name="chevron-down" />
                            <UiText text={group.label} />
                          </summary>
                          <div className={styles.paletteGrid}>
                            {entries.map((item) => (
                              <PaletteItem
                                key={item.type}
                                definition={item}
                                disabled={readOnly}
                                onAdd={() =>
                                  added(
                                    createBuilderNode(item),
                                    target.parentId &&
                                      !findBuilderNode(
                                        value.nodes,
                                        target.parentId,
                                      )
                                      ? endPosition
                                      : target,
                                  )
                                }
                              />
                            ))}
                          </div>
                        </details>
                      ) : null;
                    })}
                  </div>
                </div>
              )
            ) : null}
          </aside>
          <div className={layout.stage}>
            <Button
              className={layout.railToggle}
              title={t(collapsed ? "展开编辑栏" : "收起编辑栏")}
              aria-label={t(collapsed ? "展开编辑栏" : "收起编辑栏")}
              onClick={() => {
                setCollapsed(!collapsed);
                setShowOnMobile(false);
              }}
            >
              <Icon name={collapsed ? "chevron" : "chevron-left"} />
            </Button>
            <LiveBuilderCanvas
              frame={frame}
              document={value}
              definitions={definitions}
              selected={selected}
              onSelect={select}
              disabled={readOnly}
              canInsert={Boolean(
                builder && !builder.linked && (!builder.disabled || busy),
              )}
              device={device}
              interactive={!builder || collapsed}
              onAdd={openLibrary}
              onInsertLayout={insertLayout}
              onTemplates={
                canInsertTemplate && !readOnly
                  ? () => setTemplates(true)
                  : undefined
              }
              onRemove={removeNode}
              onContextMenu={openMenu}
              onInlineChange={changeInlineContent}
              onInlineActiveChange={(active) => {
                if (active) setShowOnMobile(false);
                onInlineActiveChange(active);
              }}
              inlineRequest={inlineRequest}
              media={builder?.media}
              shortcodes={builder?.shortcodes}
            />
            {builder && structure && !collapsed && (
              <StructureNavigator
                document={value}
                definitions={definitions}
                selected={selected}
                onSelect={(id) => select(id, !builder.linked)}
                onContextMenu={builder.linked ? undefined : openMenu}
                onClose={() => {
                  setStructure(false);
                  structureRef.current?.focus();
                }}
              />
            )}
          </div>
        </div>
      </DragAndDrop>
      {menu && menuNode && (
        <Popover
          ref={menuRef}
          className={layout.contextMenu}
          role="dialog"
          aria-label={t("组件操作")}
          onToggle={(event) => {
            if (
              event.newState === "closed" &&
              !event.currentTarget.matches(":popover-open")
            )
              setMenu((current) => (current === menu ? null : current));
          }}
        >
          <Button
            onClick={() => {
              select(menuNode.id);
              setMenu(null);
            }}
          >
            <Icon name="edit" />
            <UiText text="编辑" />
          </Button>
          <Button
            onClick={() => {
              duplicate(
                menuNode,
                after(value.nodes, menuNode.id) ?? endPosition,
              );
              setMenu(null);
            }}
          >
            <Icon name="copy" />
            <UiText text="复制组件" />
          </Button>
          <Button
            onClick={() => {
              setStructure(true);
              select(menuNode.id, false);
              setMenu(null);
            }}
          >
            <Icon name="list" />
            <UiText text="结构" />
          </Button>
          <Button
            onClick={() => {
              setRemove(menuNode.id);
              setMenu(null);
            }}
          >
            <Icon name="trash" />
            <UiText text="移除组件" />
          </Button>
        </Popover>
      )}
      <ConfirmDialog
        open={Boolean(remove)}
        title="移除组件？"
        intent="danger"
        confirmLabel="移除"
        onCancel={() => setRemove(null)}
        onConfirm={() => true}
        onConfirmed={() => {
          if (remove) removeNode(remove);
          setRemove(null);
        }}
      />
      {templates && (
        <BuilderTemplates
          onClose={() => setTemplates(false)}
          onInsert={(document, mediaUrls) => {
            if (readOnly) return;
            const nodes = document.nodes.map(cloneBuilderNode);
            if (!nodes.length) return;
            setHistory(({ before }) => ({
              before: [...before.slice(-39), value],
              after: [],
            }));
            changeBuilder({
              document: { version: 1, nodes: [...value.nodes, ...nodes] },
              mediaUrls,
            });
            setSelected(nodes[0].id);
            openPanel("properties");
            setTemplates(false);
          }}
        />
      )}
    </>
  );
}
