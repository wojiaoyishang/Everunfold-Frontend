"use client";
import { UiText } from "@/core/i18n/provider";

import type {
  DraftSession,
  CollaborationStatus,
} from "@/core/collaboration/session";
import type { DraftFields } from "@/core/contracts/content-admin";
import type { Peer } from "@/core/contracts/collaboration";
import { useAdminAccount } from "@/core/admin/account-context";
import { Button } from "../../components/ui/primitives";
import { DownloadButton } from "../../components/ui/download-button";
import { Icon } from "../../components/icon";
import styles from "./collaboration-bar.module.css";
import { serializeDraftExport } from "@/core/collaboration/export";

export function CollaborationBar({
  session,
  status,
  fields,
  localChanges,
  recoveryContent,
  disabled,
  onLocate,
  onVersions,
}: {
  session: DraftSession | null;
  status: CollaborationStatus | null;
  fields: DraftFields;
  localChanges: boolean;
  recoveryContent: () => string | undefined;
  disabled: boolean;
  onLocate: (peer: Peer) => void;
  onVersions?: () => void;
}) {
  const account = useAdminAccount();
  if (!session || !status) return null;
  const connected = status.phase === "ready";
  const self = status.peers.find(
    (peer) => peer.client_id === session.doc.clientID,
  );
  const peers = status.peers
    .filter((peer) => peer.client_id !== session.doc.clientID)
    .sort((a, b) => a.client_id - b.client_id);
  const label =
    status.phase === "stopped"
      ? "同步已停止"
      : status.mode === "local"
        ? status.localSaving
          ? "正在保存本地草稿"
          : status.local
            ? "草稿已保存到本机"
            : "本地保存失败"
        : status.merge
          ? "合并中 · 最新版只读"
          : status.mode === "review"
            ? "本地草稿待合并"
            : status.mode === "paused"
              ? "编辑已暂停 · 输入已保留"
              : status.phase === "connecting"
                ? "正在连接协同"
                : !connected
                  ? "已离线"
                  : status.pending
                    ? "正在实时保存"
                    : localChanges
                      ? "正在恢复本地正文"
                      : "已保存到服务器";
  return (
    <section
      className={styles.bar}
      aria-label="草稿协同状态"
      data-phase={status.phase}
      data-mode={status.mode}
    >
      <div className={styles.state} role="status" aria-live="polite">
        <Icon name={connected ? "cloud-check" : "cloud-off"} />
        <span>
          <UiText text={label} />
        </span>
      </div>
      <div className={styles.peers} aria-label="编辑成员">
        <Button
          className={styles.peer}
          title="当前页面"
          disabled={!self?.cursor || status.mode !== "shared"}
          onClick={() => self && onLocate(self)}
          style={{ color: self?.color }}
        >
          <Icon name="user" />
          {account.display_name} <UiText text="· 我" />
        </Button>
        {peers.map((peer) => (
          <Button
            key={peer.client_id}
            className={styles.peer}
            title={
              peer.cursor
                ? `${peer.name} · 定位光标与选区`
                : `${peer.name} · 尚未选择正文位置`
            }
            disabled={!peer.cursor || status.mode !== "shared"}
            style={{ color: peer.color }}
            onClick={() => onLocate(peer)}
          >
            <Icon name="user" />
            {peer.name}
          </Button>
        ))}
      </div>
      <div className={styles.actions}>
        <Button
          aria-label="撤销本人上一步编辑"
          title="撤销本人上一步编辑"
          disabled={disabled || !session.undo.canUndo()}
          onClick={() => session.undo.undo()}
        >
          <Icon name="undo" />
        </Button>
        <Button
          aria-label="重做本人编辑"
          title="重做本人编辑"
          disabled={disabled || !session.undo.canRedo()}
          onClick={() => session.undo.redo()}
        >
          <Icon name="redo" />
        </Button>
        {onVersions && (
          <Button onClick={onVersions}>
            <Icon name="clock" />
            <UiText text="版本" />
          </Button>
        )}
        <DownloadButton
          filename={`draft-${session.id}.json`}
          content={() =>
            recoveryContent() ??
            serializeDraftExport(
              fields,
              session.removedBlocks(fields),
              Object.fromEntries(session.sources.drafts),
            )
          }
        >
          <Icon name="down" />
          <UiText text="导出草稿" />
        </DownloadButton>
      </div>
      {(status.mode !== "shared" || status.error || status.merge) && (
        <div className={styles.recovery} role="status">
          <span>
            {status.merge
              ? `${status.merge.actor} 正在合并版本，最新版暂时只读。${status.branchId ? " 你的未确认输入已另存为本机草稿，恢复后需要比较并合并。" : ""}`
              : status.error || (
                  <UiText text="本地草稿已保留，请比较后合并。" />
                )}
            {status.mode !== "shared" &&
              (status.localSaving ? (
                <UiText text=" 正在保存到本机…" />
              ) : status.local ? (
                <UiText text=" 内容保存在此浏览器。" />
              ) : (
                <UiText text=" 本地保存失败，请立即导出。" />
              ))}
          </span>
          <div>
            {status.phase !== "stopped" &&
              status.phase !== "connecting" &&
              !connected && (
                <Button
                  className="admin-button"
                  onClick={() => session.reconnect()}
                >
                  <UiText text="重新连接" />
                </Button>
              )}
            {status.phase !== "stopped" && status.mode !== "local" && (
              <Button
                className="admin-button"
                onClick={() => session.continueLocal()}
              >
                <UiText text="继续本地编辑" />
              </Button>
            )}
            {connected && status.mode !== "shared" && (
              <Button
                className="admin-button"
                onClick={() => session.returnToLatest()}
              >
                <UiText text="返回最新版" />
              </Button>
            )}
            {onVersions && status.branchId && (
              <Button className="admin-button" onClick={onVersions}>
                <UiText text="比较与合并" />
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
