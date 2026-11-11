"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AccountProfile } from "@/core/contracts/accounts";
import { readAccountUser, readAccountUsers } from "@/core/contracts/accounts";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { UiText, useT } from "@/core/i18n/provider";
import { Button, TextField } from "./primitives";
import { ActionPopover } from "./action-popover";
import { Avatar } from "./avatar";
import { Icon } from "../icon";
import styles from "./account-user-picker.module.css";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function displayName(user: AccountProfile) {
  return user.display_name || user.username;
}

function uniqueUsers(users: AccountProfile[]) {
  return [...new Map(users.map((user) => [user.id, user])).values()];
}

/**
 * Select a stable account ID from the active user directory.
 * Callers that cannot browse users retain the explicit ID fallback.
 */
export function AccountUserPicker({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const actor = useAdminAccount();
  const { baseUrl } = useAdminRequest();
  const canBrowse = can(actor, "users:manage");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AccountProfile[]>([]);
  const [selected, setSelected] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const directoryError = t("无法读取用户目录，请检查用户管理权限后重试。");
  const chooseUserLabel = t("选择用户");

  useEffect(() => {
    if (!value) return;
    if (selected?.id === value) return;
    if (!canBrowse) return;
    const controller = new AbortController();
    readAccountUser(baseUrl, value, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setSelected(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSelected(null);
      });
    return () => controller.abort();
  }, [baseUrl, canBrowse, selected?.id, value]);

  useEffect(() => {
    if (!open || !canBrowse) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      const trimmed = query.trim();
      const exact = UUID.test(trimmed)
        ? readAccountUser(baseUrl, trimmed, {
            signal: controller.signal,
          })
            .then(({ data }) => [data])
            .catch(() => [])
        : Promise.resolve([]);
      const search = readAccountUsers(
        baseUrl,
        {
          q: trimmed,
          page: 1,
          page_size: 8,
          active: true,
        },
        { signal: controller.signal },
      )
        .then(({ data }) => data.items)
        .catch(() => {
          if (!controller.signal.aborted) {
            setError(directoryError);
          }
          return [] as AccountProfile[];
        });
      Promise.all([exact, search])
        .then(([exactUser, matches]) => {
          if (!controller.signal.aborted) {
            setUsers(uniqueUsers([...exactUser, ...matches]));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [baseUrl, canBrowse, directoryError, open, query]);

  const identity = useMemo(
    () =>
      selected && selected.id === value
        ? displayName(selected)
        : value || chooseUserLabel,
    [chooseUserLabel, selected, value],
  );
  const openChanged = useCallback((next: boolean) => {
    setOpen(next);
    if (next) setQuery("");
  }, []);

  if (!canBrowse) {
    return (
      <div className={styles.manual}>
        <TextField
          value={value}
          disabled={disabled}
          aria-label={label}
          placeholder={t("用户稳定 ID")}
          onChange={(event) => onChange(event.target.value.trim())}
        />
        <small>
          <UiText text="当前账号不能浏览用户目录，请填写用户稳定 ID。" />
        </small>
      </div>
    );
  }

  return (
    <div className={styles.picker}>
      <ActionPopover
        label={label}
        disabled={disabled}
        panelWidth={360}
        panelClassName={styles.panel}
        onOpenChange={openChanged}
        triggerContent={
          <span className={styles.triggerContent}>
            {selected?.id === value ? (
              <Avatar
                name={displayName(selected)}
                src={selected.avatar_url}
                size={24}
              />
            ) : (
              <span className={styles.avatarFallback} aria-hidden="true">
                <Icon name="user" />
              </span>
            )}
            <span className={styles.identity}>
              <strong>{identity}</strong>
              {selected?.id === value && (
                <small title={value}>
                  @{selected.username} · {value.slice(0, 8)}
                </small>
              )}
            </span>
            <Icon name="chevron-down" />
          </span>
        }
      >
        {(close) => (
          <>
            <label className={styles.search}>
              <Icon name="search" />
              <TextField
                type="search"
                value={query}
                autoComplete="off"
                aria-label={t("搜索用户")}
                placeholder={t("搜索姓名、用户名、邮箱或粘贴 ID")}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div
              className={styles.results}
              role="listbox"
              aria-label={t("用户搜索结果")}
            >
              {loading ? (
                <p className={styles.status} role="status">
                  <UiText text="正在查找用户…" />
                </p>
              ) : error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : users.length ? (
                users.map((user) => (
                  <Button
                    key={user.id}
                    role="option"
                    aria-selected={value === user.id}
                    className={styles.option}
                    onClick={() => {
                      onChange(user.id);
                      close();
                    }}
                  >
                    <Avatar
                      name={displayName(user)}
                      src={user.avatar_url}
                      size={32}
                    />
                    <span>
                      <strong>{displayName(user)}</strong>
                      <small>
                        @{user.username}
                        {user.email ? ` · ${user.email}` : ""}
                      </small>
                      <code title={user.id}>{user.id}</code>
                    </span>
                    {!user.active && (
                      <em>
                        <UiText text="已停用" />
                      </em>
                    )}
                    {value === user.id && <Icon name="check" />}
                  </Button>
                ))
              ) : (
                <p className={styles.status}>
                  <UiText text="没有匹配的用户。" />
                </p>
              )}
            </div>
          </>
        )}
      </ActionPopover>
      {value && (
        <Button
          className={styles.clear}
          disabled={disabled}
          aria-label={t("清除指定用户")}
          title={t("清除指定用户")}
          onClick={() => onChange("")}
        >
          <Icon name="close" />
        </Button>
      )}
    </div>
  );
}
