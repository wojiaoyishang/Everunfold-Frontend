"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  useTaskProgress,
  type TaskIdentity,
  type TaskMonitor,
} from "@/core/tasks/use-task-progress";
import { UiText, useT } from "@/core/i18n/provider";
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
  const [expanded, setExpanded] = useState(true),
    [following, setFollowing] = useState(true);
  const log = useRef<HTMLDivElement>(null),
    id = useId(),
    t = useT();
  const sequence = events.at(-1)?.sequence;
  useEffect(() => {
    if (!following || !expanded) return;
    const frame = requestAnimationFrame(() => {
      if (log.current) log.current.scrollTop = log.current.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [sequence, following, expanded]);
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
      <div className={styles.logToolbar}>
        <Button
          className="admin-button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((value) => !value)}
        >
          <Icon name="code" />
          <UiText text={expanded ? "收起日志" : "查看日志与报文"} />
          <span className={styles.count}>{events.length}</span>
        </Button>
        {expanded && (
          <Button
            className="admin-button"
            aria-pressed={following}
            onClick={() => setFollowing((value) => !value)}
          >
            <Icon name="chevron-down" />
            <UiText text={following ? "跟随最新日志" : "继续跟随"} />
          </Button>
        )}
      </div>
      <div id={id} hidden={!expanded}>
        {truncated && (
          <p className={styles.connection}>
            <UiText text="当前显示最近 1000 条日志。" />
          </p>
        )}
        <div
          ref={log}
          className={styles.log}
          role="region"
          aria-label={t("任务日志与报文")}
          tabIndex={0}
          onScroll={(event) => {
            const node = event.currentTarget;
            const nearEnd =
              node.scrollHeight - node.scrollTop - node.clientHeight < 24;
            setFollowing(nearEnd);
          }}
        >
          {!events.length && (
            <p className={styles.empty}>
              <UiText
                text={running ? "等待任务写入日志…" : "此任务没有详细日志。"}
              />
            </p>
          )}
          {events.map((event) => (
            <div
              className={styles.entry}
              data-level={event.level}
              key={event.sequence}
            >
              <div className={styles.meta}>
                <time dateTime={event.at}>
                  {new Date(event.at).toLocaleTimeString()}
                </time>
                <span>
                  <UiText
                    text={
                      event.kind === "request"
                        ? "客户端发送"
                        : event.kind === "response"
                          ? "服务器响应"
                          : event.level === "error"
                            ? "错误"
                            : event.level === "warning"
                              ? "提示"
                              : "进度"
                    }
                  />
                </span>
              </div>
              <pre>{event.message}</pre>
            </div>
          ))}
        </div>
        <p className={styles.connection}>
          <UiText text="日志与报文按任务事件顺序记录。" />
        </p>
      </div>
    </section>
  );
}
