"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { GlossaryContract } from "@/core/contracts/glossary";
import {
  archiveGlossaryHook,
  createGlossaryHook,
  queryGlossaryHooks,
  readGlossaryHook,
  updateGlossaryHook,
} from "@/core/contracts/glossary";
import {
  queryNavigationResources,
  type NavigationResource,
} from "@/core/contracts/settings";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { randomUUID } from "@/core/browser/crypto";
import { RequestError } from "@/core/http/request";
import { UiText, useT } from "@/core/i18n/provider";
import { SettingsSection, SettingsToggle } from "../settings/shared";
import { NavigationPicker } from "../settings/navigation-picker";
import { AdminActionButton } from "../components/action-button";
import { AdminWarning } from "../components/warning";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Select } from "../../components/ui/select";
import { Button, TextField } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import styles from "./hooks.module.css";

const ScriptEditor = dynamic(() => import("../pages/source-editor"), {
  ssr: false,
});

type HookList = NonNullable<GlossaryContract["hooks_query"]["data"]>;
type HookItem = HookList["items"][number];
type HookFields = GlossaryContract["hook_create"]["fields"];
type Target = NonNullable<HookFields["targets"]>[number];

export type PendingGlossaryHook = {
  hookId: string;
  operationId: string;
  fields: HookFields;
};

type HookEntry = {
  id: string;
  revision: number | null;
  status: HookItem["status"];
  fields: HookFields;
  operationId?: string;
  pending: boolean;
};

const blankFields = (): HookFields => ({
  mode: "selector",
  selector: "#avatar",
  script: "",
  scope: "all",
  targets: [],
  enabled: true,
  priority: 0,
});

function entryFields(item: HookItem): HookFields {
  return {
    mode: item.mode,
    selector: item.selector,
    script: item.script,
    scope: item.scope,
    targets: item.targets,
    enabled: item.enabled,
    priority: item.priority,
  };
}

function failure(error: unknown, t: ReturnType<typeof useT>) {
  if (error instanceof RequestError) {
    if (error.status === 409) return t("触发已在其他窗口更新，请刷新后重试。");
    if (error.status === 422) return t("请检查目标、选择器或优先级。");
  }
  return t("暂时无法确认操作结果，当前触发输入已保留。");
}

