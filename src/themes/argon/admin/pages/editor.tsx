"use client";
import { usePluginRuntime } from "@/core/plugins/runtime/context";
import {
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type {
  ManagedPageItem,
  PageTypeItem,
  PageTemplateItem,
  PageValue,
  PublicManagedPage,
} from "@/core/contracts/pages";
import {
  readManagedPage,
  saveManagedPage,
  savePageTemplate,
  removeManagedPage,
} from "@/core/contracts/pages";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { randomUUID } from "@/core/browser/crypto";
import { livePreviewPath } from "@/core/preview/routes";
import { useEmbeddedPreviewPublisher } from "@/core/preview/use-embedded-publisher";
import { Icon } from "../../components/icon";
import { ScrollHeaderActions } from "../layout/scroll-header-actions";
import { EmbeddedEditorActions } from "../components/embedded-editor-actions";
import { PreviewAction } from "../components/preview-action";
import { usePagePreview } from "@/core/pages/use-preview";
import { isPageUrlFailure, pagesFailure } from "@/core/pages/failure";
import { pageUrlError, suggestedPagePath } from "@/core/pages/path";
import { UiText, useT, useLanguageCatalog } from "@/core/i18n/provider";
import { Form, Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { Switch } from "../../components/ui/switch";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { AccountField } from "../../account/fields";
import { UnsavedAccountChanges } from "../../account/unsaved";
import { AdminPageHeading } from "../components/page-heading";
import { PageConfigurationEditor } from "./configuration";
import { pluginRegistry } from "@/core/plugins/registry";
import { readSettingsModel } from "@/core/forms/schema";
import { parsePageConfiguration } from "@/core/pages/configuration";
import { useAppliedShortcodes } from "@/core/shortcodes/use-library";
import { useEditorResources } from "@/core/content-management/use-editor-resources";
import { customPageTypeId } from "@/core/pages/registration";
import styles from "./pages.module.css";
import { Select } from "../../components/ui/select";
import { PageLanguages } from "./languages";
import { SeoDisclosure, SeoFieldsEditor } from "../components/seo-fields";
import { CaptchaOverrides } from "../components/captcha-overrides";
import { PageCodeFields } from "./code-fields";
import { usePageAction } from "./feedback";
import { BuilderEditor } from "@/themes/argon/admin/builder/editor";
import { PageEditOptions } from "./edit-mode";

const emptyDocument = { version: 1 as const, nodes: [] };

const blank: PageValue = {
  title: "",
  edit_mode: "components",
  component_document: emptyDocument,
  layout: "wide",
  path: "",
  description: "",
  html: "",
  css: "",
  javascript: "",
  javascript_enabled: false,
  javascript_position: "body_end",
  enabled: false,
  allow_indexing: true,
  comments_open: true,
  show_image_viewer: true,
  show_glossary_tooltips: true,
  show_glossary_footnotes: true,
  options: {},
};
export function ManagedPageEditor({
  id,
  pageType,
  template,
}: {
  id?: string;
  pageType?: PageTypeItem;
  template?: PageTemplateItem;
}) {
  usePluginRuntime();
  const actor = useAdminAccount(),
    { baseUrl, csrfToken } = useAdminRequest(),
    router = useRouter();
  const formId = useId();
  const [draftId] = useState(randomUUID);
  const previewId = id ?? draftId;
  const t = useT();
  const catalog = useLanguageCatalog();
  const shortcodes = useAppliedShortcodes();
  const resources = useEditorResources();
  const [language, setLanguage] = useState(catalog.default_code);
  const [saved, setSaved] = useState<ManagedPageItem | null>(null);
  const [initial] = useState<PageValue>(() => {
    const definition = pageType?.registration;
    if (!definition)
      return template
        ? {
            ...blank,
            ...template.value,
            edit_mode: template.value.edit_mode ?? "source",
            title: "",
            description: "",
          }
        : blank;
    return {
      ...blank,
      edit_mode: undefined,
      component_document: undefined,
      layout: undefined,
      title: definition.title,
      path: "",
      comments_open: definition.comments_open ?? true,
      options: {
        ...Object.fromEntries(
          (definition.fields ?? []).map((field) => [
            field.key,
            field.default ?? "",
          ]),
        ),
        ...definition.defaults,
      },
    };
  });
  const [value, setValue] = useState(initial);
  const [optionsSource, setOptionsSource] = useState<string | null>(null);
  const optionsError = useMemo(
    () =>
      optionsSource === null ? "" : parsePageConfiguration(optionsSource).error,
    [optionsSource],
  );
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [manualPath, setManualPath] = useState(Boolean(id));
  const [pathError, setPathError] = useState("");
  const [confirm, setConfirm] = useState<"remove" | "template" | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [newTemplateId, setNewTemplateId] = useState<string>();
  const removed = useRef(false);
  const action = usePageAction((error) => {
    const message = pagesFailure(error);
    if (isPageUrlFailure(error)) setPathError(message);
    return message;
  });
  const notifyLoadError = useEffectEvent((error: unknown) =>
    action.notify(pagesFailure(error)),
  );
  const write =
    can(actor, "pages:write") &&
    !(
      value.edit_mode !== "components" &&
      value.javascript_enabled &&
      actor.role !== "admin"
    );
  const publish = write && can(actor, "pages:publish");
  const source =
    saved?.source ??
    (pageType?.source === "registered" ? "registered" : "custom");
  const typeId = saved?.type_id ?? pageType?.id ?? customPageTypeId;
  const definition = saved ? saved.registration : pageType?.registration;
  const available = saved?.available ?? pageType?.available ?? !id;
  const ready = !id || Boolean(saved);
  const templateId = saved?.template?.id ?? template?.id;
  const componentMode = source === "custom" && value.edit_mode === "components";
  const typeTitle =
    saved?.template?.title ??
    definition?.title ??
    pageType?.title ??
    (source === "custom" ? "自定义页面" : typeId);
  const defaultPath = suggestedPagePath(
    value.title,
    catalog.languages.find(
      (item) =>
        item.code === (source === "custom" ? language : catalog.default_code),
    )?.prefix,
  );
  const path = manualPath ? value.path : defaultPath;
  const visiblePathError = pathError || (manualPath ? pageUrlError(path) : "");
  const dirty =
    JSON.stringify(value) !== JSON.stringify(saved?.value ?? initial) ||
    Boolean(optionsError) ||
    (!saved && language !== catalog.default_code);
  useEffect(() => {
    const controller = new AbortController();
    if (id)
      void readManagedPage(baseUrl, id, { signal: controller.signal })
        .then((response) => {
          if (!controller.signal.aborted) {
            setSaved(response.data);
            setValue(response.data.value);
            setOptionsSource(null);
            if (response.data.language) setLanguage(response.data.language);
            setLoadFailed(false);
          }
        })
        .catch((failure) => {
          if (!controller.signal.aborted) {
            setLoadFailed(true);
            notifyLoadError(failure);
          }
        });
    return () => controller.abort();
  }, [baseUrl, id, attempt]);
  const save = async (apply: boolean) => {
    if (!ready) return false;
    if (!value.title.trim()) {
      action.notify("请输入页面标题。");
      return false;
    }
    const urlError = manualPath ? pageUrlError(path) : "";
    if (urlError) {
      setPathError(urlError);
      action.notify(urlError);
      return false;
    }
    if (optionsError) {
      action.notify(optionsError);
      return false;
    }
    let createdId: string | undefined;
    const completed = await action.run(
      async (signal) => {
        const input = {
          id: saved?.id ?? previewId,
          expected_revision: saved?.revision ?? 0,
          type_id: saved ? undefined : typeId,
          value: { ...value, path: manualPath ? path.trim() : undefined },
          apply,
          language:
            source === "registered" ? undefined : (saved?.language ?? language),
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
          setOptionsSource(null);
          setPathError("");
          setManualPath(true);
          if (!id) createdId = response.data.id;
        }
      },
      apply ? "页面已应用，公开入口将在前端同步后更新。" : "页面草稿已保存。",
    );
    if (completed && createdId) router.replace("/admin/pages/" + createdId);
    return completed;
  };
  const previewPage = useMemo<PublicManagedPage>(
    () => ({
      ...Object.fromEntries(
        Object.entries(value).filter(([key]) => key !== "share_image_media_id"),
      ),
      share_image_url: saved?.share_image_url,
      media_urls: { ...saved?.media_urls, ...resources.media },
      comments_open: value.comments_open ?? true,
      title: value.title || "未命名页面",
      path: path || "/preview",
      id: previewId,
      source,
      implementation_id: source === "registered" ? typeId : null,
      implementation_version: definition?.version,
      revision: saved?.revision ?? 1,
      enabled: true,
      language: source === "registered" ? null : (saved?.language ?? language),
      translation_group_id: saved?.translation_group_id,
      is_original: saved?.is_original,
    }),
    [
      value,
      path,
      previewId,
      saved,
      language,
      source,
      typeId,
      definition?.version,
      resources.media,
    ],
  );
  const preview = usePagePreview(previewPage);
  useEmbeddedPreviewPublisher(
    previewId,
    {
      type: "everunfold:page-preview",
      page: previewPage,
    },
    { dirty, busy: action.busy },
  );
  const openLive = async () => {
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      action.notify("预览窗口被浏览器拦截，请允许弹出窗口后重试。");
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
          {saved && publish && !saved.archived && (
            <Button
              className="admin-button"
              onClick={() => {
                action.clearDialogError();
                setConfirm("remove");
              }}
              disabled={action.busy}
            >
              <Icon name="trash" />
              <UiText text="移到回收站" />
            </Button>
          )}
          <PreviewAction
            icon="sidebar"
            label="实时预览"
            description="在独立窗口中查看页面并编辑"
            disabled={!ready || !write || action.busy || Boolean(optionsError)}
            onClick={() => void openLive()}
          />
          <PreviewAction
            icon="external"
            label="前台预览"
            description="在新窗口中预览当前输入"
            disabled={!ready || Boolean(optionsError)}
            onClick={() => {
              if (!preview.openWindow())
                action.notify("预览窗口被浏览器拦截，请允许弹出窗口后重试。");
            }}
          />
          <EmbeddedEditorActions>
            {ready && write && !saved?.archived && (
              <>
                <Button
                  type="submit"
                  form={formId}
                  onClick={(event) => {
                    if (event.currentTarget.ownerDocument !== document) {
                      event.preventDefault();
                      void save(false);
                    }
                  }}
                  className="admin-button"
                  disabled={
                    action.busy ||
                    (Boolean(saved) && !dirty) ||
                    Boolean(optionsError)
                  }
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
                        void save(true);
                      }
                    }}
                    data-apply="true"
                    className="admin-button admin-button-primary"
                    disabled={
                      action.busy ||
                      Boolean(optionsError) ||
                      (source === "registered" && value.enabled && !available)
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
      <AdminPageHeading title={id ? "编辑页面" : "新建页面"} />
      {id && !ready && (
        <section className="account-card">
          {loadFailed ? (
            <Button
              className="admin-button"
              onClick={() => {
                setLoadFailed(false);
                setAttempt((value) => value + 1);
              }}
            >
              <UiText text="重新读取页面" />
            </Button>
          ) : (
            <p role="status">
              <UiText text="正在读取页面…" />
            </p>
          )}
        </section>
      )}
      {(!id || saved) && (
        <>
          <div className={styles.state}>
            <span className="admin-badge">
              <UiText text={typeTitle} />
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
          <div className={styles.editorLayout}>
            <div className={styles.editorColumn}>
              <Form
                id={formId}
                noValidate
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
                    {!saved && source === "custom" && (
                      <label className={styles.newLanguage}>
                        <UiText text="内容语言" />
                        <Select
                          name="page-language"
                          label={t("内容语言")}
                          value={language}
                          onValueChange={setLanguage}
                          options={catalog.languages
                            .filter((item) => item.enabled)
                            .map((item) => ({
                              value: item.code,
                              label: item.name,
                              flag: item.flag,
                            }))}
                        />
                      </label>
                    )}
                    <div className="account-form-grid">
                      <AccountField
                        label="页面标题"
                        value={value.title}
                        onChange={(title) => {
                          if (!manualPath) setPathError("");
                          setValue({ ...value, title });
                        }}
                        required
                        maxLength={120}
                      />
                      <AccountField
                        label="页面 URL"
                        value={path}
                        onChange={(path) => {
                          setManualPath(true);
                          setPathError("");
                          setValue({ ...value, path });
                        }}
                        error={visiblePathError}
                        required
                        maxLength={500}
                        hint={
                          saved
                            ? "站内路径，例如 /links 或 /about。"
                            : "根据标题生成，也可手动填写站内路径。"
                        }
                        labelAside={
                          !saved &&
                          manualPath && (
                            <Button
                              className={styles.pathReset}
                              onClick={() => {
                                setManualPath(false);
                                setPathError("");
                                setValue({ ...value, path: "" });
                              }}
                            >
                              <UiText text="按标题生成" />
                            </Button>
                          )
                        }
                      />
                    </div>
                    <div className={styles.description}>
                      <CaptchaOverrides
                        value={value}
                        onChange={(patch) => setValue({ ...value, ...patch })}
                        disabled={!write || action.busy}
                      />
                    </div>
                    <div className={styles.description}>
                      <AccountField
                        label="页面说明"
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
                        <UiText text="允许评论" />
                        <Switch
                          aria-label={t("允许评论")}
                          checked={value.comments_open ?? true}
                          onCheckedChange={(comments_open) =>
                            setValue({ ...value, comments_open })
                          }
                        />
                      </span>
                      <span>
                        <UiText text="正文图片点击查看" />
                        <Switch
                          aria-label={t("正文图片点击查看")}
                          checked={value.show_image_viewer !== false}
                          onCheckedChange={(show_image_viewer) =>
                            setValue({ ...value, show_image_viewer })
                          }
                        />
                      </span>
                      <span>
                        <UiText text="正文内术语悬浮提示" />
                        <Switch
                          aria-label={t("正文内术语悬浮提示")}
                          checked={value.show_glossary_tooltips !== false}
                          onCheckedChange={(show_glossary_tooltips) =>
                            setValue({ ...value, show_glossary_tooltips })
                          }
                        />
                      </span>
                      <span>
                        <UiText text="正文末尾术语脚注" />
                        <Switch
                          aria-label={t("正文末尾术语脚注")}
                          checked={value.show_glossary_footnotes !== false}
                          onCheckedChange={(show_glossary_footnotes) =>
                            setValue({ ...value, show_glossary_footnotes })
                          }
                        />
                      </span>
                    </div>
                    <p className={styles.help}>
                      <UiText text="开关和修改在点击“保存并应用”后生效。新页面默认停用。" />
                    </p>
                    <p className={styles.help}>
                      <UiText text="关闭评论只停止新提交，已有评论仍可阅读。保存草稿不会影响前台，保存并应用后生效。" />
                    </p>
                  </section>
                  {definition?.seo_editable !== false && (
                    <SeoDisclosure label="搜索与分享">
                      <SeoFieldsEditor
                        value={value}
                        onChange={(patch) => setValue({ ...value, ...patch })}
                        disabled={!write || action.busy}
                        content={{
                          kind: "page",
                          id: saved?.id,
                          title: value.title,
                          summary: value.description,
                          path: path || undefined,
                          language:
                            saved?.language ??
                            (source === "custom"
                              ? language
                              : catalog.default_code),
                          published: Boolean(saved?.enabled),
                          access:
                            value.captcha_read === "required"
                              ? "captcha"
                              : "public",
                          cover:
                            typeof value.options?.cover_url === "string"
                              ? value.options.cover_url
                              : undefined,
                          share_image_url:
                            value.share_image_media_id &&
                            value.share_image_media_id ===
                              saved?.value.share_image_media_id
                              ? saved.share_image_url
                              : undefined,
                        }}
                      />
                    </SeoDisclosure>
                  )}
                  {source === "registered" ? (
                    <section className="account-card">
                      <header>
                        <h2>
                          <UiText text="页面选项" />
                        </h2>
                        <p className={styles.help}>
                          <UiText
                            text={
                              definition?.description ||
                              "由前端提供交互，在这里维护公开展示的内容。"
                            }
                          />
                        </p>
                      </header>
                      {definition ? (
                        <PageConfigurationEditor
                          model={readSettingsModel(
                            Object.keys(definition.settings_schema ?? {}).length
                              ? definition.settings_schema
                              : pluginRegistry.pages.find(
                                  (page) => page.registration.id === typeId,
                                )?.settingsModel,
                          )}
                          value={value.options ?? {}}
                          source={
                            optionsSource ??
                            JSON.stringify(value.options ?? {}, null, 2)
                          }
                          error={optionsError}
                          disabled={!write || action.busy}
                          onChange={(options) => {
                            setOptionsSource(null);
                            setValue({ ...value, options });
                          }}
                          onSourceChange={(text) => {
                            setOptionsSource(text);
                            const parsed = parsePageConfiguration(text);
                            if (parsed.value)
                              setValue({ ...value, options: parsed.value });
                          }}
                        />
                      ) : (
                        <p>
                          <UiText text="页面实现尚未安装，配置已保留。" />
                        </p>
                      )}
                      {!available && (
                        <p role="alert" className={styles.error}>
                          <UiText text="前端页面实现尚未就绪，或节点版本不一致。可以保存草稿。" />
                        </p>
                      )}
                    </section>
                  ) : (
                    <>
                      <section className="account-card">
                        <PageEditOptions
                          mode={componentMode ? "components" : "source"}
                          layout={value.layout}
                          onMode={
                            templateId
                              ? undefined
                              : (edit_mode) =>
                                  setValue((current) => ({
                                    ...current,
                                    edit_mode,
                                    component_document:
                                      edit_mode === "components"
                                        ? (current.component_document ??
                                          emptyDocument)
                                        : null,
                                  }))
                          }
                          onLayout={(layout) =>
                            setValue((current) => ({ ...current, layout }))
                          }
                        />
                      </section>
                      {componentMode && (
                        <BuilderEditor
                          allowComments
                          value={value.component_document ?? emptyDocument}
                          parameters={value.component_parameters ?? {}}
                          onChange={(component_document) =>
                            setValue((current) => ({
                              ...current,
                              component_document,
                            }))
                          }
                          onParametersChange={(component_parameters) =>
                            setValue((current) => ({
                              ...current,
                              component_parameters,
                            }))
                          }
                          linked={Boolean(templateId)}
                          onMedia={resources.remember}
                          renderContext={{
                            media: previewPage.media_urls,
                            shortcodes,
                          }}
                          disabled={!write || action.busy || saved?.archived}
                          onSaveTemplate={
                            write && !templateId
                              ? () => {
                                  setTemplateName(value.title.trim());
                                  setNewTemplateId(randomUUID());
                                  action.clearDialogError();
                                  setConfirm("template");
                                }
                              : undefined
                          }
                        />
                      )}
                      {templateId ? (
                        <section className="account-card">
                          <header>
                            <h2>
                              <UiText text="自定义页面模板" />
                            </h2>
                          </header>
                          <div className={styles.templateReference}>
                            <div>
                              <strong>{typeTitle}</strong>
                              <p>
                                <UiText text="此页面使用模板的结构。更新模板会同步到使用它的页面，各页面填写的参数会保留。" />
                              </p>
                            </div>
                            <RouteLink
                              className="admin-button"
                              href={`/admin/pages/templates/${templateId}`}
                            >
                              <Icon name="code" />
                              <UiText text={write ? "编辑模板" : "查看模板"} />
                            </RouteLink>
                          </div>
                        </section>
                      ) : (
                        !componentMode && (
                          <PageCodeFields
                            value={value}
                            onChange={(patch) =>
                              setValue({ ...value, ...patch })
                            }
                            disabled={!write || action.busy}
                            allowScripts={actor.role === "admin"}
                          />
                        )
                      )}
                    </>
                  )}
                </fieldset>
              </Form>
              {saved && (
                <PageLanguages
                  page={saved}
                  disabled={dirty || action.busy}
                  onChanged={async () => {
                    const response = await readManagedPage(baseUrl, saved.id);
                    setSaved(response.data);
                    setValue(response.data.value);
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirm === "template"}
        title="另存为页面模板"
        description="模板保存组件结构及选中保留的参数默认值。新建页面时可以选择这个模板。"
        confirmLabel="保存模板"
        submitOnEnter
        busy={action.busy}
        confirmDisabled={!templateName.trim()}
        error={action.dialogError}
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          action.runInDialog(async (signal) => {
            if (!newTemplateId) return;
            const input = {
              id: newTemplateId,
              expected_revision: 0,
              value: {
                title: templateName.trim(),
                description: value.description,
                edit_mode: "components" as const,
                component_document: value.component_document ?? emptyDocument,
                layout: value.layout,
              },
            };
            await savePageTemplate(
              baseUrl,
              { ...input, operation_id: action.operation(input) },
              csrfToken,
              { signal },
            );
          })
        }
        onConfirmed={() => {
          setConfirm(null);
          action.notify("模板已保存。", "success");
        }}
      >
        <AccountField
          label="模板名称"
          value={templateName}
          onChange={setTemplateName}
          maxLength={120}
          required
        />
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "remove"}
        title="将页面移到回收站？"
        description="页面将停用，已保存的内容和配置可从回收站恢复。"
        confirmLabel="移到回收站"
        intent="danger"
        onCancel={() => setConfirm(null)}
        busy={action.busy}
        error={action.dialogError}
        onConfirm={() =>
          action.runInDialog(async (signal) => {
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
          if (removed.current) {
            action.notify("页面已移到回收站。", "success");
            router.replace("/admin/pages");
          }
        }}
      />
      <UnsavedAccountChanges dirty={dirty} busy={action.busy} />
    </>
  );
}
