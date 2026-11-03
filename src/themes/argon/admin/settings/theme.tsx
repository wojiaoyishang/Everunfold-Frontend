"use client";
import { useSettingsEditor } from "@/core/settings/editor";
import {
  SettingsFrame,
  SettingsSection,
  SettingsText,
  SettingsToggle,
} from "./shared";
import { SettingsMediaField } from "./media-field";
import { Select } from "../../components/ui/select";
import { ColorPicker } from "../../components/ui/color-picker";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import type { ThemePreferences } from "@/generated/settings-contract";
import { useFontLibrary } from "@/core/media/font-library";
import { FontField } from "../fonts/font-field";
const palette = ["#673bb7", "#3865b9", "#397566", "#ad466f", "#a26032"];
export function ThemeSettingsPage() {
  const fonts = useFontLibrary();
  const { draft, setDraft } = useSettingsEditor();
  const theme = draft?.theme;
  const update = (value: Partial<ThemePreferences>) =>
    setDraft((current) =>
      current ? { ...current, theme: { ...current.theme, ...value } } : current,
    );
  return (
    <SettingsFrame
      title="主题设置"
      description="设置阅读界面的默认外观，访客的个人选择会继续保留。"
    >
      {theme && (
        <>
          <SettingsSection
            title="色彩与外观"
            description="站点导航、卡片和交互元素使用同一套主题色。"
          >
            <div className="admin-settings-field">
              <label>默认主题色</label>
              <div className="admin-theme-colors">
                {palette.map((color) => (
                  <Button
                    key={color}
                    style={{ backgroundColor: color }}
                    aria-label={`主题色 ${color}`}
                    aria-pressed={(theme.accent ?? palette[0]) === color}
                    onClick={() => update({ accent: color })}
                  >
                    {(theme.accent ?? palette[0]) === color && (
                      <Icon name="check" />
                    )}
                  </Button>
                ))}
                <ColorPicker
                  value={theme.accent ?? palette[0]}
                  onChange={(accent) => update({ accent })}
                />
                <span>{theme.accent}</span>
              </div>
            </div>
            <div className="admin-settings-field">
              <label>默认显示模式</label>
              <Select
                name="theme-mode"
                label="默认显示模式"
                options={[
                  { value: "system", label: "跟随系统" },
                  { value: "light", label: "浅色" },
                  { value: "dark", label: "深色" },
                ]}
                value={theme.mode ?? "system"}
                onValueChange={(mode) =>
                  update({ mode: mode as ThemePreferences["mode"] })
                }
              />
            </div>
            <div
              className="admin-theme-preview"
              style={
                {
                  "--preview-color": theme.accent ?? palette[0],
                } as React.CSSProperties
              }
            >
              <div>
                <span />
                {draft?.site.name}
              </div>
              <section>
                <span />
                <span />
                <span />
              </section>
              <p>主题颜色预览</p>
            </div>
          </SettingsSection>
          <SettingsSection
            title="站点横幅"
            description="首页上方的标题与副标题。"
          >
            <SettingsText
              label="横幅标题"
              value={theme.hero_title ?? ""}
              maxLength={160}
              onChange={(hero_title) => update({ hero_title })}
            />
            <SettingsText
              label="横幅副标题"
              value={theme.hero_subtitle ?? ""}
              maxLength={300}
              onChange={(hero_subtitle) => update({ hero_subtitle })}
            />
          </SettingsSection>
          <SettingsSection
            title="字体"
            description="设置站点默认字体；文章可以为选中的文字单独指定字体。"
          >
            <div className="admin-settings-field">
              <label>默认字体</label>
              <FontField
                value={theme.font_media_id ?? ""}
                fonts={fonts.items}
                onChange={(font_media_id) => update({ font_media_id })}
              />
              <small>仅在页面实际使用时加载，下载期间保留系统字体。</small>
            </div>
          </SettingsSection>
          <SettingsSection
            title="背景"
            description="图片作为静态背景，也用于视频播放前的占位。"
          >
            <SettingsMediaField
              kind="image"
              mediaId={theme.background_media_id}
              label="背景图片地址"
              hint="留空时使用主题内置背景。"
              value={theme.background_url ?? ""}
              onChange={(background_url, background_media_id) =>
                update({ background_url, background_media_id })
              }
            />
            <SettingsMediaField
              kind="video"
              mediaId={theme.background_video_media_id}
              label="背景视频地址"
              hint="支持浏览器可播放的视频；留空后只显示静态背景。"
              value={theme.background_video_url ?? ""}
              onChange={(background_video_url, background_video_media_id) =>
                update({ background_video_url, background_video_media_id })
              }
            />
            <SettingsToggle
              label="默认播放动态背景"
              hint="离开标签页时自动暂停。访客可以在阅读设置中单独关闭。"
              value={theme.background_play ?? true}
              onChange={(background_play) => update({ background_play })}
            />
          </SettingsSection>
        </>
      )}
    </SettingsFrame>
  );
}
