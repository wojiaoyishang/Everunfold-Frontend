"use client";
import { AdminLoadingState } from "@/themes/argon/admin/components/loading-state";
import { UiText, useLocale } from "@/core/i18n/provider";

import { useId, useState } from "react";
import type { MediaItem } from "@/core/contracts/settings";
import type { MediaURL } from "@/core/contracts/content-admin";
import { useShortcodeLibrary } from "@/core/shortcodes/use-library";
import { useShortcodeActions } from "@/core/shortcodes/use-actions";
import { RequestError } from "@/core/http/request";
import { shortcodeCall } from "@/core/shortcodes/parser";
import { pluginRegistry } from "@/core/plugins/registry";
import { renderContent } from "@/core/rendering/content";
import { isCompleteShortcodeCall } from "@/core/shortcodes/registry";
import { Button, TextArea, TextField } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import { Modal } from "../../components/ui/modal";
import { Select } from "../../components/ui/select";
import { ShortcodeValues } from "./parameters";
import { ShortcodePreview } from "./preview";
import {
  RegisteredShortcodeEditor,
  shortcodeEditor,
} from "./registered-editor";
import { MediaPickerDialog } from "../media/media-picker-dialog";
import { mediaReferenceId, siteMediaReference } from "@/core/media/references";
import styles from "./shortcodes.module.css";

