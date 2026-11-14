"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/core/contracts/settings";
import type { MediaURL } from "@/core/contracts/content-admin";
import { mediaMarkup } from "@/core/content-management/editor-fields";
import type {
  CapturedInsertion,
  CodeEditorHandle,
} from "../../components/ui/code-editor";
import { RegisteredBlockEditor } from "../content/plugins/registry";
import { MediaPickerDialog } from "../media/media-picker-dialog";
import { ShortcodePicker } from "../shortcodes/picker";

/** Supplies the media and shortcode pickers to the registered block editor. */
export function BuilderBlockSourceEditor({
  format,
  label,
  value,
  onChange,
  onMedia,
  media,
  modeControls,
  autoFocus = false,
}: {
  format: "html" | "markdown";
  label: string;
  value: string;
  onChange: (value: string) => void;
  onMedia: (item: MediaItem) => void;
  media?: Record<string, MediaURL>;
  modeControls: HTMLElement | null;
  autoFocus?: boolean;
}) {
  const [picker, setPicker] = useState<
    "image" | "video" | "all" | "shortcode" | null
  >(null);
  const editor = useRef<CodeEditorHandle>(null);
  const insertion = useRef<CapturedInsertion>(undefined);
  const focusFrame = useRef(0);
  const openPicker = (next: NonNullable<typeof picker>) => {
    insertion.current?.dispose?.();
    insertion.current = editor.current?.captureInsertion();
    setPicker(next);
  };
  const closePicker = () => {
    insertion.current?.dispose?.();
    insertion.current = undefined;
    setPicker(null);
    cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => editor.current?.focus());
  };
  useEffect(
    () => () => {
      insertion.current?.dispose?.();
      cancelAnimationFrame(focusFrame.current);
    },
    [],
  );

  return (
    <>
      <RegisteredBlockEditor
        format={format}
        label={label}
        value={value}
        onChange={onChange}
        disabled={false}
        editorRef={editor}
        media={media}
        modeControls={modeControls}
        autoFocus={autoFocus}
        initialView={autoFocus ? "visual" : undefined}
        onMedia={openPicker}
        onShortcode={() => openPicker("shortcode")}
      />
      {picker === "shortcode" ? (
        <ShortcodePicker
          format={format}
          media={media}
          onMedia={onMedia}
          onPick={(source) => insertion.current?.(source)}
          onClose={closePicker}
        />
      ) : (
        picker && (
          <MediaPickerDialog
            kind={picker}
            onPick={(item) => {
              onMedia(item);
              insertion.current?.(mediaMarkup(item, format));
            }}
            onClose={closePicker}
          />
        )
      )}
    </>
  );
}
