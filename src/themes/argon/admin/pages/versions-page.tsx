"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { can } from "@/core/accounts/permissions";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import {
  readPageVersion,
  readPageVersions,
  readPageTemplateVersion,
  readPageTemplateVersions,
  restorePageVersion,
  restorePageTemplateVersion,
  type ManagedPageVersion,
  type PageTemplateVersion,
  type PageVersionCatalog,
} from "@/core/contracts/pages";
import { UiText, useT } from "@/core/i18n/provider";
import { pagesFailure } from "@/core/pages/failure";
import { Icon } from "../../components/icon";
import { Button } from "../../components/ui/primitives";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { RouteLink } from "../../components/ui/route-link";
import { VersionPairPicker } from "../content/version-pair-picker";
import { PageVersionDiff } from "./version-diff";
import { usePageAction } from "./feedback";
import { TemplateImpactList, useTemplateImpact } from "./template-impact";
import layout from "../content/versions.module.css";
import styles from "./versions.module.css";

const actionLabels = {
  baseline: "迁移时保留的版本",
  save: "保存草稿",
  apply: "应用版本",
  restore_draft: "恢复为草稿",
  enable: "启用页面",
  disable: "停用页面",
  remove: "移到回收站",
  restore: "从回收站恢复",
  translate: "创建译文",
  import: "导入版本",
  template_apply: "模板已更新",
};

type VersionDetail = ManagedPageVersion | PageTemplateVersion;

function useVersionDetails(
  id: string,
  template: boolean,
  attempt: number,
  before?: number,
  after?: number,
) {
  const { baseUrl } = useAdminRequest();
  const [result, setResult] = useState<{
    key: string;
    pair?: [VersionDetail, VersionDetail];
    error?: string;
  }>();
  const key = JSON.stringify([baseUrl, id, template, attempt, before, after]);
  useEffect(() => {
    if (!before || !after) return;
    const controller = new AbortController();
    const read = template ? readPageTemplateVersion : readPageVersion;
    const first = read(baseUrl, id, String(before), {
      signal: controller.signal,
    });
    const second =
      before === after
        ? first
        : read(baseUrl, id, String(after), { signal: controller.signal });
    void Promise.all([first, second])
      .then(([left, right]) => {
        if (!controller.signal.aborted)
          setResult({ key, pair: [left.data, right.data] });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setResult({ key, error: pagesFailure(cause) });
      });
    return () => controller.abort();
  }, [baseUrl, id, template, before, after, key]);
  return result?.key === key ? result : undefined;
}

