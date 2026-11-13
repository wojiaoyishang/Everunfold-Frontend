"use client";

import { useMemo, useState, type ReactNode } from "react";
import type {
  BuilderComponentDefinition,
  BuilderDevice,
  BuilderDocument,
  BuilderNode,
  BuilderValues,
} from "@/core/builder/types";
import {
  builderEntries,
  cloneBuilderNode,
  createBuilderNode,
  findBuilderNode,
  insertBuilderNode,
  moveBuilderNode,
  removeBuilderNode,
  type BuilderPosition,
} from "@/core/builder/document";
import { UiText, useT } from "@/core/i18n/provider";
import type { MediaItem } from "@/core/contracts/settings";
import { useShortcodeLibrary } from "@/core/shortcodes/use-library";
import { Icon, type IconName } from "../../components/icon";
import { Button, TextField } from "../../components/ui/primitives";
import {
  DragAndDrop,
  useDragItem,
  useDropPosition,
  type DragItem,
} from "../../components/ui/drag-and-drop";
import {
  BuilderElement,
  builderIcon,
  useBuilderComponents,
  type BuilderRenderContext,
} from "../../builder/content";
import { BuilderInspector } from "./inspector";
import styles from "./editor.module.css";

const devices = [
  { key: "desktop", label: "桌面预览", icon: "desktop" },
  { key: "tablet", label: "平板预览", icon: "tablet" },
  { key: "mobile", label: "手机预览", icon: "phone" },
] as const;
const groups = [
  { id: "layout", label: "布局" },
  { id: "content", label: "基础组件" },
  { id: "media", label: "媒体" },
  { id: "interactive", label: "互动" },
] as const;
const compactViews = [
  { id: "library", label: "组件", icon: "grid" },
  { id: "canvas", label: "画布", icon: "desktop" },
  { id: "inspector", label: "属性", icon: "sliders" },
] as const;

const positionKey = (position: BuilderPosition) =>
  [position.parentId ?? "", position.beforeId ?? ""].join("/");
const ignoreBusy = () => {};

