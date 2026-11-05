"use client";
import { UiText } from "@/core/i18n/provider";

import { useState } from "react";
import type { EditorTerm } from "@/generated/content-admin-contract";
import { tagFontSize } from "@/core/content-management/taxonomy-options";
import { TokenField } from "../../components/ui/token-field";
import { Button } from "../../components/ui/primitives";
import styles from "./editor-workspace.module.css";
export function TagSelector({
  terms,
  value,
  onChange,
  disabled,
}: {
  terms: EditorTerm[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const tags = terms
    .filter((term) => term.kind === "tag" && (term.count ?? 0) > 0)
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, 45)
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  const maximum = Math.max(1, ...tags.map((term) => term.count ?? 0));
  return (
    <div className={styles.tagSelector}>
      <TokenField
        label="标签"
        multiple
        compactLabel
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
      <small>
        <UiText text="多个标签请用逗号分开。" />
      </small>
      <Button
        className={styles.textButton}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <UiText text="从常用标签中选择" />
      </Button>
      <div className={styles.panelReveal} data-open={open} inert={!open}>
        <div>
          <div className={styles.tagCloud}>
            {tags.map((term) => (
              <Button
                key={term.id}
                style={{
                  fontSize: `${tagFontSize(term.count ?? 0, maximum)}px`,
                }}
                disabled={disabled}
                aria-pressed={value.includes(term.name)}
                title={`${term.name}（${term.count} 篇）`}
                onClick={() => {
                  if (!value.includes(term.name) && value.length < 30)
                    onChange([...value, term.name]);
                }}
              >
                {term.name}
              </Button>
            ))}
            {!tags.length && (
              <small>
                <UiText text="发布内容后，常用标签会显示在这里。" />
              </small>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
