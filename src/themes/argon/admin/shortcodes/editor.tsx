"use client";
import { UiText } from "@/core/i18n/provider";

import { useEffect, useId, useRef, useState } from "react";
import type {
  ShortcodeItem,
  ShortcodeSource,
  PublicShortcode,
} from "@/core/contracts/settings";
import { useShortcodeActions } from "@/core/shortcodes/use-actions";
import {
  shortcodeFailure,
  useShortcodeCompilation,
} from "@/core/shortcodes/use-library";
import type { CatalogItem } from "@/core/shortcodes/registry";
import { shortcodeCall } from "@/core/shortcodes/parser";
import { useCodeLanguage } from "@/core/editor/use-code-language";
import { Button, TextArea, TextField } from "../../components/ui/primitives";
import { CodeEditor } from "../../components/ui/code-editor";
import { RichTextEditor } from "../../components/ui/rich-text-editor";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Select } from "../../components/ui/select";
import { RichToolbar } from "../content/plugins/rich-toolbar";
import { ShortcodeParameters, ShortcodeValues } from "./parameters";
import { ShortcodePreview } from "./preview";
import styles from "./shortcodes.module.css";

type EditableShortcodeSource = ShortcodeSource & { javascript?: string };

const initial: EditableShortcodeSource = {
  name: "custom:reading-tip",
  title: "阅读提示",
  description: "",
  kind: "container",
  parameters: [
    {
      name: "title",
      label: "标题",
      type: "text",
      default: "阅读提示",
      required: false,
      options: [],
    },
  ],
  html: '<section class="card">\n  <h3>{{ title }}</h3>\n  <div>{{ content }}</div>\n</section>',
  css: ".card {\n  padding: 1.25em;\n  border: 1px solid currentColor;\n  border-radius: 8px;\n}\n.card > h3 { margin-top: 0; }",
  example_body: "这里是提示内容，可以包含 **Markdown**。",
};