export function BuilderEditor({
  value,
  onChange,
  parameters = {},
  onParametersChange,
  linked = false,
  disabled = false,
  renderContext,
  onSaveTemplate,
  onMedia,
  header,
  previewWidth,
  allowComments = false,
}: {
  value: BuilderDocument;
  onChange: (document: BuilderDocument) => void;
  parameters?: BuilderValues;
  onParametersChange?: (values: BuilderValues) => void;
  linked?: boolean;
  disabled?: boolean;
  renderContext?: BuilderRenderContext;
  onSaveTemplate?: () => void;
  onMedia?: (item: MediaItem) => void;
  header?: ReactNode;
  previewWidth?: number;
  allowComments?: boolean;
}) {
  const t = useT();
  const definitions = useBuilderComponents();
  const { applied } = useShortcodeLibrary();
  const [media, setMedia] = useState<BuilderRenderContext["media"]>({});
  const context = useMemo(
    () => ({
      ...renderContext,
      media: { ...renderContext?.media, ...media },
      shortcodes: renderContext?.shortcodes ?? applied,
    }),
    [renderContext, media, applied],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [device, setDevice] = useState<BuilderDevice>("desktop");
  const [leftPanel, setLeftPanel] = useState<"library" | "structure">(
    "library",
  );
  const [rightPanel, setRightPanel] = useState<"props" | "parameters">("props");
  const [compactView, setCompactView] = useState<
    "library" | "canvas" | "inspector"
  >("canvas");
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<{
    before: BuilderDocument[];
    after: BuilderDocument[];
  }>({ before: [], after: [] });
  const current = selected ? findBuilderNode(value.nodes, selected) : undefined;
  const readonly = disabled || linked;
  const count = builderEntries(value.nodes).length;
  const select = (id: string) => {
    setSelected(id);
    setRightPanel("props");
    setCompactView("inspector");
  };
  const change = (nodes: BuilderNode[], record = true) => {
    if (readonly) return;
    if (record)
      setHistory(({ before }) => ({
        before: [...before.slice(-39), value],
        after: [],
      }));
    onChange({ version: 1, nodes });
  };
  const stepHistory = (direction: "before" | "after") => {
    const next = history[direction].at(-1);
    if (!next || readonly) return;
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
    onChange(next);
  };
  const add = (
    definition: BuilderComponentDefinition,
    position: BuilderPosition,
  ) => {
    if (readonly) return;
    const node = createBuilderNode(definition);
    change(insertBuilderNode(value.nodes, position, node));
    select(node.id);
  };
  const addFromLibrary = (definition: BuilderComponentDefinition) =>
    add(definition, {
      parentId:
        current && definitions.get(current.type)?.container ? current.id : null,
      beforeId: null,
    });
  const drop = (item: DragItem, target: string | null) => {
    if (!target || readonly) return;
    const [parentId, beforeId] = target.split("/");
    const position = { parentId: parentId || null, beforeId: beforeId || null };
    if (item.kind === "palette") {
      const definition = definitions.get(item.id);
      if (definition) add(definition, position);
      return;
    }
    const nodes = moveBuilderNode(value.nodes, item.id, position);
    if (nodes) change(nodes);
  };
  const addContainer = () => {
    const container = definitions.get("core.container");
    if (container) add(container, { parentId: null, beforeId: null });
  };
  const saveMedia = (item: MediaItem) => {
    setMedia((previous) => ({
      ...previous,
      [item.id]: { original: item.url },
    }));
    onMedia?.(item);
  };
  const visible = [...definitions.values()].filter(
    (definition) =>
      (allowComments || definition.type !== "core.comments") &&
      `${t(definition.label)} ${definition.type}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  function renderCanvas(
    nodes: BuilderNode[],
    parentId: string | null,
  ): ReactNode {
    return (
      <>
        {nodes.map((node) => {
          const definition = definitions.get(node.type);
          const container =
            definition?.container || Boolean(node.children?.length);
          return (
            <CanvasNode
              key={node.id}
              node={node}
              definition={definition}
              selected={selected === node.id}
              onSelect={() => select(node.id)}
              disabled={readonly}
              position={{ parentId, beforeId: node.id }}
            >
              <BuilderElement
                node={node}
                definition={definition}
                parameters={linked ? parameters : undefined}
                context={context}
                preview
              >
                {container && renderCanvas(node.children ?? [], node.id)}
              </BuilderElement>
            </CanvasNode>
          );
        })}
        <DropTarget
          position={{ parentId, beforeId: null }}
          disabled={readonly}
          empty={Boolean(parentId && !nodes.length)}
        />
      </>
    );
  }
  return (
    <section
      className={styles.workspace}
      aria-label={t("可视化组件编辑器")}
      data-compact-view={compactView}
    >
      <div className={styles.toolbar}>
        <div className={styles.identity}>
          <Icon name="shapes" />
          <span>
            <UiText text="可视化编辑" />
          </span>
        </div>
        <div
          className={styles.deviceSwitch}
          role="group"
          aria-label={t("预览设备")}
        >
          {devices.map((item) => (
            <ToolButton
              key={item.key}
              icon={item.icon}
              label={item.label}
              active={device === item.key}
              onClick={() => setDevice(item.key)}
            />
          ))}
        </div>
        <div className={styles.toolbarActions}>
          <div className={styles.history}>
            <ToolButton
              icon="undo"
              label="撤销"
              disabled={readonly || !history.before.length}
              onClick={() => stepHistory("before")}
            />
            <ToolButton
              icon="redo"
              label="重做"
              disabled={readonly || !history.after.length}
              onClick={() => stepHistory("after")}
            />
          </div>
          {onSaveTemplate && !linked && (
            <Button
              className="admin-button"
              disabled={disabled || !value.nodes.length}
              onClick={onSaveTemplate}
            >
              <Icon name="save" />
              <UiText text="另存为模板" />
            </Button>
          )}
          {header}
        </div>
      </div>
      <div
        className={styles.compactNavigation}
        role="group"
        aria-label={t("编辑区域")}
      >
        {compactViews.map((item) => (
          <Button
            key={item.id}
            aria-pressed={compactView === item.id}
            onClick={() => setCompactView(item.id)}
          >
            <Icon name={item.icon} />
            <UiText text={item.label} />
          </Button>
        ))}
      </div>
      <DragAndDrop
        disabled={readonly}
        nested
        onDrop={drop}
        onBusyChange={ignoreBusy}
        renderPreview={(item) => (
          <span className={styles.dragPreview}>
            <Icon name="grip" />
            {item.label}
          </span>
        )}
      >
        <div className={styles.columns}>
          <aside className={styles.library} aria-label={t("组件库和页面结构")}>
            <div
              className={styles.tabs}
              role="group"
              aria-label={t("组件面板")}
            >
              <PanelButton
                active={leftPanel === "library"}
                icon="grid"
                label="组件库"
                onClick={() => setLeftPanel("library")}
              />
              <PanelButton
                active={leftPanel === "structure"}
                icon="list"
                label="结构"
                onClick={() => setLeftPanel("structure")}
              />
            </div>
            {leftPanel === "library" ? (
              <div className={styles.panelBody}>
                {linked ? (
                  <p className={styles.tip}>
                    <UiText text="此页面继承模板结构。请在模板中编辑组件。" />
                  </p>
                ) : (
                  <>
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
                        <UiText text="没有找到组件。" />
                      </p>
                    )}
                    {groups.map((group) => {
                      const entries = visible.filter(
                        (item) => (item.group ?? "content") === group.id,
                      );
                      return entries.length ? (
                        <div key={group.id} className={styles.paletteGroup}>
                          <h3>
                            <UiText text={group.label} />
                          </h3>
                          <div className={styles.paletteGrid}>
                            {entries.map((item) => (
                              <PaletteItem
                                key={item.type}
                                definition={item}
                                disabled={readonly}
                                onAdd={() => addFromLibrary(item)}
                              />
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })}
                  </>
                )}
              </div>
            ) : (
              <div className={styles.panelBody}>
                {value.nodes.length ? (
                  <Structure
                    nodes={value.nodes}
                    definitions={definitions}
                    selected={selected}
                    onSelect={select}
                  />
                ) : (
                  <p className={styles.tip}>
                    <UiText text="添加组件后可查看页面结构。" />
                  </p>
                )}
              </div>
            )}
          </aside>
          <div className={styles.stage} aria-label={t("编辑画布")}>
            <div className={styles.stageBar}>
              <span className={styles.stageTitle}>
                <span aria-hidden="true" />
                <UiText text="编辑画布" />
              </span>
              <span>
                <UiText
                  text={devices.find((item) => item.key === device)!.label}
                />
              </span>
            </div>
            <div className={styles.stageContent}>
              <div
                className={styles.paper}
                data-builder-device={device}
                style={
                  device === "desktop" && previewWidth
                    ? { maxInlineSize: previewWidth }
                    : undefined
                }
              >
                {!value.nodes.length && (
                  <div className={styles.emptyCanvas}>
                    <span className={styles.emptyIcon}>
                      <Icon name="shapes" />
                    </span>
                    <h3>
                      <UiText text="从一个组件开始" />
                    </h3>
                    <p>
                      <UiText text="将组件拖到画布，或在组件库点击添加。" />
                    </p>
                    <Button
                      className="admin-button"
                      disabled={readonly}
                      onClick={addContainer}
                    >
                      <Icon name="plus" />
                      <UiText text="添加容器" />
                    </Button>
                    <DropTarget
                      position={{ parentId: null, beforeId: null }}
                      disabled={readonly}
                      fill
                    />
                  </div>
                )}
                {value.nodes.length > 0 && renderCanvas(value.nodes, null)}
              </div>
            </div>
            <div className={styles.stageFooter}>
              <span>
                {count} <UiText text="个组件" />
              </span>
              <span>
                <UiText text={linked ? "继承模板" : "实时预览"} />
              </span>
            </div>
          </div>
          <aside
            className={styles.inspector}
            aria-label={t("组件属性和页面参数")}
          >
            <div
              className={styles.tabs}
              role="group"
              aria-label={t("属性面板")}
            >
              {!linked && (
                <PanelButton
                  active={rightPanel === "props"}
                  icon="sliders"
                  label="组件属性"
                  onClick={() => setRightPanel("props")}
                />
              )}
              <PanelButton
                active={linked || rightPanel === "parameters"}
                icon="settings"
                label="页面参数"
                onClick={() => setRightPanel("parameters")}
              />
            </div>
            <BuilderInspector
              document={value}
              node={current}
              definitions={definitions}
              view={linked ? "parameters" : rightPanel}
              disabled={disabled}
              linked={linked}
              parameters={parameters}
              onParametersChange={onParametersChange}
              device={device}
              context={context}
              onMedia={saveMedia}
              onChange={change}
              onSelect={select}
              onCopy={(node, position) => {
                const copy = cloneBuilderNode(node);
                change(insertBuilderNode(value.nodes, position, copy));
                setSelected(copy.id);
              }}
              onRemove={(node) => {
                change(removeBuilderNode(value.nodes, node.id));
                setSelected(null);
              }}
              onMove={(node, position) => {
                const nodes = moveBuilderNode(value.nodes, node.id, position);
                if (nodes) change(nodes);
              }}
            />
          </aside>
        </div>
      </DragAndDrop>
    </section>
  );
}

function ToolButton({
  icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  const t = useT();
  return (
    <Button
      className="admin-icon-button"
      aria-label={t(label)}
      title={t(label)}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} />
    </Button>
  );
}

function PanelButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button className={styles.panelTab} aria-pressed={active} onClick={onClick}>
      <Icon name={icon} />
      <UiText text={label} />
    </Button>
  );
}

function PaletteItem({
  definition,
  disabled,
  onAdd,
}: {
  definition: BuilderComponentDefinition;
  disabled: boolean;
  onAdd: () => void;
}) {
  const t = useT();
  const { ref, dragging, handle } = useDragItem(
    { id: definition.type, kind: "palette", label: t(definition.label) },
    disabled,
  );
  return (
    <div
      className={styles.paletteItem}
      ref={ref}
      data-dragging={dragging || undefined}
    >
      <Button className={styles.paletteAdd} onClick={onAdd} disabled={disabled}>
        <Icon name={builderIcon(definition)} />
        <UiText text={definition.label} />
      </Button>
      <Button
        {...handle}
        className={styles.paletteHandle}
        disabled={disabled}
        title={t("拖动组件")}
        aria-label={`${t("拖动组件")} · ${t(definition.label)}`}
      >
        <Icon name="grip" />
      </Button>
    </div>
  );
}

function DropTarget({
  position,
  disabled,
  empty,
  fill,
}: {
  position: BuilderPosition;
  disabled: boolean;
  empty?: boolean;
  fill?: boolean;
}) {
  const {
    setNodeRef,
    over: isOver,
    source,
  } = useDropPosition(positionKey(position), disabled);
  const over =
    isOver &&
    source?.id !== position.beforeId &&
    source?.id !== position.parentId;
  return (
    <div
      className={styles.drop}
      ref={setNodeRef}
      data-over={over || undefined}
      data-empty={empty || undefined}
      data-fill={fill || undefined}
      aria-hidden="true"
    >
      {empty && (
        <span>
          <Icon name="plus" />
          <UiText text="将组件放入容器" />
        </span>
      )}
    </div>
  );
}

function CanvasNode({
  node,
  definition,
  position,
  selected,
  disabled,
  onSelect,
  children,
}: {
  node: BuilderNode;
  definition?: BuilderComponentDefinition;
  position: BuilderPosition;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  const t = useT();
  const name = definition ? t(definition.label) : node.type;
  const { ref, dragging, handle } = useDragItem(
    { id: node.id, kind: "block", label: name },
    disabled,
  );
  return (
    <div
      ref={ref}
      className={styles.canvasNode}
      data-selected={selected || undefined}
      data-dragging={dragging || undefined}
    >
      <DropTarget position={position} disabled={disabled} />
      <div className={styles.nodeTools}>
        {!disabled && (
          <Button
            {...handle}
            className={styles.grip}
            aria-label={`${t("移动组件")} · ${name}`}
            title={t("移动组件")}
          >
            <Icon name="grip" />
          </Button>
        )}
        <Button
          className={styles.nodeLabel}
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={`${t("选择组件")} · ${name}`}
        >
          <Icon name={builderIcon(definition ?? node)} />
          {name}
        </Button>
      </div>
      <div
        className={styles.canvasElement}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          onSelect();
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Structure({
  nodes,
  definitions,
  selected,
  onSelect,
}: {
  nodes: BuilderNode[];
  definitions: ReadonlyMap<string, BuilderComponentDefinition>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className={styles.tree}>
      {nodes.map((node) => {
        const definition = definitions.get(node.type);
        return (
          <li key={node.id}>
            <Button
              className={styles.treeNode}
              aria-pressed={node.id === selected}
              onClick={() => onSelect(node.id)}
            >
              <Icon name={builderIcon(definition ?? node)} />
              {definition ? <UiText text={definition.label} /> : node.type}
            </Button>
            {!!node.children?.length && (
              <Structure
                nodes={node.children}
                definitions={definitions}
                selected={selected}
                onSelect={onSelect}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
