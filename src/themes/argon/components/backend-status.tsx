"use client";
import { UiText, useLocale, useT } from "@/core/i18n/provider";

import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { usePublicAccount } from "@/core/auth/use-public-account";
import { readerPhase, readerProgress } from "@/core/reader/state";
import { useReaderData, DynamicStatusExtensions } from "./reader-data";
import { Button, Popover } from "./ui/primitives";
import { LoadingRing } from "./ui/loading-ring";
import { useAnchoredPopover } from "./ui/use-anchored-popover";
import { Icon, type IconName } from "./icon";
import { BackendAccount } from "./backend-account";
import { BackendStatusAvatar } from "./backend-status-avatar";
import { afterDialogMotion } from "../hooks/dialog-motion";

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
  const t = useT();
  const { uiLocale } = useLocale();
  const leaving = useRef<(() => void) | null>(null);
  useEffect(() => () => leaving.current?.(), []);
  const {
    trigger,
    panel,
    open,
    ready,
    onBeforeToggle,
    onToggle,
    onPanelKeyDown,
  } = useAnchoredPopover(312, true);
  useLayoutEffect(() => {
    if (open)
      panel.current
        ?.querySelector<HTMLElement>(".backend-account-entry")
        ?.focus({ preventScroll: true });
  }, [open, panel]);
  const { store, snapshot } = useReaderData();
  const { state: account, check } = usePublicAccount(store.baseUrl);
  const user = account.phase === "ready" ? account.session.user : null;
  const phase = readerPhase(snapshot);
  const presentation = phases[phase];
  const loading = phase === "updating";
  const checking = account.phase === "checking";
  const warning = ["partial", "unavailable", "offline"].includes(phase);
  const progress = readerProgress(snapshot);
  const progressText = progress.total
    ? t("已检查 {settled}/{total} 项", {
        settled: progress.settled,
        total: progress.total,
      }) +
      (progress.failed
        ? t("，{failed} 项失败", { failed: progress.failed })
        : "")
    : "";
  return (
    <>
      <Button
        ref={trigger}
        className="icon-button backend-status"
        data-status={phase}
        data-account={user ? "ready" : account.phase}
        aria-label={t("云端同步与账号")}
        title={[user?.display_name, t(presentation.text), progressText]
          .filter(Boolean)
          .join(" · ")}
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="dialog"
        popoverTarget={id}
        disabled={!ready}
      >
        {user?.avatar_url ? (
          <BackendStatusAvatar
            key={`${user.id}:${user.avatar_url}`}
            src={user.avatar_url}
            settled={!loading && !checking}
            fallback={presentation.icon}
          />
        ) : (
          <Icon name={presentation.icon} />
        )}
        <LoadingRing
          active={loading || checking}
          progress={checking ? undefined : progress.fraction}
        />
        <span className="sr-only">{progressText}</span>
      </Button>
      <Popover
        ref={panel}
        id={id}
        role="dialog"
        aria-labelledby={`${id}-title`}
        className="backend-status-panel ui-anchored-panel"
        onToggle={(event) => {
          onToggle(event);
          if (event.newState === "open") void check(true);
          else if (
            document.activeElement === document.body ||
            panel.current?.contains(document.activeElement)
          )
            trigger.current?.focus({ preventScroll: true });
        }}
        onBeforeToggle={onBeforeToggle}
        onKeyDown={onPanelKeyDown}
      >
        <BackendAccount
          state={account}
          onRetry={() => void check()}
          onNavigate={(event) => {
            event.preventDefault();
            if (leaving.current) return;
            panel.current?.hidePopover();
            // Public/private surfaces use a document navigation, as RouteLink does.
            leaving.current = afterDialogMotion(panel.current, () =>
              window.location.assign(
                new URL("/account", window.location.href).href,
              ),
            );
          }}
        />
        <div className="backend-status-heading">
          <span className="backend-status-symbol">
            <Icon name={presentation.icon} />
          </span>
          <div>
            <strong id={`${id}-title`}>
              <UiText text="云端同步" />
            </strong>
            <p role="status">
              <UiText text={presentation.text} />
            </p>
            {progress.total > 0 && <p>{progressText}</p>}
          </div>
        </div>
        {warning && (
          <p className="backend-status-reading">
            <UiText text="已加载的页面仍可正常阅读。" />
          </p>
        )}
        <DynamicStatusExtensions />
        <div className="backend-status-footer">
          <span className="backend-status-time">
            {snapshot.completedAt !== null ? (
              t("更新于 {time}", {
                time: new Date(snapshot.completedAt).toLocaleTimeString(
                  uiLocale,
                  { hour12: false },
                ),
              })
            ) : loading ? (
              <UiText text="正在连接…" />
            ) : (
              <UiText text="尚无更新记录" />
            )}
          </span>
          <Button
            className="backend-status-refresh"
            disabled={loading || snapshot.offline || checking}
            onClick={() => {
              store.refresh();
              void check(true);
            }}
          >
            <Icon name="refresh" />
            {loading ? <UiText text="正在更新" /> : <UiText text="重新检查" />}
          </Button>
        </div>
      </Popover>
    </>
  );
}
