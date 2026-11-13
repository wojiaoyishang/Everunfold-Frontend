"use client";

import { useMemo, useState } from "react";
import type {
  NotificationEventView,
  NotificationRouteInput,
  NotificationRouteView,
} from "@/core/contracts/notifications";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { UiText, useT } from "@/core/i18n/provider";
import { useNotificationState } from "@/core/notifications/use-notifications";
import { useMailSettings } from "@/core/settings/use-mail-settings";
import { Button } from "../../components/ui/primitives";
import { AccountUserPicker } from "../../components/ui/account-user-picker";
import { Select } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Icon } from "../../components/icon";
import { AdminPageHeading } from "../components/page-heading";
import { UnsavedAccountChanges } from "../../account/unsaved";
import { SettingsLayout } from "../settings/section-navigation";
import styles from "./notifications.module.css";

const permissionLabels: Record<string, string> = {
  "comments:read": "读取评论",
  "comments:moderate": "审核与回复评论",
  "content:read": "读取内容",
  "content:publish": "发布与撤回内容",
  "media:read": "读取媒体库",
  "settings:read": "读取站点设置",
  "settings:write": "修改站点设置",
  "users:manage": "管理用户与授权",
  "applications:manage": "管理应用程序接入",
};

type RouteDraft = NotificationRouteInput & { key: string };

function routeDraft(route: NotificationRouteView, index: number): RouteDraft {
  return {
    key: route.id || `route-${index}`,
    event_type: route.event_type,
    recipient_type: route.recipient_type,
    recipient_value: route.recipient_value,
    platform_id: route.platform_id,
    mail_profile_id: route.mail_profile_id ?? null,
    template_key: route.template_key ?? "default",
    enabled: route.enabled,
  };
}

function eventGroup(event: NotificationEventView) {
  if (event.plugin_id) return "插件事件";
  if (event.id.startsWith("security.")) return "账号安全";
  if (event.id.startsWith("account.")) return "用户通知";
  return "通知事件";
}

