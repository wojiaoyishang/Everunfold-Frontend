"use client";
import { useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import type { FontAsset } from "@/generated/settings-contract";
import { loadFont } from "@/core/media/font-preview";
import { FontField } from "../../fonts/font-field";
import { Button, TextField, Form } from "../../../components/ui/primitives";
import { FilePicker } from "../../../components/ui/file-picker";
import { ActionPopover } from "../../../components/ui/action-popover";
import { Select } from "../../../components/ui/select";
import { Icon, type IconName } from "../../../components/icon";
import styles from "./rich-editor.module.css";

export function RichToolbar({
  editor,
  fonts = [],
  markdown = false,
  onMedia,
  onUpload,
}: {
  editor: Editor;
  fonts?: FontAsset[];
  markdown?: boolean;
  onMedia?: (kind: "image" | "all") => void;
  onUpload?: (files: File[]) => void;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      link: String(e.getAttributes("link").href ?? ""),
      table: e.isActive("table"),
      image: e.isActive("image"),
      imageSettings: JSON.stringify(e.getAttributes("image")),
      imageAlignment: String(
        (markdown
          ? e.getAttributes("paragraph").textAlign
          : e.getAttributes("image").alignment) || "left",
      ),
      heading: e.isActive("heading")
        ? String(e.getAttributes("heading").level)
        : "0",
      font: String(e.getAttributes("textStyle").fontId ?? ""),
      size: String(e.getAttributes("textStyle").fontSize ?? ""),
      alignment: String(
        e.getAttributes("paragraph").textAlign ??
          e.getAttributes("heading").textAlign ??
          "left",
      ),
    }),
  });
  const button = (
    label: string,
    icon: IconName,
    action: () => void,
    active = false,
  ) => (
    <Button
      key={label}
      className={styles.toolButton}
      aria-label={label}
      title={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={action}
    >
      <Icon name={icon} />
    </Button>
  );
  return (
    <div
      className={styles.toolbar}
      role="toolbar"
      aria-label={markdown ? "Markdown 排版工具" : "HTML 排版工具"}
    >
      <div className={styles.toolbarRow}>
        <Select
          name="html-heading"
          className={styles.heading}
          label="段落样式"
          value={state.heading}
          options={[
            { value: "0", label: "正文" },
            ...[1, 2, 3, 4, 5, 6].map((n) => ({
              value: String(n),
              label: `标题 ${n}`,
            })),
          ]}
          onValueChange={(v) => {
            if (v === "0") editor.chain().focus().setParagraph().run();
            else
              editor
                .chain()
                .focus()
                .toggleHeading({ level: Number(v) as 1 | 2 | 3 | 4 | 5 | 6 })
                .run();
          }}
        />
        <span className={styles.divider} />
        {button(
          "加粗 (Ctrl/Cmd+B)",
          "bold",
          () => editor.chain().focus().toggleBold().run(),
          state.bold,
        )}
        {button(
          "斜体 (Ctrl/Cmd+I)",
          "italic",
          () => editor.chain().focus().toggleItalic().run(),
          state.italic,
        )}
        {!markdown &&
          button(
            "下划线 (Ctrl/Cmd+U)",
            "underline",
            () => editor.chain().focus().toggleUnderline().run(),
            state.underline,
          )}
        {button(
          "删除线",
          "strike",
          () => editor.chain().focus().toggleStrike().run(),
          state.strike,
        )}
        <span className={styles.divider} />
        <ActionPopover
          label="插入或编辑链接"
          panelWidth={340}
          className={styles.toolButton}
          triggerContent={<Icon name="link" />}
        >
          {(close) => (
            <LinkForm key={state.link} editor={editor} close={close} />
          )}
        </ActionPopover>
        <div className={styles.insertGroup} role="group" aria-label="插入">
          {[
            [
              "无序列表",
              "list",
              () => editor.chain().focus().toggleBulletList().run(),
            ],
            [
              "有序列表",
              "ordered-list",
              () => editor.chain().focus().toggleOrderedList().run(),
            ],
            [
              "引用",
              "quote",
              () => editor.chain().focus().toggleBlockquote().run(),
            ],
            [
              "代码块",
              "code-block",
              () => editor.chain().focus().toggleCodeBlock().run(),
            ],
            [
              "表格",
              "table",
              () =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run(),
            ],
            [
              "分隔线",
              "minus",
              () => editor.chain().focus().setHorizontalRule().run(),
            ],
            [
              "清除格式",
              "type",
              () => editor.chain().focus().unsetAllMarks().clearNodes().run(),
            ],
          ].map(([label, icon, run]) =>
            button(label as string, icon as IconName, run as () => void),
          )}
          {button("插入图片", "image", () => onMedia?.("image"))}
          {button("插入媒体或附件", "folder", () => onMedia?.("all"))}
          {onUpload && (
            <FilePicker
              className={styles.toolButton}
              iconOnly
              label="上传图片"
              accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
              onFiles={onUpload}
            />
          )}
        </div>
        {state.image && (
          <div
            className={styles.imageTools}
            role="group"
            aria-label="图片快速对齐"
          >
            <span>图片</span>
            {(
              [
                ["left", "图片居左", "align-left"],
                ["center", "图片居中", "align-center"],
                ["right", "图片居右", "align-right"],
              ] as const
            ).map(([alignment, label, icon]) =>
              button(
                label,
                icon,
                () => {
                  if (markdown)
                    editor
                      .chain()
                      .focus()
                      .updateAttributes("paragraph", { textAlign: alignment })
                      .run();
                  else
                    editor
                      .chain()
                      .focus()
                      .updateAttributes("image", { alignment })
                      .run();
                },
                state.imageAlignment === alignment,
              ),
            )}
          </div>
        )}
      </div>
      {!markdown && (
        <div className={styles.toolbarRow}>
          <FontField
            className={styles.font}
            label="文字字体"
            value={state.font}
            fonts={fonts}
            onChange={(fontId, font) => {
              if (font) void loadFont(font);
              editor
                .chain()
                .focus()
                .setMark("textStyle", { fontId: fontId || null })
                .run();
            }}
          />
          <Select
            name="html-font-size"
            className={styles.size}
            label="文字字号"
            value={state.size}
            options={[
              { value: "", label: "默认字号" },
              ...[12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72].map((n) => ({
                value: `${n}px`,
                label: `${n} px`,
              })),
            ]}
            onValueChange={(fontSize) =>
              editor
                .chain()
                .focus()
                .setMark("textStyle", { fontSize: fontSize || null })
                .run()
            }
          />
          <span className={styles.divider} />
          {!state.image &&
            button(
              "左对齐",
              "align-left",
              () => editor.chain().focus().setTextAlign("left").run(),
              state.alignment === "left",
            )}
          {!state.image &&
            button(
              "居中对齐",
              "align-center",
              () => editor.chain().focus().setTextAlign("center").run(),
              state.alignment === "center",
            )}
          {!state.image &&
            button(
              "右对齐",
              "align-right",
              () => editor.chain().focus().setTextAlign("right").run(),
              state.alignment === "right",
            )}
          {state.image && (
            <ActionPopover
              label="图片设置"
              panelWidth={340}
              className={styles.insertButton}
              triggerContent={
                <>
                  <Icon name="image" />
                  图片
                </>
              }
            >
              {(close) => (
                <ImageForm
                  key={state.imageSettings}
                  editor={editor}
                  close={close}
                />
              )}
            </ActionPopover>
          )}
          {state.table && (
            <ActionPopover
              label="表格操作"
              className={styles.insertButton}
              triggerContent={
                <>
                  <Icon name="table" />
                  表格
                </>
              }
            >
              {(close) => (
                <div className={styles.menu}>
                  {[
                    [
                      "下方插入行",
                      () => editor.chain().focus().addRowAfter().run(),
                    ],
                    [
                      "右侧插入列",
                      () => editor.chain().focus().addColumnAfter().run(),
                    ],
                    [
                      "删除当前行",
                      () => editor.chain().focus().deleteRow().run(),
                    ],
                    [
                      "删除当前列",
                      () => editor.chain().focus().deleteColumn().run(),
                    ],
                    [
                      "合并单元格",
                      () => editor.chain().focus().mergeCells().run(),
                    ],
                    [
                      "拆分单元格",
                      () => editor.chain().focus().splitCell().run(),
                    ],
                    [
                      "删除表格",
                      () => editor.chain().focus().deleteTable().run(),
                    ],
                  ].map(([name, run]) => (
                    <Button
                      key={name as string}
                      onClick={() => {
                        (run as () => void)();
                        close();
                      }}
                    >
                      {name as string}
                    </Button>
                  ))}
                </div>
              )}
            </ActionPopover>
          )}
        </div>
      )}
    </div>
  );
}
function LinkForm({ editor, close }: { editor: Editor; close: () => void }) {
  const [url, setUrl] = useState(
    String(editor.getAttributes("link").href ?? "https://"),
  );
  const [error, setError] = useState("");
  return (
    <Form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (!/^(https?:\/\/|mailto:|\/|#|site:\/\/media\/)/i.test(url)) {
          setError("请填写 HTTP、HTTPS、邮箱或站内链接。");
          return;
        }
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: url })
          .run();
        close();
      }}
    >
      <label>
        链接地址
        <TextField
          aria-label="链接地址"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <div>
        <Button
          className="admin-button"
          onClick={() => {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            close();
          }}
        >
          移除链接
        </Button>
        <Button type="submit" className="admin-button admin-button-primary">
          应用
        </Button>
      </div>
    </Form>
  );
}
function ImageForm({ editor, close }: { editor: Editor; close: () => void }) {
  const attrs = editor.getAttributes("image");
  const [alt, setAlt] = useState(String(attrs.alt ?? "")),
    [caption, setCaption] = useState(String(attrs.caption ?? "")),
    [width, setWidth] = useState(String(attrs.width ?? "")),
    [alignment, setAlignment] = useState(String(attrs.alignment ?? ""));
  return (
    <Form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        editor
          .chain()
          .focus()
          .updateAttributes("image", {
            alt,
            caption: caption || null,
            width: width ? Math.max(40, Math.min(2400, Number(width))) : null,
            alignment: alignment || null,
          })
          .run();
        close();
      }}
    >
      <label>
        替代文本
        <TextField
          value={alt}
          maxLength={1000}
          onChange={(e) => setAlt(e.target.value)}
        />
      </label>
      <label>
        图片说明
        <TextField
          value={caption}
          maxLength={2000}
          onChange={(e) => setCaption(e.target.value)}
        />
      </label>
      <label>
        宽度（px）
        <TextField
          type="number"
          min={40}
          max={2400}
          value={width}
          onChange={(e) => setWidth(e.target.value)}
        />
      </label>
      <Select
        name="image-alignment"
        label="图片对齐"
        options={[
          { value: "", label: "默认对齐" },
          { value: "left", label: "左对齐" },
          { value: "center", label: "居中" },
          { value: "right", label: "右对齐" },
        ]}
        value={alignment}
        onValueChange={setAlignment}
      />
      <Button type="submit" className="admin-button admin-button-primary">
        应用
      </Button>
    </Form>
  );
}
