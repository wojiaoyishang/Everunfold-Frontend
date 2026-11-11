"use client";
import { UiText } from "@/core/i18n/provider";

import { useId, useState } from "react";
import { Button, TextField } from "../../components/ui/primitives";
import { Modal } from "../../components/ui/modal";
import { Icon } from "../../components/icon";
import { MediaPickerDialog } from "../media/media-picker-dialog";
import { MediaPreview } from "../media/media-preview";
import {
  parseSiteMediaReference,
  siteMediaReference,
} from "@/core/media/references";
/** Compact media field, shared by avatar, background image and background video. */
export function SettingsMediaField({
  label,
  hint,
  value,
  mediaId,
  kind,
  allowUrl = true,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  mediaId?: string;
  kind: "image" | "video";
  allowUrl?: boolean;
  onChange: (url: string, id: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const sourceKey = `${mediaId ?? ""}\n${value}`;
  const [local, setLocal] = useState<{
    sourceKey: string;
    text: string;
    previewUrl: string;
    invalidVirtual: boolean;
  } | null>(null);
  const current =
    local?.sourceKey === sourceKey
      ? local
      : {
          sourceKey,
          text: mediaId ? siteMediaReference(mediaId) : value,
          previewUrl: value,
          invalidVirtual: false,
        };
  const change = (url: string, id: string) => {
    setLocal({
      sourceKey,
      previewUrl: url,
      text: id ? siteMediaReference(id) : url,
      invalidVirtual: false,
    });
    onChange(url, id);
  };
  const changeText = (next: string) => {
    if (next.trim().startsWith("site://media/")) {
      const mediaId = parseSiteMediaReference(next);
      setLocal({
        sourceKey,
        text: next,
        previewUrl: "",
        invalidVirtual: !mediaId,
      });
      onChange("", mediaId ? `media:${mediaId}` : "");
      return;
    }
    setLocal({
      sourceKey,
      text: next,
      previewUrl: allowUrl ? next : "",
      invalidVirtual: !allowUrl && Boolean(next),
    });
    onChange(allowUrl ? next : "", "");
  };
  return (
    <div className="admin-settings-field admin-settings-media-field">
      <label htmlFor={id}>{label}</label>
      <div className="admin-media-field-input">
        {current.previewUrl && (
          <Button
            className="admin-media-thumbnail"
            aria-label={`预览${label}`}
            title={kind === "image" ? "点击查看大图" : "点击预览视频"}
            onClick={() => setEnlarged(true)}
          >
            <MediaPreview
              key={current.previewUrl}
              url={current.previewUrl}
              kind={kind}
              label={label}
            />
          </Button>
        )}
        <TextField
          id={id}
          value={current.text}
          maxLength={2048}
          readOnly={Boolean(mediaId)}
          onChange={(e) => changeText(e.target.value)}
          placeholder={
            kind === "image"
              ? allowUrl
                ? "图片 URL、site://media/… 或从媒体库选择"
                : "site://media/… 或从媒体库选择图片"
              : "视频地址或从媒体库选择"
          }
        />
        <Button
          className="admin-button"
          onClick={() => setOpen(true)}
          aria-label={`为${label}选择媒体`}
        >
          <Icon name="image" />
          <UiText text="媒体库" />
        </Button>
        {current.text && (
          <Button
            className="admin-icon-button"
            aria-label={`清除${label}`}
            title="清除选择"
            onClick={() => change("", "")}
          >
            <Icon name="close" />
          </Button>
        )}
      </div>
      {hint && (
        <small>
          {hint}
          {mediaId && (
            <span className="admin-media-bound">
              <UiText text="已关联媒体库（虚拟地址）" />
            </span>
          )}
        </small>
      )}
      {current.invalidVirtual && (
        <small className="admin-settings-message is-error" role="alert">
          <UiText text="请输入完整有效的 site://media/<UUID> 地址。" />
        </small>
      )}
      {open && (
        <MediaPickerDialog
          title={kind === "image" ? "选择图片" : "选择视频"}
          onClose={() => setOpen(false)}
          kind={kind}
          value={mediaId}
          confirmLabel={kind === "image" ? "使用此图片" : "使用此视频"}
          onPick={(item) => change(item.url, item.id)}
        />
      )}
      {enlarged && current.previewUrl && (
        <Modal title={label} onClose={() => setEnlarged(false)}>
          <div className="admin-media-enlarged">
            <MediaPreview
              key={current.previewUrl}
              url={current.previewUrl}
              kind={kind}
              label={label}
              playable
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
