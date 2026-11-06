"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type {
  ManagedPageItem,
  PageValue,
  PublicManagedPage,
} from "@/generated/pages-contract";
import {
  readManagedPage,
  saveManagedPage,
  removeManagedPage,
} from "@/generated/pages-client";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { useAccountAction } from "@/core/accounts/use-action";
import { randomUUID } from "@/core/browser/crypto";
import { livePreviewPath } from "@/core/preview/routes";
import { useEmbeddedPreviewPublisher } from "@/core/preview/use-embedded-publisher";
import { Icon } from "../../components/icon";
import { ScrollHeaderActions } from "../layout/scroll-header-actions";
import { EmbeddedEditorActions } from "../components/embedded-editor-actions";
import { PreviewAction } from "../components/preview-action";
import { usePagePreview } from "@/core/pages/use-preview";
import { pagesFailure } from "@/core/pages/failure";
import { UiText, useT } from "@/core/i18n/provider";
import { Form, Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { Switch } from "../../components/ui/switch";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { AccountField } from "../../account/fields";
import { UnsavedAccountChanges } from "../../account/unsaved";
import { AdminPageHeading } from "../components/page-heading";
import { PageOptionsEditor } from "./options";
import styles from "./pages.module.css";

const SourceEditor = dynamic(() => import("./source-editor"), { ssr: false });
const blank: PageValue = {
  title: "",
  path: "",
  description: "",
  html: "",
  css: "",
  javascript: "",
  javascript_enabled: false,
  enabled: false,
  allow_indexing: true,
  options: {},
};
export function ManagedPageEditor({ id }: { id?: string }) {
  const actor = useAdminAccount(),
    { baseUrl, csrfToken } = useAdminRequest(),
    router = useRouter();
  const formId = useId();
  const [draftId] = useState(randomUUID);
  const previewId = id ?? draftId;
  const form = useRef<HTMLFormElement>(null);
  const t = useT();
  const [saved, setSaved] = useState<ManagedPageItem | null>(null);
  const [value, setValue] = useState<PageValue>(blank);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"html" | "css" | "javascript">("html");
  const [confirm, setConfirm] = useState<"remove" | null>(null);
  const removed = useRef(false);
  const action = useAccountAction(pagesFailure);
  const write =
    can(actor, "pages:write") &&
    !(value.javascript_enabled && actor.role !== "admin");
  const publish = write && can(actor, "pages:publish");
  const dirty = JSON.stringify(value) !== JSON.stringify(saved?.value ?? blank);
  useEffect(() => {
    const controller = new AbortController();
    if (id)
      void readManagedPage(baseUrl, id, { signal: controller.signal })
        .then((response) => {
          if (!controller.signal.aborted) {
            setSaved(response.data);
            setValue(response.data.value);
            setError("");
          }
        })
        .catch((failure) => {
          if (!controller.signal.aborted) setError(pagesFailure(failure));
        });
    return () => controller.abort();
  }, [baseUrl, id]);
  const save = (apply: boolean) =>
    action.run(
      async (signal) => {
        const input = {
          id: saved?.id ?? previewId,
          expected_revision: saved?.revision ?? 0,
          value,
          apply,
          current_password: password,
        };
        const response = await saveManagedPage(
          baseUrl,
          { ...input, operation_id: action.operation(input) },
          csrfToken,
          { signal },
        );
        if (!signal.aborted) {
          setSaved(response.data);
          setValue(response.data.value);
          setPassword("");
          setError("");
          if (!id) router.replace("/admin/pages/" + response.data.id);
        }
      },
      apply ? "页面已应用，公开入口将在前端同步后更新。" : "页面草稿已保存。",
    );
  const source = saved?.source ?? "custom";
  const previewPage = useMemo<PublicManagedPage>(
    () => ({
      ...value,
      title: value.title || "未命名页面",
      path: value.path || "/preview",
      id: previewId,
      source: saved?.source ?? "custom",
      implementation_id: saved?.implementation_id,
      implementation_version: saved?.registration?.version,
      revision: saved?.revision ?? 1,
      enabled: true,
    }),
    [value, previewId, saved],
  );
  const preview = usePagePreview(previewPage);
  useEmbeddedPreviewPublisher(previewId, {
    type: "everunfold:page-preview",
    page: previewPage,
  });
  const openLive = async () => {
    if ((dirty || !saved) && !form.current?.reportValidity()) return;
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      action.setMessage("预览窗口被浏览器拦截，请允许弹出窗口后重试。");
      return;
    }
    popup.opener = null;
    if ((dirty || !saved) && !(await save(false))) {
      popup.close();
      return;
    }
    popup.location.replace(livePreviewPath("page", saved?.id ?? previewId));
  };

  return (
    <>
      <div className="admin-editor-back admin-page-editor-toolbar">
        <RouteLink href="/admin/pages" className="admin-button">
          <Icon name="arrow-left" />
          <UiText text="返回页面列表" />
        </RouteLink>
        <ScrollHeaderActions className={styles.editorActions}>
          <PreviewAction
            icon="sidebar"
            label="实时预览"
            description="在独立窗口中查看页面并编辑"
            disabled={!write || action.busy}
            onClick={() => void openLive()}
          />
          <PreviewAction
            icon="external"
            label="前台预览"
            description="在新窗口中预览当前输入"
            onClick={preview.openWindow}
          />
          <EmbeddedEditorActions>
            {write && !saved?.archived && (
              <>
                <Button
                  type="submit"
                  form={formId}
                  onClick={(event) => {
                    if (event.currentTarget.ownerDocument !== document) {
                      event.preventDefault();
                      if (form.current?.reportValidity()) void save(false);
                    }
                  }}
                  className="admin-button"
                  disabled={action.busy || !dirty}
                >
                  <Icon name="save" />
                  <UiText text="保存草稿" />
                </Button>
                {publish && (
                  <Button
                    type="submit"
                    form={formId}
                    onClick={(event) => {
                      if (event.currentTarget.ownerDocument !== document) {
                        event.preventDefault();
                        if (form.current?.reportValidity()) void save(true);
                      }
                    }}
                    data-apply="true"
                    className="admin-button admin-button-primary"
                    disabled={
                      action.busy ||
                      (source === "registered" &&
                        value.enabled &&
                        !saved?.available)
                    }
                  >
                    <Icon name="save" />
                    <UiText
                      text={value.enabled ? "保存并应用" : "保存并停用"}
                    />
                  </Button>
                )}
              </>
            )}
          </EmbeddedEditorActions>
        </ScrollHeaderActions>
      </div>
      <AdminPageHeading title={id ? "编辑页面" : "新建自定义页面"} />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {(!id || saved) && (
        <>
          <div className={styles.state}>
            <span className="admin-badge">
              <UiText
                text={source === "registered" ? "前端注册" : "自定义代码"}
              />
            </span>
            <span
              className={`admin-badge ${saved?.enabled ? "admin-badge-success" : ""}`}
            >
              <UiText text={saved?.enabled ? "已启用" : "已停用"} />
            </span>
            {saved && (
              <span>
                <UiText text="草稿版本" /> {saved.revision} ·{" "}
                <UiText text="应用版本" /> {saved.applied_revision ?? "—"}
              </span>
            )}
            {saved?.archived && (
              <span className="admin-badge">
                <UiText text="回收站" />
              </span>
            )}
          </div>
          {preview.error && (
            <p role="alert" className={styles.error}>
              <UiText text={preview.error} />
            </p>
          )}
          <div className={styles.editorLayout}>
            <div className={styles.editorColumn}>
              <Form
                ref={form}
                id={formId}
                onSubmit={(event) => {
                  event.preventDefault();
                  const submitter = (event.nativeEvent as SubmitEvent)
                    .submitter;
                  void save(
                    submitter instanceof HTMLElement &&
                      submitter.dataset.apply === "true",
                  );
                }}
              >
                <fieldset
                  className="account-fieldset"
                  disabled={!write || action.busy || saved?.archived}
                >
                  <section className="account-card">
                    <div className="account-form-grid">
                      <AccountField
                        label="页面标题"
                        value={value.title}
                        onChange={(title) => setValue({ ...value, title })}
                        required
                        maxLength={120}
                      />
                      <AccountField
                        label="页面路径"
                        value={value.path}
                        onChange={(path) => setValue({ ...value, path })}
                        required
                        maxLength={500}
                        hint="例如 /links 或 /about，已有内容和系统路径不可占用。"
                      />
                    </div>
                    <div className={styles.description}>
                      <AccountField
                        label="页面说明与搜索摘要"
                        value={value.description ?? ""}
                        onChange={(description) =>
                          setValue({ ...value, description })
                        }
                        multiline
                        maxLength={500}
                      />
                    </div>
                    <div className={styles.toggles}>
                      <span>
                        <UiText text="启用页面" />
                        <Switch
                          aria-label={t("启用页面")}
                          checked={!!value.enabled}
                          onCheckedChange={(enabled) =>
                            setValue({ ...value, enabled })
                          }
                        />
                      </span>
                      <span>
                        <UiText text="允许搜索引擎收录" />
                        <Switch
                          aria-label={t("允许搜索引擎收录")}
                          checked={value.allow_indexing !== false}
                          onCheckedChange={(allow_indexing) =>
                            setValue({ ...value, allow_indexing })
                          }
                        />
                      </span>
                    </div>
                    <p className={styles.help}>
                      <UiText text="开关和修改在点击“保存并应用”后生效。新页面默认停用。" />
                    </p>
                  </section>
                  {source === "registered" ? (
                    <section className="account-card">
                      <header>
                        <h2>
                          <UiText text="页面选项" />
                        </h2>
                        <p className={styles.help}>
                          <UiText text="由前端提供交互，在这里维护公开展示的内容。" />
                        </p>
                      </header>
                      {saved?.registration ? (
                        <PageOptionsEditor
                          fields={saved.registration.fields ?? []}
                          value={value.options ?? {}}
                          onChange={(options) =>
                            setValue({ ...value, options })
                          }
                        />
                      ) : (
                        <p>
                          <UiText text="页面实现尚未安装，配置已保留。" />
                        </p>
                      )}
                      {!saved?.available && (
                        <p role="alert" className={styles.error}>
                          <UiText text="前端页面实现尚未就绪，或节点版本不一致。可以保存草稿。" />
                        </p>
                      )}
                    </section>
                  ) : (
                    <section className="account-card">
                      <header>
                        <h2>
                          <UiText text="页面源码" />
                        </h2>
                      </header>
                      <nav
                        className={styles.tabs}
                        aria-label={t("页面源码模式")}
                      >
                        {(["html", "css", "javascript"] as const).map(
                          (kind) => (
                            <Button
                              key={kind}
                              aria-pressed={mode === kind}
                              onClick={() => setMode(kind)}
                            >
                              {kind === "javascript"
                                ? "JavaScript"
                                : kind.toUpperCase()}
                            </Button>
                          ),
                        )}
                      </nav>
                      {
                        <SourceEditor
                          kind={mode}
                          value={value[mode] ?? ""}
                          onChange={(text) =>
                            setValue({ ...value, [mode]: text })
                          }
                          disabled={!write || action.busy}
                        />
                      }
                      <div className={styles.toggle}>
                        <span>JavaScript</span>
                        <Switch
                          aria-label={t("启用 JavaScript")}
                          checked={!!value.javascript_enabled}
                          onCheckedChange={(javascript_enabled) =>
                            setValue({ ...value, javascript_enabled })
                          }
                          disabled={actor.role !== "admin"}
                        />
                      </div>
                      <p className={styles.help}>
                        <UiText text="JavaScript 默认关闭，只在独立页面沙箱内运行。启用脚本需要管理员确认。" />
                      </p>
                      {value.javascript_enabled && (
                        <AccountField
                          label="当前管理员密码"
                          value={password}
                          onChange={setPassword}
                          secret
                          required
                          autoComplete="current-password"
                        />
                      )}
                    </section>
                  )}
                </fieldset>
              </Form>
              <p className="account-message" role="status">
                <UiText text={action.message} />
              </p>
              {saved?.source === "custom" && publish && !saved.archived && (
                <Button
                  className="admin-button"
                  onClick={() => setConfirm("remove")}
                  disabled={action.busy}
                >
                  <UiText text="移到回收站" />
                </Button>
              )}
            </div>
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirm === "remove"}
        title="将页面移到回收站？"
        description="页面将停用，源码保留，可从回收站恢复。未保存的输入将丢弃。"
        confirmLabel="移到回收站"
        intent="danger"
        onCancel={() => setConfirm(null)}
        error={action.message}
        onConfirm={() =>
          action.run(async (signal) => {
            const input = { id: saved!.id, expected_revision: saved!.revision };
            await removeManagedPage(
              baseUrl,
              { ...input, operation_id: action.operation(input) },
              csrfToken,
              { signal },
            );
            removed.current = !signal.aborted;
          })
        }
        onConfirmed={() => {
          setConfirm(null);
          if (removed.current) router.replace("/admin/pages");
        }}
      />
      <UnsavedAccountChanges dirty={dirty} busy={action.busy} />
    </>
  );
}
