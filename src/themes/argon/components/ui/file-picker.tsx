"use client";
import { useRef } from "react";
import { Button } from "./primitives";
import { Icon } from "../icon";
/** Shared file input boundary; resetting lets users retry selecting the same file. */
export function FilePicker({
  onFile,
  disabled,
  label = "上传图标",
  accept = ".svg,.png,.webp,image/svg+xml,image/png,image/webp",
}: {
  onFile: (file: File) => void;
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
        hidden
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) onFile(file);
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
