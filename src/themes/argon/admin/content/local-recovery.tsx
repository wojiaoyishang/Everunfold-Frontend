"use client";
import type { LocalRecovery } from "@/core/collaboration/recovery";
import { Button, TextLink } from "../../components/ui/primitives";
import { DownloadButton } from "../../components/ui/download-button";
import { Icon } from "../../components/icon";
export function LocalDraftRecovery({
  recovery,
  onRetry,
}: {
  recovery: LocalRecovery;
  onRetry: () => void;
}) {
  return (
    <main
      className="admin-root admin-access"
      data-surface="admin"
      data-admin-mode="system"
    >
      <section className="admin-access-card" aria-labelledby="recovery-title">
        <span className="admin-brand-mark">
          <Icon name="cloud-off" />
        </span>
        <h1 id="recovery-title">会话暂不可用</h1>
        <p>{recovery.title}</p>
        <p>草稿已保留。请先导出，再重新登录。</p>
        <div className="admin-access-actions">
          <DownloadButton
            className="admin-button admin-button-primary"
            filename={recovery.filename}
            content={() => recovery.content}
          >
            <Icon name="down" />
            导出草稿
          </DownloadButton>
          <Button className="admin-button" onClick={onRetry}>
            重新检查
          </Button>
          <TextLink
            className="admin-button"
            href={`/login?next=${encodeURIComponent(recovery.path)}`}
          >
            前往登录
          </TextLink>
        </div>
      </section>
    </main>
  );
}
