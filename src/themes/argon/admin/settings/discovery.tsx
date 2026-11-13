"use client";
import { useId } from "react";
import { UiText } from "@/core/i18n/provider";
import { useSettingsEditor } from "@/core/settings/editor";
import { SettingsSection, SettingsText, SettingsToggle } from "./shared";
import { Select } from "../../components/ui/select";
import { TextField, TextLink } from "../../components/ui/primitives";
import type { SearchDiscovery } from "@/core/contracts/settings";
import {
  SITEMAP_PREVIEW_PATH,
  SITEMAP_XML_PATH,
} from "@/core/seo/sitemap-paths";
export function DiscoverySettings() {
  const { draft, setDraft } = useSettingsEditor();
  const countId = useId();
  if (!draft) return null;
  const value = draft.site.discovery ?? {};
  const update = (change: Partial<SearchDiscovery>) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            site: {
              ...current.site,
              discovery: { ...current.site.discovery, ...change },
            },
          }
        : current,
    );
  return (
    <>
      <SettingsSection
        id="settings-discovery"
        title="站点地图与订阅"
        description="自动跟随已发布内容更新；预览、受保护内容和不允许收录的内容不会列入。"
      >
        <SettingsToggle
          label="生成站点地图"
          hint="包含首页、文章、说说、术语和已启用页面，关联可收录的多语言版本。"
          value={value.sitemap_enabled ?? true}
          onChange={(sitemap_enabled) => update({ sitemap_enabled })}
        />
        <SettingsToggle
          label="启用 RSS / Atom 订阅"
          hint="关闭站点收录时也停止输出订阅。"
          value={value.feeds_enabled ?? true}
          onChange={(feeds_enabled) => update({ feeds_enabled })}
        />
        <div className="admin-settings-field">
          <label htmlFor={countId}>
            <UiText text="订阅条数" />
          </label>
          <TextField
            id={countId}
            type="number"
            min={1}
            max={100}
            value={value.feed_limit ?? 30}
            onChange={(event) => {
              const n = Number(event.target.value);
              if (Number.isInteger(n) && n >= 1 && n <= 100)
                update({ feed_limit: n });
            }}
          />
          <small>
            <UiText text="最近发布的 1 至 100 条内容；可以用 language 参数选择某种语言。" />
          </small>
        </div>
        <div className="admin-settings-field">
          <label htmlFor="feed-content">
            <UiText text="订阅正文" />
          </label>
          <Select
            id="feed-content"
            name="feed-content"
            label="订阅正文"
            programOptions
            value={value.feed_content ?? "excerpt"}
            options={[
              { value: "excerpt", label: "仅摘要" },
              { value: "full", label: "全文" },
            ]}
            onValueChange={(feed_content) => {
              if (feed_content === "excerpt" || feed_content === "full")
                update({ feed_content });
            }}
          />
        </div>
        <div className="admin-settings-actions">
          <TextLink
            href={SITEMAP_PREVIEW_PATH}
            target="_blank"
            rel="noopener noreferrer"
          >
            <UiText text="查看站点地图" /> ↗
          </TextLink>
          <TextLink
            href={SITEMAP_XML_PATH}
            target="_blank"
            rel="noopener noreferrer"
          >
            sitemap.xml ↗
          </TextLink>
          <TextLink
            href="/robots.txt"
            target="_blank"
            rel="noopener noreferrer"
          >
            robots.txt ↗
          </TextLink>
          <TextLink href="/feed.xml" target="_blank" rel="noopener noreferrer">
            RSS ↗
          </TextLink>
          <TextLink href="/atom.xml" target="_blank" rel="noopener noreferrer">
            Atom ↗
          </TextLink>
        </div>
        <small>
          <UiText text="保存并同步后，robots.txt 会公布启用的站点地图 XML 地址。" />
        </small>
      </SettingsSection>
      <SettingsSection
        id="settings-search-details"
        title="分享与结构化数据"
        description="为搜索引擎和分享卡片提供明确的页面信息。"
      >
        <SettingsText
          label="站点简称"
          hint="可填常用简称，供搜索引擎识别站点名称。"
          maxLength={120}
          value={value.site_alternate_name ?? ""}
          onChange={(site_alternate_name) => update({ site_alternate_name })}
        />
        <SettingsText
          label="默认分享图片"
          hint="填写图片地址。文章有封面时优先使用文章封面。"
          value={value.share_image ?? ""}
          onChange={(share_image) => update({ share_image })}
        />
        <SettingsToggle
          label="输出结构化数据"
          hint="按内容类型输出 JSON-LD，首页包含站点名称和简称。"
          value={value.structured_data ?? true}
          onChange={(structured_data) => update({ structured_data })}
        />
        <div className="admin-settings-two-col">
          <SettingsText
            label="Google 站长验证"
            hint="只填写验证标签的 content 值，不粘贴整段 HTML。"
            maxLength={200}
            value={value.google_verification ?? ""}
            onChange={(google_verification) => update({ google_verification })}
          />
          <SettingsText
            label="Bing 站长验证"
            hint="只填写 msvalidate.01 标签的 content 值。"
            maxLength={200}
            value={value.bing_verification ?? ""}
            onChange={(bing_verification) => update({ bing_verification })}
          />
        </div>
      </SettingsSection>
    </>
  );
}
