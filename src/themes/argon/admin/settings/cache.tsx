"use client";

import { useRef, useState } from "react";
import { UiText, useT } from "@/core/i18n/provider";
import { can } from "@/core/accounts/permissions";
import { useAdminAccount } from "@/core/admin/account-context";
import type {
  CacheDiskResource,
  CacheNodeState,
  CacheRebuild,
  DeliverySummary,
} from "@/core/contracts/settings";
import { useCacheManagement } from "@/core/settings/use-cache-management";
import { Button } from "../../components/ui/primitives";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Select } from "../../components/ui/select";
import { Icon } from "../../components/icon";
import { AdminPageHeading } from "../components/page-heading";
import { SettingsLayout } from "./section-navigation";
import { SettingsSection } from "./shared";
import styles from "./cache.module.css";

type CacheResource = CacheDiskResource["resource"];

const resources: Record<CacheResource, string> = {
  "public-content": "公开内容",
  "public-settings": "站点设置",
  "cache-policy": "节点策略",
};
const receiverLabels: Record<CacheNodeState["receiver"], string> = {
  ready: "接收器在线",
  disabled: "节点已停用",
  not_configured: "未配置接收器",
  credential_missing: "缺少连接凭据",
  unreachable: "无法连接接收器",
  rejected: "接收器拒绝访问",
  unsupported: "请升级节点接收器",
  invalid: "接收器状态无法读取",
  identity_mismatch: "节点身份或来源不匹配",
};
const syncLabels: Record<DeliverySummary["state"], string> = {
  applied: "已确认",
  disabled: "节点已停用",
  failed: "重试已用完",
  not_configured: "未配置接收器",
  pending: "等待同步",
  retrying: "等待重试",
  unqueued: "尚未排队",
};

