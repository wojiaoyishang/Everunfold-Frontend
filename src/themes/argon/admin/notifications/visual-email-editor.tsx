"use client";

import { useEffect, useRef, useState } from "react";
import {
  editEmailCanvas,
  escapeHtml,
  type EmailCanvas,
  type EmailEditTarget,
} from "@/core/notifications/email-canvas";
import { UiText, useT } from "@/core/i18n/provider";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Button, TextArea, TextField } from "../../components/ui/primitives";
import styles from "./notifications.module.css";

export function VisualEmailEditor({
  canvas,
  source,
  disabled,
  onChange,
}: {
  canvas: EmailCanvas;
  source: string;
  disabled: boolean;
  onChange: (source: string) => void;
}) {
  const t = useT();
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef({ canvas, disabled });
  useEffect(() => {
    latest.current = { canvas, disabled };
  }, [canvas, disabled]);
  const [editing, setEditing] = useState<{
    target: EmailEditTarget | null;
    text: string;
    url: string;
  } | null>(null);
  const newLink = editing?.target?.kind === "link" && !editing.target.tagRange;
  const textLabel =
    editing?.target?.kind === "image"
      ? "图片说明"
      : editing?.target?.kind === "link"
        ? "链接文字"
        : "邮件正文文字";

  function attachEditor() {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    const activate = (event: Event) => {
      const node = (event.target as Element | null)?.closest?.(
        "[data-mail-editor-id], a",
      );
      if (!node) return;
      event.preventDefault();
      if (latest.current.disabled) return;
      const id = node.getAttribute("data-mail-editor-id");
      const target = id ? latest.current.canvas.targets.get(id) : undefined;
      if (target)
        setEditing({ target, text: target.text ?? "", url: target.url ?? "" });
    };
    doc.addEventListener("click", activate);
    doc.addEventListener("auxclick", (event) => {
      if ((event.target as Element | null)?.closest?.("a"))
        event.preventDefault();
    });
    doc.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") activate(event);
    });
    if (!latest.current.disabled) {
      for (const node of doc.querySelectorAll("[data-mail-editor-id]")) {
        node.setAttribute("tabindex", "0");
        node.setAttribute("role", "button");
        node.setAttribute("title", t("编辑邮件内容"));
      }
      const css = doc.createElement("style");
      css.textContent =
        "[data-mail-editor-id]{cursor:pointer}[data-mail-editor-id]:is(:hover,:focus-visible){outline:1px dashed #4565c0;outline-offset:2px}";
      doc.head.append(css);
    }
  }

  return (
    <div className={styles.visualEditor}>
      {!disabled && (
        <div className={styles.visualToolbar}>
          <span className={styles.muted}>
            <UiText text="点击邮件中的文字、链接或图片进行编辑。" />
          </span>
          <div className={styles.sectionActions}>
            <Button
              className="admin-button"
              onClick={() => setEditing({ target: null, text: "", url: "" })}
            >
              <UiText text="添加段落" />
            </Button>
            <Button
              className="admin-button"
              onClick={() =>
                setEditing({
                  target: { kind: "link", text: "" },
                  text: "",
                  url: "",
                })
              }
            >
              <UiText text="添加链接" />
            </Button>
          </div>
        </div>
      )}
      <iframe
        ref={frame}
        className={styles.previewFrame}
        title={t("HTML 正文可视化")}
        sandbox="allow-same-origin"
        srcDoc={canvas.document}
        onLoad={attachEditor}
      />
      {editing && (
        <ConfirmDialog
          open
          title={
            newLink
              ? "添加链接"
              : editing.target?.kind === "link"
                ? "编辑邮件链接"
                : editing.target?.kind === "image"
                  ? "编辑邮件图片"
                  : editing.target
                    ? "编辑邮件内容"
                    : "添加段落"
          }
          description="保留双花括号内的模板变量，发送时会填入实际值。"
          returnFocus={frame}
          onCancel={() => setEditing(null)}
          onConfirmed={() => setEditing(null)}
          confirmLabel="应用"
          confirmDisabled={
            ((!editing.target || newLink) && !editing.text.trim()) ||
            (newLink && !editing.url.trim())
          }
          onConfirm={() => {
            if (disabled) return false;
            const url = editing.url.trim();
            const text = escapeHtml(editing.text);
            const next = newLink
              ? source + `\n<p><a href="${escapeHtml(url)}">${text}</a></p>`
              : editing.target
                ? editEmailCanvas(source, editing.target, editing.text, url)
                : source + `\n<p>${text}</p>`;
            onChange(next);
            return true;
          }}
        >
          <div className={styles.brandFields}>
            {(!editing.target || editing.target.text !== undefined) && (
              <label className={styles.toolbarField}>
                <UiText text={textLabel} />
                <TextArea
                  aria-label={t(textLabel)}
                  rows={3}
                  value={editing.text}
                  onChange={(event) =>
                    setEditing({ ...editing, text: event.target.value })
                  }
                />
              </label>
            )}
            {(editing.target?.tagRange || newLink) && (
              <label className={styles.toolbarField}>
                <UiText
                  text={
                    editing.target?.kind === "image" ? "图片地址" : "链接地址"
                  }
                />
                <TextField
                  value={editing.url}
                  onChange={(event) =>
                    setEditing({ ...editing, url: event.target.value })
                  }
                />
              </label>
            )}
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}
