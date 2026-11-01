"use client";
import { useRef, useState } from "react";
import { useMediaAttachment } from "@/core/media/media-attachment";
import { formatBytes } from "@/core/media/image-editor";
import type { MediaDetails, MediaItem } from "@/generated/settings-contract";
import {
  Button,
  TextArea,
  TextField,
  TextLink,
} from "../../components/ui/primitives";
import { Modal } from "../../components/ui/modal";
import { Icon } from "../../components/icon";
import { MediaPreview } from "./media-preview";
import { MediaImageEditor } from "./image-editor";
export function MediaDetailsDialog({
  item,
  previous,
  next,
  onClose,
  onNavigate,
  onChanged,
}: {
  item: MediaItem;
  previous?: MediaItem;
  next?: MediaItem;
  onClose: () => void;
  onNavigate: (item: MediaItem) => void;
  onChanged: (item: MediaDetails, created: boolean) => void;
}) {
  const attachment = useMediaAttachment(item.id);
  const { detail, draft, loading, busy, error, notice } = attachment;
  const [editing, setEditing] = useState(false);
  const [editDirty, setEditDirty] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const pending = useRef<(() => void) | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const attempt = (action: () => void) => {
    if (busy) return;
    if (attachment.dirty || editDirty) {
      pending.current = action;
      setConfirm(true);
    } else action();
  };
  const info = detail ?? item;
  return (
    <Modal
      title={editing ? "编辑图片" : "附件详情"}
      className="admin-media-modal"
      closeLabel="关闭附件详情"
      onClose={() => attempt(onClose)}
    >
      {confirm && (
        <div className="admin-media-confirm" role="alert">
          <span>有尚未保存的修改，要放弃这些修改吗？</span>
          <Button
            className="admin-button"
            onClick={() => {
              setConfirm(false);
              pending.current = null;
            }}
          >
            继续编辑
          </Button>
          <Button
            className="admin-button"
            onClick={() => {
              setConfirm(false);
              setEditDirty(false);
              pending.current?.();
              pending.current = null;
            }}
          >
            放弃修改
          </Button>
        </div>
      )}
      {error && (
        <div className="admin-media-message" role="alert">
          {error}
          {!editing && (
            <Button
              className="admin-button"
              disabled={busy || loading}
              onClick={() => attempt(attachment.reload)}
            >
              重新读取
            </Button>
          )}
        </div>
      )}
      {editing && detail ? (
        <MediaImageEditor
          detail={detail}
          busy={busy}
          onDirty={setEditDirty}
          onBack={() =>
            attempt(() => {
              setEditing(false);
              setEditDirty(false);
            })
          }
          onSave={async (recipe) => {
            const result = await attachment.edit(recipe);
            if (result) {
              setEditDirty(false);
              onChanged(result, true);
            }
          }}
        />
      ) : (
        <>
          <div className="admin-media-dialog-navigation">
            <span>{info.title || info.label}</span>
            <div>
              <Button
                className="admin-icon-button"
                aria-label="上一附件"
                disabled={!previous || busy}
                onClick={() => previous && attempt(() => onNavigate(previous))}
              >
                <Icon name="chevron-left" />
              </Button>
              <Button
                className="admin-icon-button"
                aria-label="下一附件"
                disabled={!next || busy}
                onClick={() => next && attempt(() => onNavigate(next))}
              >
                <Icon name="chevron" />
              </Button>
            </div>
          </div>
          <div className="admin-media-detail-layout" aria-busy={loading}>
            <section
              className="admin-media-detail-visual"
              aria-label="附件预览"
            >
              <div className="admin-media-detail-stage">
                <MediaPreview
                  url={info.url}
                  kind={info.kind}
                  label={info.title || info.label}
                  playable
                />
              </div>
              <div className="admin-media-preview-actions">
                {detail?.editable && (
                  <Button
                    className="admin-button"
                    disabled={busy || attachment.dirty}
                    title={attachment.dirty ? "请先保存资料" : "编辑图片"}
                    onClick={() => setEditing(true)}
                  >
                    <Icon name="crop" />
                    编辑图片
                  </Button>
                )}
                <TextLink
                  className="admin-button"
                  href={info.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="external" />
                  查看原文件
                </TextLink>
              </div>
              {detail?.source_id && (
                <p className="admin-media-source">
                  <Icon name="copy" />
                  由原图编辑生成，原文件已保留。
                </p>
              )}
              {detail && !detail.editable && (
                <p className="admin-media-source">
                  {info.kind === "video"
                    ? "视频支持预览与资料编辑。"
                    : "此文件支持预览与资料编辑，暂不支持像素处理。"}
                </p>
              )}
            </section>
            <section className="admin-media-detail-info" aria-label="附件资料">
              <div className="admin-media-file-heading">
                <span className="admin-badge">
                  {info.kind === "video" ? "视频" : "图片"}
                </span>
                <strong>{info.label}</strong>
              </div>
              <dl className="admin-media-facts">
                <div>
                  <dt>文件类型</dt>
                  <dd>{info.mime}</dd>
                </div>
                <div>
                  <dt>文件大小</dt>
                  <dd>{formatBytes(info.size)}</dd>
                </div>
                {detail?.width && detail.height && (
                  <div>
                    <dt>尺寸</dt>
                    <dd>
                      {detail.width} × {detail.height} px
                    </dd>
                  </div>
                )}
                <div>
                  <dt>上传时间</dt>
                  <dd>
                    {new Date(info.created_at).toLocaleDateString("zh-CN")}
                  </dd>
                </div>
                {detail && (
                  <div>
                    <dt>上传者</dt>
                    <dd>{detail.uploader}</dd>
                  </div>
                )}
              </dl>
              {loading ? (
                <p role="status">正在读取附件资料…</p>
              ) : (
                draft && (
                  <div className="admin-media-metadata-fields">
                    <label className="admin-media-label">
                      标题
                      <TextField
                        value={draft.title ?? ""}
                        maxLength={160}
                        disabled={busy}
                        placeholder={info.label}
                        onChange={(event) =>
                          attachment.setDraft({
                            ...draft,
                            title: event.target.value,
                          })
                        }
                      />
                    </label>
                    {info.kind === "image" && (
                      <label className="admin-media-label">
                        替代文本
                        <TextField
                          aria-label="替代文本"
                          value={draft.alt_text ?? ""}
                          maxLength={1000}
                          disabled={busy}
                          onChange={(event) =>
                            attachment.setDraft({
                              ...draft,
                              alt_text: event.target.value,
                            })
                          }
                        />
                        <small>
                          描述图片内容，帮助读屏用户理解；装饰图片可留空。
                        </small>
                      </label>
                    )}
                    <label className="admin-media-label">
                      {info.kind === "image" ? "图片说明" : "说明"}
                      <TextArea
                        rows={2}
                        value={draft.caption ?? ""}
                        maxLength={2000}
                        disabled={busy}
                        onChange={(event) =>
                          attachment.setDraft({
                            ...draft,
                            caption: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="admin-media-label">
                      描述
                      <TextArea
                        rows={3}
                        value={draft.description ?? ""}
                        maxLength={10000}
                        disabled={busy}
                        onChange={(event) =>
                          attachment.setDraft({
                            ...draft,
                            description: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                )
              )}
              <label className="admin-media-label admin-media-url">
                文件地址
                <div>
                  <TextField
                    readOnly
                    value={info.url}
                    aria-label="附件文件地址"
                  />
                  <Button
                    className="admin-icon-button"
                    aria-label="复制文件地址"
                    title="复制地址"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(info.url);
                        setCopyStatus("地址已复制");
                      } catch {
                        setCopyStatus("复制失败，请从输入框手动复制");
                      }
                    }}
                  >
                    <Icon name="copy" />
                  </Button>
                </div>
              </label>
              <span className="admin-media-copy-status" role="status">
                {copyStatus}
              </span>
            </section>
          </div>
          <div className="admin-media-dialog-footer">
            <span role="status">
              {busy
                ? "正在保存…"
                : attachment.dirty
                  ? "有未保存的修改"
                  : notice || "修改资料后点击保存"}
            </span>
            <Button
              className="admin-button admin-button-primary"
              disabled={busy || loading || !attachment.dirty}
              onClick={async () => {
                const result = await attachment.save();
                if (result) onChanged(result, false);
              }}
            >
              <Icon name="check" />
              保存资料
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
