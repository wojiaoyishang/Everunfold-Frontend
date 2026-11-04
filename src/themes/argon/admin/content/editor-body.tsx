"use client";
import { useRef, useState } from "react";
import type {
  ContentTypeDefinition,
  DraftFields,
} from "@/generated/content-admin-contract";
import type { MediaItem } from "@/generated/settings-contract";
import { mediaMarkup } from "@/core/content-management/editor-fields";
import { Button, TextArea } from "../../components/ui/primitives";
import { BlockFrame, BlockPosition } from "./block-frame";
import { useBlockComposer } from "./block-composer";
import { Icon } from "../../components/icon";
import { EditorMediaDialog } from "./editor-media-dialog";
import { RegisteredBlockEditor } from "./plugins/registry";
import type { CodeEditorHandle } from "../../components/ui/code-editor";
import type { MediaURL } from "@/generated/content-admin-contract";
import styles from "./editor-workspace.module.css";
export interface EditorProps {
  type: ContentTypeDefinition;
  value: DraftFields;
  onChange: (value: DraftFields) => void;
  disabled: boolean;
  onMedia: (item: MediaItem) => void;
  media?: Record<string, MediaURL>;
  onBlockChange: (id: string, content: string, previous: string) => void;
  stagedBlocks: string[];
  locked: (id: string) => boolean;
}
export function EditorBody({
  type,
  value,
  onChange,
  disabled,
  onMedia,
  media,
  onBlockChange,
  stagedBlocks,
  locked,
}: EditorProps) {
  const [mediaTarget, setMediaTarget] = useState<{
    id: string;
    insert: (value: string) => void;
  } | null>(null);
  const inputs = useRef(new Map<string, CodeEditorHandle>());
  const composer = useBlockComposer();
  const [announcement, setAnnouncement] = useState("");
  return (
    <fieldset className={styles.bodyFields} disabled={disabled}>
      <div className={styles.blockList}>
        {value.body.map((block, index) => (
          <BlockFrame
            key={block.id}
            block={block}
            index={index}
            disabled={locked(block.id)}
            formatDisabled={stagedBlocks.includes(block.id)}
            onFormat={(format) =>
              onChange({
                ...value,
                body: value.body.map((b) =>
                  b.id === block.id ? { ...b, type: format } : b,
                ),
              })
            }
            onDelete={() => {
              onChange({
                ...value,
                body: value.body.filter((b) => b.id !== block.id),
              });
              setAnnouncement(`已删除第 ${index + 1} 块`);
              const neighbor = value.body[index + 1] ?? value.body[index - 1];
              requestAnimationFrame(() =>
                inputs.current.get(neighbor.id)?.focus(),
              );
            }}
          >
            {(modeControls) => (
              <>
                <RegisteredBlockEditor
                  modeControls={modeControls}
                  format={block.type ?? "markdown"}
                  editorRef={(node) => {
                    if (node) {
                      inputs.current.set(block.id, node);
                      if (composer.focus.current === block.id) {
                        composer.focus.current = null;
                        requestAnimationFrame(() => node.focus());
                      }
                    } else inputs.current.delete(block.id);
                  }}
                  label={`正文块 ${index + 1} 内容`}
                  value={block.content}
                  media={media}
                  disabled={disabled || locked(block.id)}
                  onChange={(content, previous) =>
                    onBlockChange(block.id, content, previous)
                  }
                />
                <footer className={styles.blockFooter}>
                  <Button
                    disabled={disabled || locked(block.id)}
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
              </>
            )}
          </BlockFrame>
        ))}
        <BlockPosition end />
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
