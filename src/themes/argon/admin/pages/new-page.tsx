"use client";
import { useEffect, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import {
  readPageTemplate,
  type PageTemplateItem,
} from "@/core/contracts/pages";
import { UiText } from "@/core/i18n/provider";
import { pagesFailure } from "@/core/pages/failure";
import { usePageTypes } from "@/core/pages/use-types";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { AdminPageHeading } from "../components/page-heading";
import { ManagedPageEditor } from "./editor";
import { usePageErrorToast } from "./feedback";
import styles from "./pages.module.css";

export function NewManagedPage({
  typeId,
  timeZone,
}: {
  typeId: string;
  timeZone?: string;
}) {
  const { items, loading, error, reload } = usePageTypes();
  const selected = items.find((type) => type.id === typeId);
  const templateId = selected?.template_id;
  const { baseUrl } = useAdminRequest();
  const [template, setTemplate] = useState<PageTemplateItem>();
  const [templateError, setTemplateError] = useState("");
  const [attempt, setAttempt] = useState(0);
  usePageErrorToast(error || templateError);
  useEffect(() => {
    if (!templateId) return;
    const controller = new AbortController();
    void readPageTemplate(baseUrl, templateId, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setTemplate(data);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setTemplateError(pagesFailure(failure));
      });
    return () => controller.abort();
  }, [baseUrl, templateId, attempt]);
  if (selected?.available && (!templateId || template?.id === templateId))
    return (
      <ManagedPageEditor
        key={typeId}
        pageType={selected}
        template={template}
        timeZone={timeZone}
      />
    );
  return (
    <>
      <AdminPageHeading
        title="新建页面"
        action={
          <RouteLink href="/admin/pages/new" className="admin-button">
            <UiText text="选择页面类型" />
          </RouteLink>
        }
      />
      {loading || (templateId && !templateError) ? (
        <p role="status" className="account-card">
          <UiText text="正在读取页面类型…" />
        </p>
      ) : (
        <div className={styles.typeError}>
          {error || templateError ? (
            <Button
              className="admin-button"
              onClick={() => {
                if (templateError) {
                  setTemplateError("");
                  setAttempt((current) => current + 1);
                } else reload();
              }}
            >
              <UiText text="重试" />
            </Button>
          ) : (
            <p>
              <UiText text="此页面类型当前不可用。" />
            </p>
          )}
        </div>
      )}
    </>
  );
}
