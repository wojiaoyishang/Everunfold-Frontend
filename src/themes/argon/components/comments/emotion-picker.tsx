"use client";
import { UiText } from "@/core/i18n/provider";

import { Button } from "@/themes/argon/components/ui/primitives";

import Image from "next/image";
import { useState } from "react";
import { stickerGroups } from "@/core/rendering/stickers";

const textGroups = [
  {
    id: "emoji",
    label: "Emoji",
    items: [
      "✨",
      "☕",
      "🌙",
      "💛",
      "🌱",
      "🔥",
      "😊",
      "🥹",
      "😂",
      "🐾",
      "🌈",
      "🍃",
      "👍",
      "🎉",
      "💭",
      "🥰",
    ],
  },
  {
    id: "faces",
    label: "颜文字",
    items: [
      "(๑•̀ㅂ•́)و✧",
      "|´・ω・)ノ",
      "ヾ(≧∇≦*)ゝ",
      "(☆ω☆)",
      "(/ω＼)",
      "٩(ˊᗜˋ*)و",
      "(ノ°ο°)ノ",
      "(ฅ´ω`ฅ)",
    ],
  },
];
export function EmotionPicker({
  onInsert,
}: {
  onInsert: (text: string, formatted: boolean) => void;
}) {
  const [group, setGroup] = useState("emoji");
  const text = textGroups.find((item) => item.id === group);
  const stickers = stickerGroups.find((item) => item.id === group);
  return (
    <div className="emotion-picker">
      <div className="emotion-tabs" role="group" aria-label="表情分组">
        {[...textGroups, ...stickerGroups].map((item) => (
          <Button
            type="button"
            key={item.id}
            aria-pressed={group === item.id}
            onClick={() => setGroup(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <div className="emotion-grid" data-kind={stickers ? "sticker" : group}>
        {text?.items.map((item) => (
          <Button
            type="button"
            key={item}
            aria-label={`插入 ${item}`}
            onClick={() => onInsert(item, false)}
          >
            {item}
          </Button>
        ))}
        {stickers?.items.map((item) => (
          <Button
            type="button"
            key={item.src}
            title={item.label}
            aria-label={`插入 ${item.label}`}
            onClick={() => onInsert(`![${item.label}](${item.src})`, true)}
          >
            <Image
              src={item.src}
              alt={item.label}
              width={64}
              height={64}
              unoptimized
            />
          </Button>
        ))}
      </div>
      {group === "flower" && (
        <small>
          <UiText text="花！· 原主题贴纸，来源 k4yt3x/flowerhd" />
        </small>
      )}
    </div>
  );
}
