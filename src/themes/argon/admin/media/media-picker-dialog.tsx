"use client";
import { UiText } from "@/core/i18n/provider";

import { useId, useState } from "react";
import type { MediaItem, MediaQuery } from "@/core/contracts/settings";
import { Modal } from "../../components/ui/modal";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import { MediaBrowser } from "./media-browser";
import { MediaPickerInspector } from "./media-picker-inspector";
import styles from "./media-picker.module.css";

/** All media callers stage a choice in the same full-window picker before confirming. */
export function MediaPickerDialog({
  title = "选择媒体",
  kind = "all",
  value,
  confirmLabel = "使用此文件",
  onPick,
  onClose,
}: {
  title?: string;
  kind?: NonNullable<MediaQuery["kind"]>;
  value?: string;
  confirmLabel?: string;
  onPick: (item: MediaItem) => void;
  onClose: () => void;
}) {
  const id = useId();
  const [tab, setTab] = useState<"upload" | "library">("library");
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [result, setResult] = useState<MediaItem | null>(null);
  const [closing, setClosing] = useState(false);
  return (
    <Modal
      title={title}
      className={styles.dialog}
      closeLabel="关闭媒体选择器"
      closing={closing}
      onClose={() => setClosing(true)}
      onExited={() => {
        if (result) onPick(result);
        onClose();
      }}
    >
      <div className={styles.content} inert={closing}>
        <div className={styles.tabs} role="tablist" aria-label="媒体来源">
          {(["upload", "library"] as const).map((key, index) => (
            <Button
              key={key}
              id={`${id}-${key}`}
              role="tab"
              aria-selected={tab === key}
              aria-controls={`${id}-panel`}
              tabIndex={tab === key ? 0 : -1}
              onClick={() => setTab(key)}
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? 1
                      : 1 - index;
                setTab(next ? "library" : "upload");
                event.currentTarget.parentElement
                  ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                  [next]?.focus();
              }}
            >
              {key === "upload" ? (
                <UiText text="上传文件" />
              ) : (
                <UiText text="媒体库" />
              )}
            </Button>
          ))}
        </div>
        <div
          id={`${id}-panel`}
          className={styles.workspace}
          role="tabpanel"
          aria-labelledby={`${id}-${tab}`}
          data-selected={Boolean(selected)}
        >
          <div className={styles.files}>
            <MediaBrowser
              kind={kind}
              value={selected?.id ?? value}
              pickerTab={tab}
              onSelect={setSelected}
            />
          </div>
          <aside className={styles.inspector} aria-label="所选附件资料">
            {selected ? (
              <MediaPickerInspector key={selected.id} item={selected} />
            ) : (
              <div className={styles.empty}>
                <Icon name="image" />
                <span>
                  <UiText text="选择文件后查看资料" />
                </span>
              </div>
            )}
          </aside>
        </div>
        <footer className={styles.footer}>
          <div className={styles.selection} role="status">
            <Icon name={selected ? "check" : "image"} />
            <span>
              {selected ? (
                `已选择：${selected.title || selected.label}`
              ) : (
                <UiText text="尚未选择文件" />
              )}
            </span>
          </div>
          <div>
            <Button className="admin-button" onClick={() => setClosing(true)}>
              <UiText text="取消" />
            </Button>
            <Button
              className="admin-button admin-button-primary"
              disabled={!selected}
              onClick={() => {
                setResult(selected);
                setClosing(true);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}