function EventRoutes({
  event,
  routes,
  platforms,
  permissionOptions,
  mailProfiles,
  editable,
  onChange,
}: {
  event: NotificationEventView;
  routes: RouteDraft[];
  platforms: {
    value: string;
    label: string;
    available: boolean;
  }[];
  permissionOptions: { value: string; label: string }[];
  mailProfiles: { value: string; label: string }[];
  editable: boolean;
  onChange: (routes: RouteDraft[]) => void;
}) {
  const t = useT();
  const fixed = event.recipient_mode !== "configurable";
  const accountEvent = !event.plugin_id && event.id.startsWith("account.");
  const required = event.delivery_mode === "security_required";
  const managed = event.delivery_mode !== "notification";
  const platformChoices = platforms.filter(
    (platform) => !event.email_only || platform.value === "email",
  );
  const unusedPlatform = platformChoices.find(
    (platform) =>
      (platform.available || platform.value === "email") &&
      !routes.some((route) => route.platform_id === platform.value),
  );
  const canAdd = !managed && (!fixed || !!unusedPlatform);
  const inheritedMail =
    event.delivery_mode === "security_optional"
      ? "沿用找回密码验证码的发信配置"
      : managed
        ? "继承访问与安全的发信配置"
        : "默认配置";
  const recipient =
    event.recipient_mode === "subject" ? "执行目标主体" : "管理员";
  const update = (key: string, patch: Partial<RouteDraft>) =>
    onChange(
      routes.map((route) =>
        route.key === key ? { ...route, ...patch } : route,
      ),
    );
  return (
    <section
      id={`notification-event-${event.id.replace(/[^a-z0-9]+/gi, "-")}`}
      className={styles.eventCard}
      data-settings-section={event.title}
      data-settings-group={eventGroup(event)}
      tabIndex={-1}
    >
      <header className={styles.eventHeading}>
        <div>
          <span className={styles.eventCode}>{event.id}</span>
          <h2>
            <UiText text={event.title} />
          </h2>
          <p>
            <UiText text={event.description} />
          </p>
        </div>
        {canAdd && (
          <Button
            className="admin-button"
            disabled={!editable}
            onClick={() =>
              onChange([
                ...routes,
                {
                  key: `new-${Date.now()}`,
                  event_type: event.id,
                  recipient_type:
                    event.recipient_mode === "subject"
                      ? "subject"
                      : fixed || accountEvent
                        ? "role"
                        : "permission",
                  recipient_value:
                    event.recipient_mode === "subject"
                      ? "subject"
                      : fixed || accountEvent
                        ? "admin"
                        : (permissionOptions[0]?.value ?? "settings:read"),
                  platform_id: fixed
                    ? (unusedPlatform?.value ?? "email")
                    : (platformChoices[0]?.value ?? "in-app"),
                  mail_profile_id: null,
                  template_key: "default",
                  enabled: true,
                },
              ])
            }
          >
            <Icon name="plus" />
            <UiText text="添加接收规则" />
          </Button>
        )}
      </header>
      <div className={styles.routes}>
        {routes.length === 0 && (
          <p className={styles.emptyRoutes}>
            <UiText
              text={
                event.recipient_mode === "subject"
                  ? "启用规则后，只通知执行目标主体。"
                  : event.recipient_mode === "admins"
                    ? "启用规则后，只向管理员发送。"
                    : "此事件尚未通知任何人。"
              }
            />
          </p>
        )}
        {routes.map((route) => (
          <div
            className={styles.routeRow}
            data-mail={route.platform_id === "email" || undefined}
            data-fixed={fixed || undefined}
            key={route.key}
          >
            {fixed ? (
              <div className={styles.routeField}>
                <UiText text="接收人" />
                <span className={styles.routeValue}>
                  <UiText text={recipient} />
                </span>
              </div>
            ) : (
              <>
                <div className={styles.routeField}>
                  <UiText text="接收人类型" />
                  <Select
                    programOptions
                    name={`${route.key}-recipient-type`}
                    label={t("接收人类型")}
                    value={route.recipient_type}
                    disabled={!editable}
                    options={[
                      { value: "permission", label: "拥有权限的成员" },
                      { value: "role", label: "角色" },
                      { value: "user", label: "指定用户" },
                    ]}
                    onValueChange={(value) => {
                      const recipientType =
                        value as RouteDraft["recipient_type"];
                      update(route.key, {
                        recipient_type: recipientType,
                        recipient_value:
                          recipientType === "role"
                            ? "admin"
                            : recipientType === "permission"
                              ? (permissionOptions[0]?.value ?? "settings:read")
                              : "",
                      });
                    }}
                  />
                </div>
                <div className={styles.routeField}>
                  <UiText text="接收人" />
                  {route.recipient_type === "role" ? (
                    <Select
                      programOptions
                      name={`${route.key}-role`}
                      label={t("接收角色")}
                      value={route.recipient_value}
                      disabled={!editable}
                      options={[
                        { value: "admin", label: "管理员" },
                        { value: "user", label: "成员" },
                      ]}
                      onValueChange={(value) =>
                        update(route.key, { recipient_value: value })
                      }
                    />
                  ) : route.recipient_type === "permission" ? (
                    <Select
                      programOptions
                      name={`${route.key}-permission`}
                      label={t("接收权限")}
                      value={route.recipient_value}
                      disabled={!editable}
                      options={permissionOptions}
                      onValueChange={(value) =>
                        update(route.key, { recipient_value: value })
                      }
                    />
                  ) : (
                    <AccountUserPicker
                      label={t("指定用户")}
                      value={route.recipient_value}
                      disabled={!editable}
                      onChange={(value) =>
                        update(route.key, {
                          recipient_value: value,
                        })
                      }
                    />
                  )}
                </div>
              </>
            )}
            <div className={styles.routeField}>
              <UiText text="通知平台" />
              {event.email_only ? (
                <span className={styles.routeValue}>
                  <UiText text="邮件" />
                </span>
              ) : (
                <Select
                  programOptions
                  name={`${route.key}-platform`}
                  label={t("通知平台")}
                  value={route.platform_id}
                  disabled={!editable}
                  options={platformChoices.map((platform) => ({
                    value: platform.value,
                    label: platform.label,
                    disabled:
                      (!platform.available && platform.value !== "email") ||
                      (fixed &&
                        routes.some(
                          (item) =>
                            item.key !== route.key &&
                            item.platform_id === platform.value,
                        )),
                  }))}
                  onValueChange={(value) =>
                    update(route.key, {
                      platform_id: value,
                      mail_profile_id: null,
                    })
                  }
                />
              )}
            </div>
            {route.platform_id === "email" && (
              <div className={styles.routeField}>
                <UiText text="发信配置" />
                <Select
                  programOptions
                  name={`${route.key}-mail-profile`}
                  label={t("发信配置")}
                  value={route.mail_profile_id ?? "default"}
                  disabled={!editable}
                  options={[
                    { value: "default", label: inheritedMail },
                    ...mailProfiles,
                  ]}
                  onValueChange={(value) =>
                    update(route.key, {
                      mail_profile_id: value === "default" ? null : value,
                    })
                  }
                />
              </div>
            )}
            {required ? (
              <span className={styles.routeSwitch}>
                <Icon name="lock" />
                <UiText text="流程必需" />
              </span>
            ) : (
              <span className={styles.routeSwitch}>
                <Switch
                  checked={route.enabled ?? true}
                  disabled={!editable}
                  onCheckedChange={(enabled) => update(route.key, { enabled })}
                  aria-label={t("启用通知规则")}
                />
                <UiText text={route.enabled ? "启用" : "停用"} />
              </span>
            )}
            {!managed && (
              <Button
                className={`admin-button ${styles.routeRemove}`}
                aria-label={t("删除通知规则")}
                title={t("删除通知规则")}
                disabled={!editable}
                onClick={() =>
                  onChange(routes.filter((item) => item.key !== route.key))
                }
              >
                <Icon name="trash" />
                <UiText text="删除" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function NotificationPolicyPage() {
  const editor = useNotificationState();
  const mailEditor = useMailSettings();
  const user = useAdminAccount();
  const editable = can(user, "settings:write");
  const manageAccess = can(user, "access:manage");
  const [localDrafts, setLocalDrafts] = useState<RouteDraft[] | null>(null);
  const drafts = localDrafts ?? editor.state?.routes.map(routeDraft) ?? [];
  const dirty = localDrafts !== null;
  const permissionOptions = useMemo(
    () =>
      Object.keys(user.permissions ?? {})
        .sort()
        .map((value) => ({
          value,
          label: permissionLabels[value]
            ? `${permissionLabels[value]} · ${value}`
            : value,
        })),
    [user.permissions],
  );
  const platformOptions = useMemo(
    () =>
      (editor.state?.platforms ?? []).map((platform) => ({
        value: platform.id,
        label: platform.available
          ? platform.title
          : `${platform.title}（不可用）`,
        available: platform.available,
      })),
    [editor.state?.platforms],
  );
  const mailProfiles = useMemo(
    () =>
      (mailEditor.saved?.profiles ?? []).map((profile) => ({
        value: profile.id,
        label: profile.is_default ? `${profile.name}（默认）` : profile.name,
      })),
    [mailEditor.saved?.profiles],
  );
  const change = (routes: RouteDraft[]) => {
    setLocalDrafts(routes);
    editor.clearMessage();
  };
  const save = async () => {
    if (!editable) return;
    const invalid = drafts.some(
      (route) =>
        !route.event_type ||
        !route.recipient_value.trim() ||
        !route.platform_id,
    );
    if (invalid) return;
    const saved = await editor.saveRoutes(
      drafts.map((route) => ({
        event_type: route.event_type,
        recipient_type: route.recipient_type,
        recipient_value: route.recipient_value,
        platform_id: route.platform_id,
        mail_profile_id: route.mail_profile_id ?? null,
        template_key: route.template_key,
        enabled: route.enabled ?? true,
      })),
    );
    if (saved) setLocalDrafts(null);
  };
  return (
    <SettingsLayout>
      <UnsavedAccountChanges dirty={dirty} busy={editor.busy} />
      <AdminPageHeading
        title="通知策略"
        description="配置事件的接收规则和投递渠道。账号验证码的收件人由认证流程确定。"
        action={
          <Button
            className="admin-button"
            disabled={editor.loading || editor.busy || dirty}
            onClick={() => {
              void editor.reload();
            }}
          >
            <Icon name="refresh" />
            <UiText text="重新读取" />
          </Button>
        }
      />
      {editor.loading && !editor.state ? (
        <div className="admin-settings-loading" role="status">
          <UiText text="正在读取通知策略…" />
        </div>
      ) : !editor.state ? (
        <div className={styles.message} data-error="true" role="alert">
          <Icon name="cloud-off" />
          <UiText text={editor.error} />
        </div>
      ) : (
        <div className={styles.workspace}>
          {editor.error && (
            <div className={styles.message} data-error="true" role="alert">
              <Icon name="warning" />
              <UiText text={editor.error} />
            </div>
          )}
          {editor.message && (
            <div className={styles.message} role="status">
              <Icon name="check" />
              <UiText text={editor.message} />
            </div>
          )}
          <div className={styles.eventGrid}>
            {editor.state.events.map((event) => (
              <EventRoutes
                key={event.id}
                event={event}
                routes={drafts.filter((route) => route.event_type === event.id)}
                platforms={platformOptions}
                permissionOptions={permissionOptions}
                mailProfiles={mailProfiles}
                editable={
                  editable &&
                  !editor.busy &&
                  (eventGroup(event) !== "账号安全" || manageAccess)
                }
                onChange={(eventRoutes) => {
                  const others = drafts.filter(
                    (route) => route.event_type !== event.id,
                  );
                  change([...others, ...eventRoutes]);
                }}
              />
            ))}
          </div>
          <div className={styles.savebar}>
            <span>
              {dirty ? (
                <UiText text="有尚未保存的策略修改" />
              ) : (
                <UiText
                  text="已读取版本 {revision}"
                  values={{ revision: editor.state.revision }}
                />
              )}
            </span>
            <div className={styles.sectionActions}>
              <Button
                className="admin-button"
                disabled={!dirty || editor.busy}
                onClick={() => {
                  setLocalDrafts(null);
                  editor.clearMessage();
                }}
              >
                <Icon name="undo" />
                <UiText text="撤销修改" />
              </Button>
              <Button
                className="admin-button admin-button-primary"
                disabled={!editable || !dirty || editor.busy}
                onClick={() => void save()}
              >
                <Icon name={editor.busy ? "refresh" : "save"} />
                <UiText text={editor.busy ? "正在保存" : "保存策略"} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
}
