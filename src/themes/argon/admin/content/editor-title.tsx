"use client";

import { useLanguageCatalog } from "@/core/i18n/provider";
import type {
  ContentTypeDefinition,
  DraftFields,
  DraftDetail,
} from "@/core/contracts/content-admin";
import { titlePath } from "@/core/content-management/editor-fields";
import { EditorIdentity } from "../components/editor-identity";
import { PermalinkField } from "../components/permalink-field";

export function EditorTitle({
  type,
  fields,
  detail,
  onChange,
  disabled,
  language,
}: {
  type: ContentTypeDefinition;
  fields: DraftFields;
  detail: DraftDetail | null;
  onChange: (fields: DraftFields) => void;
  disabled: boolean;
  language?: string;
}) {
  const catalog = useLanguageCatalog();
  const generated = titlePath(fields.title ?? "");
  const prefix =
    catalog.languages.find(
      (item) => item.code === (language ?? catalog.default_code),
    )?.prefix ?? "";
  const path =
    fields.settings?.path ||
    detail?.public_path ||
    (generated ? prefix + generated : "");
  return (
    <EditorIdentity
      label={type.title_required ? "标题" : "标题（可选）"}
      placeholder={
        type.title_required ? "添加标题" : "为这则说说起个名字（可选）"
      }
      value={fields.title ?? ""}
      onChange={(title) => onChange({ ...fields, title })}
      disabled={disabled}
      permalink={
        <PermalinkField
          value={path}
          disabled={disabled}
          onChange={(input) =>
            onChange({
              ...fields,
              settings: { ...fields.settings, path: input || path },
            })
          }
        />
      }
    />
  );
}
