"use client";
import { useMemo } from "react";
import type { CloudLayoutOptions } from "@/core/taxonomy/cloud-layout";
import type { TaxonomyItem } from "@/core/contracts/content-admin";
import { UiText, useT } from "@/core/i18n/provider";
import { useWordCloud } from "../../hooks/use-word-cloud";
import { Button } from "../../components/ui/primitives";
import styles from "./taxonomy.module.css";

const cloudOptions: CloudLayoutOptions = {
  limit: 100,
  minSize: 11,
  maxSize: 32,
  rotations: [0, 0, 0, 90, -90, 20, -20],
  dense: true,
  fill: true,
};

export function AdminTagCloud({
  items,
  disabled,
  writable,
  onSelect,
}: {
  items: TaxonomyItem[];
  disabled: boolean;
  writable: boolean;
  onSelect: (item: TaxonomyItem) => void;
}) {
  const t = useT();
  const words = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        name: item.name,
        count: item.published_count,
      })),
    [items],
  );
  const { ref, placed } = useWordCloud(words, 400, 360, cloudOptions);
  const byId = new Map(items.map((item) => [item.id, item]));
  const positions = new Map(placed.map((word) => [word.id, word]));
  return (
    <section className={styles.cloud} aria-label={t("标签词云")}>
      <p className={styles.cloudHint}>
        <UiText text="最多展示 100 个常用标签。" />{" "}
        <UiText text="字号按已发布内容的引用次数变化。" />{" "}
        <UiText text={writable ? "点击标签编辑。" : "点击标签查看列表。"} />
      </p>
      <div
        ref={ref}
        className={styles.cloudStage}
        data-packed={placed.length > 0}
      >
        {(placed.length ? placed : words).map((word) => {
          const item = byId.get(word.id)!;
          const packed = positions.get(word.id);
          return (
            <Button
              key={word.id}
              className={styles.cloudWord}
              disabled={disabled}
              title={`${item.name} · ${t("已发布")} ${item.published_count} · ${t("工作稿")} ${item.draft_count}`}
              onClick={() => onSelect(item)}
              style={
                packed
                  ? {
                      left: packed.x,
                      top: packed.y,
                      width: packed.width,
                      height: packed.height,
                      fontSize: packed.size,
                    }
                  : undefined
              }
            >
              <span
                className={styles.cloudText}
                style={
                  packed
                    ? {
                        width: packed.textWidth,
                        height: packed.textHeight,
                        transform: `translate(-50%, -50%) rotate(${packed.angle}deg)`,
                      }
                    : undefined
                }
              >
                {item.name}
              </span>
            </Button>
          );
        })}
      </div>
      {placed.length > 0 && placed.length < items.length && (
        <p className={styles.cloudHint}>
          <UiText text="已展示" /> {placed.length} / {items.length}{" "}
          <UiText text="个标签，可切换列表查看全部。" />
        </p>
      )}
      {!items.length && (
        <p className={styles.message}>
          <UiText text="没有匹配的分类或标签。" />
        </p>
      )}
    </section>
  );
}
