"use client";
import { isEmbeddedEditor } from "@/core/preview/bridge";

import { useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { can } from "@/core/accounts/permissions";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import {
  createBuilderNode,
  emptyBuilderDocument,
} from "@/core/builder/document";
import { coreBuilderComponents } from "@/core/builder/registry";
import {
  cancelDraftSchedule,
  createComponentDraft,
  publishComponentDraft,
  readDraft,
  saveComponentDraft,
  scheduleComponentDraft,
  type ContentTypeDefinition,
  type DraftDetail,
  type DraftFields,
} from "@/core/contracts/content-admin";
import {
  draftError,
  draftFields,
  validateDraft,
  validatePublicationTime,
} from "@/core/content-management/draft-state";
import { useEditorResources } from "@/core/content-management/use-editor-resources";
import { UiText, useLanguageCatalog } from "@/core/i18n/provider";
import { useEmbeddedPreviewPublisher } from "@/core/preview/use-embedded-publisher";
import { editorPreviewContent } from "@/core/preview/content";
import { useAppliedShortcodes } from "@/core/shortcodes/use-library";
import { UnsavedAccountChanges } from "../../account/unsaved";
import { Icon } from "../../components/icon";
import { Button, TextArea } from "../../components/ui/primitives";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { RouteLink } from "../../components/ui/route-link";
import { livePreviewPath } from "@/core/preview/routes";
import { EmbeddedEditorActions } from "../components/embedded-editor-actions";
import { AdminPageHeading } from "../components/page-heading";
import { ScrollHeaderActions } from "../layout/scroll-header-actions";
import { usePageAction } from "../pages/feedback";
import { EditorLanguages } from "./editor-languages";
import { EditorPanels } from "./editor-panels";
import { EditorTitle } from "./editor-title";
import type { PublicationChoice } from "./publication-schedule";
import styles from "./component-draft-editor.module.css";

function componentFields(detail?: DraftDetail | null): DraftFields {
  const fields = draftFields(detail);
  const component_document = detail?.component_document ?? {
    ...emptyBuilderDocument,
    nodes: (detail?.body ?? [])
      .filter((block) => block.content.trim())
      .map((block) => ({
        ...createBuilderNode(
          coreBuilderComponents.find(
            (item) =>
              item.type ===
              (block.type === "html" ? "core.html" : "core.markdown"),
          )!,
        ),
        props: { source: block.content },
      })),
  };
  return { ...fields, edit_mode: "components", component_document };
}

export function ComponentDraftEditor({
  type,
  id,
  initialDetail = null,
}: {
  type: ContentTypeDefinition;
  id: string | null;
  initialDetail?: DraftDetail | null;
}) {
  const account = useAdminAccount();
  const { baseUrl, csrfToken } = useAdminRequest();
  const router = useRouter();
  const { default_code } = useLanguageCatalog();
  const [language, setLanguage] = useState(default_code);
  const [detail, setDetail] = useState(initialDetail);
  const [fields, setFields] = useState(() => componentFields(initialDetail));
  const [baseline, setBaseline] = useState(() => JSON.stringify(fields));
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [switching, setSwitching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmBlocks, setConfirmBlocks] = useState(false);
  const [publication, setPublication] = useState<PublicationChoice | null>(
    null,
  );
  const resources = useEditorResources();
  const shortcodes = useAppliedShortcodes();
  const action = usePageAction(draftError);
  const report = useEffectEvent((error: unknown) =>
    action.notify(draftError(error)),
  );
  const section = `/admin/content/${type.id}`;
  const writable =
    (!id || Boolean(detail)) &&
    detail?.status !== "trash" &&
    can(account, "content:write", detail?.owner_id ?? account.id);
  const publishable =
    writable && can(account, "content:publish", detail?.owner_id ?? account.id);
  const dirty =
    !switching &&
    (baseline !== JSON.stringify(fields) ||
      Boolean(detail && detail.edit_mode !== "components"));
  const media = { ...detail?.media_urls, ...resources.media };
  useEmbeddedPreviewPublisher(
    id,
    detail
      ? {
          type: "everunfold:content-preview",
          content: editorPreviewContent(detail, fields, media),
        }
      : null,
    {
      dirty,
      busy: action.busy,
      published: Boolean(detail?.published_revision),
    },
    {
      value: {
        document: fields.component_document ?? emptyBuilderDocument,
        parameters: {},
        linked: false,
        disabled: !writable || action.busy,
        allowComments: false,
        canSaveTemplate: false,
        media,
        shortcodes: shortcodes ?? [],
      },
      onChange: (change) => {
        if (change.media) resources.remember(change.media);
        if (change.document)
          setFields((current) => ({
            ...current,
            component_document: change.document,
          }));
      },
    },
  );
  const choice = publication ?? {
    enabled: Boolean(detail?.scheduled_for),
    at: detail?.scheduled_for ?? null,
  };
  useEffect(() => {
    if (!id || initialDetail) return;
    const controller = new AbortController();
    void readDraft(baseUrl, { id }, csrfToken, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (data.type_id !== type.id) throw new Error("内容类型不匹配。");
        const value = componentFields(data);
        setDetail(data);
        setFields(value);
        setBaseline(JSON.stringify(value));
        setLoadError("");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setLoadError(draftError(error));
        report(error);
      });
    return () => controller.abort();
  }, [id, initialDetail, baseUrl, csrfToken, type.id, attempt]);

  function applied(saved: DraftDetail) {
    const next = componentFields(saved);
    setDetail(saved);
    setFields(next);
    setBaseline(JSON.stringify(next));
  }

  async function save(
    kind: "save" | "publish" | "schedule" | "cancel",
    navigate = true,
  ) {
    if (!writable || action.busy || (kind !== "save" && !publishable)) return;
    const next: DraftFields = { ...fields };
    if (!detail && type.id === "article" && resources.defaults) {
      next.settings = {
        comments_open: resources.defaults.default_article_comments ?? true,
        categories: resources.defaults.default_article_category
          ? [resources.defaults.default_article_category]
          : [],
        ...next.settings,
      };
    }
    const error =
      (kind !== "cancel" ? validateDraft(next, type) : "") ||
      (kind === "schedule" ? validatePublicationTime(choice.at) : "");
    if (error) {
      action.notify(error);
      return;
    }
    let created: string | undefined;
    const completed = await action.run(
      async (signal) => {
        const options = { signal };
        if (!detail) {
          const input = { type_id: type.id, fields: next, language };
          const { data } = await createComponentDraft(
            baseUrl,
            { ...input, operation_id: action.operation(input) },
            csrfToken,
            options,
          );
          if (!signal.aborted) {
            applied(data);
            created = data.id;
          }
          return;
        }
        const mutation = { id: detail.id, expected_revision: detail.revision };
        const input = {
          ...mutation,
          fields: next,
          expected_collaboration_seq: detail.collaboration_seq ?? undefined,
        };
        const response =
          kind === "cancel"
            ? await cancelDraftSchedule(
                baseUrl,
                {
                  ...mutation,
                  operation_id: action.operation(mutation),
                },
                csrfToken,
                options,
              )
            : kind === "schedule"
              ? await scheduleComponentDraft(
                  baseUrl,
                  {
                    ...input,
                    scheduled_for: choice.at!,
                    operation_id: action.operation({
                      ...input,
                      scheduled_for: choice.at,
                    }),
                  },
                  csrfToken,
                  options,
                )
              : await (
                  kind === "publish"
                    ? publishComponentDraft
                    : saveComponentDraft
                )(
                  baseUrl,
                  {
                    ...input,
                    operation_id: action.operation({ ...input, kind }),
                  },
                  csrfToken,
                  options,
                );
        if (!signal.aborted) {
          applied(response.data);
          if (kind !== "save") setPublication(null);
        }
      },
      kind === "publish"
        ? "内容已发布。"
        : kind === "schedule"
          ? "已安排定时发布。"
          : kind === "cancel"
            ? "已取消定时发布。"
            : "内容草稿已保存。",
    );
    if (created && navigate)
      router.replace(`${section}/${created}/edit?mode=components`);
    return completed ? (created ?? detail?.id) : undefined;
  }

  async function openLive() {
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      action.notify("预览窗口被浏览器拦截，请允许弹出窗口后重试。");
      return;
    }
    popup.opener = null;
    const savedId = dirty || !detail ? await save("save", false) : detail.id;
    if (!savedId) {
      popup.close();
      return;
    }
    popup.location.replace(
      livePreviewPath(type.id as "article" | "shuoshuo", savedId),
    );
    if (!id) router.replace(`${section}/${savedId}/edit?mode=components`);
  }

  const saveDraft = (
    <Button
      className="admin-button"
      disabled={!writable || action.busy || Boolean(detail && !dirty)}
      onClick={() => void save("save")}
    >
      <Icon name="save" />
      <UiText text="保存草稿" />
    </Button>
  );
  const publishDraft =
    detail && publishable ? (
      <Button
        className="admin-button admin-button-primary"
        disabled={action.busy}
        onClick={() => void save(choice.enabled ? "schedule" : "publish")}
      >
        <UiText text={choice.enabled ? "定时发布" : "发布"} />
      </Button>
    ) : null;
  const settingsOpen = isEmbeddedEditor() || showSettings;

  return (
    <>
      <div className="admin-editor-back">
        <RouteLink className="admin-button" href={section}>
          <Icon name="arrow-left" />
          <UiText text="返回内容列表" />
        </RouteLink>
        <ScrollHeaderActions className={styles.actions}>
          {detail?.edit_mode === "components" ? (
            <Button
              className="admin-button"
              disabled={!writable || action.busy}
              onClick={() => {
                action.clearDialogError();
                setConfirmBlocks(true);
              }}
            >
              <UiText text="切换到区块模式" />
            </Button>
          ) : (
            <RouteLink
              className="admin-button"
              href={id ? `${section}/${id}/edit` : `${section}/new`}
            >
              <UiText text="返回区块模式" />
            </RouteLink>
          )}
          {detail?.public_path && detail.published_revision && (
            <RouteLink
              className="admin-button"
              href={detail.public_path}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="external" />
              <UiText text="查看前台" />
            </RouteLink>
          )}
          <EmbeddedEditorActions primary={publishDraft ?? saveDraft}>
            {publishDraft && saveDraft}
          </EmbeddedEditorActions>
        </ScrollHeaderActions>
      </div>
      <AdminPageHeading
        title={`${id ? "编辑" : "新建"}${type.label} · 组件模式`}
      />
      {id && !detail ? (
        <section className="account-card">
          {loadError ? (
            <>
              <p role="alert">{loadError}</p>
              <Button
                className="admin-button"
                onClick={() => setAttempt((n) => n + 1)}
              >
                <UiText text="重新读取内容" />
              </Button>
            </>
          ) : (
            <p role="status">
              <UiText text="正在读取内容…" />
            </p>
          )}
        </section>
      ) : (
        <>
          <section className={styles.metadata}>
            <EditorTitle
              type={type}
              fields={fields}
              detail={detail}
              language={detail?.language ?? language}
              disabled={!writable || action.busy}
              onChange={setFields}
            />
            <EditorLanguages
              id={detail?.id ?? null}
              contentRevision={detail?.revision}
              type={type.id}
              language={detail?.language ?? language}
              onLanguage={setLanguage}
              disabled={action.busy || (Boolean(detail) && dirty)}
              onNavigate={(href) => router.push(href)}
            />
            {!isEmbeddedEditor() && (
              <Button
                className="admin-button"
                aria-expanded={showSettings}
                aria-controls="builder-content-settings"
                onClick={() => setShowSettings((open) => !open)}
              >
                <Icon name="settings" />
                <UiText text="内容设置" />
              </Button>
            )}
          </section>
          {settingsOpen && (
            <section
              id="builder-content-settings"
              className={styles.settings}
              aria-label="内容设置"
            >
              {type.supports_excerpt && (
                <label className="admin-field">
                  <UiText text="摘要" />
                  <TextArea
                    rows={3}
                    maxLength={500}
                    value={fields.excerpt ?? ""}
                    disabled={!writable || action.busy}
                    onChange={(event) =>
                      setFields({ ...fields, excerpt: event.target.value })
                    }
                  />
                </label>
              )}
              <EditorPanels
                type={type}
                fields={fields}
                onChange={setFields}
                detail={detail}
                disabled={!writable || action.busy}
                terms={resources.terms}
                newArticleDefaults={
                  !detail && type.id === "article" ? resources.defaults : null
                }
                createCategory={resources.createCategory}
                media={media}
                onMedia={resources.remember}
                publication={{
                  choice,
                  onChange: setPublication,
                  onCancel: () => void save("cancel"),
                  disabled: !publishable || action.busy,
                }}
              />
            </section>
          )}
          <section className="account-card" hidden={isEmbeddedEditor()}>
            <h2>
              <UiText text="组件内容" />
            </h2>
            <Button
              className="admin-button admin-button-primary"
              disabled={!writable || action.busy}
              onClick={() => void openLive()}
            >
              <Icon name="eye" />
              <UiText text="进入实时编辑" />
            </Button>
          </section>
        </>
      )}
      <ConfirmDialog
        open={confirmBlocks}
        title="切换到区块模式？"
        description="切换后会恢复原来的区块正文。组件画布将保留，可再次进入组件模式继续编辑。已发布版本不变。"
        confirmLabel="切换编辑模式"
        busy={action.busy}
        error={action.dialogError}
        onCancel={() => setConfirmBlocks(false)}
        onConfirm={() =>
          action.runInDialog(async (signal) => {
            if (!detail) return;
            const input = {
              id: detail.id,
              expected_revision: detail.revision,
              fields: {
                ...fields,
                edit_mode: "blocks" as const,
                component_document: undefined,
              },
            };
            const { data } = await saveComponentDraft(
              baseUrl,
              {
                ...input,
                operation_id: action.operation(input),
              },
              csrfToken,
              { signal },
            );
            if (!signal.aborted) {
              applied(data);
              setSwitching(true);
            }
          })
        }
        onConfirmed={() => {
          setConfirmBlocks(false);
          // Open a fresh editor so it reads the new collaboration epoch even
          // when this workspace was reached through the canonical edit URL.
          window.location.replace(`${section}/${detail!.id}/edit`);
        }}
      />
      <UnsavedAccountChanges dirty={dirty} busy={action.busy} />
    </>
  );
}
