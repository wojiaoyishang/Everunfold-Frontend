"use client";

import type { CSSProperties } from "react";
import type { ThemePreferences } from "@/core/contracts/settings";
import { readableAccent } from "@/core/browser/appearance-policy";
import { UiText, useT } from "@/core/i18n/provider";
import { Icon } from "../../components/icon";
import { SiteBrand } from "../../components/site-brand";
import { Select } from "../../components/ui/select";
import { SettingsMediaField } from "./media-field";
import { SettingsSection, SettingsText } from "./shared";

export function HeaderBrandSettings({
  name,
  theme,
  onChange,
}: {
  name: string;
  theme: ThemePreferences;
  onChange: (patch: Partial<ThemePreferences>) => void;
}) {
  const t = useT();
  const mode = theme.header_brand_mode ?? "both";
  const inherited = theme.hero_title?.trim() || name;
  return (
    <SettingsSection
      id="settings-brand-images"
      title="顶栏标识"
      description="配置前台顶栏左侧的首页链接。"
    >
      <div className="admin-settings-field">
        <label htmlFor="header-brand-mode">
          <UiText text="标识显示方式" />
        </label>
        <Select
          id="header-brand-mode"
          name="header-brand-mode"
          label="标识显示方式"
          programOptions
          value={mode}
          options={[
            { value: "text", label: "仅文字" },
            { value: "image", label: "仅图片" },
            { value: "both", label: "图片和文字" },
          ]}
          onValueChange={(value) => {
            if (value === "text" || value === "image" || value === "both")
              onChange({ header_brand_mode: value });
          }}
        />
      </div>
      <SettingsText
        label="顶栏文字"
        value={theme.header_brand_text ?? ""}
        maxLength={160}
        placeholder={inherited}
        hint={
          mode === "image"
            ? "仅图片时，这段文字用于朗读首页链接，并在图片加载失败时显示。"
            : "留空时使用横幅标题，横幅标题也为空时使用站点名称。"
        }
        onChange={(header_brand_text) => onChange({ header_brand_text })}
      />
      {mode !== "text" && (
        <SettingsMediaField
          kind="image"
          label={t("顶栏 Logo")}
          hint={t("上传图片、从媒体库选择或填入图片地址。图片缺失时显示文字。")}
          value={theme.header_logo_url ?? ""}
          mediaId={theme.header_logo_media_id}
          onChange={(header_logo_url, header_logo_media_id) =>
            onChange({ header_logo_url, header_logo_media_id })
          }
        />
      )}
      <div className="admin-settings-field">
        <span className="admin-header-brand-preview-label">
          <UiText text="顶栏实时预览" />
        </span>
        <div
          className="admin-header-brand-preview"
          style={
            theme.accent
              ? ({
                  "--preview-brand-background": readableAccent(
                    theme.accent,
                    false,
                  ),
                } as CSSProperties)
              : undefined
          }
        >
          <span className="site-brand">
            <SiteBrand name={name} heroTitle={theme.hero_title} theme={theme} />
          </span>
          <Icon name="home" />
          <span className="admin-header-brand-preview-home">
            <UiText text="首页" />
          </span>
        </div>
      </div>
    </SettingsSection>
  );
}
