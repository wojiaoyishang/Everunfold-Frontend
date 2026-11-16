"use client";

import type { DraftFields } from "@/core/contracts/content-admin";
import {
  articleScene,
  draftAuthoringSource,
} from "@/core/forms/authoring-source";
import { UiText, useT } from "@/core/i18n/provider";
import { Switch } from "../../components/ui/switch";
import { AuthoringField } from "../components/authoring-field";
import styles from "./editor-workspace.module.css";

export function DraftExcerptField({
  type,
  fields,
  onChange,
  disabled,
  language,
  id,
}: {
  type: string;
  fields: DraftFields;
  onChange: (fields: DraftFields) => void;
  disabled: boolean;
  language?: string;
  id?: string;
}) {
  const t = useT();
  return (
    <AuthoringField
      className={`admin-field ${styles.excerpt}`}
      binding={
        type === "article" && language
          ? {
              scene: articleScene,
              field: "excerpt",
              resourceKey: `${id ?? "new"}:${language}`,
              source: () => ({
                ...draftAuthoringSource(fields, language, id),
                summary: undefined,
              }),
            }
          : undefined
      }
      label="摘要"
      labelAside={
        <small>
          <UiText text="（可选）" />
        </small>
      }
      labelControl={
        type === "article" && (
          <span className={styles.excerptToggle}>
            <span aria-hidden="true">
              <UiText text="启用空摘要" />
            </span>
            <Switch
              aria-label={t("启用空摘要")}
              checked={fields.settings?.hide_card_excerpt === true}
              disabled={disabled}
              onCheckedChange={(hide_card_excerpt) =>
                onChange({
                  ...fields,
                  settings: { ...fields.settings, hide_card_excerpt },
                })
              }
            />
          </span>
        )
      }
      value={fields.excerpt ?? ""}
      rows={3}
      maxLength={1000}
      disabled={disabled}
      placeholder="留空时从正文生成摘要"
      onChange={(excerpt) => onChange({ ...fields, excerpt })}
    />
  );
}
