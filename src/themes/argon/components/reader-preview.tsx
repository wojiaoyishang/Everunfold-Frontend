"use client";

import { useEffect } from "react";
import { useReaderData, useStatusSlot } from "./reader-data";
import { Button } from "./ui/primitives";

/** Article-owned demo capability. Other pages need not request identity or render these controls. */
export function ReaderPreviewRegistration() {
  const { store, route } = useReaderData();
  useEffect(() => store.registerIdentity(route), [store, route]);
  useStatusSlot("reader:preview", ReaderPreviewControls);
  return null;
}

function ReaderPreviewControls() {
  const { store, snapshot } = useReaderData();
  const loading = snapshot.identity.status === "loading";
  const identity =
    snapshot.identity.status === "ready" ? snapshot.identity.value : null;
  return (
    <div className="backend-demo-controls">
      <div className="backend-demo-heading">
        <span className="preview-badge">联调演示</span>
        <span className="backend-demo-identity" role="status">
          {identity
            ? identity.persona === "member"
              ? "演示读者 · 已登录"
              : "演示访客 · 未登录"
            : loading
              ? "正在检查演示身份"
              : "演示身份尚未确认"}
        </span>
      </div>
      <div
        className="backend-demo-options"
        role="group"
        aria-label="演示登录状态"
      >
        <Button
          aria-pressed={identity?.persona === "guest"}
          disabled={loading || snapshot.offline}
          onClick={() => store.selectPersona("guest")}
        >
          演示访客
        </Button>
        <Button
          aria-pressed={identity?.persona === "member"}
          disabled={loading || snapshot.offline}
          onClick={() => store.selectPersona("member")}
        >
          演示读者
        </Button>
      </div>
      <p className="backend-demo-note">模拟身份与浏览量，不产生真实记录。</p>
    </div>
  );
}
