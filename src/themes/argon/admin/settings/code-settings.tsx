"use client";
import { UiText } from "@/core/i18n/provider";

import { useId } from "react";
import type { CodePreferences } from "@/core/contracts/settings";
import { useFontLibrary } from "@/core/fonts/library";
import { renderContent } from "@/core/rendering/content";
import { codeHtml } from "@/core/rendering/features/code-options";
import { SettingsSection, SettingsToggle } from "./shared";
import { FontField } from "../fonts/font-field";
import { Select } from "../../components/ui/select";
import { ContentMarkup } from "../../components/content-markup";
import { CodePreferencesProvider } from "../../components/code-preferences";
import styles from "./code-settings.module.css";
const preview = renderContent({
  id: "code-theme-preview",
  media_urls: {},
  content: [
    {
      id: "code",
      type: "html",
      content: codeHtml(
        'interface Message {\n  title: string;\n}\nconst message: Message = { title: "Hello" };\nconsole.log(message.title);\n// A long line keeps its original source when wrapping is enabled.\nexport { message };',
        "typescript",
        { title: "example.ts", mark: "4" },
      ),
    },
  ],
});
export function CodeSettingsSection({
  value,
  onChange,
}: {
  value: CodePreferences;
  onChange: (value: CodePreferences) => void;
}) {
  const id = useId(),
    fonts = useFontLibrary();
  const update = (patch: Partial<CodePreferences>) =>
    onChange({ ...value, ...patch });
  const numeric = (
    key: "font_size" | "line_height" | "tab_size" | "collapse_lines",
    label: string,
    fallback: number,
    choices: number[],
    suffix = "",
  ) => {
    const selected = value[key] ?? fallback;
    return (
      <label>
        <span>{label}</span>
        <Select
          name={id + key}
          label={label}
          value={String(selected)}
          options={[...new Set([...choices, selected])]
            .sort((a, b) => a - b)
            .map((n) => ({
              value: String(n),
              label:
                n === 0 && key === "collapse_lines"
                  ? "不折叠"
                  : String(n) + suffix,
            }))}
          onValueChange={(n) => update({ [key]: Number(n) })}
        />
      </label>
    );
  };
  return (
    <SettingsSection
      id="settings-code"
      title="代码块"
      description="文章、说说及预览共用这些默认值，单个代码块可以单独覆盖。"
    >
      <div className={styles.grid}>
        <label>
          <span>
            <UiText text="浅色配色" />
          </span>
          <Select
            programOptions
            name={id + "light"}
            label="代码块浅色配色"
            value={value.light_scheme ?? "paper"}
            options={[
              { value: "paper", label: "纸白" },
              { value: "github", label: "GitHub Light" },
            ]}
            onValueChange={(v) =>
              update({ light_scheme: v as CodePreferences["light_scheme"] })
            }
          />
        </label>
        <label>
          <span>
            <UiText text="深色配色" />
          </span>
          <Select
            programOptions
            name={id + "dark"}
            label="代码块深色配色"
            value={value.dark_scheme ?? "slate"}
            options={[
              { value: "slate", label: "岩灰" },
              { value: "github", label: "GitHub Dark" },
            ]}
            onValueChange={(v) =>
              update({ dark_scheme: v as CodePreferences["dark_scheme"] })
            }
          />
        </label>
        {numeric(
          "font_size",
          "代码字号",
          13,
          [11, 12, 13, 14, 15, 16, 18, 20],
          " px",
        )}
        {numeric(
          "line_height",
          "代码行高",
          1.7,
          [1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2, 2.2],
        )}
        {numeric("tab_size", "制表宽度", 4, [2, 4, 8], " 格")}
        {numeric(
          "collapse_lines",
          "默认折叠行数",
          18,
          [0, 10, 18, 24, 30, 50, 100, 200],
          " 行",
        )}
      </div>
      <div className="admin-settings-field">
        <label>
          <UiText text="代码字体" />
        </label>
        <FontField
          value={value.font_media_id ?? ""}
          fonts={fonts.items}
          label="代码字体"
          onChange={(font_media_id, font) =>
            update({
              font_media_id,
              font_url: font?.url ?? "",
              font_info: font?.info ?? null,
            })
          }
        />
        <small>
          <UiText text="默认使用系统等宽字体。自定义字体仅在正文含有代码块时声明，使用时加载。" />
        </small>
      </div>
      <SettingsToggle
        label="默认显示行号"
        hint="自动换行时，行号仍与原代码行对齐。"
        value={value.line_numbers ?? true}
        onChange={(line_numbers) => update({ line_numbers })}
      />
      <SettingsToggle
        label="默认自动换行"
        hint="关闭后使用代码框内的横向滚动，读者仍可临时切换。"
        value={value.wrap ?? false}
        onChange={(wrap) => update({ wrap })}
      />
      <CodePreferencesProvider value={value}>
        <ContentMarkup
          className={styles.preview}
          html={preview.html}
          features={preview.features}
        />
      </CodePreferencesProvider>
    </SettingsSection>
  );
}
