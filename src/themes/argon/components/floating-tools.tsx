"use client";
import { Button } from "@/themes/argon/components/ui/primitives";

import { useEffect, type CSSProperties, type ReactNode } from "react";
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
      <ToolSlot visible={scroll >= 400}>
        <Button
          className="floating-button back-to-top"
          type="button"
          aria-label="返回顶部"
          title="返回顶部"
          onClick={() => void scrollToPosition(0, 800)}
        >
          <Icon name="up" />
        </Button>
      </ToolSlot>
      <ToolSlot visible={reading.comments}>
        <Button
          className="floating-button"
          type="button"
          aria-label="前往评论"
          title="前往评论"
          onClick={() => scrollToAnchor("#comments")}
        >
          <Icon name="comment" />
        </Button>
      </ToolSlot>
      <ToolSlot>
        <ThemeToggle className="floating-button" />
      </ToolSlot>
      <ToolSlot>
        <ReadingSettings />
      </ToolSlot>
      <ToolSlot visible={reading.showProgress}>
        <div
          className="reading-progress"
          role="progressbar"
          aria-label="阅读进度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={reading.progress}
          style={
            { "--reading-progress": `${reading.progress}%` } as CSSProperties
          }
        >
          <span>{reading.progress}%</span>
        </div>
      </ToolSlot>
    </div>
  );
}
