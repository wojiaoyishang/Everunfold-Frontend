"use client";

import { useId, useRef, useState } from "react";
import type {
  BuilderComponentDefinition,
  BuilderDevice,
  BuilderDocument,
  BuilderField,
  BuilderNode,
  BuilderParameter,
  BuilderValue,
  BuilderValues,
} from "@/core/builder/types";
import {
  builderEntries,
  builderId,
  type BuilderPosition,
  updateBuilderNode,
} from "@/core/builder/document";
import { layoutFields, layoutRecord } from "@/core/builder/layout";
import { UiText, useT } from "@/core/i18n/provider";
import type { MediaItem } from "@/core/contracts/settings";
import { mediaMarkup } from "@/core/content-management/editor-fields";
import { mediaReferenceId, siteMediaReference } from "@/core/media/references";
import { Icon } from "../../components/icon";
import { Button, TextArea, TextField } from "../../components/ui/primitives";
import { FormField } from "../../components/ui/form-field";
import { Select } from "../../components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import { Modal } from "../../components/ui/modal";
import { ConfirmPopover } from "../../components/ui/confirm-popover";
import type {
  CapturedInsertion,
  CodeEditorHandle,
} from "../../components/ui/code-editor";
import { RegisteredBlockEditor } from "../content/plugins/registry";
import { ShortcodePicker } from "../shortcodes/picker";
import { MediaPickerDialog } from "../media/media-picker-dialog";
import { builderIcon, type BuilderRenderContext } from "../../builder/content";
import styles from "./editor.module.css";

type FieldProps = {
  field: BuilderField;
  value?: BuilderValue;
  onChange: (value: BuilderValue) => void;
  disabled: boolean;
  context: BuilderRenderContext;
  onMedia: (item: MediaItem) => void;
};