export function ShortcodePicker({
  format,
  language,
  initialBody,
  media = {},
  onMedia,
  onPick,
  onClose,
}: {
  format: "markdown" | "html";
  language?: string;
  initialBody?: string;
  media?: Record<string, MediaURL>;
  onMedia: (item: MediaItem) => void;
  onPick: (source: string) => void;
  onClose: () => void;
}) {
  const id = useId();
  const { locale } = useLocale();
  const library = useShortcodeLibrary();
  const { regionPassword } = useShortcodeActions();
  const [password, setPassword] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [chosen, setChosen] = useState(""),
    [values, setValues] = useState<Record<string, string>>({});
  const [body, setBody] = useState(
    initialBody?.trim() ||
      (format === "html" ? "<p>这里是正文内容。</p>" : "这里是正文内容。"),
  );
  const [customSource, setCustomSource] = useState("");
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
  const mediaValue = mediaPicker
    ? (values[mediaPicker.parameter] ??
      selected?.parameters.find(({ name }) => name === mediaPicker.parameter)
        ?.default ??
      "")
    : "";
  const mediaReferences = mediaValue
    .split(",")
    .map((ref) => ref.trim())
    .filter(Boolean);
  const available = mediaPicker
    ? Math.max(0, mediaPicker.limit - mediaReferences.length)
    : 0;
  const needsPassword = selected?.name === "password-area";
  const editor = shortcodeEditor(selected);
  const call = editor
    ? customSource
    : selected
      ? shortcodeCall(selected, values, body)
      : "";
  const complete =
    !editor ||
    (selected &&
      isCompleteShortcodeCall(
        call,
        selected,
        library.applied,
        format === "markdown",
        library.maxDepth,
      ));
  const rendered = renderContent(
    {
      id: "shortcode-picker",
      content: [{ id: "sample", type: format, content: complete ? call : "" }],
      media_urls: media,
    },
    { definitions: library.applied, maxDepth: library.maxDepth },
    { videoPreview: true },
  );
  return (
    <Modal
      title="插入短代码"
      className={styles.pickerDialog}
      closeLabel="关闭短代码选择器"
      closing={closing}
      onClose={() => setClosing(true)}
      onExited={() => {
        if (result) onPick(result);
        onClose();
      }}
    >
      <div className={styles.picker} inert={closing}>
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
          <AdminLoadingState label="正在读取短代码…" />
        )}
        {!library.loading && !library.error && !selected && (
          <p className={styles.hint}>
            <UiText text="没有可插入的短代码。" />
          </p>
        )}
        {selected && (
          <>
            <div className={styles.field}>
              <label htmlFor={id}>
                <UiText text="短代码" />
              </label>
              <Select
                id={id}
                name="shortcode-insert"
                label="短代码"
                value={selected.id}
                options={items.map((item) => ({
                  value: item.id,
                  label: `${item.title} · ${item.name}`,
                }))}
                onValueChange={(value) => {
                  setChosen(value);
                  setValues({});
                  setCustomSource("");
                  setPassword("");
                  setPasswordError("");
                }}
              />
            </div>
            {editor ? (
              <RegisteredShortcodeEditor
                key={selected.id}
                editor={editor}
                definition={selected}
                source={customSource}
                onChange={setCustomSource}
                language={language ?? locale}
                format={format}
                initialBody={body}
                media={media}
                onMedia={onMedia}
              />
            ) : needsPassword ? (
              <label className={styles.field}>
                <span>
                  <UiText text="区域口令" />
                </span>
                <TextField
                  className="admin-input"
                  type="password"
                  autoComplete="new-password"
                  maxLength={200}
                  value={password}
                  disabled={settingPassword}
                  onChange={(event) => setPassword(event.target.value)}
                />
                {passwordError && (
                  <span className={styles.error} role="alert">
                    <UiText text={passwordError} />
                  </span>
                )}
              </label>
            ) : (
              <ShortcodeValues
                parameters={selected.parameters}
                values={values}
                onChange={setValues}
              />
            )}
            {mediaPicker && (
              <div className={styles.pickerMedia}>
                <Button
                  className="admin-button"
                  aria-disabled={available === 0}
                  onClick={() => {
                    if (available > 0) setImages(true);
                  }}
                >
                  <Icon name="image" />
                  <UiText text={mediaPicker.buttonLabel} />
                </Button>
                <span className={styles.hint}>
                  <UiText
                    text={
                      mediaReferences.length <= mediaPicker.limit
                        ? "已添加 {count} / {limit} 个文件"
                        : "已添加 {count} 个文件"
                    }
                    values={{
                      count: mediaReferences.length,
                      limit: mediaPicker.limit,
                    }}
                  />
                </span>
              </div>
            )}
            {selected.kind === "container" && !editor && (
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
            <section className={styles.field} aria-labelledby={id + "-preview"}>
              <h3 id={id + "-preview"}>
                <UiText text="预览" />
              </h3>
              <ShortcodePreview
                definition={selected}
                definitions={library.applied}
                values={values}
                body={body}
                source={editor ? (complete ? call : "") : undefined}
                maxDepth={library.maxDepth}
                format={format}
                media={media}
              />
              {editor && customSource && !complete && (
                <p role="status" className={styles.hint}>
                  <UiText text="请生成一个完整的当前短代码调用。" />
                </p>
              )}
            </section>
            <label className={styles.field}>
              <span>
                <UiText text="调用源码" />
              </span>
              <TextArea
                readOnly
                rows={2}
                value={
                  needsPassword
                    ? shortcodeCall(
                        selected,
                        { credential: "口令配置在插入时生成" },
                        body,
                      )
                    : call
                }
                className={styles.invocation}
              />
            </label>
          </>
        )}
      </div>
      <footer className={styles.pickerActions} inert={closing}>
        <Button className="admin-button" onClick={() => setClosing(true)}>
          <UiText text="取消" />
        </Button>
        <Button
          className="admin-button admin-button-primary"
          disabled={
            !selected ||
            !complete ||
            Boolean(rendered.diagnostics.length) ||
            (library.loading && !editor) ||
            closing ||
            settingPassword ||
            (needsPassword && !password.length)
          }
          onClick={async () => {
            if (!selected || !complete) return;
            if (!needsPassword) {
              setResult(call);
              setClosing(true);
              return;
            }
            setSettingPassword(true);
            setPasswordError("");
            try {
              const credential = await regionPassword(password);
              setPassword("");
              setResult(shortcodeCall(selected, { credential }, body));
              setClosing(true);
            } catch (error) {
              setPasswordError(
                error instanceof RequestError && error.code === 50381
                  ? "服务器尚未配置密码区域加密密钥。"
                  : "暂时无法设置区域口令，请重试。",
              );
            } finally {
              setSettingPassword(false);
            }
          }}
        >
          <UiText text={settingPassword ? "正在设置口令…" : "插入到光标位置"} />
        </Button>
      </footer>
      {images && mediaPicker && available > 0 && (
        <MediaPickerDialog
          kind={mediaPicker.kind}
          title={mediaPicker.title}
          multiple
          maxSelection={available}
          excludedIds={mediaReferences.map(mediaReferenceId)}
          onClose={() => setImages(false)}
          onPick={(items) => {
            items.forEach(onMedia);
            setValues((current) => ({
              ...current,
              [mediaPicker.parameter]: [
                ...mediaReferences,
                ...items.map((item) => siteMediaReference(item.id)),
              ].join(","),
            }));
          }}
        />
      )}
    </Modal>
  );
}
