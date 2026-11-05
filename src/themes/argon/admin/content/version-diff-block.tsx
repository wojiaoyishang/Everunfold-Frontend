"use client";
import { useId, useMemo, useRef, useState } from "react";
import type { MediaURL } from "@/generated/content-admin-contract";
import type { PublicShortcode } from "@/generated/settings-contract";
import type { ComparedBlock } from "@/core/editor/version-diff";
import { highlightRenderedDiff } from "@/core/editor/version-diff";
import { renderContent } from "@/core/rendering/content";
import { ContentMarkup } from "../../components/content-markup";
import { Button } from "../../components/ui/primitives";
import { CodeDiff } from "../../components/ui/code-diff";
import { Icon } from "../../components/icon";
import styles from "./versions.module.css";

export function VersionDiffBlock({
  pair,
  beforeLabel,
  afterLabel,
  beforeIndex,
  afterIndex,
  showAll,
  media,
  shortcodes,
}: {
  pair: ComparedBlock;
  beforeLabel: string;
  afterLabel: string;
  beforeIndex: number;
  afterIndex: number;
  showAll: boolean;
  media: Record<string, MediaURL>;
  shortcodes: readonly PublicShortcode[];
}) {
  const [expanded, setExpanded] = useState(true);
  const id = useId();
  const header = useRef<HTMLElement>(null);
  const format = pair.after?.type ?? pair.before?.type ?? "markdown";
  const [mode, setMode] = useState<"source" | "visual">(
    format === "html" ? "visual" : "source",
  );
  const chooseMode = (value: "source" | "visual") => {
    setMode(value);
    setExpanded(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        header.current?.scrollIntoView({
          block: "nearest",
          behavior: "instant",
        }),
      ),
    );
  };
  const rendered = useMemo(() => {
    if (mode !== "visual" || !expanded) return null;
    const sides = [pair.before, pair.after].map((block, side) =>
      renderContent(
        {
          id: `${id}-${side}`,
          content: block ? [{ ...block, type: block.type ?? "markdown" }] : [],
          media_urls: media,
        },
        shortcodes,
      ),
    );
    const markup = highlightRenderedDiff(sides[0].html, sides[1].html);
    return sides.map((render, side) => ({ ...render, html: markup[side] }));
  }, [pair, id, media, shortcodes, mode, expanded]);
  const position = (index: number) =>
    index ? String(index).padStart(2, "0") : "—";
  const change = !pair.before
    ? "新增区块"
    : !pair.after
      ? "删除区块"
      : [
          pair.moved && "顺序变化",
          pair.before.type !== pair.after.type && "格式变化",
          pair.before.content !== pair.after.content && "内容修改",
        ]
          .filter(Boolean)
          .join(" · ") || "未修改";
  return (
    <section
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
      <header ref={header}>
        <Button
          className={styles.blockToggle}
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
        >
          <Icon name={expanded ? "chevron-down" : "chevron"} />
          <strong>{format === "html" ? "HTML" : "Markdown"} 区块</strong>
          <span>
            {position(beforeIndex)} → {position(afterIndex)}
          </span>
        </Button>
        <span className={styles.blockChange}>{change}</span>
        <div
          className={styles.blockModes}
          role="group"
          aria-label={`${format === "html" ? "HTML" : "Markdown"} 区块 ${position(afterIndex || beforeIndex)} 对比模式`}
        >
          <Button
            aria-pressed={mode === "visual"}
            onClick={() => chooseMode("visual")}
          >
            可视化
          </Button>
          <Button
            aria-pressed={mode === "source"}
            onClick={() => chooseMode("source")}
          >
            源码
          </Button>
        </div>
      </header>
      {expanded && (
        <div id={id}>
          {mode === "source" ? (
            <CodeDiff
              before={pair.before?.content ?? ""}
              after={pair.after?.content ?? ""}
              format={format}
              beforeLabel={beforeLabel}
              afterLabel={afterLabel}
              compact={!showAll}
            />
          ) : (
            <div className={styles.comparison}>
              {rendered?.map((render, side) => (
                <div
                  key={side}
                  className={styles.renderedSide}
                  aria-label={side === 0 ? beforeLabel : afterLabel}
                >
                  <small className={styles.renderedLabel}>
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
        </div>
      )}
    </section>
  );
}
