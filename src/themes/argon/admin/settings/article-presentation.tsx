"use client";

import type { ArticleDisplayPreferences } from "@/core/contracts/settings";
import { UiText, useT } from "@/core/i18n/provider";
import { Button, TextField } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { SettingsText, SettingsToggle } from "./shared";

export const articleMeta = [
  ["author", "作者"],
  ["published", "发布时间"],
  ["updated", "更新时间"],
  ["words", "字数"],
  ["reading", "预计阅读时间"],
  ["comments", "评论数"],
  ["views", "浏览量"],
] as const;

const coverPositions = [
  { value: "above", label: "标题背景" },
  { value: "below", label: "标题下方" },
  { value: "hidden", label: "隐藏封面" },
] as const;
const relatedMethods = [
  { value: "both", label: "按标签和分类" },
  { value: "tag", label: "按标签" },
  { value: "category", label: "按分类" },
  { value: "recent", label: "最近发布" },
] as const;

export function ArticlePresentationSettings({
  value,
  onChange,
}: {
  value: Required<ArticleDisplayPreferences>;
  onChange: (patch: Partial<ArticleDisplayPreferences>) => void;
}) {
  const t = useT();
  const order = [
    ...value.meta_order,
    ...articleMeta
      .map(([key]) => key)
      .filter((key) => !value.meta_order.includes(key)),
  ];
  const labels = Object.fromEntries(articleMeta);
  const move = (index: number, offset: number) => {
    const target = index + offset;
    const next = [...order];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange({ meta_order: next });
  };
  return (
    <>
      <SettingsToggle
        label="显示更新时间"
        value={value.show_updated}
        onChange={(show_updated) => onChange({ show_updated })}
      />
      <SettingsToggle
        label="显示文章目录"
        value={value.show_toc}
        onChange={(show_toc) => onChange({ show_toc })}
      />
      <div className="admin-settings-field">
        <p>
          <UiText text="文章信息顺序" />
        </p>
        <ol className="admin-settings-list-editor">
          {order.map((key, index) => (
            <li className="admin-settings-list-row" key={key}>
              <span>
                <UiText text={labels[key] ?? key} />
              </span>
              <Button
                className="admin-button"
                disabled={index === 0}
                aria-label={t("上移") + " " + t(labels[key] ?? key)}
                onClick={() => move(index, -1)}
              >
                <UiText text="上移" />
              </Button>
              <Button
                className="admin-button"
                disabled={index === order.length - 1}
                aria-label={t("下移") + " " + t(labels[key] ?? key)}
                onClick={() => move(index, 1)}
              >
                <UiText text="下移" />
              </Button>
            </li>
          ))}
        </ol>
      </div>
      <div className="admin-settings-two-col">
        <div className="admin-settings-field">
          <label htmlFor="article-cover-position">
            <UiText text="文章封面位置" />
          </label>
          <Select
            id="article-cover-position"
            name="article-cover-position"
            label="文章封面位置"
            programOptions
            value={value.cover_position}
            options={[...coverPositions]}
            onValueChange={(position) => {
              const option = coverPositions.find(
                ({ value }) => value === position,
              );
              if (option) onChange({ cover_position: option.value });
            }}
          />
        </div>
        <div className="admin-settings-field">
          <label htmlFor="related-method">
            <UiText text="推荐文章依据" />
          </label>
          <Select
            id="related-method"
            name="related-method"
            label="推荐文章依据"
            programOptions
            value={value.related_basis}
            options={[...relatedMethods]}
            onValueChange={(method) => {
              const option = relatedMethods.find(
                ({ value }) => value === method,
              );
              if (option) onChange({ related_basis: option.value });
            }}
          />
        </div>
      </div>
      <div className="admin-settings-two-col">
        {(
          [
            ["han_per_minute", "每分钟汉字数", 50, 2000],
            ["words_per_minute", "每分钟单词数", 30, 1500],
            ["stale_days", "过时提醒天数", 0, 3650],
          ] as const
        ).map(([key, label, min, max]) => (
          <label className="admin-settings-field" key={key}>
            <UiText text={label} />
            <TextField
              type="number"
              min={min}
              max={max}
              value={value[key]}
              onChange={(event) => {
                const n = event.currentTarget.valueAsNumber;
                if (Number.isInteger(n)) onChange({ [key]: n });
              }}
            />
            {key === "stale_days" && (
              <small>
                <UiText text="填 0 关闭过时提醒。" />
              </small>
            )}
          </label>
        ))}
        <div className="admin-settings-field">
          <label htmlFor="article-stale-basis">
            <UiText text="过时提醒起算时间" />
          </label>
          <Select
            id="article-stale-basis"
            name="article-stale-basis"
            label="过时提醒起算时间"
            programOptions
            value={value.stale_basis}
            options={[
              { value: "updated", label: "更新时间" },
              { value: "published", label: "发布时间" },
            ]}
            onValueChange={(basis) => {
              if (basis === "updated" || basis === "published")
                onChange({ stale_basis: basis });
            }}
          />
        </div>
      </div>
      <SettingsText
        label="文章文末附加内容"
        value={value.afterword}
        multiline
        maxLength={2000}
        onChange={(afterword) => onChange({ afterword })}
      />
    </>
  );
}
