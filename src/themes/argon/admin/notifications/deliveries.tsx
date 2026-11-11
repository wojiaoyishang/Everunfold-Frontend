"use client";

import { useMemo, useState } from "react";
import type {
  NotificationDeliveryView,
  NotificationPlatformView,
} from "@/core/contracts/notifications";
import { useNotificationState } from "@/core/notifications/use-notifications";
import { UiText, useT } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { Icon, type IconName } from "../../components/icon";
import { AdminPageHeading } from "../components/page-heading";
import { SettingsLayout } from "../settings/section-navigation";
import styles from "./notifications.module.css";

const statusMeta: Record<
  NotificationDeliveryView["status"],
  {
    label: string;
    tone: "neutral" | "positive" | "warning" | "danger";
    icon: IconName;
  }
> = {
  pending: { label: "等待投递", tone: "neutral", icon: "clock" },
  sending: { label: "正在投递", tone: "warning", icon: "send" },
  sent: { label: "已投递", tone: "positive", icon: "check" },
  failed: { label: "投递失败", tone: "danger", icon: "warning" },
  unknown: { label: "结果未知", tone: "warning", icon: "eye-off" },
  suppressed: { label: "已抑制", tone: "neutral", icon: "minus" },
};

function DeliveryRow({
  delivery,
  platform,
}: {
  delivery: NotificationDeliveryView;
  platform?: NotificationPlatformView;
}) {
  const meta = statusMeta[delivery.status];
  return (
    <div className={styles.deliveryRow}>
      <div>
        <strong>{delivery.event_type}</strong>
        <small>{new Date(delivery.created_at).toLocaleString()}</small>
      </div>
      <div>
        <strong>
          <UiText text={delivery.user_name} />
        </strong>
        <code>{delivery.user_id}</code>
      </div>
      <div>
        <span>{platform?.title ?? delivery.platform_id}</span>
        <small>{delivery.locale}</small>
      </div>
      <div
        className="admin-status-badge admin-badge"
        data-tone={meta.tone}
        title={delivery.error ?? undefined}
      >
        <Icon name={meta.icon} />
        <UiText text={meta.label} />
      </div>
      <div title={delivery.error ?? undefined}>
        <strong>{delivery.attempts}</strong>
        <small>
          <UiText text="次尝试" />
        </small>
      </div>
    </div>
  );
}

export function NotificationDeliveriesPage() {
  const editor = useNotificationState();
  const t = useT();
  const [status, setStatus] = useState("all");
  const [platform, setPlatform] = useState("all");
  const deliveries = useMemo(
    () =>
      (editor.state?.deliveries ?? []).filter(
        (item) =>
          (status === "all" || item.status === status) &&
          (platform === "all" || item.platform_id === platform),
      ),
    [editor.state?.deliveries, platform, status],
  );
  const unknown = (editor.state?.deliveries ?? []).filter(
    (item) => item.status === "unknown",
  ).length;
  return (
    <SettingsLayout>
      <AdminPageHeading
        title="投递记录"
        description="显示最近 50 条逐接收人、逐平台投递。结果未知的记录不会自动重发，避免重复通知。"
        action={
          <Button
            className="admin-button"
            disabled={editor.loading}
            onClick={() => void editor.reload()}
          >
            <Icon name="refresh" />
            <UiText text="刷新记录" />
          </Button>
        }
      />
      {unknown > 0 && (
        <div className={styles.message} data-tone="warning" role="status">
          <Icon name="eye-off" />
          <UiText
            text="{count} 条投递结果未知，请结合平台后台人工核对。"
            values={{ count: unknown }}
          />
        </div>
      )}
      {editor.error && (
        <div className={styles.message} data-error="true" role="alert">
          <Icon name="cloud-off" />
          <UiText text={editor.error} />
        </div>
      )}
      <div className={styles.toolbar}>
        <label className={styles.toolbarField}>
          <UiText text="投递状态" />
          <Select
            programOptions
            name="delivery-status"
            label={t("投递状态")}
            value={status}
            options={[
              { value: "all", label: "全部状态" },
              ...Object.entries(statusMeta).map(([value, meta]) => ({
                value,
                label: meta.label,
              })),
            ]}
            onValueChange={setStatus}
          />
        </label>
        <label className={styles.toolbarField}>
          <UiText text="通知平台" />
          <Select
            programOptions
            name="delivery-platform"
            label={t("通知平台")}
            value={platform}
            options={[
              { value: "all", label: "全部平台" },
              ...(editor.state?.platforms ?? []).map((item) => ({
                value: item.id,
                label: item.title,
              })),
            ]}
            onValueChange={setPlatform}
          />
        </label>
        <Button
          className="admin-button"
          disabled={status === "all" && platform === "all"}
          onClick={() => {
            setStatus("all");
            setPlatform("all");
          }}
        >
          <UiText text="清除筛选" />
        </Button>
      </div>
      {editor.loading && !editor.state ? (
        <div className="admin-settings-loading" role="status">
          <UiText text="正在读取投递记录…" />
        </div>
      ) : deliveries.length ? (
        <div className={styles.deliveryList}>
          {deliveries.map((delivery) => (
            <DeliveryRow
              key={delivery.id}
              delivery={delivery}
              platform={editor.state?.platforms.find(
                (item) => item.id === delivery.platform_id,
              )}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Icon name="send" />
          <p>
            <UiText text="当前筛选下没有投递记录。" />
          </p>
        </div>
      )}
    </SettingsLayout>
  );
}
