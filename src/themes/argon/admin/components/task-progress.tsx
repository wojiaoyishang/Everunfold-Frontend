"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useTaskProgress,
  type TaskIdentity,
  type TaskMonitor,
} from "@/core/tasks/use-task-progress";
import { UiText, useT } from "@/core/i18n/provider";
import { copyText } from "@/core/browser/clipboard";
import {
  orderedTaskEvents,
  taskCompletionLog,
  taskLogPresentation,
} from "@/core/tasks/task-log";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import styles from "./task-progress.module.css";
const states: Record<string, string> = {
  queued: "等待执行",
  running: "执行中",
  succeeded: "已完成",
  failed: "执行失败",
  unknown: "结果待确认",
  cancelled: "已取消",
};
const stages: Record<string, string> = {
  ...states,
  connecting: "连接邮件服务器",
  greeting: "读取 SMTP 服务能力",
  encryption: "建立加密连接",
  authentication: "验证发件身份",
  envelope: "提交发件与收件地址",
  message: "传输邮件报文",
  sent: "邮件服务器已接收",
  started: "开始执行任务",
  complete: "任务执行完成",
};
const connections: Record<string, string> = {
  connecting: "正在读取任务进度…",
  live: "持续监控中",
  reconnecting: "正在重新连接",
  paused: "页面隐藏，监控已暂停",
  stopped: "本次监控已结束",
};
const logTime = (value: string | undefined) =>
  value
    ? new Date(value).toLocaleTimeString("en-GB", { hour12: false })
    : "--:--:--";
export function ConnectedTaskProgress({
  identity,
}: {
  identity: TaskIdentity;
}) {
  const monitor = useTaskProgress(identity);
  return <TaskProgressPanel monitor={monitor} />;
}