export function GlossaryTermHooks({
  termId,
  writable,
  onPendingHooksChange,
}: {
  termId: string | null;
  writable: boolean;
  onPendingHooksChange?: (hooks: PendingGlossaryHook[]) => void;
}) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const actor = useAdminAccount();
  const canUseScript = actor?.role === "admin";
  const t = useT();
  const [items, setItems] = useState<HookEntry[]>([]);
  const [selected, setSelected] = useState<HookEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [fields, setFields] = useState<HookFields>(blankFields);
  const [baseline, setBaseline] = useState(() => JSON.stringify(blankFields()));
  const [resourceKind, setResourceKind] = useState<Target["kind"] | null>(null);
  const [targetNames, setTargetNames] = useState<
    Record<string, NavigationResource>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const operation = useRef<{ fingerprint: string; id: string } | null>(null);
  const editor = useRef<HTMLDivElement>(null);

  const load = async (signal?: AbortSignal) => {
    if (!termId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await queryGlossaryHooks(
        baseUrl,
        {
          search: "",
          status: "all",
          term_id: termId,
          page: 1,
          page_size: 100,
        },
        csrfToken,
        { signal },
      );
      setItems(
        response.data.items.map((item) => ({
          id: item.id,
          revision: item.revision,
          status: item.status,
          fields: entryFields(item),
          pending: false,
        })),
      );
      setError("");
    } catch (cause) {
      if (!signal?.aborted) setError(failure(cause, t));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void load(controller.signal);
    });
    return () => controller.abort();
    // termId is the identity of this editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, csrfToken, termId]);

  useEffect(() => {
    const missing = [
      ...new Set(
        (fields.targets ?? [])
          .map((target) => `${target.kind}:${target.id}`)
          .filter((key) => !targetNames[key]),
      ),
    ];
    if (!missing.length) return;
    let active = true;
    void Promise.all(
      missing.map(async (key) => {
        const [kind, id] = key.split(":", 2);
        const response = await queryNavigationResources(
          baseUrl,
          { kind: kind as Target["kind"], id, page: 1, page_size: 1 },
          csrfToken,
        );
        return response.data.items[0];
      }),
    ).then((resources) => {
      if (!active) return;
      setTargetNames((current) => ({
        ...current,
        ...Object.fromEntries(
          resources
            .filter((item): item is NavigationResource => Boolean(item))
            .map((item) => [`${item.kind}:${item.id}`, item]),
        ),
      }));
    });
    return () => {
      active = false;
    };
  }, [baseUrl, csrfToken, fields.targets, targetNames]);

  const dirty = creating || JSON.stringify(fields) !== baseline;
  const begin = () => {
    const next = blankFields();
    setSelected(null);
    setCreating(true);
    setFields(next);
    setBaseline(JSON.stringify(next));
    setError("");
    setMessage("");
    operation.current = null;
    requestAnimationFrame(() => {
      editor.current?.scrollIntoView({ block: "nearest" });
    });
  };
  const publishPending = (next: HookEntry[]) => {
    onPendingHooksChange?.(
      next
        .filter((item) => item.pending)
        .map((item) => ({
          hookId: item.id,
          operationId: item.operationId ?? randomUUID(),
          fields: item.fields,
        })),
    );
  };
  const edit = async (item: HookEntry) => {
    if (item.pending) {
      setSelected(item);
      setCreating(false);
      setFields(item.fields);
      setBaseline(JSON.stringify(item.fields));
      setError("");
      setMessage("");
      operation.current = null;
      requestAnimationFrame(() => {
        editor.current?.scrollIntoView({ block: "nearest" });
      });
      return;
    }
    setSaving(true);
    try {
      const response = await readGlossaryHook(baseUrl, item.id);
      const next = entryFields(response.data);
      const entry: HookEntry = {
        id: response.data.id,
        revision: response.data.revision,
        status: response.data.status,
        fields: next,
        pending: false,
      };
      setItems((current) =>
        current.map((value) => (value.id === entry.id ? entry : value)),
      );
      setSelected(entry);
      setCreating(false);
      setFields(next);
      setBaseline(JSON.stringify(next));
      setError("");
      setMessage("");
      operation.current = null;
      requestAnimationFrame(() => {
        editor.current?.scrollIntoView({ block: "nearest" });
      });
    } catch (cause) {
      setError(failure(cause, t));
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!writable || saving) return;
    const value: HookFields = {
      ...fields,
      selector:
        fields.mode === "selector" ? (fields.selector ?? "").trim() : "",
      script: fields.mode === "script" ? (fields.script ?? "").trim() : "",
      targets: fields.scope === "all" ? [] : (fields.targets ?? []),
    };
    if (value.mode === "script" && (!canUseScript || !value.script)) {
      setError(
        canUseScript
          ? t("请填写 JavaScript 挂载脚本。")
          : t("只有管理员可以保存 JavaScript 页面触发。"),
      );
      return;
    }
    const fingerprint = JSON.stringify([
      selected?.id ?? "new",
      selected?.revision ?? 0,
      termId,
      value,
    ]);
    if (operation.current?.fingerprint !== fingerprint)
      operation.current = { fingerprint, id: randomUUID() };
    if (!termId) {
      const entry: HookEntry = {
        id: selected?.id ?? randomUUID(),
        revision: null,
        status: "active",
        fields: value,
        operationId: selected?.operationId ?? randomUUID(),
        pending: true,
      };
      const nextItems = selected
        ? items.map((item) => (item.id === entry.id ? entry : item))
        : [...items, entry];
      setItems(nextItems);
      setSelected(entry);
      setCreating(false);
      setFields(value);
      setBaseline(JSON.stringify(value));
      operation.current = null;
      setMessage(t("页面触发将在保存术语时一并保存。"));
      publishPending(nextItems);
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      let response;
      if (selected) {
        if (selected.revision === null) {
          setError(t("请先保存术语，再保存这条页面触发。"));
          return;
        }
        response = await updateGlossaryHook(
          baseUrl,
          selected.id,
          {
            operation_id: operation.current.id,
            expected_revision: selected.revision,
            term_id: termId,
            fields: value,
          },
          csrfToken,
        );
      } else {
        response = await createGlossaryHook(
          baseUrl,
          {
            operation_id: operation.current.id,
            hook_id: randomUUID(),
            term_id: termId,
            fields: value,
          },
          csrfToken,
        );
      }
      const next = entryFields(response.data);
      const entry: HookEntry = {
        id: response.data.id,
        revision: response.data.revision,
        status: response.data.status,
        fields: next,
        pending: false,
      };
      setItems((current) =>
        current.map((item) => (item.id === entry.id ? entry : item)),
      );
      setSelected(entry);
      setCreating(false);
      setFields(next);
      setBaseline(JSON.stringify(next));
      operation.current = null;
      setMessage(t("页面触发已保存。"));
      await load();
    } catch (cause) {
      setError(failure(cause, t));
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!selected) return false;
    if (!termId) {
      const nextItems = items.filter((item) => item.id !== selected.id);
      setItems(nextItems);
      setSelected(null);
      setCreating(false);
      setFields(blankFields());
      setBaseline(JSON.stringify(blankFields()));
      setMessage(t("已移除待保存的页面触发。"));
      publishPending(nextItems);
      return true;
    }
    if (selected.revision === null) return false;
    const response = await archiveGlossaryHook(
      baseUrl,
      selected.id,
      { operation_id: randomUUID(), expected_revision: selected.revision },
      csrfToken,
    );
    const next = entryFields(response.data);
    setSelected({
      id: response.data.id,
      revision: response.data.revision,
      status: response.data.status,
      fields: next,
      pending: false,
    });
    setMessage(t("页面触发已归档。"));
    await load();
    return true;
  };

  return (
    <>
      <SettingsSection
        id="glossary-page-hooks"
        title="页面触发"
        description="用 CSS 选择器把这个术语连接到页面元素；与正文关键词匹配相互独立。"
        action={
          writable ? (
            <AdminActionButton
              icon="plus"
              aria-controls="glossary-hook-editor"
              aria-expanded={Boolean(selected || creating || dirty)}
              onClick={begin}
            >
              <UiText text="新建页面触发" />
            </AdminActionButton>
          ) : undefined
        }
      >
        <div className={styles.embedded}>
          {items.length > 0 && (
            <div className={styles.list}>
              {items.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  className={styles.row}
                  aria-current={selected?.id === item.id ? "true" : undefined}
                  onClick={() => void edit(item)}
                >
                  <span className={styles.rowIcon}>
                    <Icon name="glossary" />
                  </span>
                  <span>
                    <strong>
                      {item.fields.mode === "selector"
                        ? item.fields.selector
                        : t("JavaScript 挂载")}
                    </strong>
                    <small>
                      {item.fields.scope === "all"
                        ? t("所有页面")
                        : `${item.fields.targets?.length ?? 0}${t("个指定内容")}`}
                    </small>
                  </span>
                  <span
                    className="admin-badge"
                    data-tone={
                      item.pending
                        ? "warning"
                        : item.fields.enabled && item.status === "active"
                          ? "positive"
                          : "warning"
                    }
                  >
                    <UiText
                      text={
                        item.pending
                          ? "待保存"
                          : item.fields.enabled && item.status === "active"
                            ? "启用"
                            : "停用"
                      }
                    />
                  </span>
                </Button>
              ))}
            </div>
          )}
          {!loading && !items.length && (
            <p className={styles.empty}>还没有页面触发。</p>
          )}
          {(selected || creating || dirty) && (
            <div
              ref={editor}
              id="glossary-hook-editor"
              className={styles.hookEditor}
              tabIndex={-1}
            >
              <div className="admin-settings-field">
                <label>
                  <UiText text="作用范围" />
                </label>
                <Select
                  programOptions
                  name="glossary-hook-scope"
                  label="作用范围"
                  value={fields.scope ?? "all"}
                  options={[
                    { value: "all", label: "所有公开页面" },
                    { value: "content", label: "指定内容" },
                  ]}
                  onValueChange={(scope) =>
                    setFields((current) => ({
                      ...current,
                      scope: scope as "all" | "content",
                      targets: scope === "all" ? [] : current.targets,
                    }))
                  }
                />
              </div>
              <div className="admin-settings-field">
                <label>
                  <UiText text="触发方式" />
                </label>
                <Select
                  programOptions
                  name="glossary-hook-mode"
                  label="触发方式"
                  value={fields.mode ?? "selector"}
                  options={[
                    { value: "selector", label: "CSS 选择器" },
                    ...(canUseScript
                      ? [{ value: "script", label: "JavaScript 挂载" }]
                      : []),
                  ]}
                  onValueChange={(mode) =>
                    setFields((current) => ({
                      ...current,
                      mode: mode as "selector" | "script",
                    }))
                  }
                />
                {!canUseScript && (
                  <small>
                    <UiText text="只有管理员可以创建或修改 JavaScript 挂载。" />
                  </small>
                )}
              </div>
              {(fields.scope ?? "all") === "content" && (
                <div className={styles.targets}>
                  <div className={styles.targetActions}>
                    {(["article", "shuoshuo", "page"] as const).map((kind) => (
                      <Button
                        key={kind}
                        type="button"
                        className="admin-button"
                        onClick={() => setResourceKind(kind)}
                      >
                        <Icon
                          name={
                            kind === "article"
                              ? "book"
                              : kind === "shuoshuo"
                                ? "leaf"
                                : "code"
                          }
                        />
                        {kind === "article"
                          ? t("添加文章")
                          : kind === "shuoshuo"
                            ? t("添加说说")
                            : t("添加页面")}
                      </Button>
                    ))}
                  </div>
                  <div className={styles.targetList}>
                    {(fields.targets ?? []).map((target) => {
                      const key = `${target.kind}:${target.id}`;
                      return (
                        <span key={key} className={styles.target}>
                          <span>
                            {targetNames[key]?.title ??
                              `${target.kind} ${target.id.slice(0, 8)}`}
                          </span>
                          <small>{targetNames[key]?.path ?? ""}</small>
                          <Button
                            type="button"
                            className="admin-icon-button"
                            aria-label={t("移除触发目标")}
                            onClick={() =>
                              setFields((current) => ({
                                ...current,
                                targets: (current.targets ?? []).filter(
                                  (item) =>
                                    item.kind !== target.kind ||
                                    item.id !== target.id,
                                ),
                              }))
                            }
                          >
                            <Icon name="close" />
                          </Button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {(fields.mode ?? "selector") === "selector" ? (
                <div className="admin-settings-field">
                  <label>
                    <UiText text="CSS 选择器" />
                  </label>
                  <TextField
                    value={fields.selector}
                    placeholder={t("#avatar 或 .article-header .avatar")}
                    maxLength={256}
                    onChange={(event) =>
                      setFields((current) => ({
                        ...current,
                        selector: event.target.value,
                      }))
                    }
                  />
                  <small>
                    <UiText text="不允许伪元素、html/body/*；每页最多绑定 20 个元素。" />
                  </small>
                </div>
              ) : (
                <div className={styles.scriptEditor}>
                  <AdminWarning text="JavaScript 会在所有命中页面的访客浏览器主线程执行，可读取和修改公开页面 DOM。错误的脚本可能破坏页面；仅管理员可保存，请先预览并确认来源可信。" />
                  <p>
                    <UiText text="可用 glossary.select(selector) 查找元素，也可把 document.querySelector 等原生 DOM 对象直接传给 glossary.mount(element)。" />
                  </p>
                  <ScriptEditor
                    kind="javascript"
                    value={fields.script ?? ""}
                    onChange={(script) =>
                      setFields((current) => ({ ...current, script }))
                    }
                    disabled={!writable || saving || !canUseScript}
                  />
                </div>
              )}
              <div className="admin-settings-field">
                <label>
                  <UiText text="优先级" />
                </label>
                <TextField
                  type="number"
                  min={0}
                  max={100}
                  value={String(fields.priority ?? 0)}
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      priority: Math.max(
                        0,
                        Math.min(100, Number(event.target.value) || 0),
                      ),
                    }))
                  }
                />
              </div>
              <SettingsToggle
                label="启用这条触发"
                hint="指定内容的规则优先于全站规则；归档后立即停止投放。"
                value={fields.enabled ?? true}
                onChange={(enabled) =>
                  setFields((current) => ({ ...current, enabled }))
                }
              />
              {(error || message) && (
                <p
                  className={`admin-settings-message ${error ? "is-error" : ""}`}
                  role={error ? "alert" : "status"}
                >
                  {error || message}
                </p>
              )}
              <div className={styles.inlineActions}>
                {selected && selected.status !== "archived" && (
                  <Button
                    type="button"
                    className="admin-button admin-menu-delete"
                    disabled={!writable || saving}
                    onClick={() => setConfirmArchive(true)}
                  >
                    <Icon name="archive" />
                    <UiText text="归档" />
                  </Button>
                )}
                <span />
                <Button
                  type="button"
                  className="admin-button"
                  disabled={!dirty || saving}
                  onClick={() => {
                    try {
                      setFields(JSON.parse(baseline) as HookFields);
                    } catch {}
                  }}
                >
                  <UiText text="撤销" />
                </Button>
                <AdminActionButton
                  type="button"
                  icon="check"
                  tone="accent"
                  disabled={
                    !writable ||
                    (fields.mode === "script" && !canUseScript) ||
                    saving ||
                    !dirty ||
                    (fields.mode === "script" &&
                      !(fields.script ?? "").trim()) ||
                    (fields.mode === "selector" &&
                      !(fields.selector ?? "").trim()) ||
                    ((fields.scope ?? "all") === "content" &&
                      !(fields.targets ?? []).length)
                  }
                  onClick={() => void save()}
                >
                  <UiText text={saving ? "正在保存…" : "保存触发"} />
                </AdminActionButton>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>

      {resourceKind && (
        <NavigationPicker
          kind={resourceKind}
          onPick={(picked) => {
            const target = { kind: picked.kind, id: picked.id };
            setFields((current) => ({
              ...current,
              targets: (current.targets ?? []).some(
                (item) => item.kind === target.kind && item.id === target.id,
              )
                ? current.targets
                : [...(current.targets ?? []), target],
            }));
            setTargetNames((current) => ({
              ...current,
              [`${picked.kind}:${picked.id}`]: picked,
            }));
          }}
          onClose={() => setResourceKind(null)}
        />
      )}

      <ConfirmDialog
        open={confirmArchive}
        title="归档页面触发"
        description="归档后立即停止公开绑定，历史配置仍保留。"
        intent="warning"
        confirmLabel="归档"
        busy={saving}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={async () => {
          setSaving(true);
          try {
            return await archive();
          } catch (cause) {
            setError(failure(cause, t));
            return false;
          } finally {
            setSaving(false);
          }
        }}
        onConfirmed={() => setConfirmArchive(false)}
      />
    </>
  );
}
