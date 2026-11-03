"use client";
import { useId, useState } from "react";
import type { FontAsset } from "@/generated/settings-contract";
import { Select } from "../../components/ui/select";
import { Modal } from "../../components/ui/modal";
import { FontLibraryPage } from "./page";

/** A picker uses the same upload, preview and paging view as the library route. */
export function FontField({
  value,
  onChange,
  fonts,
  label = "默认字体",
  className,
}: {
  value: string;
  onChange: (id: string, font?: FontAsset) => void;
  fonts: FontAsset[];
  label?: string;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false),
    [closing, setClosing] = useState(false),
    [picked, setPicked] = useState<FontAsset | null>(null),
    [pending, setPending] = useState<FontAsset | null>(null);
  const choices =
    picked && !fonts.some((f) => f.id === picked.id)
      ? [picked, ...fonts]
      : fonts;
  const options = [
    { value: "", label: "默认字体" },
    ...choices.map((font) => ({
      value: font.id,
      label: `${font.info.family} · ${font.info.format.toUpperCase()}`,
    })),
    ...(!choices.some((f) => f.id === value) && value
      ? [{ value, label: "已选字体" }]
      : []),
    { value: "__library", label: "从字体库选择…" },
  ];
  return (
    <>
      <Select
        name={id}
        label={label}
        className={className}
        options={options}
        value={value}
        onValueChange={(selected) => {
          if (selected === "__library") {
            setPending(null);
            setClosing(false);
            setOpen(true);
          } else
            onChange(
              selected,
              choices.find((font) => font.id === selected),
            );
        }}
      />
      {open && (
        <Modal
          title="选择字体"
          onClose={() => setClosing(true)}
          closing={closing}
          onExited={() => {
            if (pending) {
              setPicked(pending);
              onChange(pending.id, pending);
            }
            setOpen(false);
            setClosing(false);
            setPending(null);
          }}
          closeLabel="关闭字体选择"
        >
          <div inert={closing}>
            <FontLibraryPage
              compact
              onSelect={(font) => {
                setPending(font);
                setClosing(true);
              }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
