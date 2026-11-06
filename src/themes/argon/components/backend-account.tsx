"use client";
import type { SessionView } from "@/core/auth/session-check";
import { UiText, useT } from "@/core/i18n/provider";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/primitives";
import { RouteLink } from "./ui/route-link";
import { Icon } from "./icon";

export function BackendAccount({
  state,
  onRetry,
  onNavigate,
}: {
  state: SessionView;
  onRetry: () => void;
  onNavigate: (event: { preventDefault: () => void }) => void;
}) {
  const user = state.phase === "ready" ? state.session.user : null;
  const t = useT();
  return (
    <section className="backend-account" aria-label={t("账号")}>
      <div className="backend-account-summary">
        {user ? (
          <Avatar
            src={user.avatar_url}
            name={user.display_name || user.username}
            size={38}
          />
        ) : (
          <span className="backend-account-placeholder">
            <Icon name="user" />
          </span>
        )}
        <div>
          <strong>
            {user ? (
              user.display_name || user.username
            ) : (
              <UiText
                text={
                  state.phase === "checking"
                    ? "正在确认登录状态"
                    : state.phase === "failed"
                      ? "无法确认登录状态"
                      : "尚未登录"
                }
              />
            )}
          </strong>
          <small>
            {user ? `@${user.username}` : <UiText text="个人资料与 API Key" />}
          </small>
        </div>
      </div>
      {state.phase === "failed" ? (
        <Button className="backend-account-entry" onClick={onRetry}>
          <UiText text="重新检查登录状态" />
          <Icon name="refresh" />
        </Button>
      ) : (
        <RouteLink
          href="/account"
          className="backend-account-entry"
          onNavigate={onNavigate}
        >
          <UiText text={user ? "进入账号中心" : "登录账号"} />
          <Icon name="arrow" />
        </RouteLink>
      )}
    </section>
  );
}
