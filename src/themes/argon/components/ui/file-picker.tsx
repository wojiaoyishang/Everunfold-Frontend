"use client";
import { useT } from "@/core/i18n/provider";
import { useFileDrop } from "@/core/media/use-file-drop";
import { useRef, type ReactNode, type Ref } from "react";
import { Button } from "./primitives";
import { Icon } from "../icon";
/** Shared file input boundary; resetting lets users retry selecting the same file. */
export function FilePicker({
  onFiles,
  disabled,
  label = "上传图标",
  className = "admin-button admin-button-primary",
  iconOnly = false,
  multiple = true,
  ref,
  display,
  accept = ".svg,.png,.webp,image/svg+xml,image/png,image/webp",
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  label?: string;
  accept?: string;
  className?: string;
  iconOnly?: boolean;
  multiple?: boolean;
  ref?: Ref<HTMLButtonElement>;
  display?: ReactNode;
}) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const drop = useFileDrop(onFiles, disabled);
  return (
    <>
      <input
        ref={input}
        type="file"
        multiple={multiple}
        hidden
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (files.length) onFiles(files);
        }}
      />
      <Button
        {...drop.handlers}
        ref={ref}
        data-file-drag={drop.active}
        className={className}
        title={t(label) + " · " + t("拖放文件到这里")}
        aria-label={t(label)}
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        <Icon name="upload" />
        {!iconOnly && (display ?? label)}
      </Button>
      {drop.message && <span role="status">{t(drop.message)}</span>}
    </>
  );
}
