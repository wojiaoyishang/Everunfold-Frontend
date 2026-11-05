"use client";
import { UiText } from "@/core/i18n/provider";

import { useEffect, useId, useState } from "react";
import { Button, TextField } from "../../components/ui/primitives";
import { Modal } from "../../components/ui/modal";
import { Icon } from "../../components/icon";
import { MediaPickerDialog } from "../media/media-picker-dialog";
import { MediaPreview } from "../media/media-preview";
/** Compact media field, shared by avatar, background image and background video. */
export function SettingsMediaField({
  label,
  hint,
  value,
  mediaId,
  kind,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  mediaId?: string;
  kind: "image" | "video";
  onChange: (url: string, id: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const [preview, setPreview] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setPreview(value), 300);
    return () => clearTimeout(timer);
  }, [value]);
  return (
    <div className="admin-settings-field admin-settings-media-field">
      <label htmlFor={id}>{label}</label>
      <div className="admin-media-field-input">
        {preview && (
          <Button
            className="admin-media-thumbnail"
            aria-label={`预览${label}`}
            title={kind === "image" ? "点击查看大图" : "点击预览视频"}
            onClick={() => setEnlarged(true)}
          >
            <MediaPreview
              key={preview}
              url={preview}
              kind={kind}
              label={label}
            />
          </Button>
        )}
        <TextField
          id={id}
          value={value}
          maxLength={2048}
          onChange={(e) => onChange(e.target.value, "")}
          placeholder={
            kind === "image"
              ? "图片地址或从媒体库选择"
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
        {value && (
          <Button
            className="admin-icon-button"
            aria-label={`清除${label}`}
            title="清除选择"
            onClick={() => onChange("", "")}
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
              <UiText text="已关联媒体库" />
            </span>
          )}
        </small>
      )}
      {open && (
        <MediaPickerDialog
          title={kind === "image" ? "选择图片" : "选择视频"}
          onClose={() => setOpen(false)}
          kind={kind}
          value={mediaId}
          confirmLabel={kind === "image" ? "使用此图片" : "使用此视频"}
          onPick={(item) => onChange(item.url, item.id)}
        />
      )}
      {enlarged && preview && (
        <Modal title={label} onClose={() => setEnlarged(false)}>
          <div className="admin-media-enlarged">
            <MediaPreview
              key={preview}
              url={preview}
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
