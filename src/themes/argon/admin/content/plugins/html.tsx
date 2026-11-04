"use client";
import { useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFontLibrary } from "@/core/media/font-library";
import { Button } from "../../../components/ui/primitives";
import { RichTextEditor } from "../../../components/ui/rich-text-editor";
import type {
  CodeEditorHandle,
  SourceSelection,
} from "../../../components/ui/code-editor";
import { Icon } from "../../../components/icon";
import type { BlockEditorProps } from "./source-block-editor";
import HtmlSourceEditor from "./html-source";
import { RichToolbar } from "./rich-toolbar";
import styles from "./rich-editor.module.css";

export default function HtmlEditor(props: BlockEditorProps) {
  const [mode, setMode] = useState<"visual" | "source">("visual");
  const active = useRef<CodeEditorHandle | null>(null);
  const [selection, setSelection] = useState<SourceSelection>();
  const fonts = useFontLibrary();
  const changeMode = (next: typeof mode) => {
    if (next === mode) return;
    const selected = active.current?.selection();
    setSelection(selected);
    setMode(next);
  };
  useImperativeHandle(
    props.editorRef,
    () => ({
      focus: () => active.current?.focus(),
      select: (range) => active.current?.select(range),
      selection: () => active.current?.selection() ?? { start: 0, end: 0 },
      insert: (before, after) => active.current?.insert(before, after),
      captureInsertion: () => active.current?.captureInsertion() ?? (() => {}),
    }),
    [],
  );
  return (
    <>
      {props.modeControls &&
        createPortal(
          <div
            className={styles.tabs}
            role="group"
            aria-label={props.label + " HTML 模式"}
          >
            <Button
              type="button"
              aria-pressed={mode === "visual"}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => changeMode("visual")}
            >
              <Icon name="eye" /> 可视化
            </Button>
            <Button
              type="button"
              aria-pressed={mode === "source"}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => changeMode("source")}
            >
              <Icon name="code" /> HTML
            </Button>
          </div>,
          props.modeControls,
        )}
      {mode === "visual" ? (
        <RichTextEditor
          value={props.value}
          label={props.label}
          disabled={props.disabled}
          onChange={props.onChange}
          editorRef={active}
          initialSelection={selection}
          media={props.media}
          toolbar={(editor) => (
            <RichToolbar editor={editor} fonts={fonts.items} />
          )}
        />
      ) : (
        <HtmlSourceEditor
          value={props.value}
          onChange={props.onChange}
          label={props.label + " HTML 源码"}
          disabled={props.disabled}
          editorRef={active}
          initialSelection={selection}
        />
      )}
    </>
  );
}
