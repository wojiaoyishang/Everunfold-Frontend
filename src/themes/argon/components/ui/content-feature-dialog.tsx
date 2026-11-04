"use client";
import { useEffect, useId, useState } from "react";
import dynamic from "next/dynamic";
import { codeLanguages } from "@/core/rendering/features/model";
import {
  featureSource,
  type ContentFeatureKind,
  type ContentFeatureValue,
} from "@/core/editor/content-feature-source";
import { renderContent } from "@/core/rendering/content";
import { ContentMarkup } from "../content-markup";
import { Modal } from "./modal";
import { Button, Form, TextArea } from "./primitives";
import { Select } from "./select";
import { Icon } from "../icon";
import styles from "./content-feature-dialog.module.css";
const FormulaEditorDialog = dynamic(
  () => import("./formula/formula-editor-dialog"),
  { ssr: false },
);

export interface FeatureInsertion {
  initial?: Partial<ContentFeatureValue>;
  apply: (value: ContentFeatureValue) => void;
  dispose?: () => void;
}
/** Both editor formats and both source/visual surfaces use this same input/preview. */
export function ContentFeatureButtons({
  className,
  disabled,
  prepare,
}: {
  className: string;
  disabled?: boolean;
  prepare: (kind: ContentFeatureKind) => FeatureInsertion;
}) {
  const [opened, setOpened] = useState<{
    kind: ContentFeatureKind;
    insertion: FeatureInsertion;
  }>();
  return (
    <>
      {(
        [
          ["code", "代码块", "code-block"],
          ["math", "公式", "formula"],
        ] as const
      ).map(([kind, label, icon]) => (
        <Button
          key={kind}
          className={className}
          disabled={disabled}
          aria-label={label}
          title={label}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setOpened({ kind, insertion: prepare(kind) })}
        >
          <Icon name={icon} />
        </Button>
      ))}
      {opened?.kind === "math" ? (
        <FormulaEditorDialog
          insertion={opened.insertion}
          onClose={() => setOpened(undefined)}
        />
      ) : (
        opened && (
          <ContentFeatureDialog
            kind={opened.kind}
            insertion={opened.insertion}
            onClose={() => setOpened(undefined)}
          />
        )
      )}
    </>
  );
}
function ContentFeatureDialog({
  kind,
  insertion,
  onClose,
}: {
  kind: ContentFeatureKind;
  insertion: FeatureInsertion;
  onClose: () => void;
}) {
  useEffect(
    () => () => {
      insertion.dispose?.();
    },
    [insertion],
  );
  const id = useId();
  const [value, setValue] = useState<ContentFeatureValue>({
    source: "",
    language: "plaintext",
    display: true,
    ...insertion.initial,
  });
  const [validation, setValidation] = useState({ source: "", error: false });
  const [closing, setClosing] = useState(false),
    [result, setResult] = useState<ContentFeatureValue>();
  useEffect(() => {
    if (kind !== "math") return;
    let active = true;
    void import("@/core/rendering/features/math")
      .then(({ renderFormula }) => {
        const rendered = renderFormula(value.source, value.display);
        if (active)
          setValidation({ source: value.source, error: rendered.error });
      })
      .catch(() => {
        if (active) setValidation({ source: value.source, error: true });
      });
    return () => {
      active = false;
    };
  }, [kind, value.source, value.display]);
  const rendered = renderContent({
    id: "feature-preview",
    content: [
      {
        id: "feature",
        type: "html",
        content: featureSource(kind, value, "html"),
      },
    ],
    media_urls: {},
  });
  const invalid =
    !value.source.trim() ||
    (kind === "math" &&
      (validation.source !== value.source || validation.error));
  return (
    <Modal
      title={kind === "code" ? "代码块" : "公式"}
      className={styles.dialog}
      closeLabel="关闭内容插入"
      closing={closing}
      onClose={() => setClosing(true)}
      onExited={() => {
        if (result) insertion.apply(result);
        onClose();
      }}
    >
      <Form
        className={styles.form}
        inert={closing}
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalid) {
            setResult(value);
            setClosing(true);
          }
        }}
      >
        <div className={styles.options}>
          <label>{kind === "code" ? "代码语言" : "显示方式"}</label>
          <Select
            name={id + "-type"}
            label={kind === "code" ? "代码语言" : "公式显示方式"}
            value={
              kind === "code"
                ? value.language
                : value.display
                  ? "block"
                  : "inline"
            }
            options={
              kind === "code"
                ? codeLanguages.map(([value, label]) => ({ value, label }))
                : [
                    { value: "block", label: "独立公式" },
                    { value: "inline", label: "行内公式" },
                  ]
            }
            onValueChange={(selected) =>
              setValue((current) =>
                kind === "code"
                  ? { ...current, language: selected }
                  : { ...current, display: selected === "block" },
              )
            }
          />
        </div>
        <div className={styles.workspace}>
          <div className={styles.input}>
            <label htmlFor={id + "-source"}>
              {kind === "code" ? "代码内容" : "LaTeX 公式"}
            </label>
            <TextArea
              id={id + "-source"}
              autoFocus
              spellCheck={false}
              rows={10}
              value={value.source}
              maxLength={kind === "math" ? 8000 : 100000}
              placeholder={
                kind === "code"
                  ? "粘贴或输入代码"
                  : String.raw`\frac{a}{b} + \sqrt{x}`
              }
              onChange={(event) =>
                setValue({ ...value, source: event.target.value })
              }
            />
            {kind === "math" && value.source && validation.error && (
              <p className={styles.error} role="alert">
                公式无法解析，请检查 LaTeX 写法。
              </p>
            )}
          </div>
          <div className={styles.preview} aria-label="内容预览">
            <span>预览</span>
            {value.source ? (
              <ContentMarkup
                html={rendered.html}
                features={rendered.features}
              />
            ) : (
              <p className={styles.placeholder}>输入后显示预览</p>
            )}
          </div>
        </div>
        <footer className={styles.footer}>
          <Button className="admin-button" onClick={() => setClosing(true)}>
            取消
          </Button>
          <Button
            className="admin-button admin-button-primary"
            type="submit"
            disabled={invalid}
          >
            <Icon name="check" />
            插入
          </Button>
        </footer>
      </Form>
    </Modal>
  );
}
