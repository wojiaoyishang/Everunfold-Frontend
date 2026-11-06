"use client";
import { useEffect, useState } from "react";
import { readAccountUsers } from "@/generated/accounts-client";
import type { AccountUserList } from "@/generated/accounts-contract";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { accountFailure } from "@/core/accounts/use-action";
import { UiText, useLocale } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { RouteLink } from "../../components/ui/route-link";
import { Avatar } from "../../components/ui/avatar";
import { AdminPageHeading } from "../components/page-heading";
import { AccountField } from "../../account/fields";
import { AvatarPolicyEditor } from "./avatar-policy";

export function UsersPage() {
  const actor = useAdminAccount(),
    { baseUrl } = useAdminRequest(),
    { uiLocale: locale } = useLocale();
  const [query, setQuery] = useState(""),
    [state, setState] = useState("all"),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0);
  const [list, setList] = useState<AccountUserList | null>(null),
    [error, setError] = useState(""),
    [policy, setPolicy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      readAccountUsers(
        baseUrl,
        {
          q: query,
          page,
          page_size: 20,
          active: state === "all" ? undefined : state === "active",
        },
        { signal: controller.signal },
      )
        .then(({ data }) => {
          if (!controller.signal.aborted) {
            setList(data);
            setError("");
          }
        })
        .catch((failure) => {
          if (!controller.signal.aborted) setError(accountFailure(failure));
        });
    }, 180);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [baseUrl, page, query, state, refresh]);
  return (
    <>
      <AdminPageHeading
        title="用户管理"
        action={
          <div className="account-heading-actions">
            {actor.role === "admin" && (
              <RouteLink
                href="/admin/users/presets"
                className="admin-button"
                showPending
              >
                <UiText text="身份预设" />
              </RouteLink>
            )}
            <Button className="admin-button" onClick={() => setPolicy(true)}>
              <UiText text="头像上传限制" />
            </Button>
            <RouteLink
              href="/admin/users/new"
              className="admin-button admin-button-primary"
              showPending
            >
              <UiText text="新建用户" />
            </RouteLink>
          </div>
        }
      />
      <section className="account-card account-users-card">
        <div className="account-users-toolbar">
          <AccountField
            label="搜索用户"
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            type="search"
          />
          <div className="account-field">
            <span>
              <UiText text="账号状态" />
            </span>
            <Select
              name="user-state"
              label="账号状态"
              programOptions
              value={state}
              options={[
                { value: "all", label: "全部" },
                { value: "active", label: "已启用" },
                { value: "disabled", label: "已停用" },
              ]}
              onValueChange={(value) => {
                setState(value);
                setPage(1);
              }}
            />
          </div>
          <Button
            className="admin-button"
            onClick={() => setRefresh((value) => value + 1)}
          >
            <UiText text="刷新" />
          </Button>
        </div>
        {error && (
          <p role="alert">
            <UiText text={error} />
          </p>
        )}
        {list?.items.map((user) => (
          <div className="account-user-row" key={user.id}>
            <Avatar
              name={user.display_name || user.username}
              src={user.avatar_url}
              size={42}
            />
            <div className="account-user-identity">
              <strong>
                {user.display_name || user.username}
                {user.id === actor.id && (
                  <small>
                    {" "}
                    · <UiText text="我" />
                  </small>
                )}
              </strong>
              <span>
                @{user.username}
                {user.email && <> · {user.email}</>}
              </span>
            </div>
            <div className="account-user-badges">
              <span className="admin-badge">
                {user.role === "admin" ? (
                  <UiText text="管理员" />
                ) : (
                  (user.permission_preset?.name ?? <UiText text="成员" />)
                )}
              </span>
              <span
                className={`admin-badge ${user.active ? "admin-badge-success" : ""}`}
              >
                <UiText text={user.active ? "已启用" : "已停用"} />
              </span>
              {user.must_change_password && (
                <small>
                  <UiText text="待修改初始密码" />
                </small>
              )}
            </div>
            <time className="account-user-date" dateTime={user.created_at}>
              {new Date(user.created_at).toLocaleDateString(locale)}
            </time>
            {actor.role === "admin" || user.role !== "admin" ? (
              <RouteLink
                href={`/admin/users/${user.id}`}
                className="admin-button"
                showPending
              >
                <UiText text="编辑用户" />
              </RouteLink>
            ) : (
              <small>
                <UiText text="管理员保护" />
              </small>
            )}
          </div>
        ))}
        {list && !list.items.length && (
          <p className="account-empty">
            <UiText text="没有匹配的用户。" />
          </p>
        )}
        <div className="account-actions">
          <span className="account-muted">
            {list?.total ?? 0} <UiText text="位用户" />
          </span>
          <Button
            className="admin-button"
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
          >
            <UiText text="上一页" />
          </Button>
          <span>
            {page} / {Math.max(1, Math.ceil((list?.total ?? 0) / 20))}
          </span>
          <Button
            className="admin-button"
            disabled={page * 20 >= (list?.total ?? 0)}
            onClick={() => setPage((value) => value + 1)}
          >
            <UiText text="下一页" />
          </Button>
        </div>
      </section>
      {policy && <AvatarPolicyEditor onClose={() => setPolicy(false)} />}
    </>
  );
}
