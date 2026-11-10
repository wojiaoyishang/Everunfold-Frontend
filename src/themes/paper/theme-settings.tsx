"use client";

import { UiText } from "@/core/i18n/provider";
import { useSettingsEditor } from "@/core/settings/editor";
import {
  activeThemeId,
  themeProfile,
  updateThemeProfile,
} from "@/core/settings/theme-options";
import { SettingsSection } from "../argon/admin/settings/shared";
import { Select } from "../argon/components/ui/select";

export default function PaperThemeSettings() {
  const { draft, setDraft } = useSettingsEditor();
  const themeId = activeThemeId(draft);
  const theme = themeProfile(draft, themeId);
  if (!draft || !theme) return null;
  const update = (paper_tone: typeof theme.paper_tone) =>
    setDraft((current) =>
      current ? updateThemeProfile(current, themeId, { paper_tone }) : current,
    );
  return (
    <SettingsSection
      id="settings-paper"
      title="Paper 纸张"
      description="Paper 继承 Argon 的阅读能力，只开放自己的纸张表面选项。"
    >
      <div className="admin-settings-field">
        <label>
          <UiText text="纸张底色" />
        </label>
        <Select
          programOptions
          name="paper-tone"
          label="纸张底色"
          value={theme.paper_tone}
          options={[
            { value: "ivory", label: "暖白纸张" },
            { value: "white", label: "纯白纸张" },
            { value: "gray", label: "灰白纸张" },
          ]}
          onValueChange={(value) => update(value as typeof theme.paper_tone)}
        />
      </div>
    </SettingsSection>
  );
}
