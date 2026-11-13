import type { ReactNode } from "react";
import type { MonitorStatus, NodeStatus } from "@/core/contracts/settings";
import type { LocalNode } from "@/core/nodes/local";
import styles from "./console.module.css";

const resources = [
  ["public-settings", "public_settings", "站点设置"],
  ["cache-policy", "cache_policy", "缓存策略"],
  ["public-content", "public_content", "公开内容"],
] as const;
const labels: Record<string, string> = {
  online: "正常",
  unavailable: "无法读取",
  degraded: "异常",
  stale: "上报超时",
  never: "暂无上报",
  recent: "近期收到上报",
  disabled: "已停用",
  not_configured: "未配置接收器",
  unqueued: "尚未排队",
  pending: "等待同步",
  retrying: "等待重试",
  failed: "重试已用完",
  applied: "已确认",
  reachable: "连接正常",
  credential_missing: "缺少连接凭据",
  unreachable: "无法连接",
  rejected: "接收器拒绝访问",
  unsupported: "接收器未支持探测",
  invalid: "接收器响应无效",
  wrong_node: "节点 ID 不匹配",
  wrong_source: "数据来源不匹配",
  missing: "副本缺失",
};
const errorLabels: Record<string, string> = {
  node_not_configured: "节点配置不完整",
  delivery_unavailable: "无法连接接收器",
  invalid_receipt: "接收回执不匹配",
  source_epoch_changed: "数据来源已变更",
  receiver_http_409: "接收器拒绝应用",
  delivery_failed: "投递失败",
};
const stamp = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : "—";

export function NodeStatusLabel({ value }: { value: string | undefined }) {
  const positive = ["online", "recent", "applied", "reachable"].includes(
    value ?? "",
  );
  const negative = [
    "failed",
    "unreachable",
    "wrong_node",
    "wrong_source",
    "invalid",
    "rejected",
  ].includes(value ?? "");
  return (
    <span data-tone={positive ? "positive" : negative ? "negative" : undefined}>
      {labels[value ?? "unavailable"] ?? "未知"}
    </span>
  );
}

function ResourceCards({
  node,
  local,
}: {
  node?: NodeStatus;
  local?: LocalNode;
}) {
  return (
    <div className={styles.resources}>
      {resources.map(([key, localKey, title]) => {
        const history = node?.sync?.[key];
        const replica = local
          ? local.replicas?.[localKey]
          : node?.receiver.replicas?.[key];
        return (
          <section key={key} className={styles.resource}>
            <h3>{title}</h3>
            <dl>
              <dt>同步状态</dt>
              <dd>
                <NodeStatusLabel value={history?.state} />
              </dd>
              <dt>期望版本</dt>
              <dd>{history?.expected ?? "—"}</dd>
              <dt>最后确认</dt>
              <dd>{history?.acknowledged ?? "—"}</dd>
              <dt>接收器副本</dt>
              <dd>
                {replica?.status === "ready" ? (
                  replica.revision
                ) : replica ? (
                  <NodeStatusLabel value={replica.status} />
                ) : (
                  "—"
                )}
              </dd>
            </dl>
            {history?.acknowledged_at && (
              <p>确认时间 {stamp(history.acknowledged_at)}</p>
            )}
            {history?.acknowledged &&
            replica &&
            replica.revision !== history.acknowledged ? (
              <p>当前副本与最后确认记录不一致。</p>
            ) : null}
            {history?.error && (
              <p>
                {errorLabels[history.error] ??
                  history.error.replace(/^receiver_http_/, "接收器 HTTP ")}
                {" · "}
                {history.attempts}/{history.attempt_limit} 次尝试
              </p>
            )}
            {history?.next_retry_at && (
              <p>下次重试 {stamp(history.next_retry_at)}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function LocalNodeStatus({
  node,
  children,
  offline,
}: {
  node: LocalNode;
  children?: ReactNode;
  offline: boolean;
}) {
  return (
    <section className={styles.panel} aria-labelledby="local-node-heading">
      <h2 id="local-node-heading">本机连接</h2>
      <dl className={styles.summary}>
        <div>
          <dt>节点 ID</dt>
          <dd>{node.nodeId}</dd>
        </div>
        <div>
          <dt>活动后端</dt>
          <dd>{node.active === "inline" ? "主配置文件" : node.active}</dd>
        </div>
        <div>
          <dt>本机接收器</dt>
          <dd>
            <NodeStatusLabel value={node.receiver} />
          </dd>
        </div>
      </dl>
      {children}
      {offline && <ResourceCards local={node} />}
    </section>
  );
}

export function FleetStatus({ fleet }: { fleet: MonitorStatus }) {
  return (
    <section aria-labelledby="fleet-heading" className={styles.stack}>
      <div className={styles.toolbar}>
        <h2 id="fleet-heading">全站同步状态</h2>
        <p className={styles.muted}>更新时间 {stamp(fleet.sampled_at)}</p>
      </div>
      <dl className={styles.health}>
        {[
          ["API", fleet.api],
          ["数据库", fleet.database],
          ["Redis", fleet.redis],
          ["Worker", fleet.worker],
          ["Scheduler", fleet.scheduler],
        ].map(([title, value]) => (
          <div key={title} className={styles.panel}>
            <dt>{title}</dt>
            <dd>
              <NodeStatusLabel value={value} />
            </dd>
          </div>
        ))}
      </dl>
      {!fleet.history_available && (
        <p className={styles.muted}>同步记录暂时无法读取。</p>
      )}
      {!fleet.nodes.length && (
        <p className={styles.muted}>尚未配置前端节点。</p>
      )}
      {fleet.nodes.map((node) => (
        <article className={styles.panel} key={node.id}>
          <div className={styles.toolbar}>
            <h3>{node.id}</h3>
            <span className={styles.muted}>
              {node.enabled ? "已启用" : node.bound ? "已停用" : "待登记连接"}
            </span>
          </div>
          <p className={styles.muted}>{node.base_url}</p>
          <dl className={styles.summary}>
            <div>
              <dt>前端上报</dt>
              <dd>
                <NodeStatusLabel value={node.inbound} />
              </dd>
              <dd className={styles.muted}>{stamp(node.last_report)}</dd>
            </div>
            <div>
              <dt>同步接收器</dt>
              <dd>
                <NodeStatusLabel value={node.receiver.state} />
              </dd>
              <dd className={styles.muted}>
                {stamp(node.receiver.checked_at)}
              </dd>
            </div>
          </dl>
          <ResourceCards node={node} />
        </article>
      ))}
    </section>
  );
}
