"use client";

import { useDeferredValue, useId, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  authoredCssLimit,
  compileAuthoredCss,
} from "@/core/rendering/authored-css";
import { UiText, useT } from "@/core/i18n/provider";
import { ExtensionProgress } from "../../components/extension-placeholder";
import styles from "./authored-css-field.module.css";

const SourceEditor = dynamic(() => import("./source-editor"), {
  ssr: false,
  loading: () => (
    <div role="status" className={styles.loading}>
      <span className="sr-only">
        <UiText text="正在载入 CSS 编辑器…" />
      </span>
      <ExtensionProgress />
    </div>
  ),
});

export function AuthoredCssField({
  label,
  value = "",
  onChange,
  disabled,
  limit = authoredCssLimit,
}: {
  label: string;
  value?: string;
  onChange: (css: string) => void;
  disabled?: boolean;
  limit?: number;
}) {
  const id = useId();
  const t = useT();
  const draft = useDeferredValue(value);
  const error = useMemo(
    () => compileAuthoredCss(draft, "editor", limit).error,
    [draft, limit],
  );
  return (
    <div className={`admin-field ${styles.field}`}>
      <span>
        <UiText text={label} />
      </span>
      <div className={styles.input} data-invalid={Boolean(error) || undefined}>
        <SourceEditor
          kind="css"
          label={t(label)}
          value={value}
          onChange={onChange}
          disabled={disabled}
          limit={limit}
          invalid={Boolean(error)}
          descriptionId={`${id}-hint`}
        />
      </div>
      <small id={`${id}-hint`} aria-live="polite">
        <UiText
          text={
            error === "unsupported"
              ? "这段 CSS 含有不支持的规则或资源引用，暂未应用。"
              : error
                ? "这段 CSS 的语法有误，暂未应用。"
                : "使用 :scope 选择当前容器，支持 @media 和 @supports。"
          }
        />
      </small>
    </div>
  );
}
