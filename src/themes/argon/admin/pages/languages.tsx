"use client";
import { useEffect, useState, type ReactNode } from "react";
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
import { ActionPopover } from "../../components/ui/action-popover";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { Select } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Modal } from "../../components/ui/modal";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Icon } from "../../components/icon";
import { PageLanguageMenu } from "./language-menu";
import { usePageAction, usePageErrorToast } from "./feedback";
import translationStyles from "../content/translations.module.css";
import styles from "./pages.module.css";

export function NewPageLanguage({
  value,
  onChange,
  disabled,
  compact,
  controls,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  compact: boolean;
  controls: ReactNode;
}) {
  const catalog = useLanguageCatalog();
  return (
    <>
      <div
        className={`admin-density-controls ${translationStyles.bar} ${compact ? "" : styles.identityBar}`}
      >
        <span>
          <Icon name="languages" />
          <UiText text="内容语言" />
        </span>
        <Select
          name="page-language"
          label="内容语言"
          value={value}
          disabled={disabled}
          onValueChange={onChange}
          options={catalog.languages
            .filter((item) => item.enabled)
            .map((item) => ({
              value: item.code,
              label: item.name,
              flag: item.flag,
            }))}
        />
        {!compact && controls}
      </div>
      {compact && controls}
    </>
  );
}

export function PageLanguages({
  page,
  compact = false,
  disabled,
  onChanged,
  controls,
}: {
  page: ManagedPageItem;
  compact?: boolean;
  disabled: boolean;
  onChanged: () => Promise<void>;
  controls: ReactNode;
}) {
  const { baseUrl, csrfToken } = useAdminRequest(),
    catalog = useLanguageCatalog(),
    actor = useAdminAccount(),
    t = useT();
  const action = usePageAction();
  const [open, setOpen] = useState(false);
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
    const show = () => {
      if (location.hash === "#page-languages") setOpen(true);
    };
    show();
    window.addEventListener("hashchange", show);
    return () => window.removeEventListener("hashchange", show);
  }, []);
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
      <div
        className={`admin-density-controls ${translationStyles.bar} ${styles.identityBar}`}
      >
        <span>
          <UiText text="此页面的多语言由前端代码管理。" />
        </span>
        {controls}
      </div>
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
  const canPublish = can(actor, "pages:publish");
  const currentMember = group.members.find((member) => member.id === page.id);
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
    <div
      className={styles.languageEditor}
      id="page-languages"
      data-compact={compact || undefined}
    >
      <div
        className={`admin-density-controls ${translationStyles.bar} ${compact ? "" : styles.identityBar}`}
      >
        {!compact && (
          <span>
            <Icon name="languages" />
            <LanguageLabel
              code={currentMember?.language ?? page.language ?? undefined}
            />
            <UiText text={currentMember?.is_original ? " · 原文" : " · 译文"} />
          </span>
        )}
        <PageLanguageMenu
          group={group}
          current={page.id}
          onManage={() => setOpen(true)}
        />
        <Button
          className={translationStyles.manage}
          aria-expanded={open}
          aria-controls="page-language-management"
          onClick={() => setOpen(!open)}
        >
          <UiText text="管理语言与译文" />
        </Button>
        {!compact && controls}
      </div>
      {compact && controls}
      <div className={translationStyles.reveal} data-open={open} inert={!open}>
        <div>
          <section
            className={`admin-density-controls ${translationStyles.panel} ${styles.languagePanel}`}
            id="page-language-management"
            aria-label={t("语言与译文")}
          >
            <div className={styles.languageHeader}>
              <h2>
                <UiText text="语言与译文" />
              </h2>
              {available.length > 0 && (
                <Button
                  className={styles.languageIcon}
                  aria-label={t("添加语言版本")}
                  title={t("添加语言版本")}
                  disabled={locked || page.archived}
                  onClick={() => {
                    setAdding(true);
                    setClosing(false);
                    setTarget("");
                    setLoadError("");
                  }}
                >
                  <Icon name="plus" />
                </Button>
              )}
            </div>
            <ul className={styles.languageList}>
              {group.members.map((member) => {
                const current = member.id === page.id;
                const canUnlink = !member.archived && !member.is_original;
                return (
                  <li className={styles.languageMember} key={member.id}>
                    <div className={styles.languageInfo}>
                      <div className={styles.languageName}>
                        <LanguageLabel code={member.language} />
                        {member.is_original && <UiText text=" · 原文" />}
                      </div>
                      <small className={styles.languageMeta}>
                        {!current && (
                          <span title={member.title}>{member.title}</span>
                        )}
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
                    {(!current ||
                      member.enabled ||
                      canUnlink ||
                      canPublish) && (
                      <ActionPopover
                        label={`${t("操作")} · ${member.language.toUpperCase()}`}
                        className={styles.languageIcon}
                        panelClassName={styles.languageMenu}
                        panelWidth={180}
                        triggerContent={<Icon name="more" />}
                      >
                        {(closeMenu) => (
                          <>
                            {!current && (
                              <RouteLink
                                href={`/admin/pages/${member.id}`}
                                onClick={closeMenu}
                              >
                                <Icon name="edit" />
                                <UiText text="编辑" />
                              </RouteLink>
                            )}
                            {member.enabled && (
                              <RouteLink
                                href={member.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={closeMenu}
                              >
                                <Icon name="external" />
                                <UiText text="在前台打开" />
                              </RouteLink>
                            )}
                            {canUnlink && member.needs_review && (
                              <Button
                                disabled={locked}
                                onClick={() => {
                                  closeMenu();
                                  const input = inputs(member.id);
                                  void run(
                                    "review",
                                    input,
                                    (operation_id, signal) =>
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
                            {canUnlink && (
                              <Button
                                disabled={locked}
                                onClick={() => {
                                  closeMenu();
                                  setConfirm({ action: "unlink", member });
                                }}
                              >
                                <Icon name="link" />
                                <UiText text="解除关联" />
                              </Button>
                            )}
                            {canPublish && (
                              <Button
                                disabled={locked}
                                data-danger={member.archived ? undefined : true}
                                onClick={() => {
                                  closeMenu();
                                  setConfirm({
                                    action: member.archived
                                      ? "restore"
                                      : "remove",
                                    member,
                                  });
                                }}
                              >
                                <Icon
                                  name={member.archived ? "undo" : "trash"}
                                />
                                <UiText
                                  text={member.archived ? "恢复" : "回收此语言"}
                                />
                              </Button>
                            )}
                          </>
                        )}
                      </ActionPopover>
                    )}
                  </li>
                );
              })}
            </ul>
            {available.length === 0 &&
              can(actor, "settings:read") &&
              !page.archived && (
                <p className={styles.languageNote}>
                  <RouteLink
                    className={styles.languageSettingsLink}
                    href="/admin/settings#settings-languages"
                  >
                    <UiText text="在站点设置中启用更多语言" />
                  </RouteLink>
                </p>
              )}
            {disabled && (
              <p className={styles.languageNote}>
                <UiText text="请先保存当前修改，再管理语言关联。" />
              </p>
            )}
          </section>
        </div>
      </div>
      {adding && (
        <Modal
          className={`admin-density-controls ${styles.languageDialog}`}
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
            <p className={styles.languageNote}>
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
    </div>
  );
}