function bytes(value: number | null | undefined) {
  if (value == null) return "—";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: unit ? 1 : 0 }).format(value)} ${units[unit]}`;
}

type CacheAction = CacheRebuild["scope"] | "prune";

export function CacheSettingsPage({ localNode }: { localNode: string }) {
  const t = useT();
  const editable = can(useAdminAccount(), "settings:write");
  const cache = useCacheManagement(localNode);
  const [action, setAction] = useState<CacheAction>();
  const focus = useRef<HTMLButtonElement>(null);
  const state = cache.state;
  const disk = state?.storage;
  const resourceNames = Object.keys(resources) as CacheResource[];
  const canRebuild =
    editable &&
    state &&
    !["not_configured", "disabled"].includes(state.receiver);
  const reclaimable = disk?.resources.every(
    (item) => item.status !== "unavailable",
  )
    ? disk.resources.reduce(
        (sum, item) => sum + (item.reclaimable_bytes ?? 0),
        0,
      )
    : undefined;
  const canPrune = disk?.resources.some(
    (item) => (item.reclaimable_bytes ?? 0) > 0,
  );
  const prune = action === "prune";
  const label = prune ? "清理旧版本" : "重新同步";
  const open = (operation: CacheAction, button: HTMLButtonElement) => {
    focus.current = button;
    cache.clearActionError();
    setAction(operation);
  };
  return (
    <SettingsLayout fullWidth>
      <AdminPageHeading
        title="缓存管理"
        description="查看各前端节点磁盘上的公开副本。"
      />
      <SettingsSection
        id="cache-node"
        title="节点缓存"
        description="本机版本来自节点磁盘，确认版本来自后端投递回执。"
      >
        {cache.nodes?.length ? (
          <div className={styles.toolbar}>
            <Select
              name="cache-node"
              label="前端节点"
              value={cache.node}
              options={cache.nodes.map((id) => ({
                value: id,
                label: id === localNode ? `${id} · ${t("当前节点")}` : id,
              }))}
              onValueChange={cache.select}
              disabled={cache.busy}
            />
            <Button
              className="admin-button"
              onClick={cache.refresh}
              disabled={cache.loading || cache.busy}
            >
              <Icon name="refresh" />
              <UiText text="刷新状态" />
            </Button>
          </div>
        ) : cache.listError ? (
          <div className="admin-settings-inline-actions">
            <p role="alert">
              <UiText text="无法读取节点清单。" />
            </p>
            <Button className="admin-button" onClick={cache.reloadNodes}>
              <UiText text="重试" />
            </Button>
          </div>
        ) : (
          <p role="status">
            <UiText
              text={cache.nodes ? "尚未配置前端节点。" : "正在读取节点…"}
            />
          </p>
        )}
        {cache.node && !state && !cache.readError && (
          <p role="status">
            <UiText text="正在读取缓存状态…" />
          </p>
        )}
        {cache.readError && (
          <p role="alert" className="admin-settings-message is-error">
            <UiText text="无法刷新缓存状态。" />
          </p>
        )}
        {state && (
          <>
            <dl className={styles.summary}>
              <div>
                <dt>
                  <UiText text="接收器" />
                </dt>
                <dd>
                  <UiText text={receiverLabels[state.receiver]} />
                </dd>
              </div>
              <div>
                <dt>
                  <UiText text="内容磁盘剩余" />
                </dt>
                <dd>{bytes(disk?.free_bytes)}</dd>
              </div>
              <div>
                <dt>
                  <UiText text="旧版本可清理" />
                </dt>
                <dd>{bytes(reclaimable)}</dd>
              </div>
              <div>
                <dt>
                  <UiText text="检查时间" />
                </dt>
                <dd>
                  <time dateTime={state.checked_at}>
                    {new Date(state.checked_at).toLocaleString()}
                  </time>
                </dd>
              </div>
            </dl>
            <div className={styles.resources}>
              {resourceNames.map((name) => {
                const local = disk?.resources.find(
                  (item) => item.resource === name,
                );
                const sync = state.sync[name];
                return (
                  <article className={styles.resource} key={name}>
                    <h3>
                      <UiText text={resources[name]} />
                    </h3>
                    <dl>
                      <dt>
                        <UiText text="本机版本" />
                      </dt>
                      <dd>
                        {local?.status === "ready" ? (
                          local.revision
                        ) : (
                          <UiText
                            text={
                              local?.status === "missing"
                                ? "未保存"
                                : "无法读取"
                            }
                          />
                        )}
                      </dd>
                      <dt>
                        <UiText text="磁盘占用" />
                      </dt>
                      <dd>
                        {local && local.files !== null
                          ? t("{size} · {count} 个文件", {
                              size: bytes(local.bytes),
                              count: local.files,
                            })
                          : "—"}
                      </dd>
                      <dt>
                        <UiText text="后端期望版本" />
                      </dt>
                      <dd>{sync?.expected ?? "—"}</dd>
                      <dt>
                        <UiText text="后端确认版本" />
                      </dt>
                      <dd>{sync?.acknowledged ?? "—"}</dd>
                      <dt>
                        <UiText text="同步状态" />
                      </dt>
                      <dd>
                        {sync ? <UiText text={syncLabels[sync.state]} /> : "—"}
                      </dd>
                    </dl>
                    {editable && (
                      <Button
                        className="admin-button"
                        disabled={!canRebuild || cache.busy}
                        onClick={(event) => open(name, event.currentTarget)}
                      >
                        <UiText text="重新同步" />
                      </Button>
                    )}
                  </article>
                );
              })}
            </div>
            {editable && (
              <div className="admin-settings-inline-actions">
                <Button
                  className="admin-button"
                  disabled={!canRebuild || cache.busy}
                  onClick={(event) => open("all", event.currentTarget)}
                >
                  <UiText text="重新同步全部" />
                </Button>
                <Button
                  className="admin-button"
                  disabled={!canPrune || cache.busy}
                  onClick={(event) => open("prune", event.currentTarget)}
                >
                  <UiText text="清理旧版本" />
                </Button>
              </div>
            )}
          </>
        )}
        {cache.result && (
          <p className="admin-settings-message" role="status">
            {cache.result.type === "queued" ? (
              <UiText text="已提交重新同步。" />
            ) : cache.result.files === 0 ? (
              <UiText text="没有需要清理的旧文件。" />
            ) : (
              <UiText
                text="已清理 {count} 个文件，共 {size}。"
                values={{
                  count: cache.result.files,
                  size: bytes(cache.result.bytes),
                }}
              />
            )}
          </p>
        )}
      </SettingsSection>
      <ConfirmDialog
        open={action !== undefined}
        title={label}
        description={
          prune
            ? `${cache.node} · ${t("每类最多清理 200 个旧文件，保留当前副本和版本记录。")}`
            : `${cache.node} · ${action && action !== "all" ? t(resources[action]) : t("全部副本")} · ${t("从后端重新发送当前版本。")}`
        }
        intent={prune ? "warning" : "default"}
        confirmLabel={label}
        error={cache.actionError}
        returnFocus={focus}
        onConfirm={() => (action ? cache.run(action) : false)}
        onConfirmed={() => setAction(undefined)}
        onCancel={() => setAction(undefined)}
      />
    </SettingsLayout>
  );
}
