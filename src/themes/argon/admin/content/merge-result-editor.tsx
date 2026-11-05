"use client";
import { useRef, useState } from "react";
import type { DraftFields, MediaURL } from "@/generated/content-admin-contract";
import type { MediaItem } from "@/generated/settings-contract";
import { TextArea, TextField } from "../../components/ui/primitives";
import { RegisteredBlockEditor } from "./plugins/registry";
import { ShortcodePicker } from "../shortcodes/picker";
import { useToast } from "../../components/ui/toast/toast-provider";
import type {
  CapturedInsertion,
  CodeEditorHandle,
} from "../../components/ui/code-editor";
import styles from "./versions.module.css";

function ResultBlock({
  block,
  index,
  onChange,
  media,
  disabled,
  onMedia,
}: {
  block: DraftFields["body"][number];
  index: number;
  onChange: (content: string) => void;
  media: Record<string, MediaURL>;
  disabled: boolean;
  onMedia: (item: MediaItem) => void;
}) {
  const [controls, setControls] = useState<HTMLDivElement | null>(null);
  const input = useRef<CodeEditorHandle | null>(null);
  const [target, setTarget] = useState<{ insert: CapturedInsertion } | null>(
    null,
  );
  const toast = useToast();
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
        editorRef={input}
        format={block.type ?? "markdown"}
        value={block.content}
        label={`合并结果区块 ${index + 1}`}
        disabled={disabled}
        onChange={onChange}
        modeControls={controls}
        media={media}
        onShortcode={() => {
          const insert = input.current?.captureInsertion();
          if (insert && !disabled) setTarget({ insert });
        }}
      />
      {target && (
        <ShortcodePicker
          format={block.type ?? "markdown"}
          media={media}
          onMedia={onMedia}
          onClose={() => {
            target.insert.dispose?.();
            setTarget(null);
          }}
          onPick={(source) => {
            if (disabled) return;
            if (target.insert(source) === false)
              toast.show({
                id: "merge:shortcode-insertion",
                title: "区块内容已变化，请重新选择插入位置。",
                tone: "info",
              });
          }}
        />
      )}
    </section>
  );
}

export function MergeResultEditor({
  fields,
  onChange,
  media,
  disabled,
  onMedia,
}: {
  fields: DraftFields;
  onChange: (fields: DraftFields) => void;
  media: Record<string, MediaURL>;
  disabled: boolean;
  onMedia: (item: MediaItem) => void;
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
          onMedia={onMedia}
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
