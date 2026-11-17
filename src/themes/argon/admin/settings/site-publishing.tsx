"use client";

import { useEffect, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { readEditorOptions } from "@/core/contracts/content-admin";
import { readManagedPages } from "@/core/contracts/pages";
import type { SitePreferences } from "@/core/contracts/settings";
import {
  defaultShortcodeDepth,
  maximumShortcodeDepth,
} from "@/core/shortcodes/configuration";
import { UiText } from "@/core/i18n/provider";
import { Select } from "../../components/ui/select";
import { TextField } from "../../components/ui/primitives";
import { SettingsSection, SettingsText, SettingsToggle } from "./shared";

const dateFormats = [
  { value: "ymd-slash", label: "YYYY/MM/DD" },
  { value: "ymd-dash", label: "YYYY-MM-DD" },
  { value: "dmy", label: "DD/MM/YYYY" },
  { value: "mdy", label: "MM/DD/YYYY" },
  { value: "localized", label: "按前台语言显示" },
] as const;

export function SitePublishingSettings({
  site,
  update,
}: {
  site: SitePreferences;
  update: (value: Partial<SitePreferences>) => void;
}) {
  const { baseUrl } = useAdminRequest();
  const [pages, setPages] = useState<{ value: string; label: string }[]>([]);
  const [categories, setCategories] = useState<
    { value: string; label: string }[]
  >([]);
  const [pagesFailed, setPagesFailed] = useState(false);
  const [termsFailed, setTermsFailed] = useState(false);
  useEffect(() => {
    const request = new AbortController();
    const options = { signal: request.signal };
    void readManagedPages(baseUrl, options)
      .then(({ data }) => {
        if (!request.signal.aborted)
          setPages(
            data.items
              .filter(
                (page) =>
                  page.source === "custom" &&
                  page.enabled &&
                  page.available &&
                  page.has_applied_snapshot,
              )
              .map((page) => ({
                value: page.id,
                label: `${page.title} · ${page.path}`,
              })),
          );
      })
      .catch(() => {
        if (!request.signal.aborted) setPagesFailed(true);
      });
    void readEditorOptions(baseUrl, options)
      .then(({ data }) => {
        if (!request.signal.aborted)
          setCategories(
            data.terms
              .filter((term) => term.kind === "category")
              .map((term) => ({ value: term.id, label: term.name })),
          );
      })
      .catch(() => {
        if (!request.signal.aborted) setTermsFailed(true);
      });
    return () => request.abort();
  }, [baseUrl]);
  const reading = site.reading ?? {};
  const writing = site.writing ?? {};
  const excerptLength = writing.excerpt_length ?? 180;
  const shortcodeDepth = writing.shortcode_max_depth ?? defaultShortcodeDepth;
  const validLength =
    Number.isInteger(excerptLength) &&
    excerptLength >= 1 &&
    excerptLength <= 1000;
  const home = reading.home_page_id ?? "";
  const posts = reading.posts_page_id ?? "";
  const category = writing.default_category_id ?? "";
  const choices = (
    items: { value: string; label: string }[],
    selected: string,
    empty: string,
  ) => [
    { value: "", label: empty },
    ...items,
    ...(selected && !items.some((item) => item.value === selected)
      ? [{ value: selected, label: "当前选择暂不可用" }]
      : []),
  ];

  return (
    <>
      <SettingsSection
        id="settings-reading"
        title="站点阅读"
        description="控制公开日期和首页显示。"
      >
        <SettingsText
          label="站点时区"
          hint="填写 IANA 时区名称，例如 Asia/Shanghai 或 UTC。"
          value={reading.time_zone ?? "Asia/Shanghai"}
          maxLength={64}
          onChange={(time_zone) =>
            update({ reading: { ...reading, time_zone } })
          }
        />
        <div className="admin-settings-field">
          <label htmlFor="site-date-format">
            <UiText text="日期格式" />
          </label>
          <Select
            id="site-date-format"
            name="site-date-format"
            label="日期格式"
            programOptions
            options={[...dateFormats]}
            value={reading.date_format ?? "ymd-slash"}
            onValueChange={(format) => {
              const option = dateFormats.find(({ value }) => value === format);
              if (option)
                update({ reading: { ...reading, date_format: option.value } });
            }}
          />
        </div>
        <div className="admin-settings-field">
          <label htmlFor="site-home-page">
            <UiText text="首页显示" />
          </label>
          <Select
            id="site-home-page"
            name="site-home-page"
            label="首页显示"
            programOptions
            value={home}
            options={choices(
              pages.filter((page) => page.value !== posts),
              home,
              "最新内容",
            )}
            onValueChange={(id) =>
              update({ reading: { ...reading, home_page_id: id || null } })
            }
          />
          <small>
            <UiText text="可选择已公开发布的自定义页面作为静态首页。" />
          </small>
        </div>
        <div className="admin-settings-field">
          <label htmlFor="site-posts-page">
            <UiText text="文章列表页" />
          </label>
          <Select
            id="site-posts-page"
            name="site-posts-page"
            label="文章列表页"
            programOptions
            value={posts}
            options={choices(
              pages.filter((page) => page.value !== home),
              posts,
              "默认文章页 /article",
            )}
            onValueChange={(id) =>
              update({ reading: { ...reading, posts_page_id: id || null } })
            }
          />
          <small>
            <UiText text="选择页面后，其地址会显示文章列表。" />
          </small>
        </div>
        {pagesFailed && (
          <p role="status">
            <UiText text="暂时无法读取可选页面。" />
          </p>
        )}
      </SettingsSection>
      <SettingsSection
        id="settings-writing"
        title="文章默认值"
        description="创建新文章时应用。"
      >
        <div className="admin-settings-field">
          <label htmlFor="site-default-category">
            <UiText text="新文章默认分类" />
          </label>
          <Select
            id="site-default-category"
            name="site-default-category"
            label="新文章默认分类"
            programOptions
            value={category}
            options={choices(categories, category, "不指定分类")}
            onValueChange={(id) =>
              update({
                writing: { ...writing, default_category_id: id || null },
              })
            }
          />
          {termsFailed && (
            <small role="status">
              <UiText text="暂时无法读取分类。" />
            </small>
          )}
        </div>
        <SettingsToggle
          label="新文章默认允许评论"
          value={writing.comments_open ?? true}
          onChange={(comments_open) =>
            update({ writing: { ...writing, comments_open } })
          }
        />
        <SettingsText
          label="新文章固定链接格式"
          hint="支持 %postname%、%post_id%、%year%、%monthnum%、%day%。语言路径前缀自动添加。已保存文章保留原地址。"
          value={writing.permalink ?? "/%postname%.html"}
          maxLength={160}
          onChange={(permalink) =>
            update({ writing: { ...writing, permalink } })
          }
        />
      </SettingsSection>
      <SettingsSection
        id="settings-excerpts"
        title="摘要设置"
        description="发布未填写摘要的文章时应用。"
      >
        <div className="admin-settings-field">
          <label htmlFor="site-excerpt-length">
            <UiText text="自动摘要字数" />
          </label>
          <TextField
            id="site-excerpt-length"
            type="number"
            min={1}
            max={1000}
            step={1}
            required
            aria-describedby="site-excerpt-length-hint"
            aria-invalid={!validLength || undefined}
            value={Number.isNaN(excerptLength) ? "" : excerptLength}
            onChange={({ currentTarget }) =>
              update({
                writing: {
                  ...writing,
                  excerpt_length: currentTarget.valueAsNumber,
                },
              })
            }
          />
          <small id="site-excerpt-length-hint">
            <UiText text="从正文截取的最多字符数，范围为 1 至 1000。" />
          </small>
        </div>
        <SettingsText
          label="固定摘要"
          hint="填写后优先使用此文案，留空则从正文自动截取。"
          multiline
          maxLength={1000}
          value={writing.default_excerpt ?? ""}
          onChange={(default_excerpt) =>
            update({ writing: { ...writing, default_excerpt } })
          }
        />
      </SettingsSection>
      <SettingsSection id="settings-shortcodes" title="短代码">
        <div className="admin-settings-field">
          <label htmlFor="site-shortcode-depth">
            <UiText text="最大嵌套层数" />
          </label>
          <TextField
            id="site-shortcode-depth"
            type="number"
            min={1}
            max={maximumShortcodeDepth}
            step={1}
            required
            aria-describedby="site-shortcode-depth-hint"
            aria-invalid={
              !Number.isInteger(shortcodeDepth) ||
              shortcodeDepth < 1 ||
              shortcodeDepth > maximumShortcodeDepth ||
              undefined
            }
            value={Number.isNaN(shortcodeDepth) ? "" : shortcodeDepth}
            onChange={({ currentTarget }) =>
              update({
                writing: {
                  ...writing,
                  shortcode_max_depth: currentTarget.valueAsNumber,
                },
              })
            }
          />
          <small id="site-shortcode-depth-hint">
            <UiText text="前台阅读和编辑预览共用此设置。调低后，超限的短代码只显示可读正文。" />
          </small>
        </div>
      </SettingsSection>
    </>
  );
}
