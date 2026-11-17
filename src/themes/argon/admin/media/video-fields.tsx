"use client";

import { useId, useState } from "react";
import type { MediaItem } from "@/core/contracts/settings";
import { resourceUrl } from "@/core/content/urls";
import {
  parseSiteMediaReference,
  siteMediaReference,
} from "@/core/media/references";
import { UiText, useT } from "@/core/i18n/provider";
import {
  minimumVideoWidth,
  maximumVideoWidth,
  videoDefaults,
  videoSource,
  type VideoOptions,
} from "@/core/video/player";
import { Button, TextField } from "../../components/ui/primitives";
import { FormField } from "../../components/ui/form-field";
import { Switch } from "../../components/ui/switch";
import { Icon } from "../../components/icon";
import { MediaPickerDialog } from "./media-picker-dialog";
import styles from "./video-fields.module.css";

export type VideoDraft = Omit<VideoOptions, "max_width"> & {
  max_width: string;
};

export function videoDraft(values: Record<string, unknown> = {}): VideoDraft {
  const string = (key: keyof VideoOptions, fallback = "") =>
    typeof values[key] === "string" ? values[key] : fallback;
  const enabled = (key: keyof VideoOptions) =>
    values[key] === true || values[key] === "true";
  return {
    source: string("source"),
    title: string("title"),
    poster: string("poster"),
    captions: string("captions"),
    language: string("language", videoDefaults.language),
    max_width:
      values.max_width == null || Number(values.max_width) === 0
        ? ""
        : String(values.max_width),
    autoplay: enabled("autoplay"),
    loop: enabled("loop"),
  };
}

function validMedia(value: string) {
  return Boolean(resourceUrl(value) || parseSiteMediaReference(value));
}

function videoErrors(value: VideoDraft) {
  const width = Number(value.max_width);
  const direct = videoSource(value.source)?.provider === "direct";
  return {
    source:
      value.source.trim() && !videoSource(value.source)
        ? "请输入有效的视频直链、Bilibili 视频页或 YouTube 链接。"
        : "",
    max_width:
      width !== 0 &&
      (!Number.isInteger(width) ||
        width < minimumVideoWidth ||
        width > maximumVideoWidth)
        ? "请输入 320 至 1920 之间的整数。"
        : "",
    poster:
      direct && value.poster.trim() && !validMedia(value.poster)
        ? "请输入有效的图片地址。"
        : "",
    captions:
      direct && value.captions.trim() && !validMedia(value.captions)
        ? "请输入有效的字幕地址。"
        : "",
  };
}

export function validVideoDraft(value: VideoDraft) {
  return (
    Boolean(value.source.trim()) &&
    !Object.values(videoErrors(value)).some(Boolean)
  );
}

export function VideoFields({
  value,
  disabled,
  onChange,
  onMedia,
}: {
  value: VideoDraft;
  disabled?: boolean;
  onChange: (patch: Partial<VideoDraft>) => void;
  onMedia: (item: MediaItem) => void;
}) {
  const id = useId();
  const t = useT();
  const [picker, setPicker] = useState<"source" | "poster" | null>(null);
  const source = videoSource(value.source);
  const direct = !source || source.provider === "direct";
  const errors = videoErrors(value);
  const field = (
    key: "source" | "title" | "poster" | "captions" | "language" | "max_width",
    label: string,
    placeholder?: string,
    action?: React.ReactNode,
  ) => {
    const name = `${id}-${key}`;
    const error = key in errors ? errors[key as keyof typeof errors] : "";
    const numeric = key === "max_width";
    return (
      <FormField
        id={name}
        label={label}
        action={action}
        invalid={Boolean(error)}
      >
        <TextField
          id={name}
          type={numeric ? "number" : "text"}
          min={numeric ? minimumVideoWidth : undefined}
          max={numeric ? maximumVideoWidth : undefined}
          maxLength={numeric ? undefined : key === "title" ? 200 : 1000}
          spellCheck={key === "title"}
          disabled={disabled}
          value={value[key]}
          placeholder={placeholder ? t(placeholder) : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          onChange={(event) => onChange({ [key]: event.target.value })}
        />
        {error && (
          <small className="form-error" id={`${name}-error`}>
            <UiText text={error} />
          </small>
        )}
      </FormField>
    );
  };
  const choose = (key: "source" | "poster", label: string) => (
    <Button
      className="admin-button"
      type="button"
      disabled={disabled}
      onClick={() => setPicker(key)}
    >
      <Icon name={key === "source" ? "video" : "image"} />
      <UiText text={label} />
    </Button>
  );
  const toggle = (key: "autoplay" | "loop", label: string) => (
    <div className={styles.toggle}>
      <span id={`${id}-${key}`}>
        <UiText text={label} />
      </span>
      <Switch
        type="button"
        aria-labelledby={`${id}-${key}`}
        checked={value[key]}
        disabled={disabled}
        onCheckedChange={(checked) => onChange({ [key]: checked })}
      />
    </div>
  );
  return (
    <div className={styles.fields}>
      {field(
        "source",
        "视频来源",
        "粘贴视频直链、Bilibili 或 YouTube 链接",
        choose("source", "选择媒体库视频"),
      )}
      {field("title", "视频标题")}
      {direct &&
        field("poster", "视频封面", undefined, choose("poster", "选择封面"))}
      {direct && field("captions", "字幕地址（WebVTT）")}
      {direct && value.captions && field("language", "字幕语言代码")}
      {field("max_width", "最大宽度（px）", "留空时随内容宽度")}
      {toggle("autoplay", "静音自动播放")}
      {source?.provider !== "bilibili" && toggle("loop", "循环播放")}
      {picker && (
        <MediaPickerDialog
          title={picker === "source" ? "选择媒体库视频" : "选择封面"}
          kind={picker === "source" ? "video" : "image"}
          value={value[picker]}
          onPick={(item) => {
            onMedia(item);
            onChange({ [picker]: siteMediaReference(item.id) });
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
