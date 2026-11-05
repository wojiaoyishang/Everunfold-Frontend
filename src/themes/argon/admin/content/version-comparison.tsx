"use client";
import { useMemo, useState } from "react";
import type { DraftFields, MediaURL } from "@/generated/content-admin-contract";
import type { PublicShortcode } from "@/generated/settings-contract";
import {
  compareBlocks,
  highlightRenderedDiff,
  textDiff,
} from "@/core/editor/version-diff";
import { renderContent } from "@/core/rendering/content";
import { privateDraftFields } from "@/core/collaboration/branches";
import { ContentMarkup } from "../../components/content-markup";
import { Button } from "../../components/ui/primitives";
import { CodeDiff } from "../../components/ui/code-diff";
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
  const [mode, setMode] = useState<"visual" | "source">("visual");
  const [showAll, setShowAll] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const blocks = useMemo(
    () => compareBlocks(before.body, after.body),
    [before.body, after.body],
  );
  const rendered = useMemo(
    () =>
      blocks.map((pair) => {
        const sides = [pair.before, pair.after].map((block, side) =>
          renderContent(
            {
              id: `version-${side}-${pair.id}`,
              content: block
                ? [{ ...block, type: block.type ?? "markdown" }]
                : [],
              media_urls: media,
            },
            shortcodes,
          ),
        );
        const markup = highlightRenderedDiff(sides[0].html, sides[1].html);
        return sides.map((render, side) => ({ ...render, html: markup[side] }));
      }),
    [blocks, media, shortcodes],
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
        <div className={styles.tabs} role="group" aria-label="差异显示方式">
          <Button
            aria-pressed={mode === "visual"}
            onClick={() => setMode("visual")}
          >
            可视化对比
          </Button>
          <Button
            aria-pressed={mode === "source"}
            onClick={() => setMode("source")}
          >
            源码对比
          </Button>
        </div>
        <Button
          className="admin-button"
          aria-pressed={showAll}
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "只看修改" : "显示完整正文"}
        </Button>
        <span className={styles.legend}>
          <span data-version-change="removed">− 删除</span>
          <span data-version-change="added">+ 新增</span>
        </span>
      </div>
      <div className={styles.columnLabels}>
        <strong>{beforeLabel}</strong>
        <strong>{afterLabel}</strong>
      </div>
      {(showAll || before.title !== after.title) && (
        <section className={styles.diffField}>
          <h3>标题</h3>
          <TextDifference
            before={before.title ?? ""}
            after={after.title ?? ""}
          />
        </section>
      )}
      {(showAll || before.excerpt !== after.excerpt) && (
        <section className={styles.diffField}>
          <h3>摘要</h3>
          <TextDifference
            before={before.excerpt ?? ""}
            after={after.excerpt ?? ""}
          />
        </section>
      )}
      <p className={styles.diffCount}>
        {changed} 个区块有变化
        {!showAll && blocks.length > changed
          ? ` · 已折叠 ${blocks.length - changed} 个未改区块`
          : ""}
      </p>
      {blocks.map((pair, index) =>
        !showAll && !pair.changed ? null : (
          <section
            key={pair.id}
            className={styles.diffBlock}
            data-block-change={
              !pair.before
                ? "added"
                : !pair.after
                  ? "removed"
                  : pair.changed
                    ? "changed"
                    : "same"
            }
          >
            <header>
              <strong>
                {(pair.after?.type ?? pair.before?.type) === "html"
                  ? "HTML"
                  : "Markdown"}{" "}
                · {String(index + 1).padStart(2, "0")}
              </strong>
              <span>
                {!pair.before
                  ? "新增区块"
                  : !pair.after
                    ? "删除区块"
                    : [
                        pair.moved && "顺序变化",
                        pair.before.type !== pair.after.type && "格式变化",
                        pair.before.content !== pair.after.content &&
                          "内容修改",
                      ]
                        .filter(Boolean)
                        .join(" · ") || "未修改"}
              </span>
            </header>
            {mode === "source" ? (
              <CodeDiff
                before={pair.before?.content ?? ""}
                after={pair.after?.content ?? ""}
                format={pair.after?.type ?? pair.before?.type ?? "markdown"}
              />
            ) : (
              <div className={styles.comparison}>
                {rendered[index].map((render, side) => (
                  <div
                    key={side}
                    className={styles.renderedSide}
                    aria-label={side === 0 ? beforeLabel : afterLabel}
                  >
                    <small className={styles.mobileLabel}>
                      {side === 0 ? beforeLabel : afterLabel}
                    </small>
                    {(side === 0 ? pair.before : pair.after) ? (
                      <div className="admin-draft-preview">
                        <ContentMarkup
                          html={render.html}
                          features={render.features}
                        />
                      </div>
                    ) : (
                      <p className={styles.empty}>
                        {side === 0 ? "此版本没有该区块" : "该区块已移除"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        ),
      )}
      {oldSettings !== newSettings && (
        <section className={styles.diffField}>
          <Button
            className="admin-button"
            aria-expanded={showSettings}
            onClick={() => setShowSettings(!showSettings)}
          >
            内容设置有变化{showSettings ? " · 收起" : " · 展开"}
          </Button>
          {showSettings && (
            <CodeDiff
              before={oldSettings ?? "{}"}
              after={newSettings ?? "{}"}
            />
          )}
        </section>
      )}
      {!changed &&
        before.title === after.title &&
        before.excerpt === after.excerpt &&
        oldSettings === newSettings && (
          <p className={styles.empty}>两个版本内容相同。</p>
        )}
    </section>
  );
}
