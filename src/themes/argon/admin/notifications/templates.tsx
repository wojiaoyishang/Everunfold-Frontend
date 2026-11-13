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
import {
  escapeHtml,
  interpolateEmail,
  renderEmailPreview,
} from "@/core/notifications/email-preview";
import { Button, TextField } from "../../components/ui/primitives";
import {
  CodeEditor,
  type CodeEditorHandle,
} from "../../components/ui/code-editor";
import { Select } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Icon } from "../../components/icon";
import { AdminPageHeading } from "../components/page-heading";
import { UnsavedAccountChanges } from "../../account/unsaved";
import { SettingsLayout } from "../settings/section-navigation";
import { MailBrandDialog } from "./mail-brand";
import { RichTextEditor } from "../../components/ui/rich-text-editor";
import { RichToolbar } from "../content/plugins/rich-toolbar";
import {
  NotificationVariableValues,
  templateSampleValues,
  variableLabels,
} from "./variable-values";
import styles from "./notifications.module.css";

type DraftMap = Record<string, SaveNotificationTemplate>;

const textLanguage: Extension = [];
const emailHtmlLanguage = htmlLanguage();
const emptySiteVariables: Record<string, string> = {};

function identity(event: string, platform: string, locale: string) {
  return `${event}\0${platform}\0${locale}`;
}

function plainToEmailHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map(
      (paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`,
    )
    .join("\n");
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
  const canWriteSettings = can(user, "settings:write");
  const [eventType, setEventType] = useState("");
  const [platformId, setPlatformId] = useState("in-app");
  const [locale, setLocale] = useState("");
  const [htmlView, setHtmlView] = useState<"visual" | "source">("visual");
  const [previewMode, setPreviewMode] = useState<"html" | "no-icon">("html");
  const [sampleOverrides, setSampleOverrides] = useState<
    Record<string, string>
  >({});
  const [insertTarget, setInsertTarget] = useState<"subject" | "body">("body");
  const [brandOpen, setBrandOpen] = useState(false);
  const brandTrigger = useRef<HTMLButtonElement>(null);
  const subjectField = useRef<HTMLInputElement>(null);
  const bodyEditor = useRef<CodeEditorHandle | null>(null);
  const [draftStore, setDraftStore] = useState<{
    revision: number;
    values: DraftMap;
  }>({ revision: 0, values: {} });
  const drafts =
    draftStore.revision === editor.state?.revision ? draftStore.values : {};
  const selectedEvent = eventType || editor.state?.events[0]?.id || "";
  const event = editor.state?.events.find((item) => item.id === selectedEvent);
  const editable =
    canWriteSettings &&
    (!event?.id.startsWith("security.") || can(user, "access:manage"));
  const availablePlatforms = (editor.state?.platforms ?? []).filter(
    (item) =>
      (!event?.email_only || item.id === "email") &&
      (!event?.platform_ids?.length || event.platform_ids.includes(item.id)),
  );
  const selectedPlatform = availablePlatforms.some(
    (item) => item.id === platformId,
  )
    ? platformId
    : (availablePlatforms[0]?.id ?? "in-app");
  const selectedLocale = locale || catalog.default_code;
  const view = editor.state?.templates.find(
    (item) =>
      item.event_type === selectedEvent &&
      item.platform_id === selectedPlatform &&
      item.locale === selectedLocale,
  );
  const key = identity(selectedEvent, selectedPlatform, selectedLocale);
  const draft = drafts[key] ?? (view ? draftFrom(view) : null);
  const isEmail = selectedPlatform === "email";
  const requiresCode = event?.requires_code;
  const site = editor.state?.site_variables ?? emptySiteVariables;
  const emailVariables = isEmail ? (editor.state?.email_variables ?? []) : [];
  const variables = [...(event?.variables ?? []), ...emailVariables];
  const previewValues = useMemo(
    () => ({
      ...templateSampleValues(
        selectedPlatform,
        selectedEvent,
        selectedLocale,
        site,
        event?.title,
      ),
      ...sampleOverrides,
    }),
    [
      selectedPlatform,
      selectedEvent,
      selectedLocale,
      site,
      event?.title,
      sampleOverrides,
    ],
  );
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
  const htmlEnabled = isEmail && !!draft?.html_enabled;
  const sourceHtml = draft?.html ?? "";
  const previewDocument = useMemo(
    () =>
      htmlEnabled
        ? renderEmailPreview(
            sourceHtml,
            previewMode === "no-icon"
              ? { ...previewValues, "site.icon_url": "" }
              : previewValues,
          )
        : undefined,
    [htmlEnabled, sourceHtml, previewMode, previewValues],
  );
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
    if (insertTarget === "subject" && subjectField.current) {
      const input = subjectField.current;
      const { selectionStart, selectionEnd, value } = input;
      const start = selectionStart ?? value.length;
      const end = selectionEnd ?? value.length;
      const subject = value.slice(0, start) + token + value.slice(end);
      if (subject.length > input.maxLength) return;
      update({ subject });
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(start + token.length, start + token.length);
      });
      return;
    }
    const target = bodyEditor.current;
    if (target) {
      if (target.insertText) target.insertText(token);
      else target.insert(token);
      target.focus();
      return;
    }
    if (htmlEnabled) {
      update({ html: `${draft.html ?? ""}\n<p>${token}</p>` });
    } else
      update({ text: (draft.text ?? "") + (draft.text ? " " : "") + token });
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
        description="邮件正文可使用 HTML 可视化或源码编辑，变量仅在下方安全预览中填充。"
        action={
          <div className={styles.sectionActions}>
            {editor.state && (
              <Button
                ref={brandTrigger}
                className="admin-button"
                disabled={!canWriteSettings || editor.busy}
                onClick={() => {
                  editor.clearMessage();
                  setBrandOpen(true);
                }}
              >
                <Icon name="mail" />
                <UiText text="邮件品牌" />
              </Button>
            )}
            <Button
              className="admin-button"
              disabled={editor.loading || editor.busy}
              onClick={() => void editor.reload()}
            >
              <Icon name="refresh" />
              <UiText text="重新读取" />
            </Button>
          </div>
        }
      />
      {brandOpen && editor.state && (
        <MailBrandDialog
          brand={editor.state.mail_brand}
          site={site}
          busy={editor.busy}
          error={editor.error}
          returnFocus={brandTrigger}
          onClose={() => setBrandOpen(false)}
          onSave={async (brand) => {
            const revision = await editor.saveBrand(brand);
            if (!revision) return false;
            setDraftStore({ revision, values: drafts });
            return true;
          }}
        />
      )}
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
          {editor.error && !brandOpen && (
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
            platforms={availablePlatforms}
            selected={selectedPlatform}
            onSelect={setPlatformId}
          />
          {requiresCode && (
            <p className={styles.message}>
              <UiText text="正文必须包含验证码变量。验证码不能放在主题或 HTML 属性中。" />
            </p>
          )}
          {isEmail && !site.url && (
            <p className={styles.message}>
              <UiText text="请在邮件品牌中填写公开站点地址，邮件才能包含站内操作链接。预览使用示例地址。" />
            </p>
          )}
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
                        ref={subjectField}
                        value={draft.subject ?? ""}
                        maxLength={300}
                        placeholder={t("通知主题")}
                        disabled={!editable || editor.busy}
                        onFocus={() => setInsertTarget("subject")}
                        onChange={(input) =>
                          update({ subject: input.target.value })
                        }
                      />
                    </label>
                    <div
                      className={`${styles.toolbarField} ${styles.bodyEditor}`}
                      onFocusCapture={() => setInsertTarget("body")}
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
                            {htmlEnabled && (
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
                      {htmlEnabled && htmlView === "visual" ? (
                        <RichTextEditor
                          key={key}
                          template
                          editorRef={bodyEditor}
                          value={sourceHtml}
                          label={t("HTML 正文可视化")}
                          disabled={!editable || editor.busy}
                          onChange={(html) => update({ html })}
                          toolbar={(instance) => (
                            <RichToolbar editor={instance} emailTemplate />
                          )}
                        />
                      ) : (
                        <CodeEditor
                          key={key}
                          ref={(instance) => {
                            bodyEditor.current = instance;
                          }}
                          value={
                            htmlEnabled
                              ? (draft.html ?? "")
                              : (draft.text ?? "")
                          }
                          onChange={(value) =>
                            update(
                              htmlEnabled ? { html: value } : { text: value },
                            )
                          }
                          label={
                            htmlEnabled ? t("HTML 正文源码") : t("通知正文")
                          }
                          language={
                            htmlEnabled ? emailHtmlLanguage : textLanguage
                          }
                          disabled={!editable || editor.busy}
                        />
                      )}
                    </div>
                    <div>
                      <p className={styles.muted}>
                        <UiText
                          text={
                            insertTarget === "subject"
                              ? "插入变量到主题"
                              : "插入变量到正文"
                          }
                        />
                      </p>
                      {[
                        { label: "事件变量", keys: event.variables },
                        { label: "通用邮件变量", keys: emailVariables },
                      ].map(({ label, keys }) =>
                        keys.length ? (
                          <div key={label} className={styles.variableGroup}>
                            <small className={styles.muted}>
                              <UiText text={label} />
                            </small>
                            <div className={styles.variables}>
                              {keys.map((variable) => (
                                <Button
                                  key={variable}
                                  title={t(
                                    variableLabels[variable] ?? variable,
                                  )}
                                  disabled={
                                    !editable ||
                                    editor.busy ||
                                    (requiresCode &&
                                      insertTarget === "subject" &&
                                      variable === "verification.code")
                                  }
                                  onClick={() => appendVariable(variable)}
                                >
                                  {`{{${variable}}}`}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ) : null,
                      )}
                    </div>
                  </section>
                  <section className={styles.panel}>
                    <div className={styles.panelHeading}>
                      <h2>
                        <UiText text="安全预览" />
                      </h2>
                      {htmlEnabled && (
                        <div
                          className={`${styles.previewControls} ${styles.variables}`}
                        >
                          {(
                            [
                              ["html", "HTML"],
                              ["no-icon", "无图标"],
                            ] as const
                          ).map(([mode, label]) => (
                            <Button
                              key={mode}
                              aria-pressed={previewMode === mode}
                              onClick={() => setPreviewMode(mode)}
                            >
                              <UiText text={label} />
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={styles.previewSubject}>
                      {interpolateEmail(draft.subject ?? "", previewValues) ||
                        t("未填写主题")}
                    </div>
                    {htmlEnabled ? (
                      <>
                        {!site.support_url &&
                          sourceHtml.includes("site.support_url") && (
                            <small className={styles.muted}>
                              <UiText text="帮助链接预览使用示例地址，可在邮件品牌中设置实际地址。" />
                            </small>
                          )}
                        <iframe
                          className={styles.previewFrame}
                          title={t("HTML 通知安全预览")}
                          sandbox=""
                          srcDoc={previewDocument}
                        />
                      </>
                    ) : (
                      <pre className={styles.previewBody}>
                        {interpolateEmail(draft.text ?? "", previewValues) ||
                          t("未填写正文")}
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
                        <UiText text="变量填充" />
                      </h3>
                    </div>
                    <NotificationVariableValues
                      variables={variables}
                      values={previewValues}
                      onChange={(variable, value) =>
                        setSampleOverrides((current) => ({
                          ...current,
                          [variable]: value,
                        }))
                      }
                      onReset={() => setSampleOverrides({})}
                    />
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
                  {view.builtin && (
                    <Button
                      className="admin-button"
                      disabled={!editable || dirty || editor.busy}
                      onClick={() => {
                        if (!view.builtin) return;
                        update(view.builtin);
                        setHtmlView("visual");
                        setPreviewMode("html");
                      }}
                    >
                      <UiText text="载入新版到草稿" />
                    </Button>
                  )}
                  <Button
                    className="admin-button"
                    disabled={!editable || !view.custom || editor.busy}
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
