"use client";
import { useEffect, useMemo, useState } from "react";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, placeholder as editorPlaceholder } from "@codemirror/view";
import { languages } from "@codemirror/language-data";
import {
  CodeEditor,
  type SourceShortcut,
} from "../../components/ui/code-editor";

const jsonShortcuts: readonly SourceShortcut[] = [
  { key: "Tab", command: { kind: "tab" } },
];

export default function AdminSourceEditor({
  kind,
  value,
  onChange,
  disabled,
  label,
  limit,
  descriptionId,
  inputId,
  placeholder,
  invalid,
}: {
  kind: "html" | "css" | "javascript" | "json" | "text";
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  limit?: number;
  descriptionId?: string;
  inputId?: string;
  placeholder?: string;
  invalid?: boolean;
}) {
  const [language, setLanguage] = useState<Extension>([]);
  useEffect(() => {
    if (kind === "text") return;
    let active = true;
    const name = {
      html: "HTML",
      css: "CSS",
      javascript: "JavaScript",
      json: "JSON",
    }[kind];
    void languages
      .find((item) => item.name === name)
      ?.load()
      .then((support) => {
        if (active) setLanguage(support);
      });
    return () => {
      active = false;
    };
  }, [kind]);
  const extensions = useMemo(
    () => [
      kind === "text" ? [] : language,
      limit
        ? EditorState.changeFilter.of(
            (edit) =>
              edit.newDoc.length <= limit ||
              edit.newDoc.length < edit.startState.doc.length,
          )
        : [],
      EditorView.contentAttributes.of({
        ...(descriptionId ? { "aria-describedby": descriptionId } : {}),
        ...(inputId ? { id: inputId } : {}),
        ...(invalid === undefined
          ? {}
          : { "aria-invalid": invalid ? "true" : "false" }),
      }),
      placeholder ? editorPlaceholder(placeholder) : [],
    ],
    [kind, language, limit, descriptionId, inputId, invalid, placeholder],
  );
  return (
    <CodeEditor
      label={
        label ??
        {
          html: "HTML",
          css: "CSS",
          javascript: "JavaScript",
          json: "JSON",
          text: "正文",
        }[kind]
      }
      value={value}
      onChange={onChange}
      language={extensions}
      plainText={kind === "text"}
      disabled={disabled}
      shortcuts={kind === "json" ? jsonShortcuts : undefined}
    />
  );
}
