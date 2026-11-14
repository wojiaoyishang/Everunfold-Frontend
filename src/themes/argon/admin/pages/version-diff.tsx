"use client";

import { useState } from "react";
import type { PageValue, TitledPageCode } from "@/core/contracts/pages";
import { UiText, useT } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import { CodeDiff } from "../../components/ui/code-diff";
import styles from "../content/versions.module.css";

type VersionValue = PageValue | TitledPageCode;

function json(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, entry: unknown) =>
      entry && typeof entry === "object" && !Array.isArray(entry)
        ? Object.fromEntries(
            Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)),
          )
        : entry,
    2,
  );
}

function fields(value: VersionValue) {
  const {
    title,
    description,
    html,
    css,
    javascript,
    component_document,
    ...settings
  } = value;
  return {
    标题: title,
    说明: description ?? "",
    HTML: html ?? "",
    CSS: css ?? "",
    JavaScript: javascript ?? "",
    组件: component_document ? json(component_document) : "",
    设置: json(settings),
  };
}

export function PageVersionDiff({
  before,
  after,
}: {
  before: VersionValue;
  after: VersionValue;
}) {
  const t = useT();
  const [complete, setComplete] = useState(false);
  const left = fields(before);
  const right = fields(after);
  const labels = Object.keys(left) as (keyof typeof left)[];
  const visible = labels.filter((label) =>
    complete
      ? Boolean(left[label] || right[label])
      : left[label] !== right[label],
  );
  return (
    <div className={styles.diffWorkspace}>
      <div className={styles.diffToolbar}>
        <div
          className={styles.tabs}
          role="group"
          aria-label={t("差异显示方式")}
        >
          <Button aria-pressed={!complete} onClick={() => setComplete(false)}>
            <UiText text="只看修改" />
          </Button>
          <Button aria-pressed={complete} onClick={() => setComplete(true)}>
            <UiText text="显示完整内容" />
          </Button>
        </div>
        <div className={styles.legend}>
          <span data-version-change="removed">
            <UiText text="删除" />
          </span>
          <span data-version-change="added">
            <UiText text="新增" />
          </span>
        </div>
      </div>
      {!visible.length && (
        <p className={styles.empty}>
          <UiText text="两个版本的内容相同。" />
        </p>
      )}
      {visible.map((label) => (
        <section key={label} className={styles.diffBlock}>
          <header>
            <strong>
              <UiText text={label} />
            </strong>
          </header>
          <CodeDiff
            before={left[label]}
            after={right[label]}
            beforeLabel={t("基础版本")}
            afterLabel={t("对比版本")}
            format={label === "HTML" ? "html" : "text"}
            compact={!complete}
          />
        </section>
      ))}
    </div>
  );
}
