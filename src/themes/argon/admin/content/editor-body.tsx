"use client";
import { useRef, useState } from "react";
import type {
  ContentTypeDefinition,
  DraftFields,
} from "@/generated/content-admin-contract";
import type { MediaItem } from "@/generated/settings-contract";
import {
  mediaMarkup,
  moveBlock,
} from "@/core/content-management/editor-fields";
import { Button, TextArea, TextField } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Icon } from "../../components/icon";
import { EditorMediaDialog } from "./editor-media-dialog";
import styles from "./editor-workspace.module.css";
export interface EditorProps {
  type: ContentTypeDefinition;
  value: DraftFields;
  onChange: (value: DraftFields) => void;
  disabled: boolean;
  onMedia: (item: MediaItem) => void;
}
export function EditorBody({
  type,
  value,
  onChange,
  disabled,
  onMedia,
}: EditorProps) {
  const [remove, setRemove] = useState<string | null>(null);
  const [mediaTarget, setMediaTarget] = useState<{
    id: string;
    start: number;
    end: number;
  } | null>(null);
  const inputs = useRef(new Map<string, HTMLTextAreaElement>());
  const [moved, setMoved] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  return (
    <fieldset className={styles.bodyFields} disabled={disabled}>
      <label className={`admin-field ${styles.title}`}>
        <span>标题{!type.title_required && <small>（可选）</small>}</span>
        <TextField
          value={value.title ?? ""}
          maxLength={200}
          placeholder={
            type.title_required
              ? "给这篇文章起个标题"
              : "记录此刻，也可以不写标题"
          }
          onChange={(event) =>
            onChange({ ...value, title: event.target.value })
          }
        />
      </label>
      <div className={styles.blockList}>
        {value.body.map((block, index) => (
          <section
            key={block.id}
            className={styles.block}
            data-moved={moved === block.id}
            onAnimationEnd={() => setMoved(null)}
            aria-label={`正文块 ${index + 1}`}
          >
            <header className={styles.blockToolbar}>
              <span className={styles.blockNumber}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <Select
                name={`format-${block.id}`}
                label={`正文块 ${index + 1} 格式`}
                value={block.type ?? "markdown"}
                disabled={disabled}
                options={[
                  { value: "markdown", label: "Markdown" },
                  { value: "html", label: "HTML" },
                ]}
                onValueChange={(format) =>
                  onChange({
                    ...value,
                    body: value.body.map((part) =>
                      part.id === block.id
                        ? { ...part, type: format as "markdown" | "html" }
                        : part,
                    ),
                  })
                }
              />
              <div className={styles.blockTools}>
                <Button
                  className="admin-icon-button"
                  aria-label={`向上移动第 ${index + 1} 块`}
                  disabled={disabled || index === 0}
                  onClick={() => {
                    onChange({
                      ...value,
                      body: moveBlock(value.body, block.id, -1),
                    });
                    setMoved(block.id);
                    setAnnouncement(`已移动到第 ${index} 块`);
                  }}
                >
                  <Icon name="up" />
                </Button>
                <Button
                  className="admin-icon-button"
                  aria-label={`向下移动第 ${index + 1} 块`}
                  disabled={disabled || index === value.body.length - 1}
                  onClick={() => {
                    onChange({
                      ...value,
                      body: moveBlock(value.body, block.id, 1),
                    });
                    setMoved(block.id);
                    setAnnouncement(`已移动到第 ${index + 2} 块`);
                  }}
                >
                  <Icon name="down" />
                </Button>
                <Button
                  className="admin-icon-button"
                  aria-label={`删除第 ${index + 1} 块`}
                  disabled={disabled || value.body.length === 1}
                  onClick={() => setRemove(block.id)}
                >
                  <Icon name="trash" />
                </Button>
              </div>
            </header>
            <TextArea
              ref={(node) => {
                if (node) inputs.current.set(block.id, node);
                else inputs.current.delete(block.id);
              }}
              aria-label={`正文块 ${index + 1} 内容`}
              value={block.content}
              rows={index === 0 ? 12 : 6}
              maxLength={100000}
              spellCheck={false}
              placeholder={
                block.type === "html"
                  ? "<p>从这里开始写…</p>"
                  : "从这里开始写，支持 Markdown…"
              }
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
            <footer className={styles.blockFooter}>
              <Button
                disabled={disabled}
                onClick={() => {
                  const node = inputs.current.get(block.id);
                  setMediaTarget({
                    id: block.id,
                    start: node?.selectionStart ?? block.content.length,
                    end: node?.selectionEnd ?? block.content.length,
                  });
                }}
              >
                <Icon name="image" /> 插入媒体
              </Button>
              <small>{block.content.length.toLocaleString()} 字符</small>
            </footer>
          </section>
        ))}
        <Button
          className={styles.addBlock}
          disabled={disabled || value.body.length >= 128}
          onClick={() => {
            const id = crypto.randomUUID();
            onChange({
              ...value,
              body: [...value.body, { id, type: "markdown", content: "" }],
            });
            setAnnouncement("已添加正文块");
            requestAnimationFrame(() => inputs.current.get(id)?.focus());
          }}
        >
          <Icon name="plus" /> 添加正文块
        </Button>
      </div>
      {type.supports_excerpt && (
        <label className={`admin-field ${styles.excerpt}`}>
          <span>
            摘要 <small>（可选）</small>
          </span>
          <TextArea
            value={value.excerpt ?? ""}
            rows={3}
            maxLength={1000}
            placeholder="留空时从正文生成摘要"
            onChange={(event) =>
              onChange({ ...value, excerpt: event.target.value })
            }
          />
        </label>
      )}
      <span role="status" className="sr-only">
        {announcement}
      </span>
      <ConfirmDialog
        open={remove !== null}
        title="删除这个正文块？"
        description="这个块的内容将从草稿中移除，保存后生效。"
        icon="trash"
        confirmLabel="删除正文块"
        onCancel={() => setRemove(null)}
        onConfirm={() => true}
        onConfirmed={() => {
          if (!disabled && value.body.length > 1)
            onChange({
              ...value,
              body: value.body.filter((block) => block.id !== remove),
            });
          setRemove(null);
        }}
      />
      {mediaTarget && (
        <EditorMediaDialog
          onClose={() => setMediaTarget(null)}
          onPick={(item) => {
            if (disabled) return;
            onMedia(item);
            onChange({
              ...value,
              body: value.body.map((block) => {
                if (block.id !== mediaTarget.id) return block;
                return {
                  ...block,
                  content:
                    block.content.slice(0, mediaTarget.start) +
                    `\n${mediaMarkup(item, block.type)}\n` +
                    block.content.slice(mediaTarget.end),
                };
              }),
            });
          }}
        />
      )}
    </fieldset>
  );
}
