"use client";
import { UiText } from "@/core/i18n/provider";

import { useEffect, useId, useRef, useState } from "react";
import type { ContentFeatureValue } from "@/core/editor/content-feature-source";
import {
  codeOptions,
  validCodeMarks,
  type CodeOptions,
} from "@/core/rendering/features/code-options";
import { codeLanguages } from "@/core/rendering/features/model";
import { useCodeLanguage } from "@/core/editor/use-code-language";
import type { FeatureInsertion } from "../content-feature-dialog";
import {
  CodeEditor,
  type SourceEditorHandle,
  type SourceSearch,
  type SourceStatus,
} from "../code-editor";
import { SourceSearchPanel } from "../source-search-panel";
import { EditorStatusBar } from "../editor-status-bar";
import { Modal } from "../modal";
import { Select } from "../select";
import { Button, Form, TextField } from "../primitives";
import { Icon } from "../../icon";
import { useToast } from "../toast/toast-provider";
import styles from "./code-editor-dialog.module.css";
const initialStatus: SourceStatus = {
  line: 1,
  column: 1,
  selected: 0,
  matches: 0,
  currentMatch: 0,
  limited: false,
};

export default function CodeEditorDialog({
  insertion,
  onClose,
}: {
  insertion: FeatureInsertion;
  onClose: () => void;
}) {
  const id = useId(),
    editor = useRef<SourceEditorHandle>(null),
    toast = useToast();
  const [value, setValue] = useState<ContentFeatureValue>({
    source: "",
    language: "plaintext",
    display: true,
    ...insertion.initial,
  });
  const [options, setOptions] = useState<CodeOptions>(
    codeOptions(insertion.initial?.codeOptions),
  );
  const [expanded, setExpanded] = useState(false),
    [closing, setClosing] = useState(false),
    [result, setResult] = useState<ContentFeatureValue>();
  const [wrap, setWrap] = useState(true),
    [searching, setSearching] = useState(false);
  const [query, setQuery] = useState<SourceSearch>({
      search: "",
      replace: "",
      caseSensitive: false,
    }),
    [status, setStatus] = useState(initialStatus);
  const language = useCodeLanguage(value.language);
  const update = (patch: Partial<CodeOptions>) =>
    setOptions((current) => ({ ...current, ...patch }));
  const invalid = !value.source.trim() || !validCodeMarks(options.mark ?? "");
  const submit = () => {
    if (!invalid && !closing) {
      setResult({ ...value, codeOptions: codeOptions(options) });
      setClosing(true);
    }
  };
  useEffect(() => () => insertion.dispose?.(), [insertion]);
  return (
    <Modal
      title="代码块"
      className={styles.dialog}
      closeLabel="关闭代码编辑器"
      closing={closing}
      onClose={() => setClosing(true)}
      onExited={() => {
        if (result) insertion.apply(result);
        onClose();
      }}
      headerActions={
        <Button
          className={styles.optionsButton}
          aria-expanded={expanded}
          aria-controls={id + "-options"}
          onClick={() => setExpanded(!expanded)}
        >
          <Icon name="settings" />
          <UiText text="显示选项" />
        </Button>
      }
    >
      <Form
        className={styles.form}
        inert={closing}
        data-editor-local-control
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        onKeyDownCapture={(event) => {
          if (
            (event.ctrlKey || event.metaKey) &&
            !event.altKey &&
            !event.nativeEvent.isComposing
          ) {
            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              submit();
            }
            if (event.key.toLowerCase() === "s") {
              event.preventDefault();
              event.stopPropagation();
              toast.show({
                id: "code-window-save",
                title: "请先插入代码，再保存文章。",
                tone: "info",
              });
            }
          }
        }}
      >
        <div className={styles.controls}>
          <Select
            label="代码语言"
            name={id + "-language"}
            value={value.language}
            options={codeLanguages.map(([value, label]) => ({ value, label }))}
            onValueChange={(language) =>
              setValue((current) => ({ ...current, language }))
            }
          />
          <TextField
            aria-label="代码文件名或标题"
            placeholder="文件名或标题（可选）"
            maxLength={160}
            value={options.title ?? ""}
            onChange={(event) => update({ title: event.target.value })}
          />
        </div>
        <div
          className={styles.optionsReveal}
          data-open={expanded}
          inert={!expanded}
          aria-hidden={!expanded}
        >
          <div>
            <div className={styles.options} id={id + "-options"}>
              <label>
                <span>
                  <UiText text="行号" />
                </span>
                <Select
                  programOptions
                  label="代码行号"
                  name={id + "-numbers"}
                  value={options.numbers ?? "inherit"}
                  options={[
                    { value: "inherit", label: "跟随主题" },
                    { value: "on", label: "显示" },
                    { value: "off", label: "隐藏" },
                  ]}
                  onValueChange={(v) =>
                    update({
                      numbers:
                        v === "inherit" ? undefined : (v as "on" | "off"),
                    })
                  }
                />
              </label>
              <label>
                <span>
                  <UiText text="起始行号" />
                </span>
                <TextField
                  type="number"
                  min={1}
                  max={1000000}
                  placeholder="1"
                  value={options.start ?? ""}
                  onChange={(e) =>
                    update({
                      start: e.target.value
                        ? Math.min(1000000, Math.max(1, Number(e.target.value)))
                        : undefined,
                    })
                  }
                />
              </label>
              <label className={styles.marks}>
                <span>
                  <UiText text="重点行" />
                </span>
                <TextField
                  aria-invalid={!validCodeMarks(options.mark ?? "")}
                  placeholder="如 3,5-8"
                  value={options.mark ?? ""}
                  maxLength={512}
                  onChange={(e) => update({ mark: e.target.value })}
                />
              </label>
              <label>
                <span>
                  <UiText text="自动换行" />
                </span>
                <Select
                  programOptions
                  label="代码显示换行"
                  name={id + "-wrap"}
                  value={options.wrap ?? "inherit"}
                  options={[
                    { value: "inherit", label: "跟随主题" },
                    { value: "on", label: "换行" },
                    { value: "off", label: "横向滚动" },
                  ]}
                  onValueChange={(v) =>
                    update({
                      wrap: v === "inherit" ? undefined : (v as "on" | "off"),
                    })
                  }
                />
              </label>
              <label>
                <span>
                  <UiText text="折叠行数" />
                </span>
                <TextField
                  type="number"
                  min={0}
                  max={200}
                  placeholder="跟随主题"
                  value={options.fold ?? ""}
                  onChange={(e) =>
                    update({
                      fold: e.target.value
                        ? Math.min(200, Math.max(0, Number(e.target.value)))
                        : undefined,
                    })
                  }
                />
              </label>
              {!validCodeMarks(options.mark ?? "") && (
                <small role="alert">
                  <UiText text="重点行请填写行号或范围，如 3,5-8。" />
                </small>
              )}
            </div>
          </div>
        </div>
        <SourceSearchPanel
          id={id}
          label="代码内容"
          open={searching}
          disabled={closing}
          query={query}
          status={status}
          onChange={setQuery}
          onClose={() => {
            setSearching(false);
            editor.current?.focus();
          }}
          onFind={(d) => editor.current?.find(d)}
          onReplace={(all) => editor.current?.replace(all)}
        />
        <div className={styles.workspace}>
          <CodeEditor
            ref={editor}
            label="代码内容"
            value={value.source}
            language={language}
            onChange={(source) =>
              setValue((current) => ({ ...current, source }))
            }
            wrapLines={wrap}
            search={searching ? query : undefined}
            onStatus={setStatus}
            onSearchRequest={() => setSearching(true)}
          />
        </div>
        <EditorStatusBar
          count={value.source.length}
          actions={
            <>
              <Button
                className={styles.statusButton}
                aria-label="编辑区自动换行"
                title="编辑区自动换行"
                aria-pressed={wrap}
                onClick={() => setWrap(!wrap)}
              >
                <Icon name="wrap" />
              </Button>
              <Button
                className={styles.statusButton}
                aria-label="代码查找与替换"
                title="查找与替换 (Ctrl/Cmd+F)"
                aria-expanded={searching}
                onClick={() => setSearching(!searching)}
              >
                <Icon name="search" />
              </Button>
            </>
          }
        >
          <UiText text="行" />
          {status.line}
          <UiText text="，列" />
          {status.column}
          {status.selected ? ` · 已选 ${status.selected}` : ""}
        </EditorStatusBar>
        <footer className={styles.footer}>
          <small>
            <UiText text="Ctrl / ⌘ + Enter 插入" />
          </small>
          <Button className="admin-button" onClick={() => setClosing(true)}>
            <UiText text="取消" />
          </Button>
          <Button
            className="admin-button admin-button-primary"
            type="submit"
            disabled={invalid || closing}
          >
            <Icon name="check" />
            <UiText text="插入代码" />
          </Button>
        </footer>
      </Form>
    </Modal>
  );
}
