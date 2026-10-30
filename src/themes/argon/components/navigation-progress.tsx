"use client";

import { useEffect, useRef } from "react";
import { useRouteState } from "./route-state";

export function NavigationProgress() {
  const { pending } = useRouteState();
  const container = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const progress = useRef(0);
  useEffect(() => {
    const element = container.current;
    const line = bar.current;
    if (!element || !line) return;
    let interval = 0;
    let reset = 0;
    const write = (value: number) => {
      progress.current = value;
      line.style.transform = `scaleX(${value})`;
    };
    const delay = window.setTimeout(
      () => {
        if (pending) {
          element.dataset.state = "loading";
          write(
            progress.current >= 1 ? 0.08 : Math.max(0.08, progress.current),
          );
          interval = window.setInterval(
            () =>
              write(
                Math.min(
                  0.92,
                  progress.current + (0.94 - progress.current) * 0.12,
                ),
              ),
            220,
          );
        } else if (element.dataset.state === "loading") {
          write(1);
          element.dataset.state = "complete";
          reset = window.setTimeout(() => {
            element.dataset.state = "idle";
            write(0);
          }, 460);
        }
      },
      pending ? 80 : 0,
    );
    return () => {
      clearTimeout(delay);
      clearTimeout(reset);
      clearInterval(interval);
    };
  }, [pending]);
  return (
    <>
      <div
        ref={container}
        className="navigation-progress"
        data-state="idle"
        aria-hidden="true"
      >
        <span ref={bar} />
      </div>
      <div className="navigation-status" role="status" aria-live="polite">
        {pending ? "正在加载下一页…" : ""}
      </div>
    </>
  );
}
