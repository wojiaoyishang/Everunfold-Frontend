"use client";
import { useEffect, useState } from "react";
import type { Extension } from "@codemirror/state";
import { languages } from "@codemirror/language-data";
import { CodeEditor } from "../../components/ui/code-editor";
export default function PageSourceEditor({
  kind,
  value,
  onChange,
  disabled,
}: {
  kind: "html" | "css" | "javascript" | "json";
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const [language, setLanguage] = useState<Extension>([]);
  useEffect(() => {
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
  return (
    <CodeEditor
      label={
        { html: "HTML", css: "CSS", javascript: "JavaScript", json: "JSON" }[
          kind
        ]
      }
      value={value}
      onChange={onChange}
      language={language}
      disabled={disabled}
    />
  );
}
