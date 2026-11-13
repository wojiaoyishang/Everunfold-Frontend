"use client";

import type { CSSProperties } from "react";

import type {
  ArticleDisplayPreferences,
  ThemePreferences,
} from "@/core/contracts/settings";
import { useSettingsEditor } from "@/core/settings/editor";
import {
  activeThemeId,
  themeProfile,
  updateThemeProfile,
} from "@/core/settings/theme-options";
import {
  SettingsSection,
  SettingsText,
  SettingsToggle,
} from "./admin/settings/shared";
import { SettingsMediaField } from "./admin/settings/media-field";
import { ColorPicker } from "./components/ui/color-picker";
import { Button, TextField } from "./components/ui/primitives";
import { Icon } from "./components/icon";
import { Select } from "./components/ui/select";
import { FontField } from "./admin/fonts/font-field";
import { useFontLibrary } from "@/core/fonts/library";
import { HeaderBrandSettings } from "./admin/settings/header-brand-settings";
import { SidebarNavigationSettings } from "./admin/settings/sidebar-navigation-settings";
import { SidebarProfileSettings } from "./admin/settings/sidebar-profile";
import { ArticlePresentationSettings } from "./admin/settings/article-presentation";
import { CodeSettingsSection } from "./admin/settings/code-settings";
import { HomeFeedSettings } from "./admin/settings/home-feed";
import type { ThemeSettingsProps } from "@/core/settings/theme-settings-host";
import { UiText } from "@/core/i18n/provider";
import { argonAssetUrl } from "./assets";

const palette = ["#673bb7", "#3865b9", "#397566", "#ad466f", "#a26032"];
const articleToggles: readonly [keyof ArticleDisplayPreferences, string][] = [
  ["show_author", "显示作者"],
  ["show_date", "显示日期"],
  ["show_word_count", "显示字数"],
  ["show_reading_time", "显示预计阅读时间"],
  ["show_comments", "显示评论入口"],
  ["show_views", "显示阅读量"],
  ["show_share", "显示分享与复制"],
  ["show_neighbors", "显示上一篇/下一篇"],
  ["show_related", "显示推荐文章"],
  ["toc_numbered", "目录显示序号"],
];

