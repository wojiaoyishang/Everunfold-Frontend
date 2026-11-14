"use client";
import { UiText } from "@/core/i18n/provider";

import { useEffect, useRef, useState } from "react";
import type {
  ContentTypeDefinition,
  DraftFields,
} from "@/core/contracts/content-admin";
import type { MediaItem } from "@/core/contracts/settings";
import type { InlineImageUploads } from "@/core/content-management/use-inline-image-uploads";
import { uploadMarkers } from "@/core/editor/upload-placeholders";
import { mediaMarkup } from "@/core/content-management/editor-fields";
import { Button } from "../../components/ui/primitives";
import { BlockFrame, BlockPosition } from "./block-frame";
import { useBlockComposer } from "./block-composer";
import { EditorMediaDialog } from "./editor-media-dialog";
import { RegisteredBlockEditor } from "./plugins/registry";
import { ShortcodePicker } from "../shortcodes/picker";
import { useToast } from "../../components/ui/toast/toast-provider";
import type {
  CodeEditorHandle,
  CapturedInsertion,
} from "../../components/ui/code-editor";
import type { MediaURL } from "@/core/contracts/content-admin";
import styles from "./editor-workspace.module.css";
import type { DraftSession } from "@/core/collaboration/session";
import { AuthoringField } from "../components/authoring-field";
import {
  articleScene,
  draftAuthoringSource,
} from "@/core/forms/authoring-source";

export interface EditorProps {
  authoringLanguage?: string;
  authoringId?: string;
  session?: DraftSession | null;
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
  session,
  authoringLanguage,
  authoringId,
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
    kind: "all" | "image" | "video";
    insert: CapturedInsertion;
  } | null>(null);
  const inputs = useRef(new Map<string, CodeEditorHandle>());
  const [shortcodeTarget, setShortcodeTarget] = useState<{
    id: string;
    insert: CapturedInsertion;
  } | null>(null);
  const composer = useBlockComposer();
  const [announcement, setAnnouncement] = useState("");
  const toast = useToast();
  useEffect(() => {
    if (!session) return;
    return session.registerLocator((range) => {
      const input = inputs.current.get(range.blockId);
      const block = document.querySelector<HTMLElement>(
        `[data-block-id="${CSS.escape(range.blockId)}"]`,
      );
      if (!input || !block) return false;
      block.scrollIntoView({ block: "center", behavior: "instant" });
      requestAnimationFrame(() => input.reveal?.(range));
      block.dataset.collabLocated = "true";
      setTimeout(() => delete block.dataset.collabLocated, 1600);
      setAnnouncement("已定位到协作者的光标，当前插入点已保留。");
      return true;
    });
  }, [session]);
  const insertCaptured = (insert: CapturedInsertion, source: string) => {
    if (insert(source) !== false) return true;
    toast.show({
      id: "content:insertion",
      title: "区块内容已变化，请重新选择插入位置。",
      tone: "info",
    });
    return false;
  };
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
        if (!files.length) return;
        const insert = inputs.current.get(blockId)?.captureInsertion();
        if (!insert) return;
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
                  shared={session?.binding(block.id)}
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
                  onShortcode={() =>
                    setShortcodeTarget({
                      id: block.id,
                      insert:
                        inputs.current.get(block.id)?.captureInsertion() ??
                        (() => {}),
                    })
                  }
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
                          <span>
                            <UiText text="图片上传已中断，请重新粘贴或选择图片。" />
                          </span>
                          <Button
                            onClick={() =>
                              uploadMarkers(block.content).forEach((marker) =>
                                uploads.remove(marker.id, block.id),
                              )
                            }
                          >
                            <UiText text="移除上传占位" />
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
        <AuthoringField
          className={`admin-field ${styles.excerpt}`}
          binding={
            type.id === "article" && authoringLanguage
              ? {
                  scene: articleScene,
                  field: "excerpt",
                  resourceKey: `${authoringId ?? "new"}:${authoringLanguage}`,
                  source: () => ({
                    ...draftAuthoringSource(
                      value,
                      authoringLanguage,
                      authoringId,
                    ),
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
          value={value.excerpt ?? ""}
          rows={3}
          maxLength={1000}
          disabled={disabled}
          placeholder="留空时从正文生成摘要"
          onChange={(excerpt) => onChange({ ...value, excerpt })}
        />
      )}
      <span role="status" className="sr-only">
        {announcement}
      </span>
      {mediaTarget && (
        <EditorMediaDialog
          kind={mediaTarget.kind}
          title={
            mediaTarget.kind === "image"
              ? "插入图片"
              : mediaTarget.kind === "video"
                ? "插入视频"
                : "插入媒体"
          }
          onClose={() => {
            mediaTarget.insert.dispose?.();
            setMediaTarget(null);
          }}
          onPick={(item) => {
            if (disabled || locked(mediaTarget.id)) return;
            onMedia(item);
            const target = value.body.find(
              (block) => block.id === mediaTarget.id,
            );
            if (target)
              insertCaptured(
                mediaTarget.insert,
                `\n${mediaMarkup(item, target.type)}\n`,
              );
          }}
        />
      )}
      {shortcodeTarget && (
        <ShortcodePicker
          format={
            value.body.find((block) => block.id === shortcodeTarget.id)?.type ??
            "markdown"
          }
          media={media}
          onMedia={onMedia}
          onClose={() => {
            shortcodeTarget.insert.dispose?.();
            setShortcodeTarget(null);
          }}
          onPick={(source) => {
            if (
              disabled ||
              locked(shortcodeTarget.id) ||
              !value.body.some((block) => block.id === shortcodeTarget.id)
            )
              return;
            if (insertCaptured(shortcodeTarget.insert, source))
              setAnnouncement("已在当前区块插入短代码");
          }}
        />
      )}
    </fieldset>
  );
}
