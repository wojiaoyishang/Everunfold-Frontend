"use client";
import { useEffect, useState } from "react";
import type {
  PermissionCatalog,
  UserPreset,
  UserPresetCatalog,
} from "@/core/contracts/accounts";
import {
  readAccountPermissions,
  readUserPresets,
} from "@/core/contracts/accounts";
import { useAdminRequest } from "@/core/admin/account-context";
import { accountFailure } from "@/core/accounts/use-action";
import { UiText, useT } from "@/core/i18n/provider";
import { Button } from "../../../components/ui/primitives";
import { RouteLink } from "../../../components/ui/route-link";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { AdminPageHeading } from "../../components/page-heading";
import { UserPresetEditor } from "./editor";

export function UserPresetsPage() {
  const { baseUrl } = useAdminRequest();
  const t = useT();
  const [catalog, setCatalog] = useState<UserPresetCatalog | null>(null);
  const [permissions, setPermissions] = useState<PermissionCatalog | null>(
    null,
  );
  const [selected, setSelected] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      readUserPresets(baseUrl, { signal: controller.signal }),
      readAccountPermissions(baseUrl, {
        signal: controller.signal,
        headers: { "X-Site-Locale": "zh-CN" },
      }),
    ])
      .then(([presets, definitions]) => {
        if (controller.signal.aborted) return;
        setCatalog(presets.data);
        setPermissions(definitions.data);
        setError("");
        setSelected(
          (value) =>
            value ||
            presets.data.items[0]?.id ||
            (presets.data.can_manage ? "new" : ""),
        );
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(accountFailure(failure));
      });
    return () => controller.abort();
  }, [baseUrl, refresh]);
  const choose = (value: string) => {
    if (value === selected) return;
    if (dirty) setPending(value);
    else {
      setSelected(value);
      setDirty(false);
    }
  };
  const saved = (row: UserPreset) => {
    setCatalog((value) =>
      value
        ? {
            ...value,
            items: [...value.items.filter((item) => item.id !== row.id), row],
          }
        : null,
    );
    if (selected === "new") {
      setSelected(row.id);
      setDirty(false);
    }
  };
  return (
    <>
      <AdminPageHeading
        title="身份预设"
        action={
          <div className="account-heading-actions">
            <RouteLink href="/admin/users" className="admin-button">
              <UiText text="返回用户列表" />
            </RouteLink>
            <Button
              className="admin-button"
              onClick={() => setRefresh((value) => value + 1)}
            >
              <UiText text="刷新预设" />
            </Button>
            {catalog?.can_manage && (
              <Button
                className="admin-button admin-button-primary"
                onClick={() => choose("new")}
              >
                <UiText text="新建预设" />
              </Button>
            )}
          </div>
        }
      />
      {error && (
        <p role="alert">
          <UiText text={error} />
        </p>
      )}
      <div className="account-applications-layout">
        <nav className="account-application-nav" aria-label={t("身份预设列表")}>
          {catalog?.items.map((row) => (
            <Button
              key={row.id}
              aria-pressed={selected === row.id}
              onClick={() => choose(row.id)}
            >
              <strong>{row.name}</strong>
              <small>
                v{row.revision} ·{" "}
                {t("{count} 项权限", {
                  count: Object.values(row.grants ?? {}).reduce(
                    (total, grants) => total + Object.keys(grants).length,
                    0,
                  ),
                })}
              </small>
            </Button>
          ))}
          {selected === "new" && (
            <Button aria-pressed="true">
              <UiText text="新建预设" />
            </Button>
          )}
        </nav>
        <div className="account-application-content account-preset-content">
          {catalog && permissions ? (
            selected ? (
              <UserPresetEditor
                key={selected}
                row={
                  selected === "new"
                    ? null
                    : catalog.items.find((row) => row.id === selected)
                }
                catalog={permissions}
                canManage={catalog.can_manage}
                onSaved={saved}
                onDirty={setDirty}
                onRemoved={(value) => {
                  setCatalog(value);
                  setDirty(false);
                  setSelected(value.items[0]?.id ?? "new");
                }}
              />
            ) : (
              <p className="account-empty">
                <UiText text="没有可用身份预设。" />
              </p>
            )
          ) : (
            !error && (
              <p role="status">
                <UiText text="正在读取身份预设…" />
              </p>
            )
          )}
        </div>
      </div>
      <ConfirmDialog
        open={pending !== null}
        title="放弃当前预设的修改？"
        description="切换预设会丢失未保存的输入。"
        confirmLabel="放弃并切换"
        onCancel={() => setPending(null)}
        onConfirm={() => true}
        onConfirmed={() => {
          setSelected(pending!);
          setPending(null);
          setDirty(false);
        }}
      />
    </>
  );
}
