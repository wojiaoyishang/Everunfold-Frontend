"use client";
import type { ComponentType } from "react";
import type {
  ContentTypeDefinition,
  DraftFields,
} from "@/generated/content-admin-contract";
import { TextArea, TextField } from "../../components/ui/primitives";

interface EditorProps {
  type: ContentTypeDefinition;
  value: DraftFields;
  onChange: (value: DraftFields) => void;
  disabled: boolean;
}
function MarkdownFields({ type, value, onChange, disabled }: EditorProps) {
  return (
    <fieldset className="admin-draft-fields" disabled={disabled}>
      <label className="admin-field">
        <span>标题{!type.title_required && <small>（可选）</small>}</span>
        <TextField
          value={value.title ?? ""}
          maxLength={200}
          placeholder={
            type.title_required
              ? "给这篇文章起个标题"
              : "为这段日常起个名字，也可以留空"
          }
          onChange={(event) =>
            onChange({ ...value, title: event.target.value })
          }
        />
      </label>
      {type.supports_excerpt && (
        <label className="admin-field">
          <span>
            摘要 <small>（可选）</small>
          </span>
          <TextArea
            value={value.excerpt ?? ""}
            rows={2}
            maxLength={1000}
            placeholder="用一两句话介绍这篇文章"
            onChange={(event) =>
              onChange({ ...value, excerpt: event.target.value })
            }
          />
        </label>
      )}
      {value.body.map((block, index) => (
        <label className="admin-field" key={block.id}>
          <span>
            正文{value.body.length > 1 ? ` · ${index + 1}` : ""}{" "}
            <small>支持 Markdown</small>
          </span>
          <TextArea
            className="admin-draft-body-input"
            value={block.content}
            rows={type.supports_excerpt ? 12 : 8}
            maxLength={100000}
            placeholder="从这里开始写…"
            onChange={(event) =>
              onChange({
                ...value,
                body: value.body.map((part) =>
                  part.id === block.id
                    ? { ...part, content: event.target.value }
                    : part,
                ),
              })
            }
          />
        </label>
      ))}
    </fieldset>
  );
}

/** Explicit compiled adapters; a backend string never becomes executable code. */
export const contentEditors: Readonly<
  Record<string, ComponentType<EditorProps>>
> = Object.freeze({ "core.markdown": MarkdownFields });