export default function ArgonThemeSettings({ taxonomies }: ThemeSettingsProps) {
  const fonts = useFontLibrary();
  const { draft, setDraft } = useSettingsEditor();
  const themeId = activeThemeId(draft);
  const theme = themeProfile(draft, themeId);
  if (!draft || !theme) return null;
  const update = (value: Partial<ThemePreferences>) =>
    setDraft((current) => {
      if (!current) return current;
      const normalized = { ...value };
      if (!("background_url" in value))
        normalized.background_url = argonAssetUrl(theme.background_url);
      if (!("background_video_url" in value))
        normalized.background_video_url = argonAssetUrl(
          theme.background_video_url,
        );
      return updateThemeProfile(current, themeId, normalized);
    });
  const article = theme.article;
  const updateArticle = (patch: Partial<ArticleDisplayPreferences>) =>
    update({ article: { ...article, ...patch } });
  return (
    <>
      <SettingsSection
        id="settings-appearance"
        title="色彩与外观"
        description="站点导航、卡片和交互元素使用同一套主题色。"
      >
        <div className="admin-settings-field">
          <label>
            <UiText text="默认主题色" />
          </label>
          <div className="admin-theme-colors">
            {palette.map((color) => (
              <Button
                key={color}
                style={{ backgroundColor: color }}
                aria-label={`主题色 ${color}`}
                aria-pressed={theme.accent === color}
                onClick={() => update({ accent: color })}
              >
                {theme.accent === color && <Icon name="check" />}
              </Button>
            ))}
            <ColorPicker
              value={theme.accent}
              onChange={(accent) => update({ accent })}
            />
            <span>{theme.accent}</span>
          </div>
        </div>
        <div className="admin-settings-field">
          <label>
            <UiText text="默认显示模式" />
          </label>
          <Select
            programOptions
            name="theme-mode"
            label="默认显示模式"
            options={[
              { value: "system", label: "跟随系统" },
              { value: "light", label: "浅色" },
              { value: "dark", label: "深色" },
            ]}
            value={theme.mode}
            onValueChange={(mode) =>
              update({ mode: mode as typeof theme.mode })
            }
          />
        </div>
        <div
          className="admin-theme-preview"
          style={{ "--preview-color": theme.accent } as CSSProperties}
        >
          <div>
            <span />
            {draft.site.name}
          </div>
          <section>
            <span />
            <span />
            <span />
          </section>
          <p>
            <UiText text="主题颜色预览" />
          </p>
        </div>
      </SettingsSection>
      <HeaderBrandSettings
        name={draft.site.name}
        theme={theme}
        onChange={update}
      />
      <SidebarNavigationSettings
        site={draft.site}
        theme={theme}
        iconUrls={draft.icon_urls ?? {}}
        onIconUrl={(id, url) =>
          setDraft((current) =>
            current
              ? { ...current, icon_urls: { ...current.icon_urls, [id]: url } }
              : current,
          )
        }
        onChange={(sidebar_navigation) => update({ sidebar_navigation })}
      />
      <SettingsSection
        id="settings-sidebar-profile"
        title="侧栏博主卡片"
        description="设置头像、统计跳转、个人按钮和友情链接。"
      >
        <SettingsMediaField
          kind="image"
          label="博主头像"
          value={theme.author_avatar_url ?? draft.site.avatar_url ?? ""}
          mediaId={
            theme.author_avatar_url === null
              ? draft.site.avatar_media_id
              : theme.author_avatar_media_id
          }
          onChange={(author_avatar_url, author_avatar_media_id) =>
            update({ author_avatar_url, author_avatar_media_id })
          }
        />
        <SidebarProfileSettings
          author={draft.site.author}
          value={theme.sidebar_profile}
          onChange={(sidebar_profile) => update({ sidebar_profile })}
        />
      </SettingsSection>
      <SettingsSection
        id="settings-hero"
        title="站点横幅"
        description="设置页面上方的标题、副标题和入场动效。"
      >
        <SettingsText
          label="横幅标题"
          value={theme.hero_title}
          maxLength={160}
          onChange={(hero_title) => update({ hero_title })}
        />
        <SettingsText
          label="横幅副标题"
          value={theme.hero_subtitle}
          maxLength={300}
          onChange={(hero_subtitle) => update({ hero_subtitle })}
        />
        <SettingsToggle
          label="显示横幅副标题"
          value={theme.hero_show_subtitle}
          onChange={(hero_show_subtitle) => update({ hero_show_subtitle })}
        />
        <div className="admin-settings-field">
          <label htmlFor="hero-animation">
            <UiText text="横幅入场动效" />
          </label>
          <Select
            id="hero-animation"
            name="hero-animation"
            label="横幅入场动效"
            programOptions
            value={theme.hero_animation}
            options={[
              { value: "none", label: "关闭动效" },
              { value: "fade", label: "淡入" },
              { value: "rise", label: "上移淡入" },
              { value: "typewriter", label: "标题打字" },
            ]}
            onValueChange={(hero_animation) => {
              if (
                hero_animation === "none" ||
                hero_animation === "fade" ||
                hero_animation === "rise" ||
                hero_animation === "typewriter"
              )
                update({ hero_animation });
            }}
          />
        </div>
        {theme.hero_animation === "typewriter" && (
          <label className="admin-settings-field">
            <UiText text="打字间隔（毫秒／字）" />
            <TextField
              type="number"
              min={10}
              max={120}
              value={theme.hero_typing_ms}
              onChange={(event) => {
                const hero_typing_ms = event.currentTarget.valueAsNumber;
                if (Number.isInteger(hero_typing_ms))
                  update({ hero_typing_ms });
              }}
            />
          </label>
        )}
      </SettingsSection>
      <SettingsSection
        id="settings-fonts"
        title="字体"
        description="设置站点默认字体；文章可以为选中的文字单独指定字体。"
      >
        <div className="admin-settings-field">
          <label>
            <UiText text="默认字体" />
          </label>
          <FontField
            value={theme.font_media_id}
            fonts={fonts.items}
            onChange={(font_media_id) => update({ font_media_id })}
          />
          <small>
            <UiText text="仅在页面实际使用时加载，下载期间保留系统字体。" />
          </small>
        </div>
      </SettingsSection>
      <HomeFeedSettings
        value={theme.feed}
        taxonomies={taxonomies}
        staticHome={Boolean(draft.site.reading?.home_page_id)}
        onChange={(feed) => update({ feed })}
      />
      <SettingsSection
        id="settings-article"
        title="文章阅读"
        description="控制文章页的信息和阅读工具；缺失数据不会显示假占位。"
      >
        {articleToggles.map(([key, label]) => (
          <SettingsToggle
            key={key}
            label={label}
            value={article[key] as boolean}
            onChange={(value) => updateArticle({ [key]: value })}
          />
        ))}
        <label className="admin-field">
          <span>
            <UiText text="推荐文章数量" />
          </span>
          <Select
            programOptions
            name="related-count"
            label="推荐文章数量"
            value={String(article.related_count)}
            options={Array.from({ length: 7 }, (_, index) => ({
              value: String(index),
              label: String(index),
            }))}
            onValueChange={(related_count) =>
              updateArticle({ related_count: Number(related_count) })
            }
          />
        </label>
        <ArticlePresentationSettings value={article} onChange={updateArticle} />
      </SettingsSection>
      <CodeSettingsSection
        value={theme.code}
        onChange={(code) => update({ code })}
      />
      <SettingsSection
        id="settings-background"
        title="背景"
        description="图片作为静态背景，也用于视频播放前的占位。"
      >
        <SettingsMediaField
          kind="image"
          mediaId={theme.background_media_id}
          label="背景图片地址"
          hint="留空时使用主题内置背景。"
          value={argonAssetUrl(theme.background_url)}
          onChange={(background_url, background_media_id) =>
            update({ background_url, background_media_id })
          }
        />
        <SettingsMediaField
          kind="video"
          mediaId={theme.background_video_media_id}
          label="背景视频地址"
          hint="支持浏览器可播放的视频；留空后只显示静态背景。"
          value={argonAssetUrl(theme.background_video_url)}
          onChange={(background_video_url, background_video_media_id) =>
            update({ background_video_url, background_video_media_id })
          }
        />
        <SettingsToggle
          label="默认播放动态背景"
          hint="离开标签页时自动暂停。访客可以在阅读设置中单独关闭。"
          value={theme.background_play}
          onChange={(background_play) => update({ background_play })}
        />
      </SettingsSection>
    </>
  );
}
