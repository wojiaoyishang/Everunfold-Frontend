"use client";

import { useId } from "react";
import { readerPhase, readerProgress } from "@/core/reader/state";
import { useReaderData, DynamicStatusExtensions } from "./reader-data";
import { Button, Popover } from "./ui/primitives";
import { LoadingRing } from "./ui/loading-ring";
import { useAnchoredPopover } from "./ui/use-anchored-popover";
import { Icon, type IconName } from "./icon";

const phases = {
  idle: { text: "尚未检查动态数据", icon: "cloud" },
  updating: { text: "正在更新动态数据", icon: "cloud" },
  ready: { text: "本页动态数据已更新", icon: "cloud-check" },
  partial: { text: "部分动态数据未更新", icon: "cloud-off" },
  unavailable: { text: "动态数据暂不可用", icon: "cloud-off" },
  offline: { text: "当前网络离线", icon: "cloud-off" },
} satisfies Record<string, { text: string; icon: IconName }>;

export function BackendStatus() {
  const id = useId();
  const {
    trigger,
    panel,
    open,
    ready,
    onBeforeToggle,
    onToggle,
    onPanelKeyDown,
  } = useAnchoredPopover(312);
  const { store, snapshot } = useReaderData();
  const phase = readerPhase(snapshot);
  const presentation = phases[phase];
  const loading = phase === "updating";
  const progress = readerProgress(snapshot);
  const progressText = progress.total
    ? `已检查 ${progress.settled}/${progress.total} 项${progress.failed ? `，${progress.failed} 项失败` : ""}`
    : "";
  return (
    <>
      <Button
        ref={trigger}
        className="icon-button backend-status"
        data-status={phase}
        aria-label={`动态数据状态：${presentation.text}`}
        title={[presentation.text, progressText].filter(Boolean).join(" · ")}
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="dialog"
        popoverTarget={id}
        disabled={!ready}
      >
        <Icon name={presentation.icon} />
        <LoadingRing active={loading} progress={progress.fraction} />
        <span className="sr-only">{progressText}</span>
      </Button>
      <Popover
        ref={panel}
        id={id}
        role="dialog"
        aria-labelledby={`${id}-title`}
        className="backend-status-panel ui-anchored-panel"
        onToggle={onToggle}
        onBeforeToggle={onBeforeToggle}
        onKeyDown={onPanelKeyDown}
      >
        <div className="backend-status-heading">
          <span className="backend-status-symbol">
            <Icon name={presentation.icon} />
          </span>
          <div>
            <strong id={`${id}-title`}>动态数据状态</strong>
            <p role="status">{presentation.text}</p>
            {progress.total > 0 && <p>{progressText}</p>}
          </div>
        </div>
        {["partial", "unavailable", "offline"].includes(phase) && (
          <p className="backend-status-reading">已加载的页面仍可正常阅读。</p>
        )}
        <DynamicStatusExtensions />
        <div className="backend-status-footer">
          <span className="backend-status-time">
            {snapshot.completedAt !== null
              ? `更新于 ${new Date(snapshot.completedAt).toLocaleTimeString("zh-CN", { hour12: false })}`
              : loading
                ? "正在连接…"
                : "尚无更新记录"}
          </span>
          <Button
            className="backend-status-refresh"
            disabled={
              loading ||
              snapshot.offline ||
              !Object.keys(snapshot.requests).length
            }
            onClick={() => store.refresh()}
          >
            <Icon name="refresh" />
            {loading ? "正在更新" : "重新检查"}
          </Button>
        </div>
      </Popover>
    </>
  );
}
