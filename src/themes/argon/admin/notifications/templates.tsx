"use client";

import { useMemo, useRef, useState } from "react";
import { html as htmlLanguage } from "@codemirror/lang-html";
import type { Extension } from "@codemirror/state";
import type {
  NotificationPlatformView,
  NotificationTemplateView,
  SaveNotificationTemplate,
} from "@/core/contracts/notifications";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { useLanguageCatalog, UiText, useT } from "@/core/i18n/provider";
import { useNotificationState } from "@/core/notifications/use-notifications";
import { Button, TextField } from "../../components/ui/primitives";
import {
  CodeEditor,
  type CodeEditorHandle,
  type SourceEditorHandle,
} from "../../components/ui/code-editor";
import { RichTextEditor } from "../../components/ui/rich-text-editor";
import { RichToolbar } from "../content/plugins/rich-toolbar";
import { Select } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Icon } from "../../components/icon";
import { AdminPageHeading } from "../components/page-heading";
import { UnsavedAccountChanges } from "../../account/unsaved";
import { SettingsLayout } from "../settings/section-navigation";
import styles from "./notifications.module.css";

type DraftMap = Record<string, SaveNotificationTemplate>;

const sampleData: Record<string, string> = {
  "actor.name": "小灵",
  "content.excerpt": "这是一条刚刚提交、正在等待审核的评论。",
  "resource.title": "示例文章",
  "resource.url": "/posts/example",
  "resource.review_url": "/admin/comments",
};
const textLanguage: Extension = [];
const emailHtmlLanguage = htmlLanguage();

function identity(event: string, platform: string, locale: string) {
  return `${event}\0${platform}\0${locale}`;
}

