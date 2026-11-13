"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { PageValue } from "@/core/contracts/pages";
import { UiText, useT } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import { SettingsForm } from "@/core/forms/renderer";
import type { SettingsModel } from "@/core/forms/schema";
import styles from "./pages.module.css";

const SourceEditor = dynamic(() => import("./source-editor"), { ssr: false });

export function PageConfigurationEditor({
  model,
  value,
  source,
  error,
  onChange,
  onSourceChange,
  disabled,
}: {
  model: SettingsModel;
  value: NonNullable<PageValue["options"]>;
  source: string;
  error: string;
  onChange: (value: NonNullable<PageValue["options"]>) => void;
  onSourceChange: (source: string) => void;
  disabled: boolean;
}) {
  const t = useT();
  const [mode, setMode] = useState<"form" | "json">(
    model.fields.length ? "form" : "json",
  );
  return (
    <div className={styles.configuration}>
      {!!model.fields.length && (
        <nav className={styles.tabs} aria-label={t("页面配置编辑方式")}>
          <Button
            aria-pressed={mode === "form"}
            disabled={Boolean(error)}
            onClick={() => setMode("form")}
          >
            <UiText text="表单" />
          </Button>
          <Button
            aria-pressed={mode === "json"}
            onClick={() => setMode("json")}
          >
            <UiText text="JSON 配置" />
          </Button>
        </nav>
      )}
      {mode === "form" && model.fields.length ? (
        <SettingsForm
          model={model}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      ) : (
        <>
          <p className={styles.configurationHint}>
            <UiText text="支持任意 JSON 键值、嵌套对象和数组。配置会随页面应用后公开；表单未展示的字段也会保留。" />
          </p>
          <SourceEditor
            kind="json"
            value={source}
            onChange={onSourceChange}
            disabled={disabled}
          />
          {error && (
            <p className={styles.error} role="alert">
              <UiText text={error} />
            </p>
          )}
        </>
      )}
    </div>
  );
}
