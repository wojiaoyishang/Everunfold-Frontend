"use client";
import { UiText } from "@/core/i18n/provider";

import { useState } from "react";
import type { MediaItem } from "@/core/contracts/settings";
import type { MediaURL } from "@/core/contracts/content-admin";
import { useShortcodeLibrary } from "@/core/shortcodes/use-library";
import { shortcodeCall } from "@/core/shortcodes/parser";
import { pluginRegistry } from "@/core/plugins/registry";
import { renderContent } from "@/core/rendering/content";
import { Button, TextArea } from "../../components/ui/primitives";
import { Modal } from "../../components/ui/modal";
import { Select } from "../../components/ui/select";
import { ShortcodeValues } from "./parameters";
import { ShortcodePreview } from "./preview";
import { EditorMediaDialog } from "../content/editor-media-dialog";
import { siteMediaReference } from "@/core/media/references";
import styles from "./shortcodes.module.css";

export function ShortcodePicker({
  format,
  media = {},
  onMedia,
  onPick,
  onClose,
}: {
  format: "markdown" | "html";
  media?: Record<string, MediaURL>;
  onMedia: (item: MediaItem) => void;
  onPick: (source: string) => void;
  onClose: () => void;
}) {
  const library = useShortcodeLibrary();
  const [chosen, setChosen] = useState(""),
    [values, setValues] = useState<Record<string, string>>({});
  const [body, setBody] = useState(
    format === "html" ? "<p>这里是正文内容。</p>" : "这里是正文内容。",
  );
  const [closing, setClosing] = useState(false),
    [result, setResult] = useState<string>(),
    [images, setImages] = useState(false);
  const items = library.items
    .filter((item) => !item.archived && item.applied_revision)
    .map((item) =>
      item.origin === "custom"
        ? library.applied.find((definition) => definition.id === item.id)
        : item.compiled,
    )
    .filter((item) => item !== undefined);
  const selected = items.find((item) => item.id === chosen) ?? items[0];
  const mediaPicker = selected
    ? pluginRegistry.shortcode(selected)?.mediaPicker
    : undefined;
  const call = selected ? shortcodeCall(selected, values, body) : "";
  const rendered = renderContent(
    {
      id: "shortcode-picker",
      content: [{ id: "sample", type: format, content: call }],
      media_urls: media,
    },
    library.applied,
  );
  return (
    <Modal
      title="插入短代码"
      closeLabel="关闭短代码选择器"
      closing={closing}
      onClose={() => setClosing(true)}
      onExited={() => {
        if (result) onPick(result);
        onClose();
      }}
    >
      <div className={styles.picker}>
        <p className={styles.hint}>
          <UiText text="插入到当前区块的光标或选区；正文保留调用源码。" />
        </p>
        {library.error && (
          <p role="alert" className={styles.error}>
            {library.error}
            <Button
              className="admin-button"
              onClick={() => void library.reload()}
            >
              <UiText text="重试" />
            </Button>
          </p>
        )}
        {library.loading && !items.length && (
          <p role="status">
            <UiText text="正在读取短代码…" />
          </p>
        )}
        {selected && (
          <>
            <Select
              name="shortcode-insert"
              label="选择短代码"
              value={selected.id}
              options={items.map((item) => ({
                value: item.id,
                label: `${item.title} · ${item.name}`,
              }))}
              onValueChange={(value) => {
                setChosen(value);
                setValues({});
              }}
            />
            <ShortcodeValues
              parameters={selected.parameters}
              values={values}
              onChange={setValues}
            />
            {mediaPicker && (
              <Button
                className="admin-button"
                disabled={
                  (values[mediaPicker.parameter] ?? "")
                    .split(",")
                    .filter(Boolean).length >= mediaPicker.limit
                }
                onClick={() => setImages(true)}
              >
                <UiText text={mediaPicker.buttonLabel} />
              </Button>
            )}
            {selected.kind === "container" && (
              <label className={styles.field}>
                <span>
                  <UiText text="正文（" />
                  {format === "html" ? "HTML" : "Markdown"}）
                </span>
                <TextArea
                  rows={4}
                  maxLength={20000}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
              </label>
            )}
            <ShortcodePreview
              definition={selected}
              definitions={library.applied}
              values={values}
              body={body}
              format={format}
              media={media}
            />
            <label className={styles.field}>
              <span>
                <UiText text="调用源码" />
              </span>
              <TextArea readOnly value={call} className={styles.invocation} />
            </label>
          </>
        )}
        <div className={styles.actions}>
          <Button className="admin-button" onClick={() => setClosing(true)}>
            <UiText text="取消" />
          </Button>
          <Button
            className="admin-button admin-button-primary"
            disabled={
              !selected ||
              Boolean(rendered.diagnostics.length) ||
              library.loading ||
              closing
            }
            onClick={() => {
              setResult(call);
              setClosing(true);
            }}
          >
            <UiText text="插入到光标位置" />
          </Button>
        </div>
      </div>
      {images && mediaPicker && (
        <EditorMediaDialog
          kind={mediaPicker.kind}
          title={mediaPicker.title}
          onClose={() => setImages(false)}
          onPick={(item) => {
            onMedia(item);
            const reference = siteMediaReference(item.id);
            setValues((current) => ({
              ...current,
              [mediaPicker.parameter]: [
                current[mediaPicker.parameter],
                reference,
              ]
                .filter(Boolean)
                .join(","),
            }));
          }}
        />
      )}
    </Modal>
  );
}