/** A reusable presentation for durable task snapshots and incrementally loaded logs. */
export function TaskProgressPanel({ monitor }: { monitor: TaskMonitor }) {
  const { data, events, running, connection, error, truncated, refresh } =
    monitor;
  const [following, setFollowing] = useState(true);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const log = useRef<HTMLDivElement>(null),
    t = useT();
  const orderedEvents = useMemo(() => orderedTaskEvents(events), [events]);
  const completion = taskCompletionLog(data?.state ?? "");
  const followKey = `${orderedEvents.at(-1)?.sequence ?? 0}:${data?.state ?? ""}:${data?.finished_at ?? ""}`;
  useEffect(() => {
    if (!following) return;
    const frame = requestAnimationFrame(() => {
      if (log.current) log.current.scrollTop = log.current.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [followKey, following]);
  useEffect(() => {
    if (copyState === "idle") return;
    const timer = window.setTimeout(() => setCopyState("idle"), 1600);
    return () => window.clearTimeout(timer);
  }, [copyState]);
  const copyLog = async () => {
    const lines = orderedEvents.map((event) => {
      const presentation = taskLogPresentation(event);
      return `${String(event.sequence).padStart(4, "0")}\t${logTime(event.at)}\t${presentation.badge}\t${event.message}`;
    });
    if (completion) {
      lines.push(
        `END\t${logTime(data?.finished_at ?? data?.updated_at)}\t${completion.badge}\t${completion.message}`,
      );
    }
    try {
      await copyText(lines.join("\n"));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };
  const percent = data?.percent;
  const stageText = data
    ? data.stage && data.stage !== data.state
      ? (stages[data.stage] ?? data.stage)
      : null
    : connections[connection];
  const hasCount = data?.completed != null && data.total != null;
  return (
    <section className={styles.panel} aria-label={t("任务进度与日志")}>
      <div className={styles.heading}>
        <div className={styles.summary}>
          <strong>
            <UiText text="任务进度" />
          </strong>
          <span data-state={data?.state}>
            <UiText text={states[data?.state ?? ""] ?? "正在读取"} />
          </span>
        </div>
        <Button className="admin-button" onClick={refresh}>
          <Icon name="refresh" />
          <UiText text="刷新状态" />
        </Button>
      </div>
      {(stageText || percent != null || hasCount) && (
        <div className={styles.stage} aria-live="polite">
          {stageText && (
            <span>
              <UiText text={stageText} />
            </span>
          )}
          {percent != null && <strong>{Math.round(percent)}%</strong>}
          {data?.completed != null && data.total != null && (
            <small>
              {data.completed} / {data.total} {data.unit ?? ""}
            </small>
          )}
        </div>
      )}
      {(running || percent != null) && (
        <div
          className={styles.progress}
          role="progressbar"
          aria-label={t("任务进度")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent ?? undefined}
          data-indeterminate={percent == null}
        >
          <span
            style={percent == null ? undefined : { width: `${percent}%` }}
          />
        </div>
      )}
      <p className={styles.connection} role="status">
        <UiText text={error || connections[connection]} />
      </p>
      {truncated && (
        <p className={styles.connection}>
          <UiText text="当前显示最近 1000 条日志。" />
        </p>
      )}
      <div className={styles.terminal} data-task-terminal="true">
        <div className={styles.terminalBar} data-task-terminal-titlebar="true">
          <span className={styles.terminalDots} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <code>task.log</code>
          <span className={styles.terminalCount}>
            {orderedEvents.length + (completion ? 1 : 0)}
          </span>
          <div className={styles.terminalTools}>
            <span className={styles.terminalState} data-connection={connection}>
              <UiText text={connections[connection]} />
            </span>
            <Button
              className={styles.terminalAction}
              aria-pressed={following}
              title={t(following ? "暂停自动跟随" : "恢复自动跟随")}
              onClick={() => setFollowing((value) => !value)}
            >
              <span
                className={styles.followIndicator}
                data-active={following || undefined}
                aria-hidden="true"
              />
              <UiText text={following ? "跟随" : "恢复"} />
            </Button>
            <Button
              className={styles.terminalAction}
              disabled={!orderedEvents.length && !completion}
              title={t("复制全部日志")}
              onClick={() => void copyLog()}
            >
              <Icon name={copyState === "copied" ? "check" : "copy"} />
              <UiText
                text={
                  copyState === "copied"
                    ? "已复制"
                    : copyState === "failed"
                      ? "复制失败"
                      : "复制"
                }
              />
            </Button>
          </div>
        </div>
        <div
          ref={log}
          className={styles.log}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label={t("任务日志与报文")}
          tabIndex={0}
          onScroll={(event) => {
            const node = event.currentTarget;
            const nearEnd =
              node.scrollHeight - node.scrollTop - node.clientHeight < 24;
            setFollowing(nearEnd);
          }}
        >
          {!orderedEvents.length && (
            <p className={styles.empty}>
              <UiText
                text={running ? "等待任务写入日志…" : "此任务没有详细日志。"}
              />
            </p>
          )}
          {orderedEvents.map((event) => {
            const presentation = taskLogPresentation(event);
            return (
              <div
                className={styles.entry}
                data-tone={presentation.tone}
                key={event.sequence}
              >
                <span className={styles.sequence} aria-hidden="true">
                  {String(event.sequence).padStart(4, "0")}
                </span>
                <time dateTime={event.at}>{logTime(event.at)}</time>
                <span className={styles.level} title={t(presentation.label)}>
                  {presentation.badge}
                </span>
                <pre>{event.message}</pre>
              </div>
            );
          })}
          {completion && (
            <div
              className={styles.entry}
              data-tone={completion.tone}
              data-task-completion="true"
            >
              <span className={styles.sequence} aria-hidden="true">
                END
              </span>
              <time dateTime={data?.finished_at ?? data?.updated_at}>
                {logTime(data?.finished_at ?? data?.updated_at)}
              </time>
              <span className={styles.level}>{completion.badge}</span>
              <pre>{completion.message}</pre>
            </div>
          )}
          {!completion && !!orderedEvents.length && (
            <div className={styles.prompt} aria-hidden="true">
              <span>›</span>
              <span>
                <UiText text={running ? "等待新日志" : "任务输出结束"} />
              </span>
              {running && <i />}
            </div>
          )}
        </div>
      </div>
      <p className={styles.connection}>
        <UiText text="日志与报文按任务事件顺序记录。" />
      </p>
    </section>
  );
}