export function PageVersionsPage({
  id,
  template = false,
}: {
  id: string;
  template?: boolean;
}) {
  const router = useRouter();
  const actor = useAdminAccount();
  const { baseUrl, csrfToken } = useAdminRequest();
  const t = useT();
  const action = usePageAction();
  const path = template ? `/admin/pages/templates/${id}` : `/admin/pages/${id}`;
  const [catalog, setCatalog] = useState<PageVersionCatalog>();
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [base, setBase] = useState<string>();
  const [target, setTarget] = useState("head");
  const [showCatalog, setShowCatalog] = useState(false);
  const [restore, setRestore] = useState<number>();
  const impact = useTemplateImpact(template && restore ? id : undefined);
  const before = base ?? String(catalog?.items[1]?.revision ?? "head");
  const resolve = (value: string) =>
    value === "head" ? catalog?.revision : Number(value);
  const baseRevision = resolve(before);
  const targetRevision = resolve(target);
  const detail = useVersionDetails(
    id,
    template,
    attempt,
    baseRevision,
    targetRevision,
  );
  const canRestore =
    can(actor, "pages:write") &&
    !catalog?.archived &&
    Boolean(detail?.pair && baseRevision !== catalog?.revision);

  useEffect(() => {
    const controller = new AbortController();
    const read = template ? readPageTemplateVersions : readPageVersions;
    void read(baseUrl, id, {}, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setCatalog(data);
          setLoadError("");
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setLoadError(pagesFailure(cause));
      });
    return () => controller.abort();
  }, [baseUrl, id, template, attempt]);

  async function loadMore() {
    if (!catalog?.next_before || loadingMore) return;
    setLoadingMore(true);
    try {
      const read = template ? readPageTemplateVersions : readPageVersions;
      const { data } = await read(baseUrl, id, { before: catalog.next_before });
      setCatalog({
        ...data,
        items: [...catalog.items, ...data.items],
      });
      if (data.revision !== catalog.revision)
        setAttempt((current) => current + 1);
    } catch (cause) {
      action.notify(pagesFailure(cause));
    } finally {
      setLoadingMore(false);
    }
  }

  async function confirmRestore() {
    if (
      !catalog ||
      !restore ||
      (template && impact.data?.revision !== catalog.revision)
    )
      return false;
    const input = { revision: restore, expected_revision: catalog.revision };
    return action.runInDialog(async (signal) => {
      const save = template ? restorePageTemplateVersion : restorePageVersion;
      await save(
        baseUrl,
        id,
        { ...input, operation_id: action.operation({ ...input, id }) },
        csrfToken,
        { signal },
      );
    });
  }

  return (
    <div className={layout.page}>
      <RouteLink href={path} className="admin-button">
        <Icon name="arrow-left" />
        <UiText text="返回编辑" />
      </RouteLink>
      <header className={layout.pageHeading}>
        <div>
          <h1>
            <UiText text="版本修订" />
          </h1>
          {catalog && <p className={layout.revisionContext}>{catalog.title}</p>}
        </div>
      </header>
      {catalog ? (
        <>
          <div className={layout.workflowBar}>
            <Button
              className="admin-button"
              aria-expanded={showCatalog}
              aria-controls="page-version-catalog"
              onClick={() => setShowCatalog(!showCatalog)}
            >
              <Icon name="clock" />
              <UiText text="历史版本" />
            </Button>
            <Button
              className="admin-button"
              aria-label={t("重新读取版本")}
              onClick={() => setAttempt((current) => current + 1)}
            >
              <Icon name="refresh" />
            </Button>
          </div>
          {loadError && (
            <p className={layout.warning} role="alert">
              {t(loadError)}
            </p>
          )}
          <VersionPairPicker
            versions={catalog.items}
            before={before}
            after={target}
            beforeDetail={detail?.pair?.[0] ?? null}
            afterDetail={detail?.pair?.[1] ?? null}
            headLabel="最新版 · 当前草稿"
            disabled={action.busy}
            onBefore={setBase}
            onAfter={setTarget}
            onSwap={() => {
              setBase(target);
              setTarget(before);
            }}
          />
          {showCatalog && (
            <aside
              id="page-version-catalog"
              className={layout.catalog}
              aria-label={t("版本目录")}
            >
              <section>
                {catalog.items.map((item) => (
                  <div
                    key={item.revision}
                    className={`${layout.catalogRow} ${styles.catalogItem}`}
                    data-selected={item.revision === baseRevision}
                  >
                    <Button
                      className={layout.catalogSelect}
                      aria-pressed={item.revision === baseRevision}
                      onClick={() => {
                        setBase(String(item.revision));
                        setShowCatalog(false);
                      }}
                    >
                      <strong>
                        V{item.revision}
                        {item.revision === catalog.revision && (
                          <span className={layout.badge}>
                            <UiText text="最新版" />
                          </span>
                        )}
                        {item.revision === catalog.applied_revision && (
                          <span className={layout.badge}>
                            <UiText text="已应用" />
                          </span>
                        )}
                      </strong>
                      <span>
                        <UiText text={actionLabels[item.action]} />
                        {item.from_revision && ` · V${item.from_revision}`}
                      </span>
                      <small>
                        {[
                          item.actor,
                          new Date(item.created_at).toLocaleString(),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </Button>
                  </div>
                ))}
                {catalog.next_before != null && (
                  <div className={layout.pager}>
                    <Button
                      className="admin-button"
                      disabled={loadingMore}
                      onClick={() => void loadMore()}
                    >
                      <UiText
                        text={
                          loadingMore ? "正在读取历史版本…" : "加载更多版本"
                        }
                      />
                    </Button>
                  </div>
                )}
              </section>
            </aside>
          )}
          <section className={layout.main} aria-label={t("查看差异")}>
            <div className={layout.selectionHeading}>
              <h2>
                <UiText text="查看差异" />
              </h2>
              {canRestore && (
                <Button
                  className="admin-button"
                  disabled={action.busy}
                  onClick={() => {
                    action.clearDialogError();
                    impact.reload();
                    setRestore(baseRevision);
                  }}
                >
                  <Icon name="undo" />
                  <UiText text="恢复左侧版本为草稿" />
                </Button>
              )}
            </div>
            {detail?.pair ? (
              <PageVersionDiff
                before={detail.pair[0].value}
                after={detail.pair[1].value}
              />
            ) : (
              <p role={detail?.error ? "alert" : "status"}>
                <UiText text={detail?.error ?? "正在读取版本差异…"} />
              </p>
            )}
          </section>
        </>
      ) : (
        <div className={layout.catalog}>
          <p role={loadError ? "alert" : "status"}>
            <UiText text={loadError || "正在读取历史版本…"} />
          </p>
          {loadError && (
            <Button
              className="admin-button"
              onClick={() => setAttempt((current) => current + 1)}
            >
              <UiText text="重新读取" />
            </Button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(restore)}
        className={styles.confirmation}
        title="恢复为草稿？"
        description={
          <UiText
            text={
              template
                ? "版本 {version} 将保存为新草稿。确认应用模板后，下列页面才会使用恢复后的版本。"
                : "版本 {version} 将保存为新草稿。已发布的页面会保留到你应用草稿。"
            }
            values={{ version: `V${restore}` }}
          />
        }
        icon="undo"
        confirmLabel="恢复为草稿"
        confirmDisabled={
          template && impact.data?.revision !== catalog?.revision
        }
        error={
          impact.error ||
          (impact.data && impact.data.revision !== catalog?.revision
            ? "页面模板已被修改，请重新读取版本。"
            : action.dialogError)
        }
        auxiliaryAction={
          impact.error && (
            <Button className="ui-confirm-button" onClick={impact.reload}>
              <UiText text="重新读取" />
            </Button>
          )
        }
        onCancel={() => setRestore(undefined)}
        onConfirm={confirmRestore}
        onConfirmed={() => {
          setRestore(undefined);
          action.notify("已恢复为草稿。", "success");
          router.push(path);
        }}
      >
        {template && !impact.error && (
          <TemplateImpactList impact={impact.data} />
        )}
      </ConfirmDialog>
    </div>
  );
}
