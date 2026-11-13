"use client";

import { useState } from "react";
import { UiText, useT } from "@/core/i18n/provider";
import type { ThemeSettingsProps } from "@/core/settings/theme-settings-host";
import type { ThemePreferences } from "@/core/contracts/settings";
import { Icon } from "../../components/icon";
import { Button, TextField } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { SettingsSection } from "./shared";
import "../../components/feed-layout.css";
import styles from "./home-feed.module.css";

type Preferences = Required<NonNullable<ThemePreferences["feed"]>>;

const sample = [
  { type: "article", title: "沿江散步", lines: 2, cover: true },
  { type: "shuoshuo", title: "雨停之后", lines: 1, cover: false },
  { type: "article", title: "周末阅读笔记", lines: 3, cover: false },
  { type: "article", title: "记一次旅行", lines: 2, cover: true },
] as const;

export function HomeFeedSettings({
  value,
  taxonomies,
  staticHome,
  onChange,
}: ThemeSettingsProps & {
  value: Preferences;
  staticHome: boolean;
  onChange: (value: Preferences) => void;
}) {
  const [phone, setPhone] = useState(false);
  const [term, setTerm] = useState("");
  const t = useT();
  const update = (patch: Partial<Preferences>) =>
    onChange({ ...value, ...patch });
  const chosen = new Set(value.excluded_taxonomy_ids);
  const available = (taxonomies ?? []).filter((item) => !chosen.has(item.id));
  const selectedTerm = available.some((item) => item.id === term) ? term : "";
  const examples = sample
    .filter(
      (item) =>
        value.default_type === "all" || item.type === value.default_type,
    )
    .slice(0, value.page_size);

  return (
    <SettingsSection
      id="settings-feed"
      title="首页内容"
      description="设置动态首页的内容和布局。读者仍可切换文章与说说。"
    >
      {staticHome && (
        <p className="admin-settings-hint">
          <UiText text="当前首页使用静态页面。这些选项在使用动态首页时生效。" />
        </p>
      )}
      <div className={styles.fields}>
        <div className="admin-settings-field">
          <span>
            <UiText text="默认内容" />
          </span>
          <Select
            programOptions
            name="theme-feed"
            label="默认内容"
            value={value.default_type}
            options={[
              { value: "all", label: "文章与说说" },
              { value: "article", label: "仅文章" },
              { value: "shuoshuo", label: "仅说说" },
            ]}
            onValueChange={(default_type) =>
              update({
                default_type: default_type as Preferences["default_type"],
              })
            }
          />
        </div>
        <label className="admin-field">
          <span>
            <UiText text="每页内容数" />
          </span>
          <TextField
            type="number"
            min={1}
            max={30}
            value={value.page_size}
            onChange={(event) =>
              update({
                page_size: Math.max(
                  1,
                  Math.min(30, Number(event.target.value) || 1),
                ),
              })
            }
          />
        </label>
        <div className="admin-settings-field">
          <span>
            <UiText text="卡片布局" />
          </span>
          <Select
            programOptions
            name="theme-feed-layout"
            label="卡片布局"
            value={value.layout}
            options={[
              { value: "list", label: "单列列表" },
              { value: "grid", label: "双列网格" },
              { value: "masonry", label: "瀑布流" },
            ]}
            onValueChange={(layout) =>
              update({ layout: layout as Preferences["layout"] })
            }
          />
        </div>
        <div className="admin-settings-field">
          <span>
            <UiText text="卡片密度" />
          </span>
          <Select
            programOptions
            name="theme-feed-density"
            label="卡片密度"
            value={value.density}
            options={[
              { value: "comfortable", label: "舒展" },
              { value: "compact", label: "紧凑" },
            ]}
            onValueChange={(density) =>
              update({ density: density as Preferences["density"] })
            }
          />
        </div>
      </div>
      <div className="admin-settings-field">
        <span>
          <UiText text="首页隐藏的分类和标签" />
        </span>
        <div className={styles.termPicker}>
          <Select
            name="theme-feed-exclusion"
            label="选择分类或标签"
            value={selectedTerm}
            disabled={!available.length || chosen.size >= 64}
            options={[
              { value: "", label: t("选择分类或标签") },
              ...available.map(({ id, name, kind, slug }) => ({
                value: id,
                label: `${t(kind === "category" ? "分类" : "标签")} · ${name} (${slug})`,
              })),
            ]}
            onValueChange={setTerm}
          />
          <Button
            className="admin-button"
            disabled={!selectedTerm}
            onClick={() => {
              update({ excluded_taxonomy_ids: [...chosen, selectedTerm] });
              setTerm("");
            }}
          >
            <UiText text="添加" />
          </Button>
        </div>
        {Boolean(chosen.size) && (
          <ul className={styles.terms}>
            {[...chosen].map((id) => {
              const item = taxonomies?.find((candidate) => candidate.id === id);
              return (
                <li key={id}>
                  <Button
                    className="admin-button"
                    aria-label={`${t("移除")} ${item?.name ?? id}`}
                    onClick={() =>
                      update({
                        excluded_taxonomy_ids: [...chosen].filter(
                          (other) => other !== id,
                        ),
                      })
                    }
                  >
                    {item?.name ?? id}
                    <Icon name="close" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <small>
          <UiText
            text={
              taxonomies === undefined
                ? "分类和标签暂时无法读取。"
                : "命中任一所选分类或标签的内容会从首页列表隐藏。"
            }
          />
        </small>
      </div>
      <div className={styles.preview}>
        <div className={styles.toolbar}>
          <strong>
            <UiText text="首页示例预览" />
          </strong>
          <div role="group" aria-label={t("预览尺寸")}>
            <Button
              className="admin-button"
              aria-pressed={!phone}
              onClick={() => setPhone(false)}
            >
              <UiText text="桌面" />
            </Button>
            <Button
              className="admin-button"
              aria-pressed={phone}
              onClick={() => setPhone(true)}
            >
              <UiText text="手机" />
            </Button>
          </div>
        </div>
        <div
          className={`feed-layout-container ${styles.viewport}`}
          data-phone={phone}
        >
          <div
            className="feed-layout"
            data-layout={value.layout}
            data-density={value.density}
          >
            {examples.map(({ type, title, cover, lines }) => (
              <div key={title} className={styles.card}>
                {cover && <div className={styles.cover} aria-hidden />}
                <div className={`post-card-body ${styles.body}`}>
                  <small>
                    <UiText text={type === "article" ? "文章" : "说说"} />
                  </small>
                  <strong>
                    <UiText text={title} />
                  </strong>
                  <div className={styles.lines} aria-hidden>
                    {Array.from({ length: lines }, (_, index) => (
                      <span key={index} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
