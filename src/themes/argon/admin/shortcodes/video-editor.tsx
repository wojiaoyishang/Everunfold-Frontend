"use client";

import { useEffect, useState } from "react";
import type { MediaItem } from "@/core/contracts/settings";
import type { MediaURL } from "@/core/contracts/content-admin";
import type { ShortcodeEditorProps } from "@/core/plugins/types";
import { UiText } from "@/core/i18n/provider";
import { videoOptions, type VideoOptions } from "@/core/video/player";
import { standaloneVideo, videoCall } from "@/core/video/shortcode";
import { Button, TextArea } from "../../components/ui/primitives";
import { Modal } from "../../components/ui/modal";
import { VideoPlayer } from "../../components/video-player";
import {
  validVideoDraft,
  videoDraft,
  VideoFields,
} from "../media/video-fields";
import styles from "./shortcodes.module.css";

export function VideoShortcodeEditor({
  source,
  onChange,
  onMedia,
}: ShortcodeEditorProps) {
  const [draft, setDraft] = useState(() =>
    videoDraft(standaloneVideo(source) ?? {}),
  );
  const call = validVideoDraft(draft) ? videoCall(videoOptions(draft)) : "";
  useEffect(() => onChange(call), [call, onChange]);
  return (
    <VideoFields
      value={draft}
      onMedia={onMedia}
      onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
    />
  );
}

export function VideoEditorDialog({
  initial,
  media,
  shortcode = false,
  onMedia,
  onConfirm,
  onClose,
}: {
  initial?: VideoOptions;
  media?: Record<string, MediaURL>;
  shortcode?: boolean;
  onMedia: (item: MediaItem) => void;
  onConfirm: (source: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => videoDraft(initial));
  const [closing, setClosing] = useState(false);
  const [result, setResult] = useState("");
  const valid = validVideoDraft(draft);
  const call = valid ? videoCall(videoOptions(draft)) : "";
  return (
    <Modal
      title={
        shortcode ? "插入视频短代码" : initial ? "设置视频区块" : "添加视频区块"
      }
      className={styles.pickerDialog}
      closing={closing}
      onClose={() => setClosing(true)}
      onExited={() => {
        if (result) onConfirm(result);
        onClose();
      }}
    >
      <div className={styles.picker} inert={closing}>
        <VideoFields
          value={draft}
          onMedia={onMedia}
          onChange={(patch) =>
            setDraft((current) => ({ ...current, ...patch }))
          }
        />
        {valid && <VideoPlayer values={draft} media={media} preview />}
        {shortcode && (
          <label className={styles.field}>
            <span>
              <UiText text="调用源码" />
            </span>
            <TextArea
              className={styles.invocation}
              readOnly
              rows={2}
              value={call}
            />
          </label>
        )}
      </div>
      <footer className={styles.pickerActions} inert={closing}>
        <Button className="admin-button" onClick={() => setClosing(true)}>
          <UiText text="取消" />
        </Button>
        <Button
          className="admin-button admin-button-primary"
          disabled={!valid || closing}
          onClick={() => {
            setResult(call);
            setClosing(true);
          }}
        >
          <UiText text={initial ? "应用" : "插入"} />
        </Button>
      </footer>
    </Modal>
  );
}
