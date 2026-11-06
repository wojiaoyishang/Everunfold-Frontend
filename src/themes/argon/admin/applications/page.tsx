"use client";
import { useEffect, useState } from "react";
import type {
  ApplicationState,
  PermissionDefinition,
} from "@/core/contracts/accounts";
import {
  readAccountPermissions,
  readApiApplications,
} from "@/core/contracts/accounts";
import { useAdminRequest } from "@/core/admin/account-context";
import { accountFailure } from "@/core/accounts/use-action";
import { UiText } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { SecretReveal } from "../../account/secret-reveal";
import { UnsavedAccountChanges } from "../../account/unsaved";
import { AdminPageHeading } from "../components/page-heading";
import { ApplicationEditor } from "./editor";

export function ApplicationsPage() {
  const { baseUrl } = useAdminRequest();
  const [apps, setApps] = useState<ApplicationState[] | null>(null),
    [definitions, setDefinitions] = useState<PermissionDefinition[]>([]);
  const [selected, setSelected] = useState(""),
    [pending, setPending] = useState<string | null>(null),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0),
    [secrets, setSecrets] = useState<{ label: string; value: string }[] | null>(
      null,
    );
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      readApiApplications(baseUrl, { signal: controller.signal }),
      readAccountPermissions(baseUrl, {
        signal: controller.signal,
        headers: { "X-Site-Locale": "zh-CN" },
      }),
    ])
      .then(([applications, permissions]) => {
        if (!controller.signal.aborted) {
          setApps(applications.data.items);
          setDefinitions(permissions.data.items);
          setSelected(
            (value) => value || applications.data.items[0]?.id || "new",
          );
          setError("");
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(accountFailure(failure));
      });
    return () => controller.abort();
  }, [baseUrl, refresh]);
  const hasPending = apps?.some((app) =>
    app.callbacks.some((event) => event.status === "pending"),
  );
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        setRefresh((value) => value + 1);
    }, 3000);
    return () => clearInterval(timer);
  }, [hasPending]);
  const choose = (id: string) => {
    if (id === selected) return;
    if (dirty) setPending(id);
    else {
      setSelected(id);
      setDirty(false);
    }
  };
  const saved = (app: ApplicationState) => {
    setApps((value) =>
      [...(value ?? []).filter((item) => item.id !== app.id), app].sort(
        (a, b) => a.id.localeCompare(b.id),
      ),
    );
    if (selected === "new") setSelected(app.id);
  };
  return (
    <>
      <AdminPageHeading
        title="应用程序接入"
        action={
          <div className="account-heading-actions">
            <Button
              className="admin-button"
              onClick={() => setRefresh((value) => value + 1)}
            >
              <UiText text="刷新" />
            </Button>
            <Button
              className="admin-button admin-button-primary"
              onClick={() => choose("new")}
            >
              <UiText text="新建接入应用" />
            </Button>
          </div>
        }
      />
      {error && (
        <p role="alert">
          <UiText text={error} />
        </p>
      )}
      <div className="account-applications-layout">
        <nav className="account-application-nav" aria-label="接入应用">
          {apps?.map((app) => (
            <Button
              key={app.id}
              aria-pressed={selected === app.id}
              onClick={() => choose(app.id)}
            >
              <strong>{app.name}</strong>
              <small>
                {app.id} · <UiText text={app.active ? "已启用" : "已停用"} />
              </small>
            </Button>
          ))}
          {selected === "new" && (
            <Button aria-pressed="true">
              <UiText text="新建接入应用" />
            </Button>
          )}
        </nav>
        <div className="account-application-content">
          {apps && selected ? (
            <ApplicationEditor
              key={selected}
              app={apps.find((item) => item.id === selected) ?? null}
              definitions={definitions}
              onSaved={saved}
              onDirty={setDirty}
              onReveal={setSecrets}
            />
          ) : (
            !error && (
              <p role="status">
                <UiText text="正在读取接入应用…" />
              </p>
            )
          )}
        </div>
      </div>
      <ConfirmDialog
        open={pending !== null}
        title="放弃当前应用的修改？"
        description="切换应用会丢失未保存的输入。"
        confirmLabel="放弃并切换"
        onCancel={() => setPending(null)}
        onConfirm={() => true}
        onConfirmed={() => {
          setSelected(pending!);
          setDirty(false);
          setPending(null);
        }}
      />
      {secrets && (
        <SecretReveal entries={secrets} onClose={() => setSecrets(null)} />
      )}
      <UnsavedAccountChanges dirty={dirty} busy={false} />
    </>
  );
}
