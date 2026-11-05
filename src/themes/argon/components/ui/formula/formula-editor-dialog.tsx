"use client";
import { UiText } from "@/core/i18n/provider";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  formulaGroups,
  formulaTemplates,
  templatePreview,
  templateSource,
  type FormulaTemplate,
} from "@/core/editor/formula/templates";
import { latexLanguage } from "@/core/editor/formula/latex-language";
import { formulaSourceRange } from "@/core/editor/formula/selection";
import { renderFormula } from "@/core/rendering/features/math";
import { ContentResources } from "../../content-resources";
import { Icon } from "../../icon";
import { Modal } from "../modal";
import { Button, Form, TextField } from "../primitives";
import {
  CodeEditor,
  type SourceEditorHandle,
  type SourceStatus,
} from "../code-editor";
import type { FeatureInsertion } from "../content-feature-dialog";
import type { ContentFeatureValue } from "@/core/editor/content-feature-source";
import { FormulaField, type FormulaFieldHandle } from "./math-field";
import styles from "./formula-editor.module.css";

export default function FormulaEditorDialog({
  insertion,
  onClose,
}: {
  insertion: FeatureInsertion;
  onClose: () => void;
}) {
  const [source, setSource] = useState(insertion.initial?.source ?? "");
  const [display, setDisplay] = useState(insertion.initial?.display ?? true);
  const [group, setGroup] = useState<string>("common"),
    [query, setQuery] = useState("");
  const [showSource, setShowSource] = useState(true);
  const [closing, setClosing] = useState(false),
    [result, setResult] = useState<ContentFeatureValue>();
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState({ undo: false, redo: false });
  const [status, setStatus] = useState<SourceStatus>({
    line: 1,
    column: 1,
    selected: 0,
    matches: 0,
    currentMatch: 0,
    limited: false,
  });
  const input = useRef<SourceEditorHandle>(null),
    field = useRef<FormulaFieldHandle>(null);
  const active = useRef<"visual" | "source">("visual");
  const rendered = useMemo(
    () => renderFormula(source, display),
    [source, display],
  );
  const valid = !rendered.error;
  useEffect(() => () => insertion.dispose?.(), [insertion]);
  const reportHistory = useCallback(
    (undo: boolean, redo: boolean) => setHistory({ undo, redo }),
    [],
  );
  const change = (value: string) => {
    setSource(value);
    setNotice("");
  };
  const templates = useMemo(
    () =>
      formulaTemplates.filter((item) =>
        query.trim()
          ? (item.name + " " + item.latex)
              .toLowerCase()
              .includes(query.toLowerCase())
          : item.group === group,
      ),
    [group, query],
  );
  const insertTemplate = (template: FormulaTemplate) => {
    if (active.current === "source" || !valid) {
      const range = input.current?.selection();
      const parts = templateSource(
        template.latex,
        range ? source.slice(range.start, range.end) : "",
      );
      input.current?.insert(parts.before, parts.after);
    } else field.current?.insert(template.latex);
  };
  const locate = () => {
    if (active.current === "visual") {
      const range = formulaSourceRange(source, field.current?.selected() ?? "");
      if (range) {
        input.current?.select(range);
        setNotice("");
        return;
      }
    } else {
      const range = input.current?.selection();
      if (
        range &&
        field.current?.select(source.slice(range.start, range.end))
      ) {
        field.current.focus();
        setNotice("");
        return;
      }
    }
    setNotice("请选中一段可唯一识别的公式；重复或复杂结构可在另一侧手动定位。");
  };
  const confirm = () => {
    if (!source.trim() || !valid || closing) return;
    setResult({ source, display, language: "plaintext" });
    setClosing(true);
  };
  return (
    <Modal
      title="公式编辑器"
      headerActions={
        <div className={styles.topbar} inert={closing}>
          <div
            className={styles.segment}
            role="group"
            aria-label="公式显示方式"
          >
            {(
              [
                [true, "独立公式", "独立"],
                [false, "行内公式", "行内"],
              ] as const
            ).map(([value, label, text]) => (
              <Button
                key={label}
                title={label}
                aria-label={label}
                aria-pressed={display === value}
                onClick={() => setDisplay(value)}
              >
                {text}
              </Button>
            ))}
          </div>
          <div className={styles.topActions}>
            <Button
              title="数学键盘"
              aria-label="数学键盘"
              onClick={() => field.current?.keyboard()}
            >
              <Icon name="grid" />
            </Button>
            <Button
              title="LaTeX 源码"
              aria-label="LaTeX"
              aria-pressed={showSource}
              onClick={() => {
                if (showSource) active.current = "visual";
                setShowSource(!showSource);
              }}
            >
              <Icon name="code" />
              <span>LaTeX</span>
            </Button>
          </div>
        </div>
      }
      className={styles.dialog}
      closeLabel="关闭公式编辑器"
      closing={closing}
      onClose={() => setClosing(true)}
      onExited={() => {
        if (result) insertion.apply(result);
        onClose();
      }}
    >
      {/* eslint-disable-next-line @next/next/no-css-tags -- Authoring fonts load only while this client-only dialog is open. */}
      <link
        rel="stylesheet"
        href="/content-features/mathlive-0.111.4/fonts.css"
      />
      <ContentResources features={{ code: false, math: true }} />
      <Form
        className={styles.form}
        data-editor-local-control
        inert={closing}
        onSubmit={(event) => {
          event.preventDefault();
          confirm();
        }}
        onKeyDown={(event) => {
          if (
            (event.ctrlKey || event.metaKey) &&
            ["s", "Enter"].includes(event.key)
          ) {
            event.preventDefault();
            event.stopPropagation();
            if (event.key === "Enter") confirm();
            else setNotice("公式尚在编辑，插入正文后可保存文章。");
          }
        }}
      >
        <div className={styles.body}>
          <div className={styles.library}>
            <div
              className={styles.categories}
              role="group"
              aria-label="公式分类"
            >
              {formulaGroups.map(([id, label]) => (
                <Button
                  key={id}
                  aria-pressed={group === id && !query}
                  onClick={() => {
                    setGroup(id);
                    setQuery("");
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
            <TextField
              className={styles.search}
              type="search"
              aria-label="搜索公式符号或命令"
              placeholder="搜索符号或命令…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div
              className={styles.palette}
              role="toolbar"
              aria-label="公式模板"
            >
              {templates.map((template) => (
                <Button
                  key={template.name}
                  title={
                    template.name +
                    " · " +
                    template.latex.replace(/#(?:0|\?)/g, "")
                  }
                  aria-label={template.name}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertTemplate(template)}
                >
                  <span
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{
                      __html: renderFormula(
                        template.preview ?? templatePreview(template.latex),
                        false,
                      ).html,
                    }}
                  />
                </Button>
              ))}
              {!templates.length && (
                <p>
                  <UiText text="没有匹配的符号" />
                </p>
              )}
            </div>
          </div>
          <div className={styles.workspace} data-source={showSource}>
            <section
              className={styles.visual}
              aria-label="可视化公式"
              onFocusCapture={() => {
                active.current = "visual";
              }}
            >
              <div className={styles.paneHeading}>
                <span>
                  <UiText text="可视化" />
                </span>
                <div className={styles.history}>
                  <Button
                    title="撤销公式编辑"
                    aria-label="撤销公式编辑"
                    disabled={!history.undo}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => field.current?.command("undo")}
                  >
                    <Icon name="undo" />
                  </Button>
                  <Button
                    title="重做公式编辑"
                    aria-label="重做公式编辑"
                    disabled={!history.redo}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => field.current?.command("redo")}
                  >
                    <Icon name="redo" />
                  </Button>
                </div>
              </div>
              <FormulaField
                source={source}
                valid={valid}
                display={display}
                disabled={closing}
                onChange={change}
                onSelection={() => {}}
                onHistory={reportHistory}
                ref={field}
              />
              {!valid && (
                <p className={styles.hint}>
                  <UiText text="源码尚未完成，可视化保留上次有效结果。" />
                </p>
              )}
              {/\\begin\{(?:[pbvBV]?matrix|cases|aligned|array)\}/.test(
                source,
              ) && (
                <div className={styles.matrixTools} aria-label="矩阵行列操作">
                  {(
                    [
                      ["addRowAfter", "添加行"],
                      ["addColumnAfter", "添加列"],
                      ["removeRow", "删除行"],
                      ["removeColumn", "删除列"],
                    ] as const
                  ).map(([command, label]) => (
                    <Button
                      key={command}
                      disabled={!valid}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        if (!field.current?.command(command))
                          setNotice("请先将光标放入要修改的矩阵单元格。");
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              )}
            </section>
            {showSource && (
              <section
                className={styles.source}
                aria-label="LaTeX 源码面板"
                onFocusCapture={() => {
                  active.current = "source";
                }}
              >
                <div className={styles.paneHeading}>
                  <span>
                    <UiText text="LaTeX 源码" />
                  </span>
                  <Button
                    title="定位另一视图中的选区"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={locate}
                  >
                    <Icon name="search" />
                    <UiText text="定位选区" />
                  </Button>
                </div>
                <CodeEditor
                  label="LaTeX 源码"
                  language={latexLanguage}
                  value={source}
                  onChange={change}
                  onStatus={setStatus}
                  ref={input}
                />
              </section>
            )}
          </div>
          <div className={styles.status} role="status">
            <span>
              {valid
                ? `${source.length} 字符`
                : `公式未完成${rendered.position !== undefined ? ` · 第 ${rendered.position + 1} 个字符附近` : ""}`}
            </span>
            {showSource && (
              <span>
                <UiText text="行" />
                {status.line}
                <UiText text="，列" />
                {status.column}
                {status.selected ? ` · 已选 ${status.selected} 字符` : ""}
              </span>
            )}
          </div>
          {!valid && (
            <p className={styles.error} role="alert">
              {rendered.message}
            </p>
          )}
          {notice && (
            <p className={styles.hint} role="status">
              {notice}
            </p>
          )}
        </div>
        <footer className={styles.footer}>
          <span>
            <UiText text="Ctrl / ⌘ + Enter 插入" />
          </span>
          <Button className="admin-button" onClick={() => setClosing(true)}>
            <UiText text="取消" />
          </Button>
          <Button
            className="admin-button admin-button-primary"
            type="submit"
            disabled={!source.trim() || !valid}
          >
            <Icon name="check" />
            {insertion.initial?.source ? (
              <UiText text="确认公式" />
            ) : (
              <UiText text="插入公式" />
            )}
          </Button>
        </footer>
      </Form>
    </Modal>
  );
}
