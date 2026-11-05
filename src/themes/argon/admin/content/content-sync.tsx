"use client";
import { UiText } from "@/core/i18n/provider";

import { useContentSync } from "@/core/content-management/use-content-sync";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import styles from "./content-sync.module.css";

export function ContentSync({
  refreshKey = 0,
}: {
  refreshKey?: number | string;
}) {
  const sync = useContentSync(refreshKey);
  const nodes = sync.state?.delivery ?? [];
  const configured = nodes.filter((node) => node.enabled);
  const applied =
    configured.length > 0 &&
    configured.every((node) => node.status === "applied");
  const failed =
    Boolean(sync.error) || configured.some((node) => node.status === "failed");
  const pending = !applied && !failed && configured.length > 0;
  const label = sync.error
    ? "暂时无法确认同步状态"
    : !sync.state
      ? "正在确认同步状态…"
      : !configured.length
        ? "尚未配置前台同步"
        : failed
          ? "前台同步待重试"
          : applied
            ? "前台内容已同步"
            : "正在同步到前台…";
  return (
    <section
      className={styles.root}
      aria-label="前台同步状态"
      data-state={failed ? "failed" : applied ? "applied" : "idle"}
      data-pending={pending}
    >
      <span className={styles.indicator}>
        <Icon
          name={
            applied && !sync.error
              ? "cloud-check"
              : failed
                ? "cloud-off"
                : "cloud"
          }
        />
      </span>
      <div className={styles.copy} role="status">
        <strong className={styles.title}>
          <UiText text={label} />
        </strong>
        <p>
          {sync.error ||
            (applied ? (
              <UiText text="已发布内容已应用到前台。" />
            ) : (
              <UiText text="内容已保存在后端，同步完成后会更新前台。" />
            ))}
        </p>
      </div>
      <Button
        className={`admin-button ${styles.action}`}
        disabled={sync.busy}
        onClick={() => void sync.retry()}
      >
        <Icon name="refresh" className={sync.busy ? "admin-draft-spin" : ""} />
        {sync.busy ? <UiText text="正在重试…" /> : <UiText text="重新同步" />}
      </Button>
    </section>
  );
}
