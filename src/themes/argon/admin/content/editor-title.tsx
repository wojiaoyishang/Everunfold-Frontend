"use client";
import { useState } from "react";
import type {
  ContentTypeDefinition,
  DraftFields,
  DraftDetail,
} from "@/generated/content-admin-contract";
import { titlePath } from "@/core/content-management/editor-fields";
import { Button, TextField } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import styles from "./editor-workspace.module.css";

export function EditorTitle({
  type,
  fields,
  detail,
  onChange,
  disabled,
}: {
  type: ContentTypeDefinition;
  fields: DraftFields;
  detail: DraftDetail | null;
  onChange: (fields: DraftFields) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const path =
    fields.settings?.path ||
    detail?.public_path ||
    titlePath(fields.title ?? "");
  const [input, setInput] = useState("");
  const updatePath = () => {
    onChange({
      ...fields,
      settings: { ...fields.settings, path: input.trim() || path },
    });
    setEditing(false);
  };
  return (
    <div className={styles.editorTitle}>
      <label>
        <span className="sr-only">
          标题{!type.title_required ? "（可选）" : ""}
        </span>
        <TextField
          value={fields.title ?? ""}
          maxLength={200}
          disabled={disabled}
          placeholder={
            type.title_required ? "添加标题" : "为这则说说起个名字（可选）"
          }
          onChange={(event) =>
            onChange({ ...fields, title: event.target.value })
          }
        />
      </label>
      <div className={styles.permalink}>
        <span>固定链接：</span>
        {editing ? (
          <div className={styles.permalinkEdit}>
            <TextField
              aria-label="编辑固定链接"
              value={input}
              maxLength={500}
              disabled={disabled}
              placeholder={path || "/自定义路径.html"}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  updatePath();
                }
                if (event.key === "Escape") setEditing(false);
              }}
            />
            <Button
              className="admin-button"
              disabled={disabled}
              onClick={updatePath}
            >
              确定
            </Button>
            <Button
              className={styles.textButton}
              onClick={() => setEditing(false)}
            >
              取消
            </Button>
          </div>
        ) : (
          <>
            <span className={styles.permalinkValue}>
              {path || "填写标题后自动生成"}
            </span>
            <Button
              className={styles.textButton}
              aria-label="编辑固定链接"
              disabled={disabled}
              onClick={() => {
                setInput(path);
                setEditing(true);
              }}
            >
              <Icon name="edit" /> 编辑
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
