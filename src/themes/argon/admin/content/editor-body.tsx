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
import { Button, TextArea } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { ConfirmPopover } from "../../components/ui/confirm-popover";
import { Icon } from "../../components/icon";
import { EditorMediaDialog } from "./editor-media-dialog";
import { blockEditors, RegisteredBlockEditor } from "./plugins/registry";
import type { CodeEditorHandle } from "../../components/ui/code-editor";
import { useBlockCollaboration } from "@/core/collaboration/context";
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
  const [mediaTarget, setMediaTarget] = useState<{
    id: string;
    insert: (value: string) => void;
  } | null>(null);
  const inputs = useRef(new Map<string, CodeEditorHandle>());
  const [moved, setMoved] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  return (
    <fieldset className={styles.bodyFields} disabled={disabled}>
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
                options={blockEditors.entries.map((p) => ({
                  value: p.format,
                  label: p.label,
                }))}
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
                <ConfirmPopover
                  triggerClassName="admin-icon-button"
                  label={`删除第 ${index + 1} 块`}
                  title="删除这个正文块？"
                  description="从草稿中移除，可以通过撤销恢复。"
                  disabled={disabled || value.body.length === 1}
                  onConfirmed={() => {
                    if (disabled || value.body.length === 1) return;
                    onChange({
                      ...value,
                      body: value.body.filter((part) => part.id !== block.id),
                    });
                    setAnnouncement(`已删除第 ${index + 1} 块`);
                    const neighbor =
                      value.body[index + 1] ?? value.body[index - 1];
                    requestAnimationFrame(() =>
                      inputs.current.get(neighbor.id)?.focus(),
                    );
                  }}
                >
                  <Icon name="trash" />
                </ConfirmPopover>
              </div>
            </header>
            <CollaborativeBlock
              id={block.id}
              format={block.type ?? "markdown"}
              editorRef={(node) => {
                if (node) inputs.current.set(block.id, node);
                else inputs.current.delete(block.id);
              }}
              label={`正文块 ${index + 1} 内容`}
              value={block.content}
              disabled={disabled}
              onChange={(content) =>
                onChange({
                  ...value,
                  body: value.body.map((part) =>
                    part.id === block.id ? { ...part, content } : part,
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
                    insert: node?.captureInsertion() ?? (() => {}),
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
      {mediaTarget && (
        <EditorMediaDialog
          onClose={() => setMediaTarget(null)}
          onPick={(item) => {
            if (disabled) return;
            onMedia(item);
            const target = value.body.find(
              (block) => block.id === mediaTarget.id,
            );
            if (target)
              mediaTarget.insert(`\n${mediaMarkup(item, target.type)}\n`);
          }}
        />
      )}
    </fieldset>
  );
}

function CollaborativeBlock({
  id,
  ...props
}: React.ComponentProps<typeof RegisteredBlockEditor> & { id: string }) {
  const shared = useBlockCollaboration(id);
  return <RegisteredBlockEditor {...props} shared={shared} />;
}
