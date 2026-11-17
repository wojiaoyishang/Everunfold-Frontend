"use client";

import { useEffect, useId, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { markdown } from "@codemirror/lang-markdown";
import { loadGlossaryIndex } from "@/core/glossary/runtime";
import type { GlossaryContract } from "@/core/contracts/glossary";
import { UiText, useT } from "@/core/i18n/provider";
import type { ShortcodeEditorProps } from "@/core/plugins/types";
import { glossaryPopupName } from "@/core/shortcodes/glossary";
import { shortcodeCall } from "@/core/shortcodes/source";
import { CodeEditor } from "../../components/ui/code-editor";
import { LoadingProgress } from "../../components/extension-placeholder";
import { TextArea, TextField } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import HtmlSourceEditor from "../content/plugins/html-source";
import styles from "./shortcodes.module.css";

type GlossaryFields = {
  mode: "term" | "text" | "markup";
  term: string;
  title: string;
  text: string;
  format: "markdown" | "html";
  markup: string;
};

type Term = NonNullable<
  GlossaryContract["public_index"]["data"]
>["terms"][number];
const markdownLanguage = markdown();

function LinkedTermField({
  language,
  value,
  onChange,
}: {
  language: string;
  value: string;
  onChange: (term: string) => void;
}) {
  const { baseUrl } = useAdminRequest();
  const t = useT();
  const id = useId();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ language: string; terms?: Term[] }>();
  useEffect(() => {
    let active = true;
    void loadGlossaryIndex(baseUrl, language)
      .then((data) => {
        if (active) setResult({ language, terms: data.terms });
      })
      .catch(() => {
        if (active) setResult({ language });
      });
    return () => {
      active = false;
    };
  }, [baseUrl, language]);
  const terms = result?.language === language ? result.terms : undefined;
  const filter = query.trim().toLocaleLowerCase();
  const matching =
    terms?.filter((term) =>
      `${term.title} ${term.slug} ${term.aliases.join(" ")}`
        .toLocaleLowerCase()
        .includes(filter),
    ) ?? [];
  const options = matching.slice(0, 100).map((term) => ({
    value: term.slug,
    label: `${term.title} · ${term.slug}`,
  }));
  const chosen = terms?.find((term) => term.slug === value);
  if (chosen && !options.some((option) => option.value === chosen.slug))
    options.unshift({ value: chosen.slug, label: chosen.title });
  return (
    <>
      {terms && (
        <div className={styles.field}>
          <TextField
            type="search"
            aria-label={t("搜索已发布词条")}
            placeholder={t("搜索已发布词条")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <label htmlFor={id}>
            <UiText text="关联词条" />
          </label>
          <Select
            id={id}
            name="glossary-shortcode-term"
            label="关联词条"
            value={value}
            options={[
              { value: "", label: t("选择已发布词条"), disabled: true },
              ...options,
            ]}
            onValueChange={onChange}
          />
          {!options.length && (
            <small role="status">
              <UiText text="没有匹配的已发布词条。" />
            </small>
          )}
        </div>
      )}
      {!terms && result?.language !== language && (
        <LoadingProgress label="正在读取术语…" />
      )}
      {!terms && result?.language === language && (
        <label className={styles.field}>
          <span>
            <UiText text="词条路径片段" />
          </span>
          <TextField
            value={value}
            maxLength={120}
            onChange={(event) => onChange(event.target.value)}
          />
          <small role="status">
            <UiText text="暂时无法读取术语目录，可填写词条链接的最后一段。" />
          </small>
        </label>
      )}
    </>
  );
}

export function GlossaryShortcodeEditor({
  definition,
  format,
  language,
  initialBody,
  onChange,
}: ShortcodeEditorProps) {
  const [body, setBody] = useState(initialBody);
  const [fields, setFields] = useState<GlossaryFields>({
    mode: "text",
    term: "",
    title: "",
    text: "",
    format: "html",
    markup: "",
  });
  useEffect(() => {
    const input = {
      term: fields.mode === "term" ? fields.term : "",
      title: fields.mode === "term" ? "" : fields.title,
      text: fields.mode === "text" ? fields.text : "",
    };
    const content =
      fields.mode === "markup"
        ? `${body.trimEnd()}\n{{< ${glossaryPopupName} format="${fields.format}" >}}\n${fields.markup}\n{{< /${glossaryPopupName} >}}`
        : body;
    onChange(shortcodeCall(definition, input, content));
  }, [body, definition, fields, onChange]);
  return (
    <GlossaryShortcodeFields
      value={fields}
      onChange={setFields}
      language={language}
      format={format}
      body={body}
      onBody={setBody}
    />
  );
}

function GlossaryShortcodeFields({
  value,
  onChange,
  language,
  format,
  body,
  onBody,
}: {
  value: GlossaryFields;
  onChange: (fields: GlossaryFields) => void;
  language: string;
  format: "markdown" | "html";
  body: string;
  onBody: (value: string) => void;
}) {
  const id = useId();
  const t = useT();
  const update = (patch: Partial<GlossaryFields>) =>
    onChange({ ...value, ...patch });
  return (
    <>
      <div className={styles.field}>
        <label htmlFor={id}>
          <UiText text="弹窗内容来源" />
        </label>
        <Select
          id={id}
          name="glossary-shortcode-source"
          label="弹窗内容来源"
          programOptions
          value={value.mode}
          options={[
            { value: "term", label: "绑定术语" },
            { value: "text", label: "纯文本说明" },
            { value: "markup", label: "Markdown 或 HTML" },
          ]}
          onValueChange={(mode) =>
            update({ mode: mode as GlossaryFields["mode"] })
          }
        />
      </div>
      {value.mode === "term" ? (
        <LinkedTermField
          language={language}
          value={value.term}
          onChange={(term) => update({ term })}
        />
      ) : (
        <label className={styles.field}>
          <span>
            <UiText text="弹窗标题（可选）" />
          </span>
          <TextField
            maxLength={120}
            value={value.title}
            onChange={(event) => update({ title: event.target.value })}
          />
        </label>
      )}
      {value.mode === "text" && (
        <label className={styles.field}>
          <span>
            <UiText text="纯文本说明" />
          </span>
          <TextArea
            rows={3}
            maxLength={1000}
            value={value.text}
            onChange={(event) => update({ text: event.target.value })}
          />
        </label>
      )}
      {value.mode === "markup" && (
        <div className={styles.field}>
          <label htmlFor={id + "-format"}>
            <UiText text="弹窗内容格式" />
          </label>
          <Select
            id={id + "-format"}
            name="glossary-shortcode-format"
            label="弹窗内容格式"
            value={value.format}
            options={[
              { value: "markdown", label: "Markdown" },
              { value: "html", label: "HTML" },
            ]}
            onValueChange={(format) =>
              update({ format: format as GlossaryFields["format"] })
            }
          />
          <div className={styles.glossaryEditor}>
            {value.format === "html" ? (
              <HtmlSourceEditor
                label={t("弹窗 HTML")}
                disabled={false}
                hideStatusBar
                value={value.markup}
                onChange={(markup) => update({ markup })}
              />
            ) : (
              <CodeEditor
                label={t("弹窗 Markdown")}
                language={markdownLanguage}
                value={value.markup}
                onChange={(markup) => update({ markup })}
              />
            )}
          </div>
        </div>
      )}
      <div className={styles.field}>
        <label htmlFor={format === "html" ? undefined : id + "-body"}>
          <UiText text="术语触发区" />
        </label>
        {format === "html" ? (
          <div className={styles.glossaryEditor}>
            <HtmlSourceEditor
              label={t("术语触发区")}
              value={body}
              onChange={onBody}
              disabled={false}
              hideStatusBar
            />
          </div>
        ) : (
          <TextArea
            id={id + "-body"}
            rows={2}
            maxLength={20000}
            value={body}
            onChange={(event) => onBody(event.target.value)}
          />
        )}
      </div>
    </>
  );
}
