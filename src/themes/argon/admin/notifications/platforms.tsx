"use client";

import type { NotificationPlatformView } from "@/core/contracts/notifications";
import { useNotificationState } from "@/core/notifications/use-notifications";
import { UiText, useT } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { Icon } from "../../components/icon";
import { AdminPageHeading } from "../components/page-heading";
import { SettingsLayout } from "../settings/section-navigation";
import styles from "./notifications.module.css";

const semantics = {
  idempotent: {
    label: "支持幂等投递",
    hint: "平台使用稳定投递 ID 去重。",
  },
  "retry-safe": {
    label: "可安全重试",
    hint: "明确失败后可以自动重试。",
  },
  "unknown-no-retry": {
    label: "结果未知不重试",
    hint: "网络结果不明确时保留人工核对。",
  },
};

function PlatformCard({ platform }: { platform: NotificationPlatformView }) {
  const t = useT();
  const state = semantics[platform.delivery_semantics];
  return (
    <article className={styles.platformCard}>
      <header>
        <div className={styles.platformIdentity}>
          <span className={styles.platformIcon}>
            <Icon
              name={
                platform.id === "email"
                  ? "mail"
                  : platform.kind === "bridge"
                    ? "activity"
                    : "bell"
              }
            />
          </span>
          <div>
            <strong>
              <UiText text={platform.title} />
            </strong>
            <small>{platform.id}</small>
          </div>
        </div>
        <span
          className={`admin-badge ${platform.available ? "admin-badge-success" : ""}`}
        >
          <Icon name={platform.available ? "check" : "cloud-off"} />
          <UiText text={platform.available ? "可用" : "未就绪"} />
        </span>
      </header>
      <p>
        <UiText text={platform.description} />
      </p>
      <dl className={styles.metaList}>
        <div>
          <dt>
            <UiText text="接入类型" />
          </dt>
          <dd>
            <UiText
              text={
                platform.builtin
                  ? "内置平台"
                  : platform.kind === "bridge"
                    ? "消息总线"
                    : "插件平台"
              }
            />
          </dd>
        </div>
        <div>
          <dt>
            <UiText text="投递语义" />
          </dt>
          <dd>
            <UiText text={t(state.label)} />
          </dd>
        </div>
      </dl>
      <p>
        <UiText text={state.hint} />
      </p>
      <footer>
        <span className="admin-badge">
          {platform.kind === "bridge" ? "Bridge" : "Direct"}
        </span>
        {platform.id === "email" ? (
          <RouteLink href="/admin/settings/mail" className="admin-button">
            <Icon name="settings" />
            <UiText text="邮件配置" />
          </RouteLink>
        ) : platform.builtin ? (
          <span className="admin-badge">
            <UiText text="无需额外配置" />
          </span>
        ) : (
          <RouteLink href="/admin/settings/plugins" className="admin-button">
            <Icon name="puzzle" />
            <UiText text="查看插件" />
          </RouteLink>
        )}
      </footer>
    </article>
  );
}

export function NotificationPlatformsPage() {
  const editor = useNotificationState();
  return (
    <SettingsLayout>
      <AdminPageHeading
        title="通知平台"
        description="站内和邮件由核心提供；其他渠道通过可信后端插件注册。平台停用或部署摘要不一致时，投递会标记为抑制。"
        action={
          <Button
            className="admin-button"
            disabled={editor.loading}
            onClick={() => void editor.reload()}
          >
            <Icon name="refresh" />
            <UiText text="刷新状态" />
          </Button>
        }
      />
      {editor.loading && !editor.state ? (
        <div className="admin-settings-loading" role="status">
          <UiText text="正在检查通知平台…" />
        </div>
      ) : editor.error && !editor.state ? (
        <div className={styles.message} data-error="true" role="alert">
          <Icon name="cloud-off" />
          <UiText text={editor.error} />
        </div>
      ) : editor.state ? (
        <div className={styles.platformGrid}>
          {editor.state.platforms.map((platform) => (
            <PlatformCard key={platform.id} platform={platform} />
          ))}
        </div>
      ) : null}
    </SettingsLayout>
  );
}
