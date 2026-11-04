"use client";
import { useId } from "react";
import type { SourceCommand } from "@/core/editor/source-commands";
import { Icon, type IconName } from "../../../components/icon";
import { Button } from "../../../components/ui/primitives";
import { FilePicker } from "../../../components/ui/file-picker";
import { Select } from "../../../components/ui/select";
import styles from "./source-block-editor.module.css";
export interface SourceAction {
  label: string;
  icon: IconName;
  command: SourceCommand;
  hint?: string;
}
const headingOptions = [
  { value: "0", label: "正文" },
  ...Array.from({ length: 6 }, (_, i) => ({
    value: String(i + 1),
    label: `标题 ${i + 1}`,
  })),
];

export function SourceToolbar({
  label,
  disabled,
  format,
  heading,
  actions,
  inserts,
  onCommand,
  onIndent,
  onMedia,
  onUpload,
}: {
  label: string;
  disabled: boolean;
  format: "markdown" | "html";
  heading: number;
  actions: readonly SourceAction[];
  inserts: readonly SourceAction[];
  onCommand: (command: SourceCommand) => void;
  onIndent: (direction: -1 | 1) => void;
  onMedia?: (kind: "image" | "all") => void;
  onUpload?: (files: File[]) => void;
}) {
  const id = useId();
  const formatLabel = format === "markdown" ? "Markdown" : "HTML";
  const buttons = (items: readonly SourceAction[]) =>
    items.map((action) => (
      <Button
        key={action.label}
        className={styles.tool}
        disabled={disabled}
        title={action.label + (action.hint ? " (" + action.hint + ")" : "")}
        aria-label={action.label}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onCommand(action.command)}
      >
        <Icon name={action.icon} />
      </Button>
    ));
  return (
    <div
      className={styles.tools}
      role="toolbar"
      aria-label={formatLabel + " 工具栏"}
    >
      <Select
        name={id + "-heading"}
        label={label + " 段落样式"}
        options={headingOptions}
        value={String(heading)}
        disabled={disabled}
        onValueChange={(level) =>
          onCommand({ kind: "heading", level: Number(level), format })
        }
      />
      <div className={styles.toolGroup}>{buttons(actions)}</div>
      <div className={styles.insertGroup} role="group" aria-label="插入">
        {buttons(inserts)}
        <Button
          className={styles.tool}
          title="插入图片"
          aria-label="插入图片"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onMedia?.("image")}
        >
          <Icon name="image" />
        </Button>
        <Button
          className={styles.tool}
          title="插入媒体或附件"
          aria-label="插入媒体或附件"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onMedia?.("all")}
        >
          <Icon name="folder" />
        </Button>
        {onUpload && (
          <FilePicker
            className={styles.tool}
            iconOnly
            label="上传图片"
            disabled={disabled}
            accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
            onFiles={onUpload}
          />
        )}
      </div>
      <div className={styles.insertGroup} role="group" aria-label="缩进">
        <Button
          className={styles.tool}
          disabled={disabled}
          aria-label="增加缩进"
          title="增加缩进"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onIndent(1)}
        >
          <Icon name="indent-more" />
        </Button>
        <Button
          className={styles.tool}
          disabled={disabled}
          aria-label="减少缩进"
          title="减少缩进"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onIndent(-1)}
        >
          <Icon name="indent-less" />
        </Button>
      </div>
    </div>
  );
}
