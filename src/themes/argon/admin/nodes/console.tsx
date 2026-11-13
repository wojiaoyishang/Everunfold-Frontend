"use client";

import { useState, type FormEvent } from "react";
import { nodesConsolePath } from "@/core/auth/routes";
import { nodeError, useNodeConsole } from "@/core/nodes/use-console";
import type { LocalNode } from "@/core/nodes/local";
import {
  Button,
  Form,
  TextField,
} from "@/themes/argon/components/ui/primitives";
import { FormField } from "@/themes/argon/components/ui/form-field";
import { Select } from "@/themes/argon/components/ui/select";
import { ConfirmDialog } from "@/themes/argon/components/ui/confirm-dialog";
import { RouteLink } from "@/themes/argon/components/ui/route-link";
import { FleetStatus, LocalNodeStatus } from "./status";
import styles from "./console.module.css";

export function NodeConsole() {
  const { view, refreshing, refresh, login, logout, switchProfile } =
    useNodeConsole();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const loginPath = "/login?next=" + encodeURIComponent(nodesConsolePath);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const password = String(new FormData(form).get("password") ?? "");
    form.reset();
    setPending(true);
    setError("");
    try {
      await login(password);
    } catch (cause) {
      setError(nodeError(cause));
    } finally {
      setPending(false);
    }
  }

  const full = view.mode === "online" || view.mode === "offline";
  return (
    <main
      className={`admin-root ${full ? styles.page : styles.center}`}
      data-surface="admin"
      data-admin-mode="system"
    >
      <div className={styles.shell}>
        <header className={styles.toolbar}>
          <h1>节点诊断</h1>
          <div className={styles.actions}>
            <Button
              className="admin-button"
              onClick={() => {
                setError("");
                void refresh();
              }}
              disabled={refreshing || pending}
            >
              {refreshing ? "正在刷新…" : "刷新状态"}
            </Button>
            {view.mode === "online" && (
              <RouteLink className="admin-button" href="/admin">
                返回后台
              </RouteLink>
            )}
            {view.mode === "offline" && (
              <Button
                className="admin-button"
                onClick={() => {
                  void logout().catch((cause) => setError(nodeError(cause)));
                }}
              >
                锁定
              </Button>
            )}
          </div>
        </header>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {view.mode === "loading" && <p role="status">正在检查后端连接…</p>}
        {view.mode === "disabled" && <p role="status">此节点未启用诊断。</p>}
        {view.mode === "unavailable" && (
          <p role="status">暂时无法确认后端状态。请检查连接后刷新。</p>
        )}
        {view.mode === "sign-in" && (
          <div className={styles.panel}>
            <p>后端已连接。请使用站点管理员账号登录。</p>
            <RouteLink
              className="admin-button admin-button-primary"
              href={loginPath}
            >
              管理员登录
            </RouteLink>
          </div>
        )}
        {view.mode === "forbidden" && (
          <p role="status">此页面需要站点管理员权限。</p>
        )}
        {view.mode === "locked" && (
          <div className={styles.panel}>
            <p role="status">后端离线</p>
            {view.passwordConfigured ? (
              <Form className={styles.stack} onSubmit={onLogin}>
                <FormField id="node-password" label="本机诊断密码">
                  <TextField
                    id="node-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    maxLength={1024}
                  />
                </FormField>
                <Button
                  type="submit"
                  className="admin-button admin-button-primary"
                  disabled={pending}
                >
                  {pending ? "正在验证…" : "解锁"}
                </Button>
              </Form>
            ) : (
              <p>本机未设置诊断密码。请在前端服务器检查连接配置。</p>
            )}
          </div>
        )}
        {full && (
          <>
            {view.mode === "offline" && (
              <p role="status">后端离线，无法读取全站同步记录。</p>
            )}
            <noscript>请启用 JavaScript 后使用节点诊断。</noscript>
            {view.local ? (
              <LocalNodeStatus
                node={view.local}
                offline={view.mode === "offline"}
              >
                <ConnectionPicker
                  key={view.local.revision}
                  node={view.local}
                  onChange={switchProfile}
                  onChanged={refresh}
                />
              </LocalNodeStatus>
            ) : (
              <p role="status">
                本机诊断未授权。请确认此节点已在后端登记并启用。
              </p>
            )}
            {view.mode === "online" && <FleetStatus fleet={view.fleet} />}
          </>
        )}
      </div>
    </main>
  );
}

function ConnectionPicker({
  node,
  onChange,
  onChanged,
}: {
  node: LocalNode;
  onChange: (id: string) => Promise<void>;
  onChanged: () => Promise<void>;
}) {
  const [selected, setSelected] = useState(node.active);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const options = node.profiles.map(({ id }) => ({ label: id, value: id }));
  if (options.length < 2) return null;
  return (
    <>
      <div className={styles.picker}>
        <FormField id="node-profile" label="选择已登记的后端">
          <Select
            id="node-profile"
            name="profile"
            label="选择已登记的后端"
            options={options}
            value={selected}
            onValueChange={setSelected}
          />
        </FormField>
        <Button
          className="admin-button"
          disabled={selected === node.active}
          onClick={() => {
            setError("");
            setConfirming(true);
          }}
        >
          切换连接
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        title="切换本机后端"
        description={`将连接切换到 ${selected}。保存后重启本机接收器，再从后端重新同步。`}
        confirmLabel="切换连接"
        error={error}
        onCancel={() => setConfirming(false)}
        onConfirmed={() => {
          setConfirming(false);
          void onChanged();
        }}
        onConfirm={async () => {
          try {
            await onChange(selected);
            return true;
          } catch (cause) {
            setError(nodeError(cause));
            return false;
          }
        }}
      />
    </>
  );
}
