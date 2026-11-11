"use client";

import { UiText } from "@/core/i18n/provider";
import { useNotificationInbox } from "@/core/notifications/use-notifications";
import { ActionPopover } from "../../components/ui/action-popover";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { Icon } from "../../components/icon";
import styles from "./notifications.module.css";

export function NotificationCenter() {
  const { inbox, unread, loading, error, refresh, markRead } =
    useNotificationInbox();
  return (
    <ActionPopover
      label={`通知中心${unread ? `，${unread} 条未读` : ""}`}
      className="admin-icon-button admin-notification-trigger"
      panelClassName={styles.centerPanel}
      panelWidth={380}
      triggerContent={
        <>
          <Icon name="bell" />
          {unread > 0 && (
            <span className={styles.unreadBadge} aria-hidden="true">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </>
      }
    >
      {(close) => (
        <div className={styles.center}>
          <header className={styles.centerHeader}>
            <div>
              <strong>
                <UiText text="通知" />
              </strong>
              <span>
                <UiText
                  text={unread ? "{count} 条未读" : "暂无未读通知"}
                  values={{ count: unread }}
                />
              </span>
            </div>
            <div className={styles.centerActions}>
              <Button
                className={`admin-icon-button ${styles.centerRefresh}`}
                aria-label="刷新通知"
                title="刷新通知"
                disabled={loading}
                onClick={() => void refresh()}
              >
                <Icon
                  name="refresh"
                  className={loading ? "admin-spinning" : ""}
                />
              </Button>
              {unread > 0 && (
                <>
                  <span
                    className={styles.centerActionsDivider}
                    aria-hidden="true"
                  />
                  <Button
                    className={`admin-text-action ${styles.markAll}`}
                    disabled={loading}
                    onClick={() => void markRead()}
                  >
                    <Icon name="check" />
                    <UiText text="全部已读" />
                  </Button>
                </>
              )}
            </div>
          </header>
          {error ? (
            <div className={styles.centerState} role="alert">
              <Icon name="cloud-off" />
              <span>
                <UiText text="通知暂时无法读取。" />
              </span>
              <Button
                className="admin-button"
                disabled={loading}
                onClick={() => void refresh()}
              >
                <UiText text="重试" />
              </Button>
            </div>
          ) : !inbox?.items.length ? (
            <div className={styles.centerState} data-kind="empty">
              <Icon name={loading ? "refresh" : "bell"} />
              <span>
                <UiText text={loading ? "正在读取通知…" : "暂时没有通知"} />
              </span>
            </div>
          ) : (
            <div className={styles.centerList}>
              {inbox.items.map((item) => {
                const content = (
                  <>
                    <span
                      className={styles.readDot}
                      data-unread={!item.read_at || undefined}
                    />
                    <span className={styles.centerItemBody}>
                      <strong>
                        <UiText text={item.title} />
                      </strong>
                      <span>
                        <UiText text={item.text} />
                      </span>
                      <small>
                        {new Date(item.created_at).toLocaleString()}
                      </small>
                    </span>
                  </>
                );
                return item.href ? (
                  <RouteLink
                    key={item.id}
                    href={item.href}
                    className={styles.centerItem}
                    onClick={() => {
                      if (!item.read_at) void markRead([item.id]);
                      close();
                    }}
                  >
                    {content}
                  </RouteLink>
                ) : (
                  <Button
                    key={item.id}
                    className={styles.centerItem}
                    onClick={() => void markRead([item.id])}
                  >
                    {content}
                  </Button>
                );
              })}
            </div>
          )}
          <footer className={styles.centerFooter}>
            <span>
              <UiText text="通知会在后台保持同步" />
            </span>
            <RouteLink
              href="/admin/notifications/deliveries"
              className="admin-text-action"
              onClick={close}
            >
              <UiText text="查看投递记录" />
              <Icon name="arrow" />
            </RouteLink>
          </footer>
        </div>
      )}
    </ActionPopover>
  );
}
