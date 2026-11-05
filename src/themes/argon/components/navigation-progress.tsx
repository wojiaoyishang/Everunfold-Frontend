"use client";
import { UiText } from "@/core/i18n/provider";

import { useEffect, useRef, type CSSProperties } from "react";
import type { NavigationFailure } from "@/core/navigation/document";
import { NAVIGATION_FAILURE_HOLD_MS } from "@/core/navigation/transaction";
import { useRouteState } from "./route-state";

const failureText: Record<NavigationFailure, string> = {
  timeout: "加载超时，原页面已保留",
  network: "连接中断，原页面已保留",
  "not-found": "没有找到这页，原页面已保留",
  unavailable: "页面暂不可用，原页面已保留",
  render: "内容未准备好，原页面已保留",
  sync: "后端同步失败，文章暂时无法打开，原页面已保留",
};

export function NavigationProgress() {
  const { feedback, pending } = useRouteState();
  const bar = useRef<HTMLSpanElement>(null);
  const progress = useRef({ id: 0, value: 0 });
  const expanded = feedback.phase === "slow" || feedback.phase === "failed";
  const failed = feedback.phase === "failed";
  useEffect(() => {
    const line = bar.current;
    if (!line) return;
    if (progress.current.id !== feedback.id)
      progress.current = { id: feedback.id, value: 0.08 };
    const write = (value: number) => {
      progress.current.value = value;
      line.style.transform = `scaleX(${value})`;
    };
    if (pending) {
      write(Math.max(0.08, progress.current.value));
      const timer = setInterval(
        () =>
          write(
            Math.min(
              0.92,
              progress.current.value + (0.94 - progress.current.value) * 0.1,
            ),
          ),
        220,
      );
      return () => clearInterval(timer);
    }
    write(feedback.phase === "complete" ? 1 : 0);
  }, [feedback.id, feedback.phase, pending]);
  return (
    <div
      className="navigation-progress"
      data-state={feedback.phase}
      data-expanded={expanded}
      data-attention={failed && feedback.attention === true}
      style={
        {
          "--navigation-hold-duration": `${NAVIGATION_FAILURE_HOLD_MS}ms`,
        } as CSSProperties
      }
    >
      <span ref={bar} className="navigation-line" aria-hidden="true" />
      <span className="navigation-countdown" aria-hidden="true" />
      <span className="navigation-countdown-trail" aria-hidden="true">
        {[0, 1, 2, 3].map((bubble) => (
          <span className="navigation-countdown-bubble" key={bubble} />
        ))}
      </span>
      <div
        className="navigation-message"
        inert={!expanded}
        aria-hidden={!expanded}
      >
        <div className="navigation-message-copy">
          <span className="navigation-face" aria-hidden="true">
            {failed ? "(╥﹏╥)" : "(ง •̀_•́)ง"}
          </span>
          <span>
            {failed ? (
              failureText[feedback.failure ?? "network"]
            ) : (
              <UiText text="正在努力加载，再等一下…" />
            )}
          </span>
        </div>
      </div>
      <span
        className="sr-only"
        role={failed ? "alert" : "status"}
        aria-live={failed ? "assertive" : "polite"}
      >
        {failed ? (
          `${failureText[feedback.failure ?? "network"]}。提示将自动收起，可再次点击原链接。`
        ) : pending ? (
          feedback.phase === "slow" ? (
            <UiText text="正在努力加载，当前页面可以继续阅读。" />
          ) : (
            <UiText text="正在加载下一页…" />
          )
        ) : (
          ""
        )}
      </span>
    </div>
  );
}
