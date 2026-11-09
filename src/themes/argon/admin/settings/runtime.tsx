"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  readRuntime,
  controlRuntime,
  type RuntimeOverview,
  type RuntimeCommand,
} from "@/core/contracts/settings";
import { useAdminRequest, useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { UiText } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import { Switch } from "../../components/ui/switch";
import { Icon } from "../../components/icon";
import { AdminPageHeading } from "../components/page-heading";
import styles from "./runtime.module.css";
const labels: Record<string, string> = {
  online: "在线",
  stale: "心跳过期",
  stopped: "已停止",
  degraded: "异常",
  starting: "正在启动",
  queued: "等待执行",
  running: "执行中",
  succeeded: "已完成",
  failed: "执行失败",
  unknown: "结果待确认",
  cancelled: "已取消",
  connecting: "正在连接",
  connected: "已连接",
};
const date = (value: string | number | null | undefined) =>
  value
    ? new Date(
        typeof value === "number" ? value * 1000 : value,
      ).toLocaleString()
    : "—";
export function RuntimePage() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const writable = can(useAdminAccount(), "settings:write");
  const [data, setData] = useState<RuntimeOverview | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const [tab, setTab] = useState("概览");
  const serial = useRef(0);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const id = ++serial.current;
      try {
        const response = await readRuntime(baseUrl, { signal });
        if (id === serial.current && !signal?.aborted) {
          setData(response.data);
          setError("");
        }
      } catch {
        if (!signal?.aborted)
          setError("运行状态暂时无法刷新，以下为上次读取的数据。");
      }
    },
    [baseUrl],
  );
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void refresh(controller.signal);
    });
    const timer = setInterval(() => {
      if (!document.hidden) void refresh(controller.signal);
    }, 5000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [refresh]);
  const control = async (task_id: string, action: RuntimeCommand["action"]) => {
    if (busy) return;
    setBusy(task_id);
    ++serial.current;
    try {
      await controlRuntime(baseUrl, { task_id, action }, csrfToken);
      await refresh();
    } catch {
      setError("操作未完成，请刷新后重试。");
    } finally {
      setBusy("");
    }
  };
  return (
    <div className={styles.page}>
      <AdminPageHeading title="运行与任务" />
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          {["概览", "定时任务", "常驻任务", "执行记录"].map((name) => (
            <Button
              key={name}
              className={tab === name ? "admin-tab active" : "admin-tab"}
              aria-pressed={tab === name}
              onClick={() => setTab(name)}
            >
              <UiText text={name} />
            </Button>
          ))}
        </div>
        <Button className="admin-button" onClick={() => void refresh()}>
          <Icon name="refresh" />
          <UiText text="刷新" />
        </Button>
      </div>
      {error && (
        <p role="alert">
          <UiText text={error} />
        </p>
      )}
      {!data ? (
        <p role="status">
          <UiText text="正在读取运行状态…" />
        </p>
      ) : (
        <>
          <p className={styles.sample}>
            <UiText text="最近刷新" /> {date(data.sampled_at)}
            {!data.telemetry_available && (
              <>
                {" "}
                · <UiText text="心跳数据暂不可用" />
              </>
            )}
          </p>
          {tab === "概览" && (
            <section className={styles.instances}>
              {["scheduler", "worker"].map((role) => (
                <article className={styles.card} key={role}>
                  <h2>{role === "scheduler" ? "Scheduler" : "Worker"}</h2>
                  {!data.instances.some((i) => i.role === role) && (
                    <p>
                      <UiText text="尚未收到实例心跳" />
                    </p>
                  )}
                  {data.instances
                    .filter((i) => i.role === role)
                    .sort((a, b) => b.started_at - a.started_at)
                    .slice(0, 5)
                    .map((instance) => (
                      <div className={styles.instance} key={instance.id}>
                        <strong
                          data-state={
                            error || !data.telemetry_available
                              ? "stale"
                              : instance.state
                          }
                        >
                          <UiText
                            text={
                              error || !data.telemetry_available
                                ? "状态待确认"
                                : (labels[instance.state] ?? instance.state)
                            }
                          />
                        </strong>
                        <dl>
                          <dt>
                            <UiText text="节点" />
                          </dt>
                          <dd>
                            {instance.host} · PID {instance.pid}
                          </dd>
                          <dt>
                            <UiText text="启动时间" />
                          </dt>
                          <dd>{date(instance.started_at)}</dd>
                          <dt>
                            <UiText text="最后心跳" />
                          </dt>
                          <dd>{date(instance.heartbeat)}</dd>
                          {role === "worker" && (
                            <>
                              <dt>
                                <UiText text="队列待领取消息" />
                              </dt>
                              <dd>{data.queue_depth ?? "—"}</dd>
                              <dt>
                                <UiText text="全队列执行中" />
                              </dt>
                              <dd>
                                {
                                  data.runs.filter(
                                    (r) =>
                                      r.status === "running" &&
                                      data.plans.find((p) => p.id === r.task_id)
                                        ?.kind === "periodic",
                                  ).length
                                }
                              </dd>
                            </>
                          )}
                          {role === "scheduler" && (
                            <>
                              <dt>
                                <UiText text="最近扫描" />
                              </dt>
                              <dd>{date(instance.last_scan)}</dd>
                              <dt>
                                <UiText text="常驻进程" />
                              </dt>
                              <dd>{instance.residents}</dd>
                            </>
                          )}
                        </dl>
                        {instance.error && <small>{instance.error}</small>}
                      </div>
                    ))}
                </article>
              ))}
            </section>
          )}
          {(tab === "定时任务" || tab === "常驻任务") && (
            <section className={styles.card}>
              <h2>
                Scheduler · <UiText text={tab} />
              </h2>
              {tab === "常驻任务" && (
                <p className={styles.sample}>
                  <UiText text="连接由 Scheduler 的子进程维护，停止后保留恢复位置。" />
                </p>
              )}
              {data.plans
                .filter(
                  (p) =>
                    p.kind === (tab === "常驻任务" ? "resident" : "periodic"),
                )
                .map((plan) => {
                  const latest = data.runs.find((r) => r.task_id === plan.id);
                  return (
                    <article key={plan.id} className={styles.plan}>
                      <div>
                        <strong>{plan.title}</strong>
                        <small>
                          {plan.plugin} · {plan.id}
                        </small>
                        <p>
                          <UiText
                            text={
                              labels[
                                latest?.connection ?? latest?.status ?? ""
                              ] ?? "尚未执行"
                            }
                          />
                          {plan.kind === "periodic" && (
                            <>
                              {" "}
                              · {plan.interval}s · <UiText text="下次检查" />{" "}
                              {date(plan.next_at)}
                            </>
                          )}
                        </p>
                        {plan.kind === "resident" && (
                          <small>
                            <UiText text="重新启动" /> {plan.restarts} ·{" "}
                            <UiText text="最近通信" />{" "}
                            {date(latest?.last_message_at)}
                          </small>
                        )}
                        {!plan.available && (
                          <small>
                            <UiText text="插件未启用或部署目录尚未同步" />
                          </small>
                        )}
                      </div>
                      <div className={styles.actions}>
                        {plan.manual && (
                          <Button
                            className="admin-button"
                            disabled={
                              !!busy ||
                              !writable ||
                              !plan.enabled ||
                              !plan.available
                            }
                            onClick={() => void control(plan.id, "run")}
                          >
                            <Icon name="refresh" />
                            <UiText text="执行一次" />
                          </Button>
                        )}
                        <Switch
                          aria-label={plan.title}
                          checked={plan.enabled}
                          disabled={!!busy || !writable || !plan.available}
                          onCheckedChange={(enabled) =>
                            void control(
                              plan.id,
                              enabled ? "enable" : "disable",
                            )
                          }
                        />
                      </div>
                    </article>
                  );
                })}
            </section>
          )}
          {tab === "执行记录" && (
            <section className={styles.card}>
              <h2>
                <UiText text="最近 100 次执行" />
              </h2>
              {!data.runs.length && (
                <p>
                  <UiText text="暂无执行记录" />
                </p>
              )}
              {data.runs.map((run) => (
                <article className={styles.plan} key={run.id}>
                  <div>
                    <strong>
                      {data.plans.find((p) => p.id === run.task_id)?.title ??
                        run.task_id}
                    </strong>
                    <small>
                      {date(run.started_at ?? run.planned_at)} ·{" "}
                      {run.id.slice(0, 8)}
                    </small>
                    {run.error && <small>{run.error}</small>}
                  </div>
                  <span data-state={run.status}>
                    <UiText text={labels[run.status] ?? run.status} />
                  </span>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
