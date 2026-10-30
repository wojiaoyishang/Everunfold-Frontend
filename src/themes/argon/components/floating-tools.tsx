"use client";

import { useEffect, type ReactNode } from "react";
import {
  installScrollBehavior,
  scrollToAnchor,
  scrollToPosition,
} from "@/core/browser/scroll";
import { navigateToAnchor } from "@/core/browser/scroll-restoration";
import { useScrollPosition } from "../hooks/use-scroll-position";
import { useReadingState } from "./reading-state";
import { ThemeToggle } from "./controls";
import { ReadingSettings } from "./reading-settings";
import { Icon } from "./icon";

function ToolSlot({
  visible = true,
  children,
}: {
  visible?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="tool-slot"
      data-visible={visible}
      aria-hidden={!visible}
      inert={!visible}
    >
      <div className="tool-slot-inner">{children}</div>
    </div>
  );
}

export function FloatingTools() {
  const scroll = useScrollPosition();
  const reading = useReadingState();
  useEffect(() => installScrollBehavior(navigateToAnchor), []);
  return (
    <div className="floating-tools" role="group" aria-label="阅读工具">
      <ToolSlot visible={reading.article && scroll > 100}>
        <div
          className="reading-progress"
          aria-label={`阅读进度 ${reading.progress}%`}
          style={{ backgroundSize: `${reading.progress}% 100%` }}
        >
          {reading.progress}%
        </div>
      </ToolSlot>
      <ToolSlot visible={scroll >= 400}>
        <button
          className="floating-button back-to-top"
          type="button"
          aria-label="返回顶部"
          title="返回顶部"
          onClick={() => void scrollToPosition(0, 800)}
        >
          <Icon name="up" />
        </button>
      </ToolSlot>
      <ToolSlot visible={reading.comments}>
        <button
          className="floating-button"
          type="button"
          aria-label="前往评论"
          title="前往评论"
          onClick={() => scrollToAnchor("#comments")}
        >
          <Icon name="comment" />
        </button>
      </ToolSlot>
      <ToolSlot>
        <ThemeToggle className="floating-button" />
      </ToolSlot>
      <ToolSlot>
        <ReadingSettings />
      </ToolSlot>
    </div>
  );
}
