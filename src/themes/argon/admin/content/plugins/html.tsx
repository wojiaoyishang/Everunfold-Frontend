"use client";
import { FileDropZone } from "../../../components/ui/file-drop-zone";
import { useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFontLibrary } from "@/core/fonts/library";
import { EditorViewToggle } from "./editor-view-toggle";
import { RichTextEditor } from "../../../components/ui/rich-text-editor";
import type {
  CodeEditorHandle,
  SourceSelection,
} from "../../../components/ui/code-editor";
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
      reveal: (range) => active.current?.reveal?.(range),
      selection: () => active.current?.selection() ?? { start: 0, end: 0 },
      insert: (before, after) => active.current?.insert(before, after),
      captureInsertion: () => active.current?.captureInsertion() ?? (() => {}),
    }),
    [],
  );
  return (
    <FileDropZone
      capture
      disabled={props.disabled || !props.onUpload}
      onFiles={(files) => props.onUpload?.(files)}
    >
      {props.modeControls &&
        createPortal(
          <div
            className={styles.tabs}
            role="group"
            aria-label={props.label + " HTML 模式"}
          >
            <EditorViewToggle
              current={mode}
              next={mode === "visual" ? "source" : "visual"}
              onToggle={() =>
                changeMode(mode === "visual" ? "source" : "visual")
              }
            />
          </div>,
          props.modeControls,
        )}
      {mode === "visual" ? (
        <RichTextEditor
          shared={props.shared}
          value={props.value}
          label={props.label}
          disabled={props.disabled}
          onChange={props.onChange}
          editorRef={active}
          initialSelection={selection}
          afterToolbar={props.uploadStatus}
          uploadEntries={props.uploadEntries}
          media={props.media}
          toolbar={(editor) => (
            <RichToolbar
              editor={editor}
              fonts={fonts.items}
              onMedia={props.onMedia}
              onShortcode={props.onShortcode}
              onUpload={props.onUpload}
            />
          )}
        />
      ) : (
        <HtmlSourceEditor
          {...props}
          label={props.label + " HTML 源码"}
          editorRef={active}
          initialSelection={selection}
        />
      )}
    </FileDropZone>
  );
}
