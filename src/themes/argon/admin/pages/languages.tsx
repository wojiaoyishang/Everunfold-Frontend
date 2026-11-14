"use client";
import { useEffect, useState } from "react";
import type {
  ManagedPageItem,
  ManagedPageSummary,
  PageTranslationMember,
} from "@/core/contracts/pages";
import {
  createPageTranslation,
  linkPageTranslation,
  unlinkPageTranslation,
  reviewPageTranslation,
  removeManagedPage,
  readManagedPages,
} from "@/core/contracts/pages";
import { useAdminRequest, useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { pagesFailure } from "@/core/pages/failure";
import { UiText, useT, useLanguageCatalog } from "@/core/i18n/provider";
import { LanguageLabel } from "../../components/language-label";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { Select } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Modal } from "../../components/ui/modal";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Icon } from "../../components/icon";
import { PageLanguageMenu } from "./language-menu";
import { usePageAction, usePageErrorToast } from "./feedback";
import styles from "./pages.module.css";

export function PageLanguages({
  page,
  compact = false,
  disabled,
  onChanged,
}: {
  page: ManagedPageItem;
  compact?: boolean;
  disabled: boolean;
  onChanged: () => Promise<void>;
}) {
  const { baseUrl, csrfToken } = useAdminRequest(),
    catalog = useLanguageCatalog(),
    actor = useAdminAccount(),
    t = useT();
  const action = usePageAction();
  const [adding, setAdding] = useState(false),
    [closing, setClosing] = useState(false);
  const [language, setLanguage] = useState(""),
    [copy, setCopy] = useState(true),
    [mode, setMode] = useState("create"),
    [target, setTarget] = useState("");
  const [candidates, setCandidates] = useState<ManagedPageSummary[]>([]),
    [loadError, setLoadError] = useState("");
  const [confirm, setConfirm] = useState<{
    action: "unlink" | "remove" | "restore";
    member: PageTranslationMember;
  } | null>(null);
  const group = page.translations;
  usePageErrorToast(adding && mode === "link" ? loadError : "");
  useEffect(() => {
    if (!adding || mode !== "link") return;
    const controller = new AbortController();
    void readManagedPages(baseUrl, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setCandidates(data.items);
          setLoadError("");
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setLoadError(pagesFailure(cause));
      });
    return () => controller.abort();
  }, [adding, mode, baseUrl]);
  if (!group)
    return (
      <p className={styles.help}>
        <UiText text="此页面的多语言由前端代码管理。" />
      </p>
    );
  const available = catalog.languages.filter(
    (item) =>
      item.enabled &&
      !group.members.some((member) => member.language === item.code),
  );
  const chosen = available.some((item) => item.code === language)
    ? language
    : (available[0]?.code ?? "");
  const locked = disabled || action.busy || !can(actor, "pages:write");
  const inputs = (member = page.id) => ({
    id: member,
    expected_revision: group.revision,
  });
  const run = (
    kind: string,
    input: object,
    execute: (operation: string, signal: AbortSignal) => Promise<unknown>,
  ) =>
    action.run(async (signal) => {
      await execute(action.operation({ kind, ...input }), signal);
      await onChanged();
    }, "页面语言设置已更新。");
  const close = () => {
    if (!action.busy) setClosing(true);
  };
  const links = candidates.filter(
    (item) =>
      item.source === "custom" &&
      !item.archived &&
      item.language === chosen &&
      item.translation_group_id !== group.id &&
      (item.translations?.members.length ?? 0) === 1,
  );
  return (
    <section
      className={`account-card ${styles.languagePanel}`}
      id="page-languages"
      data-compact={compact || undefined}
    >
      <div className={styles.languageHeader}>
        {!compact && (
          <h2>
            <UiText text="语言版本" />
          </h2>
        )}
        <PageLanguageMenu group={group} current={page.id} />
      </div>
      <div className={styles.languageList}>
        {group.members.map((member) => (
          <div className={styles.languageMember} key={member.id}>
            <div>
              <LanguageLabel code={member.language} />
              {member.is_original && <UiText text=" · 原文" />}
              <small>
                {member.title} ·{" "}
                <UiText
                  text={
                    member.archived
                      ? "已回收"
                      : member.needs_review
                        ? "待检查"
                        : member.enabled
                          ? "已启用"
                          : "草稿"
                  }
                />
              </small>
            </div>
            <div className={styles.languageActions}>
              {member.id !== page.id && (
                <RouteLink
                  href={`/admin/pages/${member.id}`}
                  className="admin-button"
                >
                  <Icon name="edit" />
                  <UiText text="编辑" />
                </RouteLink>
              )}
              {member.enabled && (
                <RouteLink
                  href={member.path}
                  className="admin-icon-button"
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t("在前台打开")}
                  aria-label={`${t("在前台打开")} ${member.language}`}
                >
                  <Icon name="external" />
                </RouteLink>
              )}
              {!member.archived &&
                !member.is_original &&
                member.needs_review && (
                  <Button
                    className="admin-button"
                    disabled={locked}
                    onClick={() => {
                      const input = inputs(member.id);
                      void run("review", input, (operation_id, signal) =>
                        reviewPageTranslation(
                          baseUrl,
                          { ...input, operation_id },
                          csrfToken,
                          { signal },
                        ),
                      );
                    }}
                  >
                    <Icon name="check" />
                    <UiText text="已核对" />
                  </Button>
                )}
              {!member.archived && !member.is_original && (
                <Button
                  className="admin-button"
                  disabled={locked}
                  onClick={() => setConfirm({ action: "unlink", member })}
                >
                  <UiText text="解除关联" />
                </Button>
              )}
              {can(actor, "pages:publish") && (
                <Button
                  className="admin-button"
                  disabled={locked}
                  onClick={() =>
                    setConfirm({
                      action: member.archived ? "restore" : "remove",
                      member,
                    })
                  }
                >
                  <UiText text={member.archived ? "恢复" : "回收此语言"} />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      {available.length > 0 && (
        <Button
          className="admin-button"
          disabled={locked || page.archived}
          onClick={() => {
            setAdding(true);
            setClosing(false);
            setTarget("");
            setLoadError("");
          }}
        >
          <Icon name="plus" />
          <UiText text="添加语言版本" />
        </Button>
      )}
      {!compact && (
        <p className={styles.help}>
          <UiText text="各语言独立编辑和启用，只在列表显示原文。新增语言请先在站点设置中启用。" />
        </p>
      )}
      {disabled && (
        <p className={styles.help}>
          <UiText text="请先保存当前修改，再管理语言关联。" />
        </p>
      )}
      {adding && (
        <Modal
          title="添加页面语言"
          onClose={close}
          closing={closing}
          onExited={() => {
            setAdding(false);
            setClosing(false);
          }}
          closeLabel="关闭页面语言设置"
        >
          <div className={styles.languageForm}>
            <label>
              <UiText text="语言" />
              <Select
                name="page-translation-language"
                label={t("语言")}
                value={chosen}
                options={available.map((item) => ({
                  value: item.code,
                  label: item.name,
                  flag: item.flag,
                }))}
                onValueChange={(value) => {
                  setLanguage(value);
                  setTarget("");
                }}
                disabled={action.busy}
              />
            </label>
            <label>
              <UiText text="添加方式" />
              <Select
                name="page-translation-mode"
                label={t("添加方式")}
                value={mode}
                options={[
                  { value: "create", label: "新建译文" },
                  { value: "link", label: "关联已有页面" },
                ]}
                onValueChange={setMode}
                disabled={action.busy}
              />
            </label>
            {mode === "create" ? (
              !page.template && (
                <div className={styles.toggle}>
                  <span>
                    <UiText text="复制原文源码" />
                  </span>
                  <Switch
                    aria-label={t("复制原文源码")}
                    checked={copy}
                    onCheckedChange={setCopy}
                    disabled={action.busy}
                  />
                </div>
              )
            ) : (
              <>
                <Select
                  name="page-translation-target"
                  label={t("选择已有页面")}
                  value={target}
                  options={[
                    { value: "", label: "选择已有页面" },
                    ...links.map((item) => ({
                      value: item.id,
                      label: `${item.title} · ${item.path}`,
                    })),
                  ]}
                  onValueChange={setTarget}
                  disabled={action.busy}
                />
                {!links.length && (
                  <p>
                    <UiText text="没有此语言的独立页面可供关联。" />
                  </p>
                )}
              </>
            )}
            <p className={styles.help}>
              <UiText
                text={
                  page.template
                    ? "新译文沿用同一模板，确认译文后再单独启用。"
                    : "新译文保持停用，JavaScript 默认关闭；确认译文后再单独启用。"
                }
              />
            </p>
            <div className={styles.languageActions}>
              <Button
                className="admin-button"
                disabled={action.busy}
                onClick={close}
              >
                <UiText text="取消" />
              </Button>
              <Button
                className="admin-button admin-button-primary"
                disabled={
                  locked ||
                  !chosen ||
                  (mode === "link" && !links.some((item) => item.id === target))
                }
                onClick={() => {
                  const input =
                    mode === "create"
                      ? {
                          ...inputs(),
                          language: chosen,
                          copy_source: !page.template && copy,
                        }
                      : { ...inputs(), target_id: target };
                  void run(mode, input, (operation_id, signal) =>
                    mode === "create"
                      ? createPageTranslation(
                          baseUrl,
                          {
                            ...inputs(),
                            language: chosen,
                            copy_source: !page.template && copy,
                            operation_id,
                          },
                          csrfToken,
                          { signal },
                        )
                      : linkPageTranslation(
                          baseUrl,
                          { ...inputs(), target_id: target, operation_id },
                          csrfToken,
                          { signal },
                        ),
                  ).then((ok) => {
                    if (ok) setClosing(true);
                  });
                }}
              >
                <Icon name="plus" />
                <UiText text={mode === "create" ? "新建译文" : "关联页面"} />
              </Button>
            </div>
          </div>
        </Modal>
      )}
      <ConfirmDialog
        open={!!confirm}
        title={
          confirm?.action === "unlink"
            ? "解除语言关联？"
            : confirm?.action === "restore"
              ? "恢复此页面？"
              : "回收此语言页面？"
        }
        description={
          confirm?.action === "unlink"
            ? "此页面将成为独立页面，内容与公开地址保持。"
            : confirm?.action === "restore"
              ? "源码与配置将恢复，页面保持停用。"
              : "只回收所选语言，其他语言继续保留；如果回收原文，会选取剩余语言作为列表入口。"
        }
        confirmLabel={
          confirm?.action === "unlink"
            ? "解除关联"
            : confirm?.action === "restore"
              ? "恢复页面"
              : "回收此语言"
        }
        busy={action.busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return false;
          if (confirm.action === "unlink") {
            const input = inputs(confirm.member.id);
            return run("unlink", input, (operation_id, signal) =>
              unlinkPageTranslation(
                baseUrl,
                { ...input, operation_id },
                csrfToken,
                { signal },
              ),
            );
          }
          const input = {
            id: confirm.member.id,
            expected_revision: confirm.member.revision,
            restore: confirm.action === "restore",
          };
          return run(confirm.action, input, (operation_id, signal) =>
            removeManagedPage(baseUrl, { ...input, operation_id }, csrfToken, {
              signal,
            }),
          );
        }}
        onConfirmed={() => setConfirm(null)}
      />
    </section>
  );
}
