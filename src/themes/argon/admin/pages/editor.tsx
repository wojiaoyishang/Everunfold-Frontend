"use client";
import { embeddedEditorSurface, isEmbeddedEditor } from "@/core/preview/bridge";
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
import {
  datedPageTitle,
  pageUrlError,
  suggestedPagePath,
} from "@/core/pages/path";
import { UiText, useLanguageCatalog, useT } from "@/core/i18n/provider";
import { Form, Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { AccountField } from "../../account/fields";
import { UnsavedAccountChanges } from "../../account/unsaved";
import { AdminPageHeading } from "../components/page-heading";
import { EditorIdentity } from "../components/editor-identity";
import { PermalinkField } from "../components/permalink-field";
import { PageConfigurationEditor } from "./configuration";
import { pluginRegistry } from "@/core/plugins/registry";
import { readSettingsModel } from "@/core/forms/schema";
import { parsePageConfiguration } from "@/core/pages/configuration";
import { useAppliedShortcodes } from "@/core/shortcodes/use-library";
import { useEditorResources } from "@/core/content-management/use-editor-resources";
import { customPageTypeId } from "@/core/pages/registration";
import styles from "./pages.module.css";
import editorColumns from "../components/editor-columns.module.css";
import { NewPageLanguage, PageLanguages } from "./languages";
import { SeoDisclosure, SeoFieldsEditor } from "../components/seo-fields";
import { PageCodeFields } from "./code-fields";
import { usePageAction } from "./feedback";

import { PageEditOptions } from "./edit-mode";
import { PageSettings, PageSettingsGroup } from "./page-settings";

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
  timeZone,
}: {
  id?: string;
  pageType?: PageTypeItem;
  template?: PageTemplateItem;
  timeZone?: string;
}) {
  usePluginRuntime();
  const t = useT();
  const actor = useAdminAccount(),
    { baseUrl, csrfToken } = useAdminRequest(),
    router = useRouter();
  const formId = useId();
  const [draftId] = useState(randomUUID);
  const generatedTitle = useRef<string | null>(null);
  const previewId = id ?? draftId;
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
  const compact = isEmbeddedEditor();
  const update = (patch: Partial<PageValue>) =>
    setValue((current) => ({ ...current, ...patch }));
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
    typeId === customPageTypeId
      ? "自定义页面"
      : (saved?.template?.title ??
        definition?.title ??
        pageType?.title ??
        typeId);
  const editOptions = source === "custom" && (
    <PageEditOptions
      inline
      mode={componentMode ? "components" : "source"}
      layout={value.layout}
      lockedMode={Boolean(templateId)}
      onMode={templateId ? undefined : (edit_mode) => update({ edit_mode })}
      onLayout={(layout) => update({ layout })}
    />
  );
  const defaultPath = suggestedPagePath(
    value.title,
    catalog.languages.find(
      (item) =>
        item.code === (source === "custom" ? language : catalog.default_code),
    )?.prefix,
  );
  const path = manualPath ? value.path : defaultPath;
  const visiblePathError = pathError || (manualPath ? pageUrlError(path) : "");
  const disabled = !write || action.busy || Boolean(saved?.archived);
  const onTitle = (title: string) => {
    if (!manualPath) setPathError("");
    update({ title });
  };
  const permalink = (
    <PermalinkField
      value={path}
      disabled={disabled}
      validate={pageUrlError}
      onChange={(path) => {
        setManualPath(true);
        setPathError("");
        update({ path });
      }}
      error={visiblePathError}
      emptyLabel={!saved ? "保存时自动生成" : undefined}
      after={
        !saved &&
        manualPath && (
          <Button
            className={styles.pathReset}
            onClick={() => {
              setManualPath(false);
              setPathError("");
              update({ path: "" });
            }}
          >
            <UiText text="按标题生成" />
          </Button>
        )
      }
    />
  );
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
    if (saved && !value.title.trim()) {
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
        const title =
          value.title.trim() ||
          (generatedTitle.current ??= datedPageTitle(new Date(), timeZone));
        const input = {
          id: saved?.id ?? previewId,
          expected_revision: saved?.revision ?? 0,
          type_id: saved ? undefined : typeId,
          value: {
            ...value,
            title,
            path: manualPath ? path.trim() : undefined,
            ...(componentMode
              ? {
                  html: undefined,
                  css: undefined,
                  javascript: undefined,
                  javascript_enabled: undefined,
                  javascript_position: undefined,
                }
              : {}),
          },
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
    ready ? { type: "everunfold:page-preview", page: previewPage } : null,
    {
      dirty,
      busy: action.busy,
      published: Boolean(saved?.applied_revision && saved.enabled),
    },
    componentMode
      ? {
          value: {
            document: value.component_document ?? emptyDocument,
            parameters: value.component_parameters ?? {},
            linked: Boolean(templateId),
            disabled: !write || action.busy || Boolean(saved?.archived),
            allowComments: true,
            canSaveTemplate: write && !templateId,
            media: previewPage.media_urls ?? {},
            shortcodes: shortcodes ?? [],
          },
          onChange: (change) => {
            if (change.media) resources.remember(change.media);
            if (change.mediaUrls)
              resources.rememberResolvedMedia(change.mediaUrls);
            if (change.document || change.parameters)
              setValue((current) => ({
                ...current,
                ...(change.document
                  ? { component_document: change.document }
                  : {}),
                ...(change.parameters
                  ? { component_parameters: change.parameters }
                  : {}),
              }));
            if (change.saveTemplate) {
              setTemplateName(value.title.trim());
              setNewTemplateId(randomUUID());
              action.clearDialogError();
              setConfirm("template");
            }
          },
        }
      : undefined,
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
  const refreshPage = async () => {
    if (!saved) return;
    const { data } = await readManagedPage(baseUrl, saved.id);
    setSaved(data);
    setValue(data.value);
  };

  const submitAction = (apply: boolean, label: string) => (
    <Button
      type="submit"
      form={formId}
      onClick={(event) => {
        if (event.currentTarget.ownerDocument !== document) {
          event.preventDefault();
          void save(apply);
        }
      }}
      data-apply={apply || undefined}
      className={apply ? "admin-button admin-button-primary" : "admin-button"}
      disabled={
        action.busy ||
        Boolean(optionsError) ||
        (apply
          ? source === "registered" && value.enabled && !available
          : Boolean(saved) && !dirty)
      }
    >
      <Icon name="save" />
      <UiText text={label} />
    </Button>
  );
  const saveAction = submitAction(false, "保存草稿");
  const publishAction = publish
    ? submitAction(true, value.enabled ? "保存并应用" : "保存并停用")
    : null;
  const pageControls = (!compact || editOptions) && (
    <fieldset
      className={`account-fieldset admin-density-controls ${styles.pageEditControls}`}
      disabled={disabled}
      data-compact={compact || undefined}
    >
      {!compact && (
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
      )}
      {editOptions}
    </fieldset>
  );
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
            disabled={!ready || !write || action.busy || Boolean(optionsError)}
            onClick={() => void openLive()}
          />
          <PreviewAction
            icon="external"
            label="前台预览"
            disabled={!ready || Boolean(optionsError)}
            onClick={() => {
              if (!preview.openWindow())
                action.notify("预览窗口被浏览器拦截，请允许弹出窗口后重试。");
            }}
          />
          {ready && write && !saved?.archived && (
            <EmbeddedEditorActions primary={publishAction ?? saveAction}>
              {publishAction && saveAction}
            </EmbeddedEditorActions>
          )}
        </ScrollHeaderActions>
      </div>
      {id && !ready && (
        <>
          <AdminPageHeading title="编辑页面" />
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
        </>
      )}
      {ready && (
        <Form
          id={formId}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const submitter = (event.nativeEvent as SubmitEvent).submitter;
            void save(
              submitter instanceof HTMLElement &&
                submitter.dataset.apply === "true",
            );
          }}
        >
          <fieldset className="account-fieldset" disabled={disabled}>
            {!compact && (
              <>
                <h1 className="sr-only">
                  <UiText text={id ? "编辑页面" : "新建页面"} />
                </h1>
                <EditorIdentity
                  label="页面标题"
                  placeholder="添加标题"
                  value={value.title}
                  onChange={onTitle}
                  maxLength={120}
                  disabled={disabled}
                  permalink={permalink}
                />
              </>
            )}
          </fieldset>
          <div className={styles.pageIdentityRow} data-live-part="settings">
            {saved && (!compact || saved.translations) ? (
              <PageLanguages
                page={saved}
                compact={compact}
                disabled={dirty || action.busy}
                onChanged={refreshPage}
                controls={pageControls}
              />
            ) : !saved && source === "custom" ? (
              <NewPageLanguage
                value={language}
                onChange={setLanguage}
                disabled={disabled}
                compact={compact}
                controls={pageControls}
              />
            ) : (
              pageControls
            )}
          </div>
          <div
            className={
              compact
                ? undefined
                : `${editorColumns.layout} ${styles.editorLayout}`
            }
          >
            <fieldset
              className={`account-fieldset admin-density-controls ${styles.editorPane}`}
              disabled={disabled}
            >
              {source === "registered" ? (
                <section
                  className={`account-card ${styles.pageOptionsCard}`}
                  data-live-part="content"
                >
                  <header>
                    <h2>
                      <UiText text="页面选项" />
                    </h2>
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
                        update({ options });
                      }}
                      onSourceChange={(text) => {
                        setOptionsSource(text);
                        const parsed = parsePageConfiguration(text);
                        if (parsed.value) update({ options: parsed.value });
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
                (!compact || (!componentMode && !templateId)) && (
                  <PageCodeFields
                    value={value}
                    onChange={update}
                    disabled={!write || action.busy}
                    allowScripts={actor.role === "admin"}
                    cover={
                      componentMode ? (
                        <Button
                          className="admin-button admin-button-primary"
                          disabled={disabled}
                          onClick={() => void openLive()}
                        >
                          <Icon name="sidebar" />
                          <UiText text="前往实时预览" />
                        </Button>
                      ) : templateId ? (
                        <RouteLink
                          className="admin-button"
                          href={`/admin/pages/templates/${templateId}`}
                        >
                          <Icon name="code" />
                          <UiText text={write ? "编辑模板" : "查看模板"} />
                        </RouteLink>
                      ) : undefined
                    }
                  />
                )
              )}
            </fieldset>
            <aside
              className={compact ? undefined : editorColumns.inspector}
              aria-label={t("内容设置")}
              data-live-part="settings"
            >
              <fieldset className="account-fieldset" disabled={disabled}>
                <PageSettings
                  value={value}
                  change={update}
                  disabled={disabled}
                  compact={compact}
                  compactIdentity={
                    compact && (
                      <>
                        <AccountField
                          label="页面标题"
                          value={value.title}
                          onChange={onTitle}
                          required
                          maxLength={120}
                        />
                        {permalink}
                      </>
                    )
                  }
                  seo={
                    definition?.seo_editable !== false && (
                      <SeoDisclosure label="搜索与分享">
                        <SeoFieldsEditor
                          value={value}
                          onChange={update}
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
                    )
                  }
                  extra={
                    compact &&
                    templateId && (
                      <PageSettingsGroup
                        title="自定义页面模板"
                        initiallyOpen={false}
                      >
                        <RouteLink
                          className="admin-button"
                          href={`/admin/pages/templates/${templateId}`}
                        >
                          <Icon name="code" />
                          <UiText text={write ? "编辑模板" : "查看模板"} />
                        </RouteLink>
                      </PageSettingsGroup>
                    )
                  }
                />
              </fieldset>
            </aside>
          </div>
        </Form>
      )}
      <ConfirmDialog
        open={confirm === "template"}
        portalTarget={embeddedEditorSurface() ?? undefined}
        title="另存为页面模板"
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
