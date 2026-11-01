"use client";
import { useRef } from "react";
import { Button } from "./primitives";
import { Icon } from "../icon";
/** Shared file input boundary; resetting lets users retry selecting the same file. */
export function FilePicker({
  onFiles,
  disabled,
  label = "上传图标",
  accept = ".svg,.png,.webp,image/svg+xml,image/png,image/webp",
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  label?: string;
  accept?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
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
        className="admin-button admin-button-primary"
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        <Icon name="upload" />
        {label}
      </Button>
    </>
  );
}