export function BuilderInspector({
  document,
  node,
  definitions,
  view,
  linked,
  disabled,
  parameters,
  onParametersChange,
  device,
  context,
  onMedia,
  onChange,
  onSelect,
  onCopy,
  onRemove,
  onMove,
}: {
  document: BuilderDocument;
  node?: BuilderNode;
  definitions: ReadonlyMap<string, BuilderComponentDefinition>;
  view: "props" | "parameters";
  linked: boolean;
  disabled: boolean;
  parameters: BuilderValues;
  onParametersChange?: (values: BuilderValues) => void;
  device: BuilderDevice;
  context: BuilderRenderContext;
  onMedia: (item: MediaItem) => void;
  onChange: (nodes: BuilderNode[]) => void;
  onSelect: (id: string) => void;
  onCopy: (node: BuilderNode, position: BuilderPosition) => void;
  onRemove: (node: BuilderNode) => void;
  onMove: (node: BuilderNode, position: BuilderPosition) => void;
}) {
  const t = useT();
  const parameterList = builderEntries(document.nodes).flatMap((entry) =>
    Object.entries(entry.parameters ?? {}).map(([key, parameter]) => ({
      entry,
      key,
      parameter,
      field: definitions
        .get(entry.type)
        ?.fields?.find((field) => field.key === key),
    })),
  );
  const changeNode = (
    id: string,
    update: (value: BuilderNode) => BuilderNode,
  ) => onChange(updateBuilderNode(document.nodes, id, update));
  if (view === "parameters")
    return (
      <div className={styles.panelBody}>
        {!parameterList.length ? (
          <PanelEmpty
            icon="settings"
            title="暂无页面参数"
            description={
              linked
                ? "此模板未提供可编辑参数。"
                : "在组件属性中勾选「作为参数」，即可在这里集中管理。"
            }
          />
        ) : (
          <div className={styles.fields}>
            {linked && (
              <p className={styles.tip}>
                <UiText text="在此填写当前页面使用的值。清除覆盖后将跟随模板。" />
              </p>
            )}
            {parameterList.map(({ entry, key, parameter, field }) => {
              const name = parameter.label || (field ? t(field.label) : key);
              if (!linked)
                return (
                  <Button
                    className={styles.parameterSummary}
                    key={parameter.id}
                    onClick={() => onSelect(entry.id)}
                  >
                    <Icon name={builderIcon(entry)} />
                    <span>
                      {name}
                      <small>
                        <UiText
                          text={
                            parameter.keep_default !== false
                              ? "保留模板默认值"
                              : "由页面填写"
                          }
                        />
                      </small>
                    </span>
                    <Icon name="chevron" />
                  </Button>
                );
              const overridden = Object.hasOwn(parameters, parameter.id);
              return (
                <div className={styles.fieldGroup} key={parameter.id}>
                  {field ? (
                    <BuilderControl
                      field={{ ...field, label: name }}
                      value={
                        overridden
                          ? parameters[parameter.id]
                          : parameter.keep_default !== false
                            ? entry.props[key]
                            : undefined
                      }
                      disabled={disabled || !onParametersChange}
                      onChange={(value) =>
                        onParametersChange?.({
                          ...parameters,
                          [parameter.id]: value,
                        })
                      }
                      context={context}
                      onMedia={onMedia}
                    />
                  ) : (
                    <p className={styles.tip}>
                      {name} · <UiText text="组件当前不可用" />
                    </p>
                  )}
                  {overridden && (
                    <Button
                      className={styles.reset}
                      disabled={disabled || !onParametersChange}
                      onClick={() => {
                        const next = { ...parameters };
                        delete next[parameter.id];
                        onParametersChange?.(next);
                      }}
                    >
                      <Icon name="undo" />
                      <UiText text="恢复模板值" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  if (!node)
    return (
      <div className={styles.panelBody}>
        <PanelEmpty
          icon="sliders"
          title="选择一个组件"
          description="在画布或结构列表中选择组件，编辑内容和布局。"
        />
      </div>
    );
  const definition = definitions.get(node.type);
  const position = siblingPosition(document.nodes, node.id);
  const index = position?.nodes.findIndex(({ id }) => id === node.id) ?? -1;
  const previous = position?.nodes[index - 1];
  const next = position?.nodes[index + 1];
  const afterNext = position?.nodes[index + 2];
  const setParameter = (key: string, parameter?: BuilderParameter) =>
    changeNode(node.id, (entry) => {
      const exposed = { ...entry.parameters };
      if (parameter) exposed[key] = parameter;
      else delete exposed[key];
      return { ...entry, parameters: exposed };
    });
  return (
    <div className={styles.panelBody}>
      <div className={styles.selectionHeading}>
        <span className={styles.selectionIcon}>
          <Icon name={builderIcon(definition ?? node)} />
        </span>
        <h3>{definition ? <UiText text={definition.label} /> : node.type}</h3>
      </div>
      <div className={styles.nodeActions}>
        <Button
          className="admin-icon-button"
          aria-label={t("上移组件")}
          title={t("上移组件")}
          disabled={disabled || !previous}
          onClick={() =>
            position &&
            previous &&
            onMove(node, { parentId: position.parentId, beforeId: previous.id })
          }
        >
          <Icon name="up" />
        </Button>
        <Button
          className="admin-icon-button"
          aria-label={t("下移组件")}
          title={t("下移组件")}
          disabled={disabled || !next}
          onClick={() =>
            position &&
            onMove(node, {
              parentId: position.parentId,
              beforeId: afterNext?.id ?? null,
            })
          }
        >
          <Icon name="down" />
        </Button>
        <Button
          className="admin-icon-button"
          aria-label={t("复制组件")}
          title={t("复制组件")}
          disabled={disabled}
          onClick={() =>
            position &&
            onCopy(node, {
              parentId: position.parentId,
              beforeId: next?.id ?? null,
            })
          }
        >
          <Icon name="copy" />
        </Button>
        <ConfirmPopover
          label="移除组件"
          title="移除此组件？"
          description="如果组件包含其他组件，子组件也会移除。"
          triggerClassName="admin-icon-button"
          disabled={disabled}
          onConfirmed={() => onRemove(node)}
        >
          <Icon name="trash" />
        </ConfirmPopover>
      </div>
      {definition?.fields?.length ? (
        <div className={styles.fields}>
          {definition.fields.map((field) => {
            const parameter = node.parameters?.[field.key];
            return (
              <div className={styles.fieldGroup} key={field.key}>
                <BuilderControl
                  key={`${node.id}-${field.key}`}
                  field={field}
                  value={node.props[field.key]}
                  onChange={(value) =>
                    changeNode(node.id, (entry) => ({
                      ...entry,
                      props: { ...entry.props, [field.key]: value },
                    }))
                  }
                  disabled={disabled}
                  context={context}
                  onMedia={onMedia}
                />
                {field.expose !== false && (
                  <div className={styles.parameterControls}>
                    <label className={styles.checkbox}>
                      <Checkbox
                        checked={Boolean(parameter)}
                        disabled={disabled}
                        onChange={(event) =>
                          setParameter(
                            field.key,
                            event.target.checked
                              ? {
                                  id: builderId(),
                                  label: t(field.label),
                                  keep_default: true,
                                }
                              : undefined,
                          )
                        }
                      />
                      <UiText text="作为参数" />
                    </label>
                    {parameter && (
                      <>
                        <TextField
                          className={styles.parameterLabel}
                          value={parameter.label}
                          disabled={disabled}
                          aria-label={t("参数名称")}
                          placeholder={t("参数名称")}
                          maxLength={80}
                          onChange={(event) =>
                            setParameter(field.key, {
                              ...parameter,
                              label: event.target.value,
                            })
                          }
                        />
                        <label className={styles.checkbox}>
                          <Checkbox
                            checked={parameter.keep_default !== false}
                            disabled={disabled}
                            onChange={(event) =>
                              setParameter(field.key, {
                                ...parameter,
                                keep_default: event.target.checked,
                              })
                            }
                          />
                          <UiText text="保留模板默认值" />
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
      <LayoutControls
        key={`${node.id}-${device}`}
        node={node}
        container={definition?.container}
        device={device}
        disabled={disabled}
        update={(value) => changeNode(node.id, () => value)}
      />
    </div>
  );
}

function siblingPosition(
  nodes: BuilderNode[],
  id: string,
  parentId: string | null = null,
): { nodes: BuilderNode[]; parentId: string | null } | undefined {
  if (nodes.some((node) => node.id === id)) return { nodes, parentId };
  for (const node of nodes) {
    const position =
      node.children && siblingPosition(node.children, id, node.id);
    if (position) return position;
  }
}

function PanelEmpty({
  icon,
  title,
  description,
}: {
  icon: "settings" | "sliders";
  title: string;
  description: string;
}) {
  return (
    <div className={styles.panelEmpty}>
      <Icon name={icon} />
      <h3>
        <UiText text={title} />
      </h3>
      <p>
        <UiText text={description} />
      </p>
    </div>
  );
}

function BuilderControl({
  field,
  value,
  onChange,
  disabled,
  context,
  onMedia,
}: FieldProps) {
  const id = useId();
  const t = useT();
  const [media, setMedia] = useState(false);
  const [sourceEditor, setSourceEditor] = useState(false);
  const [shortcodes, setShortcodes] = useState(false);
  const text = typeof value === "string" ? value : "";
  if (field.type === "boolean")
    return (
      <label className={styles.checkbox}>
        <Checkbox
          checked={value === true}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <UiText text={field.label} />
      </label>
    );
  let input;
  if (field.type === "select")
    input = (
      <Select
        id={id}
        name={id}
        label={field.label}
        options={field.options ?? []}
        value={text}
        onValueChange={onChange}
        disabled={disabled}
        programOptions
      />
    );
  else if (field.type === "number")
    input = (
      <TextField
        id={id}
        type="number"
        inputMode="numeric"
        min={field.min}
        max={field.max}
        value={typeof value === "number" ? value : ""}
        placeholder={
          field.default === undefined ? undefined : String(field.default)
        }
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.value === "" ? null : event.target.valueAsNumber,
          )
        }
      />
    );
  else if (field.type === "textarea")
    input = (
      <TextArea
        id={id}
        rows={3}
        value={text}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  else if (field.type === "media")
    input = (
      <div className={styles.controlStack}>
        <TextField
          id={id}
          value={text}
          placeholder={t(
            field.multiple ? "使用逗号分隔媒体引用" : "输入图片地址或选择媒体",
          )}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button
          className="admin-button"
          disabled={disabled}
          onClick={() => setMedia(true)}
        >
          <Icon name="image" />
          <UiText text={field.multiple ? "添加图片" : "选择媒体"} />
        </Button>
        {media &&
          (field.multiple ? (
            <MediaPickerDialog
              multiple
              kind="image"
              maxSelection={Math.max(
                0,
                20 - text.split(",").filter(Boolean).length,
              )}
              excludedIds={text
                .split(",")
                .map((item) => mediaReferenceId(item.trim()))}
              onPick={(items) => {
                items.forEach(onMedia);
                onChange(
                  [text, ...items.map((item) => siteMediaReference(item.id))]
                    .filter(Boolean)
                    .join(", "),
                );
              }}
              onClose={() => setMedia(false)}
            />
          ) : (
            <MediaPickerDialog
              kind="image"
              value={text}
              onPick={(item) => {
                onMedia(item);
                onChange(siteMediaReference(item.id));
              }}
              onClose={() => setMedia(false)}
            />
          ))}
      </div>
    );
  else if (field.type === "html" || field.type === "markdown")
    input = (
      <div className={styles.controlStack}>
        {text && <p className={styles.sourceExcerpt}>{text}</p>}
        <Button
          id={id}
          className="admin-button"
          disabled={disabled}
          onClick={() => setSourceEditor(true)}
        >
          <Icon name="edit" />
          <UiText text="打开编辑器" />
        </Button>
        {sourceEditor && (
          <SourceEditor
            format={field.type}
            label={field.label}
            value={text}
            onChange={onChange}
            onClose={() => setSourceEditor(false)}
            context={context}
            onMedia={onMedia}
          />
        )}
      </div>
    );
  else if (field.type === "shortcode")
    input = (
      <div className={styles.controlStack}>
        <TextArea
          id={id}
          rows={4}
          value={text}
          className={styles.codeInput}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button
          className="admin-button"
          disabled={disabled}
          onClick={() => setShortcodes(true)}
        >
          <Icon name="shortcode" />
          <UiText text="选择短代码" />
        </Button>
        {shortcodes && (
          <ShortcodePicker
            format="markdown"
            media={context.media}
            onMedia={onMedia}
            onPick={onChange}
            onClose={() => setShortcodes(false)}
          />
        )}
      </div>
    );
  else
    input = (
      <TextField
        id={id}
        value={text}
        inputMode={field.type === "url" ? "url" : undefined}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  return (
    <FormField id={id} label={field.label}>
      {input}
    </FormField>
  );
}

function SourceEditor({
  format,
  label,
  value,
  onChange,
  onClose,
  context,
  onMedia,
}: {
  format: "html" | "markdown";
  label: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  context: BuilderRenderContext;
  onMedia: (item: MediaItem) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [mediaKind, setMediaKind] = useState<"all" | "image" | "video" | null>(
    null,
  );
  const [shortcodes, setShortcodes] = useState(false);
  const editor = useRef<CodeEditorHandle>(null);
  const insertion = useRef<CapturedInsertion>(undefined);
  const capture = () => {
    insertion.current?.dispose?.();
    insertion.current = editor.current?.captureInsertion();
  };
  const clear = () => {
    insertion.current?.dispose?.();
    insertion.current = undefined;
  };
  return (
    <Modal
      className={styles.sourceDialog}
      title={label}
      closeLabel="关闭组件编辑器"
      onClose={onClose}
    >
      <div className={styles.sourceEditor}>
        <RegisteredBlockEditor
          format={format}
          editorRef={editor}
          value={draft}
          onChange={setDraft}
          label={label}
          disabled={false}
          media={context.media}
          onMedia={(kind) => {
            capture();
            setMediaKind(kind);
          }}
          onShortcode={() => {
            capture();
            setShortcodes(true);
          }}
        />
      </div>
      <div className={styles.modalActions}>
        <Button className="admin-button" onClick={onClose}>
          <UiText text="取消" />
        </Button>
        <Button
          className="admin-button admin-button-primary"
          onClick={() => {
            onChange(draft);
            onClose();
          }}
        >
          <UiText text="应用到组件" />
        </Button>
      </div>
      {mediaKind && (
        <MediaPickerDialog
          kind={mediaKind}
          onPick={(item) => {
            onMedia(item);
            insertion.current?.(mediaMarkup(item, format));
          }}
          onClose={() => {
            clear();
            setMediaKind(null);
          }}
        />
      )}
      {shortcodes && (
        <ShortcodePicker
          format={format}
          media={context.media}
          onMedia={onMedia}
          onPick={(source) => insertion.current?.(source)}
          onClose={() => {
            clear();
            setShortcodes(false);
          }}
        />
      )}
    </Modal>
  );
}

function LayoutControls({
  node,
  container,
  device,
  disabled,
  update,
}: {
  node: BuilderNode;
  container?: boolean;
  device: BuilderDevice;
  disabled: boolean;
  update: (value: BuilderNode) => void;
}) {
  const id = useId();
  const layout = layoutRecord(node.props, device);
  const key = device === "desktop" ? "layout" : device;
  const direction =
    typeof layout.direction === "string" ? layout.direction : "";
  const set = (name: string, value: BuilderValue) => {
    const next = { ...layout };
    if (value === null || value === "") delete next[name];
    else next[name] = value;
    update({ ...node, props: { ...node.props, [key]: next } });
  };
  const directionOptions = [
    { value: "", label: device === "mobile" ? "默认纵向" : "默认布局" },
    { value: "column", label: "纵向" },
    { value: "row", label: "横向" },
    { value: "grid", label: "网格" },
  ];
  return (
    <div className={styles.layoutControls}>
      <h3>
        <UiText text="布局" />
      </h3>
      {container && (
        <FormField id={`${id}-direction`} label="排列方向">
          <Select
            id={`${id}-direction`}
            name={`${id}-direction`}
            label="排列方向"
            value={direction}
            onValueChange={(value) => set("direction", value)}
            options={directionOptions}
            disabled={disabled}
            programOptions
          />
        </FormField>
      )}
      {container &&
        (direction === "grid" || (device === "tablet" && !direction)) && (
          <FormField id={`${id}-columns`} label="网格列数">
            <TextField
              id={`${id}-columns`}
              type="number"
              min={1}
              max={6}
              placeholder="2"
              value={typeof layout.columns === "number" ? layout.columns : ""}
              onChange={(event) =>
                set(
                  "columns",
                  event.target.value === "" ? null : event.target.valueAsNumber,
                )
              }
              disabled={disabled}
            />
          </FormField>
        )}
      <FormField id={`${id}-align`} label="对齐">
        <Select
          id={`${id}-align`}
          name={`${id}-align`}
          label="对齐"
          value={typeof layout.align === "string" ? layout.align : ""}
          onValueChange={(value) => set("align", value)}
          options={[
            { value: "", label: "默认对齐" },
            { value: "start", label: "起始" },
            { value: "center", label: "居中" },
            { value: "end", label: "末端" },
            ...(container ? [{ value: "stretch", label: "拉伸" }] : []),
          ]}
          disabled={disabled}
          programOptions
        />
      </FormField>
      {layoutFields
        .filter((field) => container || field.key !== "gap")
        .map((field) => {
          const fieldValue = layout[field.key];
          return (
            <FormField
              id={`${id}-${field.key}`}
              key={field.key}
              label={`${field.label} (px)`}
            >
              <TextField
                id={`${id}-${field.key}`}
                type="number"
                min={0}
                max={field.max}
                value={typeof fieldValue === "number" ? fieldValue : ""}
                placeholder={String(field.default)}
                disabled={disabled}
                onChange={(event) =>
                  set(
                    field.key,
                    event.target.value === ""
                      ? null
                      : event.target.valueAsNumber,
                  )
                }
              />
            </FormField>
          );
        })}
    </div>
  );
}