function interpolate(value: string) {
  return value.replace(
    /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g,
    (_match, key: string) => sampleData[key] ?? "",
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function interpolateHtml(value: string) {
  return value.replace(
    /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g,
    (_match, key: string) => escapeHtml(sampleData[key] ?? ""),
  );
}

function plainToEmailHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map(
      (paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`,
    )
    .join("\n");
}

function htmlPreviewDocument(value: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{margin:0;padding:14px;color:#20252d;background:#fff;font:14px/1.7 system-ui,sans-serif}img{max-width:100%;height:auto}table{max-width:100%;border-collapse:collapse}td,th{padding:6px 8px}</style></head><body>${interpolateHtml(value)}</body></html>`;
}

function draftFrom(view: NotificationTemplateView): SaveNotificationTemplate {
  return {
    expected_revision: 1,
    event_type: view.event_type,
    platform_id: view.platform_id,
    locale: view.locale,
    subject: view.subject,
    text: view.text,
    html: view.html,
    html_enabled: view.html_enabled,
    enabled: view.enabled,
    reset: false,
  };
}

function PlatformTabs({
  platforms,
  selected,
  onSelect,
}: {
  platforms: NotificationPlatformView[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className={styles.platformTabs} role="tablist" aria-label="通知平台">
      {platforms.map((platform) => (
        <Button
          key={platform.id}
          className={`admin-button ${styles.platformTab}`}
          role="tab"
          aria-selected={platform.id === selected}
          data-current={platform.id === selected || undefined}
          onClick={() => onSelect(platform.id)}
        >
          <Icon name={platform.id === "email" ? "mail" : "bell"} />
          <span>
            <UiText text={platform.title} />
          </span>
          {!platform.available && (
            <small>
              <UiText text="不可用" />
            </small>
          )}
        </Button>
      ))}
    </div>
  );
}

export function NotificationTemplatesPage() {
  const editor = useNotificationState();
  const user = useAdminAccount();
  const catalog = useLanguageCatalog();
  const t = useT();
  const editable = can(user, "settings:write");
  const [eventType, setEventType] = useState("");
  const [platformId, setPlatformId] = useState("in-app");
  const [locale, setLocale] = useState("");
  const [htmlView, setHtmlView] = useState<"visual" | "source">("visual");
  const bodyEditor = useRef<SourceEditorHandle | null>(null);
  const richBodyEditor = useRef<CodeEditorHandle | null>(null);
  const [draftStore, setDraftStore] = useState<{
    revision: number;
    values: DraftMap;
  }>({ revision: 0, values: {} });
  const drafts =
    draftStore.revision === editor.state?.revision ? draftStore.values : {};
  const selectedEvent = eventType || editor.state?.events[0]?.id || "";
  const selectedPlatform = editor.state?.platforms.some(
    (item) => item.id === platformId,
  )
    ? platformId
    : (editor.state?.platforms[0]?.id ?? "in-app");
  const selectedLocale = locale || catalog.default_code;
  const view = useMemo(
    () =>
      editor.state?.templates.find(
        (item) =>
          item.event_type === selectedEvent &&
          item.platform_id === selectedPlatform &&
          item.locale === selectedLocale,
      ),
    [editor.state?.templates, selectedEvent, selectedLocale, selectedPlatform],
  );
  const key = identity(selectedEvent, selectedPlatform, selectedLocale);
  const draft = drafts[key] ?? (view ? draftFrom(view) : null);
  const event = editor.state?.events.find((item) => item.id === selectedEvent);
  const languageOptions = useMemo(
    () =>
      catalog.languages
        .filter((item) => item.enabled)
        .map((item) => ({
          value: item.code,
          label: item.name,
          flag: item.flag,
        })),
    [catalog.languages],
  );
  const currentLanguage = languageOptions.find(
    (item) => item.value === selectedLocale,
  );
  const dirty = !!(
    view &&
    draft &&
    (draft.subject !== view.subject ||
      draft.text !== view.text ||
      draft.html !== view.html ||
      draft.html_enabled !== view.html_enabled ||
      draft.enabled !== view.enabled)
  );
  const activeBodyMode =
    selectedPlatform === "email" && draft?.html_enabled ? "html" : "text";
  const update = (patch: Partial<SaveNotificationTemplate>) => {
    if (!draft) return;
    setDraftStore((current) => ({
      revision: editor.state?.revision ?? current.revision,
      values: {
        ...(current.revision === editor.state?.revision ? current.values : {}),
        [key]: { ...draft, ...patch, reset: false },
      },
    }));
    editor.clearMessage();
  };
  const resetDrafts = () => {
    if (!view) return;
    setDraftStore((current) => ({
      revision: editor.state?.revision ?? current.revision,
      values: {
        ...(current.revision === editor.state?.revision ? current.values : {}),
        [key]: draftFrom(view),
      },
    }));
    editor.clearMessage();
  };
  const save = async (reset = false) => {
    if (!draft || !editable) return;
    const saved = await editor.saveTemplate({
      ...draft,
      expected_revision: editor.state?.revision ?? 1,
      reset,
    });
    if (saved) {
      setDraftStore((current) => {
        const next = {
          revision: editor.state?.revision ?? current.revision,
          values: {
            ...(current.revision === editor.state?.revision
              ? current.values
              : {}),
          },
        };
        delete next.values[key];
        return next;
      });
    }
  };
  const appendVariable = (variable: string) => {
    if (!draft) return;
    const token = `{{${variable}}}`;
    const target =
      activeBodyMode === "html" && htmlView === "visual"
        ? richBodyEditor.current
        : bodyEditor.current;
    if (target) {
      target.insert(token);
      target.focus();
      return;
    }
    if (activeBodyMode === "html") update({ html: (draft.html ?? "") + token });
    else update({ text: (draft.text ?? "") + (draft.text ? " " : "") + token });
  };
  const setHtmlEnabled = (enabled: boolean) => {
    setHtmlView("visual");
    if (enabled && draft && !draft.html)
      update({
        html_enabled: true,
        html: plainToEmailHtml(draft.text ?? ""),
      });
    else update({ html_enabled: enabled });
  };
  return (
    <SettingsLayout>
      <UnsavedAccountChanges dirty={dirty} busy={editor.busy} />
      <AdminPageHeading
        title="通知模板"
        description="正文使用代码编辑器；邮件可编辑 HTML 并保留纯文本回退，变量只做安全插值，不执行模板代码。"
        action={
          <Button
            className="admin-button"
            disabled={editor.loading || editor.busy}
            onClick={() => void editor.reload()}
          >
            <Icon name="refresh" />
            <UiText text="重新读取" />
          </Button>
        }
      />
      {editor.loading && !editor.state ? (
        <div className="admin-settings-loading" role="status">
          <UiText text="正在读取通知模板…" />
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
          <div className={styles.toolbar}>
            <label className={styles.toolbarField}>
              <UiText text="通知事件" />
              <Select
                programOptions
                name="notification-event"
                label={t("通知事件")}
                value={selectedEvent}
                options={editor.state.events.map((item) => ({
                  value: item.id,
                  label: item.title,
                }))}
                onValueChange={setEventType}
              />
            </label>
            <label className={styles.toolbarField}>
              <UiText text="模板语言" />
              <Select
                programOptions
                name="notification-locale"
                label={t("模板语言")}
                value={selectedLocale}
                options={languageOptions}
                onValueChange={setLocale}
              />
            </label>
          </div>
          <PlatformTabs
            platforms={editor.state.platforms}
            selected={selectedPlatform}
            onSelect={setPlatformId}
          />
          {!view || !draft || !event ? (
            <div className={styles.message} data-error="true">
              <Icon name="warning" />
              <UiText text="当前事件、平台和语言没有可用模板。" />
            </div>
          ) : (
            <>
              <div className={styles.editorGrid}>
                <div className={styles.editorMain}>
                  <section className={styles.panel}>
                    <div className={styles.panelHeading}>
                      <div>
                        <h2>
                          <UiText text="模板内容" />
                        </h2>
                        <span>
                          {view.custom ? (
                            <UiText
                              text="已自定义 · 修订 {revision}"
                              values={{ revision: view.revision }}
                            />
                          ) : (
                            <UiText text="正在使用内置默认模板" />
                          )}
                        </span>
                      </div>
                      <Switch
                        checked={draft.enabled ?? true}
                        disabled={!editable || editor.busy}
                        onCheckedChange={(enabled) => update({ enabled })}
                        aria-label={t("启用通知模板")}
                      />
                    </div>
                    <label className={styles.toolbarField}>
                      <UiText text="主题" />
                      <TextField
                        value={draft.subject ?? ""}
                        maxLength={300}
                        placeholder="通知主题"
                        onChange={(input) =>
                          update({ subject: input.target.value })
                        }
                      />
                    </label>
                    <div
                      className={`${styles.toolbarField} ${styles.bodyEditor}`}
                    >
                      <div className={styles.bodyEditorHeading}>
                        <span>
                          <UiText text="正文" />
                        </span>
                        {selectedPlatform === "email" && (
                          <div className={styles.bodyEditorControls}>
                            <label className={styles.htmlBodyToggle}>
                              <span>
                                <UiText text="启用 HTML" />
                              </span>
                              <Switch
                                checked={!!draft.html_enabled}
                                disabled={!editable || editor.busy}
                                aria-label={t("启用 HTML 正文")}
                                onCheckedChange={setHtmlEnabled}
                              />
                            </label>
                            {activeBodyMode === "html" && (
                              <div
                                className={styles.bodyModeTabs}
                                role="tablist"
                                aria-label={t("HTML 编辑视图")}
                              >
                                <Button
                                  role="tab"
                                  aria-selected={htmlView === "visual"}
                                  data-current={
                                    htmlView === "visual" || undefined
                                  }
                                  onClick={() => setHtmlView("visual")}
                                >
                                  <Icon name="eye" />
                                  <UiText text="可视化" />
                                </Button>
                                <Button
                                  role="tab"
                                  aria-selected={htmlView === "source"}
                                  data-current={
                                    htmlView === "source" || undefined
                                  }
                                  onClick={() => setHtmlView("source")}
                                >
                                  <Icon name="code" />
                                  <UiText text="HTML 源码" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {activeBodyMode === "html" && htmlView === "visual" ? (
                        <div className={styles.bodyRichEditor}>
                          <RichTextEditor
                            editorRef={richBodyEditor}
                            value={draft.html ?? ""}
                            onChange={(html) => update({ html })}
                            label={t("HTML 正文可视化")}
                            disabled={!editable || editor.busy}
                            toolbar={(current) => (
                              <RichToolbar editor={current} compact />
                            )}
                          />
                        </div>
                      ) : (
                        <CodeEditor
                          ref={bodyEditor}
                          value={
                            activeBodyMode === "html"
                              ? (draft.html ?? "")
                              : (draft.text ?? "")
                          }
                          onChange={(value) =>
                            update(
                              activeBodyMode === "html"
                                ? { html: value }
                                : { text: value },
                            )
                          }
                          label={
                            activeBodyMode === "html"
                              ? t("HTML 正文源码")
                              : t("通知正文")
                          }
                          language={
                            activeBodyMode === "html"
                              ? emailHtmlLanguage
                              : textLanguage
                          }
                          disabled={!editable || editor.busy}
                        />
                      )}
                    </div>
                    <div>
                      <p className={styles.muted}>
                        <UiText text="可用变量" />
                      </p>
                      <div className={styles.variables}>
                        {event.variables.map((variable) => (
                          <Button
                            key={variable}
                            disabled={!editable || editor.busy}
                            onClick={() => appendVariable(variable)}
                          >
                            {`{{${variable}}}`}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </section>
                  <section className={styles.panel}>
                    <div className={styles.panelHeading}>
                      <h2>
                        <UiText text="安全预览" />
                      </h2>
                      <span>
                        {currentLanguage?.label ?? selectedLocale}
                        {selectedPlatform === "email"
                          ? ` · ${activeBodyMode === "html" ? "HTML" : "纯文本"}`
                          : ""}
                      </span>
                    </div>
                    <div className={styles.previewSubject}>
                      {interpolate(draft.subject ?? "") || t("未填写主题")}
                    </div>
                    {selectedPlatform === "email" &&
                    activeBodyMode === "html" ? (
                      <iframe
                        className={styles.previewFrame}
                        title={t("HTML 通知预览")}
                        sandbox=""
                        srcDoc={htmlPreviewDocument(draft.html ?? "")}
                      />
                    ) : (
                      <pre className={styles.previewBody}>
                        {interpolate(draft.text ?? "") || t("未填写正文")}
                      </pre>
                    )}
                  </section>
                </div>
                <aside className={styles.editorAside}>
                  <section className={styles.panel}>
                    <div className={styles.panelHeading}>
                      <h3>
                        <UiText text="事件信息" />
                      </h3>
                    </div>
                    <dl className={styles.metaList}>
                      <div>
                        <dt>
                          <UiText text="事件" />
                        </dt>
                        <dd>{event.id}</dd>
                      </div>
                      <div>
                        <dt>
                          <UiText text="平台" />
                        </dt>
                        <dd>
                          {
                            editor.state.platforms.find(
                              (item) => item.id === selectedPlatform,
                            )?.title
                          }
                        </dd>
                      </div>
                      <div>
                        <dt>
                          <UiText text="语言" />
                        </dt>
                        <dd>{currentLanguage?.label ?? selectedLocale}</dd>
                      </div>
                      <div>
                        <dt>
                          <UiText text="模板来源" />
                        </dt>
                        <dd>{view.custom ? "站点自定义" : "内置默认"}</dd>
                      </div>
                    </dl>
                  </section>
                  <section className={styles.panel}>
                    <div className={styles.panelHeading}>
                      <h3>
                        <UiText text="变量预览" />
                      </h3>
                    </div>
                    <dl className={styles.metaList}>
                      {event.variables.map((variable) => (
                        <div key={variable}>
                          <dt>{`{{${variable}}}`}</dt>
                          <dd>{sampleData[variable] || t("按事件提供")}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                </aside>
              </div>
              <div className={styles.savebar}>
                <span>
                  <UiText
                    text={dirty ? "有尚未保存的模板修改" : "模板已同步"}
                  />
                </span>
                <div className={styles.sectionActions}>
                  <Button
                    className="admin-button"
                    disabled={!view.custom || editor.busy}
                    onClick={() => void save(true)}
                  >
                    <Icon name="undo" />
                    <UiText text="恢复默认" />
                  </Button>
                  <Button
                    className="admin-button"
                    disabled={!dirty || editor.busy}
                    onClick={resetDrafts}
                  >
                    <UiText text="撤销修改" />
                  </Button>
                  <Button
                    className="admin-button admin-button-primary"
                    disabled={!editable || !dirty || editor.busy}
                    onClick={() => void save()}
                  >
                    <Icon name={editor.busy ? "refresh" : "save"} />
                    <UiText text={editor.busy ? "正在保存" : "保存模板"} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </SettingsLayout>
  );
}