export function ShortcodeEditor({
  item,
  onSaved,
  onReload,
  onClose,
  onDirtyChange,
  definitions = [],
}: {
  item: CatalogItem | null;
  onSaved: (item: ShortcodeItem) => void;
  onReload: () => Promise<void>;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
  definitions?: readonly PublicShortcode[];
}) {
  const kindId = useId();
  const actions = useShortcodeActions();
  const [source, setSource] = useState<EditableShortcodeSource>(
    item?.source ?? initial,
  );
  const [tab, setTab] = useState("html"),
    [visual, setVisual] = useState(false),
    [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<
      "apply" | "archive" | "restore" | null
    >(null),
    [version, setVersion] = useState(String(item?.versions?.[0] ?? ""));
  const writable = !item || item.editable;
  const dirty =
    JSON.stringify(source) !== JSON.stringify(item?.source ?? initial) || !item;
  const compilation = useShortcodeCompilation(source, item?.id, writable);
  const compiled = writable ? compilation.compiled : item?.compiled;
  const htmlLanguage = useCodeLanguage("html"),
    cssLanguage = useCodeLanguage("css"),
    javascriptLanguage = useCodeLanguage("javascript");
  const heading = useRef<HTMLDivElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);
  useEffect(() => {
    onDirtyChange(writable && dirty);
    return () => onDirtyChange(false);
  }, [dirty, writable, onDirtyChange]);
  useEffect(() => {
    if (!writable || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [writable, dirty]);
  const update = (patch: Partial<EditableShortcodeSource>) => {
    setSource((current) => ({ ...current, ...patch }));
    setMessage("");
  };
  async function save() {
    if (busy || !compiled) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await actions.save(source, item);
      onSaved(result);
      setMessage("草稿已保存，应用后会更新使用它的文章。");
      await onReload();
    } catch (error) {
      setError(shortcodeFailure(error));
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!item) return false;
    setBusy(true);
    setError("");
    try {
      if (confirmation === "restore") {
        const result = await actions.restore(item, Number(version));
        setSource(result.source);
        onSaved(result);
        setMessage("已恢复为新的草稿；检查后再应用。");
      } else if (confirmation === "archive") {
        const result = await actions.archive(item);
        const updated = result.items.find((entry) => entry.id === item.id);
        if (updated) onSaved(updated);
        setMessage("已归档；已发布内容仍按原样渲染。");
      } else {
        const result = await actions.apply(item);
        const updated = result.items.find((entry) => entry.id === item.id);
        if (updated) {
          onSaved(updated);
          setVersion(String(updated.versions?.[0] ?? ""));
        }
        setMessage("已应用。下方显示前台节点的同步状态。");
      }
      await onReload();
      return true;
    } catch (error) {
      setError(shortcodeFailure(error));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={styles.editor}
      aria-label="短代码详情"
      ref={heading}
      tabIndex={-1}
    >
      <div className={styles.editorHeading}>
        <div>
          <h2>{item ? source.title : <UiText text="新建短代码" />}</h2>
          <p>
            {writable ? (
              `自定义模板${item ? ` · 草稿 ${item.revision}${item.applied_revision ? ` · 已应用 ${item.applied_revision}` : " · 尚未应用"}` : ""}`
            ) : (
              <UiText text="代码注册 · 只读展示" />
            )}
          </p>
        </div>
        <Button className="admin-button" disabled={busy} onClick={onClose}>
          <UiText text="关闭详情" />
        </Button>
      </div>
      {!writable && (
        <p className={styles.notice}>
          <UiText text="此短代码由" />
          {item?.origin === "frontend" ? (
            <UiText text="前端" />
          ) : (
            <UiText text="后端" />
          )}
          <UiText text="代码注册，可试填参数、查看样式和调用方式。定义由项目代码维护。" />
        </p>
      )}
      <div className={styles.fields}>
        <label className={styles.field}>
          <span>
            <UiText text="名称" />
          </span>
          <TextField
            aria-label="短代码名称"
            value={source.title}
            maxLength={100}
            disabled={!writable || busy}
            onChange={(event) => update({ title: event.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span>
            <UiText text="调用名称（创建后固定）" />
          </span>
          <TextField
            aria-label="短代码调用名称"
            value={source.name}
            maxLength={55}
            disabled={Boolean(item) || busy}
            onChange={(event) => update({ name: event.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span>
            <UiText text="说明" />
          </span>
          <TextField
            value={source.description ?? ""}
            maxLength={300}
            disabled={!writable || busy}
            onChange={(event) => update({ description: event.target.value })}
          />
        </label>
        <div className={styles.field}>
          <label htmlFor={kindId}>
            <UiText text="调用类型" />
          </label>
          <Select
            programOptions
            id={kindId}
            name="shortcode-kind"
            label="调用类型"
            value={source.kind ?? "container"}
            disabled={!writable || busy || Boolean(item?.applied_revision)}
            options={[
              { value: "container", label: "容器 · 包含正文" },
              { value: "leaf", label: "单体 · 无正文" },
            ]}
            onValueChange={(kind) =>
              update({ kind: kind as "container" | "leaf" })
            }
          />
        </div>
      </div>
      <div className={styles.workspace}>
        <div className={styles.source}>
          <div className={styles.tabs} role="group" aria-label="短代码定义内容">
            {[
              ["html", "HTML"],
              ["css", "CSS"],
              ["javascript", "JavaScript"],
              ["parameters", "参数"],
            ].map(([value, label]) => (
              <Button
                key={value}
                className={styles.tab}
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
              >
                {label}
              </Button>
            ))}
          </div>
          {tab === "parameters" ? (
            <ShortcodeParameters
              value={source.parameters ?? []}
              disabled={!writable || busy}
              onChange={(parameters) => update({ parameters })}
            />
          ) : (
            <>
              {tab === "html" && writable && (
                <div
                  className={styles.tabs}
                  role="group"
                  aria-label="HTML 编辑方式"
                >
                  <Button
                    className={styles.tab}
                    aria-pressed={!visual}
                    onClick={() => setVisual(false)}
                  >
                    <UiText text="源码" />
                  </Button>
                  <Button
                    className={styles.tab}
                    aria-pressed={visual}
                    onClick={() => setVisual(true)}
                  >
                    <UiText text="可视化" />
                  </Button>
                </div>
              )}
              <div className={styles.sourceCanvas}>
                {tab === "html" && visual && writable ? (
                  <RichTextEditor
                    value={source.html}
                    onChange={(html) => update({ html })}
                    label="短代码 HTML 可视化"
                    disabled={busy}
                    toolbar={(editor) => <RichToolbar editor={editor} />}
                  />
                ) : (
                  <CodeEditor
                    value={
                      tab === "html"
                        ? source.html
                        : tab === "css"
                          ? (source.css ?? "")
                          : (source.javascript ?? "")
                    }
                    onChange={(value) =>
                      update(
                        tab === "html"
                          ? { html: value }
                          : tab === "css"
                            ? { css: value }
                            : { javascript: value },
                      )
                    }
                    label={
                      tab === "html"
                        ? "短代码 HTML 源码"
                        : tab === "css"
                          ? "短代码 CSS 源码"
                          : "短代码 JavaScript 源码"
                    }
                    language={
                      tab === "html"
                        ? htmlLanguage
                        : tab === "css"
                          ? cssLanguage
                          : javascriptLanguage
                    }
                    disabled={!writable || busy}
                  />
                )}
              </div>
              <p className={styles.hint}>
                {tab === "html" ? (
                  <UiText text="HTML 与可视化修改同一份模板。容器保留一个 {{ content }} 正文插槽。" />
                ) : tab === "javascript" ? (
                  <UiText text="每个短代码实例独立运行。root 是该实例的最外层元素，rootSelector 可用来选中它。脚本在隔离框内执行。" />
                ) : (
                  <UiText text="CSS 自动限定在此短代码内。用 & 表示外层；不支持脚本、外部资源、全局规则和悬浮定位。" />
                )}
              </p>
            </>
          )}
        </div>
        <aside className={styles.inspector} aria-label="短代码预览">
          <strong>
            <UiText text="样式预览" />
          </strong>
          <ShortcodeValues
            parameters={source.parameters ?? []}
            values={values}
            onChange={setValues}
          />
          {source.kind !== "leaf" && (
            <label className={styles.field}>
              <span>
                <UiText text="示例正文" />
              </span>
              <TextArea
                rows={3}
                value={values.__body ?? source.example_body ?? ""}
                maxLength={2000}
                onChange={(event) =>
                  writable
                    ? update({ example_body: event.target.value })
                    : setValues((current) => ({
                        ...current,
                        __body: event.target.value,
                      }))
                }
              />
            </label>
          )}
          {compilation.pending && writable && (
            <p className={styles.hint} role="status">
              <UiText text="正在更新预览…" />
            </p>
          )}
          {compilation.error && writable && (
            <p className={styles.error} role="status">
              {compilation.error}
            </p>
          )}
          {compiled && (
            <>
              <ShortcodePreview
                definition={compiled}
                definitions={definitions}
                body={values.__body ?? source.example_body}
                values={values}
              />
              <label className={styles.field}>
                <span>
                  <UiText text="调用源码" />
                </span>
                <TextArea
                  className={styles.invocation}
                  readOnly
                  value={shortcodeCall(
                    compiled,
                    values,
                    values.__body ?? source.example_body ?? "",
                  )}
                />
              </label>
            </>
          )}
        </aside>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className={styles.notice} role="status">
          {message}
        </p>
      )}
      {writable && (
        <div className={styles.actions}>
          <Button
            className="admin-button admin-button-primary"
            disabled={busy || !compiled || (!dirty && Boolean(item))}
            onClick={() => void save()}
          >
            {busy ? <UiText text="处理中…" /> : <UiText text="保存草稿" />}
          </Button>
          {item && (
            <>
              <Button
                className="admin-button"
                disabled={busy || dirty || !compiled}
                onClick={() => setConfirmation("apply")}
              >
                {item.archived ? (
                  <UiText text="重新应用" />
                ) : (
                  <UiText text="应用模板" />
                )}
              </Button>
              <Button
                className="admin-button"
                disabled={busy || dirty || item.archived}
                onClick={() => setConfirmation("archive")}
              >
                <UiText text="归档" />
              </Button>
            </>
          )}
          {Boolean(item?.versions?.length) && (
            <>
              <Select
                name="shortcode-version"
                label="历史应用版本"
                value={version}
                options={(item?.versions ?? []).map((value) => ({
                  value: String(value),
                  label: `应用版本 ${value}`,
                }))}
                onValueChange={setVersion}
              />
              <Button
                className="admin-button"
                disabled={busy || dirty || !version}
                onClick={() => setConfirmation("restore")}
              >
                <UiText text="恢复为草稿" />
              </Button>
            </>
          )}
          {dirty && (
            <span className={styles.hint}>
              <UiText text="有未保存的修改" />
            </span>
          )}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(confirmation)}
        title={
          confirmation === "archive"
            ? "归档这个短代码？"
            : confirmation === "restore"
              ? "恢复历史模板？"
              : "应用这个模板？"
        }
        description={
          confirmation === "archive"
            ? "归档后不再提供新插入选项，已有文章继续渲染。"
            : confirmation === "restore"
              ? "历史版本会成为新草稿，应用后才会更新公开样式。"
              : "所有使用这个短代码的已发布文章都会采用新的模板样式。"
        }
        confirmLabel={
          confirmation === "archive"
            ? "归档"
            : confirmation === "restore"
              ? "恢复草稿"
              : "应用模板"
        }
        busy={busy}
        error={error}
        onCancel={() => setConfirmation(null)}
        onConfirm={confirm}
        onConfirmed={() => setConfirmation(null)}
      />
    </section>
  );
}
