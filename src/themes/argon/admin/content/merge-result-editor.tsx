"use client";
import { useState } from "react";
import type { DraftFields, MediaURL } from "@/generated/content-admin-contract";
import { TextArea, TextField } from "../../components/ui/primitives";
import { RegisteredBlockEditor } from "./plugins/registry";
import styles from "./versions.module.css";

function ResultBlock({
  block,
  index,
  onChange,
  media,
  disabled,
}: {
  block: DraftFields["body"][number];
  index: number;
  onChange: (content: string) => void;
  media: Record<string, MediaURL>;
  disabled: boolean;
}) {
  const [controls, setControls] = useState<HTMLDivElement | null>(null);
  return (
    <section className={styles.resultBlock}>
      <header>
        <strong>
          {block.type === "html" ? "HTML" : "Markdown"}{" "}
          {String(index + 1).padStart(2, "0")}
        </strong>
        <div ref={setControls} />
      </header>
      <RegisteredBlockEditor
        format={block.type ?? "markdown"}
        value={block.content}
        label={`合并结果区块 ${index + 1}`}
        disabled={disabled}
        onChange={onChange}
        modeControls={controls}
        media={media}
      />
    </section>
  );
}

export function MergeResultEditor({
  fields,
  onChange,
  media,
  disabled,
}: {
  fields: DraftFields;
  onChange: (fields: DraftFields) => void;
  media: Record<string, MediaURL>;
  disabled: boolean;
}) {
  return (
    <div className={styles.resultEditor}>
      <label className="admin-field">
        <span>标题</span>
        <TextField
          value={fields.title ?? ""}
          maxLength={200}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...fields, title: event.target.value })
          }
        />
      </label>
      {fields.body.map((block, index) => (
        <ResultBlock
          key={block.id}
          block={block}
          index={index}
          media={media}
          disabled={disabled}
          onChange={(content) =>
            onChange({
              ...fields,
              body: fields.body.map((part) =>
                part.id === block.id ? { ...part, content } : part,
              ),
            })
          }
        />
      ))}
      <label className="admin-field">
        <span>摘要</span>
        <TextArea
          value={fields.excerpt ?? ""}
          maxLength={1000}
          rows={3}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...fields, excerpt: event.target.value })
          }
        />
      </label>
    </div>
  );
}
