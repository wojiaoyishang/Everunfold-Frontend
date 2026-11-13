"use client";

import { useEffect, useEffectEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { can } from "@/core/accounts/permissions";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { randomUUID } from "@/core/browser/crypto";
import {
  readPageTemplate,
  savePageTemplate,
  type PageTemplateItem,
  type TitledPageCode,
} from "@/core/contracts/pages";
import { UiText } from "@/core/i18n/provider";
import { pagesFailure } from "@/core/pages/failure";
import { AccountField } from "../../account/fields";
import { UnsavedAccountChanges } from "../../account/unsaved";
import { Icon } from "../../components/icon";
import { Button, Form } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { AdminPageHeading } from "../components/page-heading";
import { ScrollHeaderActions } from "../layout/scroll-header-actions";
import { PageCodeFields } from "./code-fields";
import { BuilderEditor } from "@/themes/argon/admin/builder/editor";
import { useAppliedShortcodes } from "@/core/shortcodes/use-library";
import { useEditorResources } from "@/core/content-management/use-editor-resources";
import { PageEditOptions } from "./edit-mode";
import { usePageAction } from "./feedback";
import styles from "./pages.module.css";

const emptyDocument = { version: 1 as const, nodes: [] };
const emptyTemplate: TitledPageCode = {
  title: "",
  description: "",
  edit_mode: "components",
  component_document: emptyDocument,
  layout: "wide",
};

export function PageTemplateEditor({ id }: { id?: string }) {
  const actor = useAdminAccount();
  const { baseUrl, csrfToken } = useAdminRequest();
  const router = useRouter();
  const formId = useId();
  const [draftId] = useState(randomUUID);
  const [saved, setSaved] = useState<PageTemplateItem | null>(null);
  const [value, setValue] = useState(emptyTemplate);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const action = usePageAction();
  const shortcodes = useAppliedShortcodes();
  const resources = useEditorResources();
  const notifyLoadError = useEffectEvent((error: unknown) =>
    action.notify(pagesFailure(error)),
  );
  const ready = !id || Boolean(saved);
  const allowScripts = actor.role === "admin";
  const write =
    can(actor, "pages:write") &&
    (allowScripts ||
      saved?.value.edit_mode === "components" ||
      !saved?.value.javascript_enabled);
  const dirty =
    JSON.stringify(value) !== JSON.stringify(saved?.value ?? emptyTemplate);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    void readPageTemplate(baseUrl, id, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setSaved(data);
        setValue(data.value);
        setLoadFailed(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setLoadFailed(true);
        notifyLoadError(error);
      });
    return () => controller.abort();
  }, [baseUrl, id, attempt]);

  async function save() {
    if (!write || !ready || !dirty) return;
    if (!value.title.trim()) {
      action.notify("请输入模板名称。");
      return;
    }
    const input = {
      id: id ?? draftId,
      expected_revision: saved?.revision ?? 0,
      value,
    };
    let destination: string | undefined;
    const completed = await action.run(async (signal) => {
      const { data } = await savePageTemplate(
        baseUrl,
        { ...input, operation_id: action.operation(input) },
        csrfToken,
        { signal },
      );
      if (signal.aborted) return;
      setSaved(data);
      setValue(data.value);
      if (!id) destination = `/admin/pages/templates/${data.id}`;
    }, "模板已保存。");
    if (completed && destination) router.replace(destination);
  }

  return (
    <>
      <div className="admin-editor-back admin-page-editor-toolbar">
        <RouteLink href="/admin/pages" className="admin-button">
          <Icon name="arrow-left" />
          <UiText text="返回页面列表" />
        </RouteLink>
        <ScrollHeaderActions className={styles.editorActions}>
          {saved && write && (
            <RouteLink
              className="admin-button"
              href={`/admin/pages/new?type=${encodeURIComponent(saved.type_id)}`}
            >
              <Icon name="plus" />
              <UiText text="使用模板新建页面" />
            </RouteLink>
          )}
          {ready && write && (
            <Button
              type="submit"
              form={formId}
              className="admin-button admin-button-primary"
              disabled={action.busy || !dirty}
            >
              <Icon name="save" />
              <UiText text="保存模板" />
            </Button>
          )}
        </ScrollHeaderActions>
      </div>
      <AdminPageHeading
        title={id ? "编辑自定义页面模板" : "创建自定义页面模板"}
        description="页面各自设置标题和 URL。保存模板会更新使用它的页面结构，已发布的页面会同步到前端。"
      />
      {ready ? (
        <Form
          id={formId}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <fieldset
            className="account-fieldset"
            disabled={!write || action.busy}
          >
            <section className="account-card">
              <div className="account-form-grid">
                <AccountField
                  label="模板名称"
                  value={value.title}
                  required
                  maxLength={120}
                  onChange={(title) => setValue({ ...value, title })}
                />
                <AccountField
                  label="模板说明"
                  value={value.description ?? ""}
                  maxLength={500}
                  onChange={(description) =>
                    setValue({ ...value, description })
                  }
                />
              </div>
            </section>
            <section className="account-card">
              <PageEditOptions
                mode={value.edit_mode ?? "source"}
                layout={value.layout}
                onMode={(edit_mode) =>
                  setValue((current) => ({
                    ...current,
                    edit_mode,
                    component_document:
                      edit_mode === "components"
                        ? (current.component_document ?? emptyDocument)
                        : null,
                  }))
                }
                onLayout={(layout) =>
                  setValue((current) => ({ ...current, layout }))
                }
              />
            </section>
            {value.edit_mode === "components" ? (
              <BuilderEditor
                allowComments
                value={value.component_document ?? emptyDocument}
                onMedia={resources.remember}
                renderContext={{
                  media: { ...saved?.media_urls, ...resources.media },
                  shortcodes,
                }}
                disabled={!write || action.busy}
                onChange={(component_document) =>
                  setValue((current) => ({ ...current, component_document }))
                }
              />
            ) : (
              <PageCodeFields
                value={value}
                disabled={!write || action.busy}
                onChange={(patch) => setValue({ ...value, ...patch })}
                allowScripts={allowScripts}
              />
            )}
          </fieldset>
        </Form>
      ) : (
        <section className="account-card">
          {loadFailed ? (
            <Button
              className="admin-button"
              onClick={() => {
                setLoadFailed(false);
                setAttempt((current) => current + 1);
              }}
            >
              <UiText text="重新读取模板" />
            </Button>
          ) : (
            <p role="status">
              <UiText text="正在读取模板…" />
            </p>
          )}
        </section>
      )}
      <UnsavedAccountChanges dirty={dirty} busy={action.busy} />
    </>
  );
}
