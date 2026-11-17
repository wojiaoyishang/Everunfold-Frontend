"use client";

import { useRef, useState } from "react";
import { can } from "@/core/accounts/permissions";
import { useAdminAccount } from "@/core/admin/account-context";
import { useContentCache } from "@/core/content-management/use-content-cache";
import type {
  ContentCacheCommand,
  ContentCacheNode,
  ContentCacheTarget,
} from "@/core/contracts/content-admin";
import { UiText, useT } from "@/core/i18n/provider";
import { embeddedEditorSurface } from "@/core/preview/bridge";
import { Icon } from "../../components/icon";
import { Button } from "../../components/ui/primitives";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { EditorPanel } from "./editor-panel";
import { AdminLoadingState } from "./loading-state";
import styles from "./content-cache-card.module.css";

const statusLabels: Record<ContentCacheNode["state"], string> = {
  applied: "已同步",
  disabled: "节点已停用",
  failed: "同步失败",
  not_configured: "接收器未配置",
  not_published: "尚无公开副本",
  pending: "等待同步",
  retrying: "正在重试",
  unqueued: "待安排同步",
};

const actionLabels = {
  clear: "清除本内容相关缓存",
  resync: "强制重新同步",
};

function CacheControls({
  target,
  writable,
}: {
  target: ContentCacheTarget;
  writable: boolean;
}) {
  const cache = useContentCache(target);
  const t = useT();
  const [action, setAction] = useState<ContentCacheCommand["action"]>();
  const clear = useRef<HTMLButtonElement>(null);
  const resync = useRef<HTMLButtonElement>(null);
  const hasReceivers = cache.state?.nodes.some(
    ({ state }) => state !== "disabled" && state !== "not_configured",
  );
  const busy = cache.loading && cache.state === undefined;
  const label = action ? actionLabels[action] : "";

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span>
          <UiText text="节点同步状态" />
        </span>
        <Button
          className="admin-button"
          aria-label={t("刷新状态")}
          title={t("刷新状态")}
          disabled={cache.loading}
          onClick={cache.refresh}
        >
          <Icon name="refresh" />
        </Button>
      </div>
      {busy && <AdminLoadingState label="正在读取缓存状态…" compact />}
      {cache.loadError && (
        <p role="alert">
          <UiText text="无法读取内容的缓存状态。" />
        </p>
      )}
      {cache.state && !cache.state.manageable && (
        <p>
          <UiText text="此内容尚无可维护的公开副本。" />
        </p>
      )}
      {cache.state &&
        (cache.state.nodes.length ? (
          <ul className={styles.nodes}>
            {cache.state.nodes.map((node) => (
              <li key={node.node_id}>
                <div className={styles.node}>
                  <bdi className={styles.nodeId}>{node.node_id}</bdi>
                  <span className={styles.state} data-state={node.state}>
                    <UiText text={statusLabels[node.state]} />
                  </span>
                </div>
                {node.acknowledged_at && (
                  <time dateTime={node.acknowledged_at}>
                    {new Date(node.acknowledged_at).toLocaleString()}
                  </time>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>
            <UiText text="尚未登记前端节点。" />
          </p>
        ))}
      {writable && cache.state?.manageable && (
        <div className={styles.actions}>
          <Button
            ref={clear}
            className="admin-button"
            onClick={() => {
              cache.setActionError("");
              setAction("clear");
            }}
          >
            <Icon name="trash" />
            <UiText text={actionLabels.clear} />
          </Button>
          <Button
            ref={resync}
            className="admin-button"
            disabled={!hasReceivers}
            onClick={() => {
              cache.setActionError("");
              setAction("resync");
            }}
          >
            <Icon name="refresh" />
            <UiText text={actionLabels.resync} />
          </Button>
        </div>
      )}
      {cache.completed && (
        <p role="status">
          <UiText
            text={
              cache.completed === "clear"
                ? "公开副本已重建。"
                : "已将当前公开副本重新加入同步队列。"
            }
          />
        </p>
      )}
      <ConfirmDialog
        open={action !== undefined}
        portalTarget={embeddedEditorSurface() ?? undefined}
        title={label}
        confirmLabel={label}
        description={
          <UiText
            text={
              action === "clear"
                ? "从已发布数据重建公开副本，并向已配置的节点排队同步。"
                : "向已配置的节点重发当前公开副本，并重置投递重试次数。"
            }
          />
        }
        intent={action === "clear" ? "warning" : "default"}
        error={cache.actionError ? t(cache.actionError) : ""}
        returnFocus={action === "clear" ? clear : resync}
        onConfirm={() => (action ? cache.run(action) : false)}
        onConfirmed={() => setAction(undefined)}
        onCancel={() => setAction(undefined)}
      />
    </div>
  );
}

export function ContentCacheCard({
  id,
  kind,
  revision,
}: {
  id?: string;
  kind: ContentCacheTarget["kind"];
  revision?: number | string | null;
}) {
  const account = useAdminAccount();
  if (!can(account, "settings:read")) return null;
  return (
    <EditorPanel title="缓存" initialOpen={false} defer>
      {id ? (
        <CacheControls
          key={`${kind}:${id}:${revision ?? ""}`}
          target={{ id, kind }}
          writable={can(account, "settings:write")}
        />
      ) : (
        <p>
          <UiText text="保存并发布后可管理缓存。" />
        </p>
      )}
    </EditorPanel>
  );
}
