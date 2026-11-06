"use client";
import { UiText } from "@/core/i18n/provider";

import { useMemo, useState } from "react";
import type { DraftFields, MediaURL } from "@/core/contracts/content-admin";
import type { PublicShortcode } from "@/core/contracts/settings";
import { compareBlocks, textDiff } from "@/core/editor/version-diff";
import { privateDraftFields } from "@/core/collaboration/branches";
import { Button } from "../../components/ui/primitives";
import { CodeDiff } from "../../components/ui/code-diff";
import { VersionDiffBlock } from "./version-diff-block";
import styles from "./versions.module.css";

function TextDifference({ before, after }: { before: string; after: string }) {
  const changes = textDiff(before, after);
  const parts = (value: string, side: "before" | "after") => {
    let start = 0;
    const result = [];
    for (const [i, change] of changes.entries()) {
      const from = side === "before" ? change.fromA : change.fromB;
      const to = side === "before" ? change.toA : change.toB;
      result.push(<span key={`same-${i}`}>{value.slice(start, from)}</span>);
      if (from < to)
        result.push(
          <mark
            key={i}
            data-version-change={side === "before" ? "removed" : "added"}
          >
            {value.slice(from, to)}
          </mark>,
        );
      start = to;
    }
    result.push(<span key="tail">{value.slice(start)}</span>);
    return result;
  };
  return (
    <div className={styles.comparison}>
      <p>{parts(before, "before")}</p>
      <p>{parts(after, "after")}</p>
    </div>
  );
}

export function VersionComparison({
  before,
  after,
  beforeLabel,
  afterLabel,
  media,
  shortcodes,
}: {
  before: DraftFields;
  after: DraftFields;
  beforeLabel: string;
  afterLabel: string;
  media: Record<string, MediaURL>;
  shortcodes: readonly PublicShortcode[];
}) {
  const [showAll, setShowAll] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const blocks = useMemo(
    () => compareBlocks(before.body, after.body),
    [before.body, after.body],
  );
  const changed = blocks.filter((block) => block.changed).length;
  const oldSettings = JSON.stringify(
    privateDraftFields(before).settings,
    null,
    2,
  );
  const newSettings = JSON.stringify(
    privateDraftFields(after).settings,
    null,
    2,
  );
  return (
    <section className={styles.diffWorkspace} aria-label="版本差异">
      <div className={styles.diffToolbar}>
        <Button
          className="admin-button"
          aria-pressed={showAll}
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <UiText text="只看修改" />
          ) : (
            <UiText text="显示完整正文" />
          )}
        </Button>
        <span className={styles.legend}>
          <span data-version-change="removed">
            <UiText text="− 删除" />
          </span>
          <span data-version-change="added">
            <UiText text="+ 新增" />
          </span>
        </span>
      </div>
      {(showAll || before.title !== after.title) && (
        <section className={styles.diffField}>
          <h3>
            <UiText text="标题" />
          </h3>
          <TextDifference
            before={before.title ?? ""}
            after={after.title ?? ""}
          />
        </section>
      )}
      {(showAll || before.excerpt !== after.excerpt) && (
        <section className={styles.diffField}>
          <h3>
            <UiText text="摘要" />
          </h3>
          <TextDifference
            before={before.excerpt ?? ""}
            after={after.excerpt ?? ""}
          />
        </section>
      )}
      <p className={styles.diffCount}>
        {changed} <UiText text="个区块有变化" />
        {!showAll && blocks.length > changed
          ? ` · 已折叠 ${blocks.length - changed} 个未改区块`
          : ""}
      </p>
      {blocks.map((pair) =>
        !showAll && !pair.changed ? null : (
          <VersionDiffBlock
            key={`${pair.id}:${pair.after?.type ?? pair.before?.type ?? "markdown"}`}
            pair={pair}
            showAll={showAll}
            beforeLabel={beforeLabel}
            afterLabel={afterLabel}
            beforeIndex={
              before.body.findIndex((block) => block.id === pair.id) + 1
            }
            afterIndex={
              after.body.findIndex((block) => block.id === pair.id) + 1
            }
            media={media}
            shortcodes={shortcodes}
          />
        ),
      )}
      {oldSettings !== newSettings && (
        <section className={styles.diffField}>
          <Button
            className="admin-button"
            aria-expanded={showSettings}
            onClick={() => setShowSettings(!showSettings)}
          >
            <UiText text="内容设置有变化" />
            {showSettings ? (
              <UiText text=" · 收起" />
            ) : (
              <UiText text=" · 展开" />
            )}
          </Button>
          {showSettings && (
            <CodeDiff
              before={oldSettings ?? "{}"}
              after={newSettings ?? "{}"}
              beforeLabel={beforeLabel}
              afterLabel={afterLabel}
              compact={!showAll}
            />
          )}
        </section>
      )}
      {!changed &&
        before.title === after.title &&
        before.excerpt === after.excerpt &&
        oldSettings === newSettings && (
          <p className={styles.empty}>
            <UiText text="两个版本内容相同。" />
          </p>
        )}
    </section>
  );
}
