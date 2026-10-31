"use client";
import { useEffect, useRef } from "react";
import type { NavigationFailure } from "@/core/navigation/document";
import { useRouteState } from "./route-state";
import { Icon } from "./icon";

const failureText: Record<NavigationFailure, string> = {
  timeout: "加载超时，这次没能取回内容。",
  network: "连接中断，暂时没能打开这页。",
  "not-found": "没有找到这页，内容可能已移走。",
  unavailable: "加载失败，这页暂时无法读取。",
  render: "加载失败，内容还没有准备好。",
};

export function NavigationProgress() {
  const { feedback, cancel, retry, pending } = useRouteState();
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
    >
      <span ref={bar} className="navigation-line" aria-hidden="true" />
      <div
        className="navigation-message"
        inert={!expanded}
        aria-hidden={!expanded}
      >
        <div className="navigation-message-copy">
          <span className="navigation-face" aria-hidden="true">
            {failed ? "(｡•́︿•̀｡)" : "(ง •̀_•́)ง"}
          </span>
          <span>
            {failed
              ? failureText[feedback.failure ?? "network"]
              : "正在努力加载，再等我一下…"}
          </span>
        </div>
        {failed && (
          <div className="navigation-message-actions">
            <button type="button" onClick={retry}>
              <Icon name="retry" />
              再试一次
            </button>
            <button type="button" onClick={cancel}>
              继续阅读
            </button>
          </div>
        )}
        <button
          type="button"
          className="navigation-dismiss"
          onClick={cancel}
          aria-label={failed ? "关闭加载提示" : "取消加载"}
          title={failed ? "关闭提示，继续阅读" : "取消加载"}
        >
          <Icon name="close" />
        </button>
      </div>
      <span
        className="sr-only"
        role={failed ? "alert" : "status"}
        aria-live={failed ? "assertive" : "polite"}
      >
        {failed
          ? `${failureText[feedback.failure ?? "network"]} 当前页面已保留，可以重试或继续阅读。`
          : pending
            ? feedback.phase === "slow"
              ? "正在努力加载，当前页面可以继续阅读。"
              : "正在加载下一页…"
            : ""}
      </span>
    </div>
  );
}
