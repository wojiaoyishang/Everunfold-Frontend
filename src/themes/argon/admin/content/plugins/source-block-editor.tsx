"use client";
import { useImperativeHandle, useRef, type Ref } from "react";
import type { Extension } from "@codemirror/state";
import { Button } from "../../../components/ui/primitives";
import {
  CodeEditor,
  type CodeEditorHandle,
  type SharedSource,
} from "../../../components/ui/code-editor";
import styles from "./source-block-editor.module.css";

export interface BlockEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled: boolean;
  shared?: SharedSource;
  editorRef?: Ref<CodeEditorHandle>;
}
export function SourceBlockEditor({
  language,
  actions,
  format,
  editorRef,
  ...props
}: BlockEditorProps & {
  language: Extension;
  format: string;
  actions: readonly {
    label: string;
    text: string;
    before: string;
    after?: string;
  }[];
}) {
  const input = useRef<CodeEditorHandle | null>(null);
  useImperativeHandle(
    editorRef,
    () => ({
      focus: () => input.current?.focus(),
      selection: () => input.current?.selection() ?? { start: 0, end: 0 },
      insert: (before, after) => input.current?.insert(before, after),
      captureInsertion: () => input.current?.captureInsertion() ?? (() => {}),
    }),
    [],
  );
  return (
    <div className={styles.source} data-format={format}>
      <div className={styles.tools} aria-label={`${format} 工具栏`}>
        <span>{format}</span>
        {actions.map((action) => (
          <Button
            key={action.label}
            disabled={props.disabled}
            title={action.label}
            aria-label={action.label}
            onClick={() => input.current?.insert(action.before, action.after)}
          >
            {action.text}
          </Button>
        ))}
      </div>
      <CodeEditor {...props} language={language} ref={input} />
    </div>
  );
}
