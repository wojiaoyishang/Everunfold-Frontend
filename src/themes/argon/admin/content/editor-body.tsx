"use client";
import { useRef, useState } from "react";
import type {
  ContentTypeDefinition,
  DraftFields,
} from "@/generated/content-admin-contract";
import type { MediaItem } from "@/generated/settings-contract";
import type { InlineImageUploads } from "@/core/content-management/use-inline-image-uploads";
import { uploadMarkers } from "@/core/editor/upload-placeholders";
import { mediaMarkup } from "@/core/content-management/editor-fields";
import { Button, TextArea } from "../../components/ui/primitives";
import { BlockFrame, BlockPosition } from "./block-frame";
import { useBlockComposer } from "./block-composer";
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
  uploads: InlineImageUploads;
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
  uploads,
}: EditorProps) {
  const [mediaTarget, setMediaTarget] = useState<{
    id: string;
    kind: "all" | "image";
    insert: (value: string) => void;
  } | null>(null);
  const inputs = useRef(new Map<string, CodeEditorHandle>());
  const composer = useBlockComposer();
  const [announcement, setAnnouncement] = useState("");
  return (
    <fieldset
      className={styles.bodyFields}
      disabled={disabled}
      onPasteCapture={(event) => {
        if (disabled || !(event.target instanceof Element)) return;
        const blockId = event.target
          .closest("[data-block-id]")
          ?.getAttribute("data-block-id");
        if (
          !blockId ||
          !event.target.closest('[contenteditable="true"]') ||
          locked(blockId)
        )
          return;
        const files = Array.from(event.clipboardData.files).filter((file) =>
          file.type.startsWith("image/"),
        );
        const insert = inputs.current.get(blockId)?.captureInsertion();
        if (!files.length || !insert) return;
        event.preventDefault();
        event.stopPropagation();
        uploads.add(files, blockId, insert);
      }}
    >
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
                  onMedia={(kind) =>
                    setMediaTarget({
                      id: block.id,
                      kind,
                      insert:
                        inputs.current.get(block.id)?.captureInsertion() ??
                        (() => {}),
                    })
                  }
                  onUpload={(files) => {
                    const insert = inputs.current
                      .get(block.id)
                      ?.captureInsertion();
                    if (insert) uploads.add(files, block.id, insert);
                  }}
                  uploadEntries={uploads.items(block.id)}
                  uploadStatus={
                    <>
                      {uploadMarkers(block.content).some(
                        (marker) =>
                          !uploads
                            .items(block.id)
                            .some((entry) => entry.id === marker.id),
                      ) && (
                        <div className={styles.uploadRecovery} role="status">
                          <span>图片上传已中断，请重新粘贴或选择图片。</span>
                          <Button
                            onClick={() =>
                              uploadMarkers(block.content).forEach((marker) =>
                                uploads.remove(marker.id, block.id),
                              )
                            }
                          >
                            移除上传占位
                          </Button>
                        </div>
                      )}
                    </>
                  }
                  disabled={disabled || locked(block.id)}
                  onChange={(content, previous) =>
                    onBlockChange(block.id, content, previous)
                  }
                />
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
          kind={mediaTarget.kind}
          title={mediaTarget.kind === "image" ? "插入图片" : "插入媒体"}
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
