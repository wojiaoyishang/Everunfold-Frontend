"use client";
import type {
  DraftSession,
  CollaborationStatus,
} from "@/core/collaboration/session";
import type { DraftFields } from "@/generated/content-admin-contract";
import { Button } from "../../components/ui/primitives";
import { DownloadButton } from "../../components/ui/download-button";
import { Icon } from "../../components/icon";
import styles from "./collaboration-bar.module.css";
import { serializeDraftExport } from "@/core/collaboration/export";

export function CollaborationBar({
  session,
  status,
  fields,
  disabled,
}: {
  session: DraftSession | null;
  status: CollaborationStatus | null;
  fields: DraftFields;
  disabled: boolean;
}) {
  if (!session || !status) return null;
  const connected = status.phase === "ready";
  const pending = status.pending > 0;
  const label =
    status.phase === "stopped"
      ? "同步已停止"
      : status.phase === "connecting"
        ? "正在连接协同"
        : !connected
          ? status.localSaving
            ? "离线 · 正在保存到本机"
            : status.local
              ? "离线 · 修改仅保存在本机"
              : "离线 · 请及时导出"
          : pending
            ? "正在同步修改"
            : "修改已同步";
  return (
    <section
      className={styles.bar}
      aria-label="草稿协同状态"
      data-phase={status.phase}
    >
      <div className={styles.state} role="status" aria-live="polite">
        <Icon
          name={connected ? (pending ? "refresh" : "cloud-check") : "cloud-off"}
          className={connected && pending ? "admin-draft-spin" : ""}
        />
        <span key={label}>{label}</span>
      </div>
      {status.peers.length > 0 && (
        <div
          className={styles.peers}
          aria-label={`${status.peers.length} 个在线编辑会话`}
        >
          {status.peers.map((peer) => (
            <span
              key={peer.connection_id}
              className={styles.peer}
              title={`${peer.name}${peer.client_id === session.doc.clientID ? "（当前页面）" : ""}`}
              style={{ color: peer.color }}
            >
              <Icon name="user" />
              {peer.name}
              {peer.client_id === session.doc.clientID ? " · 我" : ""}
            </span>
          ))}
        </div>
      )}
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
        <DownloadButton
          filename={`draft-${session.id}.json`}
          content={() =>
            serializeDraftExport(
              fields,
              session.removedBlocks(fields),
              Object.fromEntries(session.sources.drafts),
            )
          }
        >
          <Icon name="down" />
          导出草稿
        </DownloadButton>
      </div>
      {status.error && (
        <p className={styles.error} role="alert">
          {status.error}
        </p>
      )}
    </section>
  );
}
