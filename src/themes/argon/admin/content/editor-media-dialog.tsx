"use client";
import { useState } from "react";
import type { MediaItem } from "@/generated/settings-contract";
import { Modal } from "../../components/ui/modal";
import { MediaBrowser } from "../media/media-browser";
export function EditorMediaDialog({
  kind = "all",
  onPick,
  onClose,
}: {
  kind?: "all" | "image";
  onPick: (item: MediaItem) => void;
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  return (
    <Modal
      title={kind === "image" ? "选择封面" : "插入媒体"}
      closing={closing}
      onClose={() => setClosing(true)}
      onExited={() => {
        if (selected) onPick(selected);
        onClose();
      }}
    >
      <div inert={closing}>
        <MediaBrowser
          kind={kind}
          onSelect={(item) => {
            setSelected(item);
            setClosing(true);
          }}
        />
      </div>
    </Modal>
  );
}
