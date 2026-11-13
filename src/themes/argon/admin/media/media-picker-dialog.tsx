"use client";
import { UiText, useT } from "@/core/i18n/provider";

import { useId, useState } from "react";
import type { MediaItem, MediaQuery } from "@/core/contracts/settings";
import { Modal } from "../../components/ui/modal";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import { MediaBrowser } from "./media-browser";
import { MediaPickerInspector } from "./media-picker-inspector";
import { mediaReferenceId } from "@/core/media/references";
import styles from "./media-picker.module.css";

type MediaPickerProps = {
  title?: string;
  kind?: NonNullable<MediaQuery["kind"]>;
  confirmLabel?: string;
  onClose: () => void;
} & (
  | { multiple?: false; value?: string; onPick: (item: MediaItem) => void }
  | {
      multiple: true;
      maxSelection?: number;
      excludedIds?: readonly string[];
      onPick: (items: MediaItem[]) => void;
    }
);

/** All media callers stage a choice in the same full-window picker before confirming. */
export function MediaPickerDialog(props: MediaPickerProps) {
  const {
    title = "选择媒体",
    kind = "all",
    confirmLabel = props.multiple ? "添加所选媒体" : "使用此文件",
    onClose,
  } = props;
  const id = useId();
  const t = useT();
  const [tab, setTab] = useState<"upload" | "library">("library");
  const [selected, setSelected] = useState<MediaItem[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [closing, setClosing] = useState(false);
  const current = selected.at(-1);
  const maxSelection = props.multiple ? props.maxSelection : undefined;
  const excludedIds = new Set(props.multiple ? props.excludedIds : undefined);
  const full = maxSelection !== undefined && selected.length >= maxSelection;
  const pick = (item: MediaItem) => {
    if (!props.multiple) {
      setSelected([item]);
      return;
    }
    if (excludedIds.has(mediaReferenceId(item.id))) return;
    setSelected((items) => {
      if (items.some(({ id }) => id === item.id))
        return items.filter(({ id }) => id !== item.id);
      if (maxSelection !== undefined && items.length >= maxSelection)
        return items;
      return [...items, item];
    });
  };
  return (
    <Modal
      title={title}
      className={styles.dialog}
      closeLabel="关闭媒体选择器"
      closing={closing}
      onClose={() => setClosing(true)}
      onExited={() => {
        if (confirmed && current) {
          if (props.multiple) props.onPick(selected);
          else props.onPick(current);
        }
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
          data-selected={Boolean(current)}
        >
          <div className={styles.files}>
            <MediaBrowser
              kind={kind}
              value={props.multiple ? undefined : (current?.id ?? props.value)}
              selection={
                props.multiple
                  ? {
                      selectedIds: new Set(selected.map(({ id }) => id)),
                      excludedIds,
                      full,
                    }
                  : undefined
              }
              pickerTab={tab}
              onSelect={pick}
            />
          </div>
          <aside className={styles.inspector} aria-label="所选附件资料">
            {current ? (
              <>
                {props.multiple && (
                  <section
                    className={styles.selectedFiles}
                    aria-labelledby={id + "-selected"}
                  >
                    <h3 id={id + "-selected"}>
                      <UiText text="所选文件" />
                    </h3>
                    <ol>
                      {selected.map((item) => (
                        <li key={item.id}>
                          <span title={item.title || item.label}>
                            {item.title || item.label}
                          </span>
                          <Button
                            className="admin-icon-button"
                            aria-label={t("取消选择 {name}", {
                              name: item.title || item.label,
                            })}
                            onClick={(event) => {
                              const row = event.currentTarget.closest("li");
                              const next =
                                row?.nextElementSibling ??
                                row?.previousElementSibling;
                              const fallback = event.currentTarget
                                .closest("dialog")
                                ?.querySelector<HTMLElement>(
                                  '[role="tab"][aria-selected="true"]',
                                );
                              (
                                next?.querySelector("button") ?? fallback
                              )?.focus();
                              pick(item);
                            }}
                          >
                            <Icon name="close" />
                          </Button>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
                <MediaPickerInspector key={current.id} item={current} />
              </>
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
            <Icon name={current ? "check" : "image"} />
            <span>
              {maxSelection !== undefined ? (
                <UiText
                  text="已选择 {count} / {limit} 个文件"
                  values={{ count: selected.length, limit: maxSelection }}
                />
              ) : props.multiple && current ? (
                <UiText
                  text="已选择 {count} 个文件"
                  values={{ count: selected.length }}
                />
              ) : current ? (
                `已选择：${current.title || current.label}`
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
              disabled={!current}
              onClick={() => {
                setConfirmed(true);
                setClosing(true);
              }}
            >
              <UiText text={confirmLabel} />
            </Button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}
