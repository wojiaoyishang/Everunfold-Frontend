"use client";
import { UiText } from "@/core/i18n/provider";

import { useEffect, useState } from "react";
import { useTranslations } from "@/core/content-management/use-translations";
import { useTranslationCandidates } from "@/core/content-management/use-translation-candidates";
import type { Locale } from "@/core/i18n/locale";
import { useLanguageCatalog } from "@/core/i18n/provider";
import { languageName } from "@/core/i18n/catalog";
import { LanguageLabel } from "../../components/language-label";
import type { TranslationMember } from "@/core/contracts/content-admin";
import { Button, TextField } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Modal } from "../../components/ui/modal";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Icon } from "../../components/icon";
import { TranslationMenu, translationStatus } from "./translation-menu";
import styles from "./translations.module.css";

function LinkPicker({
  type,
  language,
  group,
  busy,
  error,
  onPick,
  onClose,
}: {
  type: string;
  language: Locale;
  group: string;
  busy: boolean;
  error: string;
  onPick: (id: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const catalog = useLanguageCatalog();
  const [search, setSearch] = useState("");
  const [closing, setClosing] = useState(false);
  const results = useTranslationCandidates(type, language, search);
  return (
    <Modal
      title={`关联已有${languageName(catalog, language)}内容`}
      closeLabel="关闭译文选择器"
      closing={closing}
      onClose={() => setClosing(true)}
      onExited={onClose}
    >
      <div className={styles.picker}>
        <TextField
          type="search"
          aria-label="搜索可关联译文"
          placeholder="搜索标题或正文"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {results.loading && (
          <p role="status">
            <UiText text="正在读取内容…" />
          </p>
        )}
        {(error || results.error) && (
          <p role="alert">{error || results.error}</p>
        )}
        {results.items
          .filter((item) => item.translation_group_id !== group)
          .map((item) => (
            <div key={item.id} className={styles.candidate}>
              <span>
                {item.title || item.preview.slice(0, 60) || (
                  <UiText text="未命名说说" />
                )}
              </span>
              <Button
                className="admin-button"
                disabled={busy || (item.translations?.length ?? 0) > 1}
                onClick={() =>
                  void onPick(item.id).then((ok) => {
                    if (ok) setClosing(true);
                  })
                }
              >
                {(item.translations?.length ?? 0) > 1 ? (
                  <UiText text="已有译文关联" />
                ) : (
                  <UiText text="关联" />
                )}
              </Button>
            </div>
          ))}
        {!results.loading && !results.items.length && (
          <p>
            <UiText text="没有可关联的内容。" />
          </p>
        )}
        <Button className="admin-button" onClick={() => setClosing(true)}>
          <UiText text="取消" />
        </Button>
      </div>
    </Modal>
  );
}

export function EditorLanguages({
  id,
  type,
  language,
  onLanguage,
  onNavigate,
  disabled,
  contentRevision,
}: {
  id: string | null;
  type: string;
  language: Locale;
  onLanguage: (value: Locale) => void;
  onNavigate: (href: string) => void;
  disabled: boolean;
  contentRevision?: number;
}) {
  const catalog = useLanguageCatalog();
  const [chosen, setChosen] = useState("");
  const translations = useTranslations(id, contentRevision);
  const [open, setOpen] = useState(false);
  const [copy, setCopy] = useState(true);
  const [linking, setLinking] = useState<Locale | null>(null);
  const [confirm, setConfirm] = useState<{
    action: "unlink" | "trash";
    member: TranslationMember;
  } | null>(null);
  useEffect(() => {
    const show = () => {
      if (location.hash === "#content-languages") setOpen(true);
    };
    show();
    window.addEventListener("hashchange", show);
    return () => window.removeEventListener("hashchange", show);
  }, []);
  const group = translations.catalog;
  const available = catalog.languages.filter((item) => item.enabled);
  const missing = available
    .map((item) => item.code)
    .filter(
      (locale) => !group?.members.some((member) => member.language === locale),
    );
  const target = missing.includes(chosen) ? chosen : missing[0];
  const current = group?.members.find((member) => member.id === id);
  const locked = disabled || translations.busy;
  return (
    <>
      <div className={styles.bar}>
        {!id ? (
          <>
            <span>
              <Icon name="languages" />
              <UiText text="内容语言" />
            </span>
            <Select
              name="new-content-language"
              label="内容语言"
              options={available.map((item) => ({
                value: item.code,
                label: item.name,
                flag: item.flag,
              }))}
              value={language}
              disabled={disabled}
              onValueChange={onLanguage}
            />
          </>
        ) : (
          <>
            <span>
              <Icon name="languages" />
              <LanguageLabel code={current?.language ?? language} />
              {current?.is_original ? (
                <UiText text=" · 原文" />
              ) : (
                <UiText text=" · 译文" />
              )}
            </span>
            {group && (
              <TranslationMenu
                members={group.members}
                type={type}
                current={id}
                original={group.source_id}
                disabled={locked}
                onNavigate={onNavigate}
              />
            )}
            <Button
              className={styles.manage}
              aria-expanded={open}
              aria-controls="content-languages"
              onClick={() => setOpen(!open)}
            >
              <UiText text="管理语言与译文" />
            </Button>
          </>
        )}
      </div>
      {id && (
        <div className={styles.reveal} data-open={open} inert={!open}>
          <div>
            <section
              id="content-languages"
              className={styles.panel}
              aria-label="语言与译文"
            >
              <h2>
                <UiText text="语言与译文" />
                <Button
                  className={styles.manage}
                  disabled={locked}
                  onClick={translations.reload}
                  aria-label="刷新语言版本"
                >
                  <Icon name="refresh" />
                </Button>
              </h2>
              {translations.error && (
                <p role="alert">
                  {translations.error}
                  <Button
                    className={styles.manage}
                    onClick={translations.reload}
                  >
                    <UiText text="刷新" />
                  </Button>
                </p>
              )}
              {!group ? (
                <p role="status">
                  <UiText text="正在读取语言版本…" />
                </p>
              ) : (
                <>
                  <div className={styles.rows}>
                    {group.members.map((member) => (
                      <div className={styles.row} key={member.id}>
                        <div>
                          <strong>
                            <LanguageLabel code={member.language} />
                          </strong>
                          {member.is_original && (
                            <small>
                              <UiText text="原文" />
                            </small>
                          )}
                          {member.id === id && (
                            <small>
                              <UiText text="当前" />
                            </small>
                          )}
                          <small>
                            <UiText text={translationStatus(member)} />
                          </small>
                        </div>
                        <div>
                          <Button
                            className={styles.manage}
                            disabled={locked}
                            onClick={() =>
                              onNavigate(
                                `/admin/content/${type}/${member.id}/edit`,
                              )
                            }
                          >
                            <UiText text="编辑" />
                          </Button>
                          {member.status === "trash" ? (
                            <Button
                              className={styles.manage}
                              disabled={locked}
                              onClick={() =>
                                void translations.archive(member, true)
                              }
                            >
                              <UiText text="恢复" />
                            </Button>
                          ) : (
                            !member.is_original && (
                              <Button
                                className={styles.manage}
                                disabled={locked}
                                onClick={() =>
                                  setConfirm({ action: "trash", member })
                                }
                              >
                                <UiText text="回收译文" />
                              </Button>
                            )
                          )}
                          {!member.is_original && (
                            <Button
                              className={styles.manage}
                              disabled={locked}
                              onClick={() =>
                                setConfirm({ action: "unlink", member })
                              }
                            >
                              <UiText text="解除关联" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {current?.needs_review && (
                    <div className={styles.create}>
                      <p className={styles.hint}>
                        <UiText text="原文已有更新，请检查这份译文。" />
                      </p>
                      <Button
                        className="admin-button"
                        disabled={locked}
                        onClick={() => void translations.review()}
                      >
                        <UiText text="已核对原文" />
                      </Button>
                    </div>
                  )}
                  {target && (
                    <div className={styles.create}>
                      <Select
                        name="translation-target-language"
                        label="新译文语言"
                        value={target}
                        options={missing.map((code) => ({
                          value: code,
                          label: languageName(catalog, code),
                          flag: catalog.languages.find(
                            (item) => item.code === code,
                          )?.flag,
                        }))}
                        onValueChange={setChosen}
                        disabled={locked}
                      />
                      <label>
                        <Switch
                          aria-label="复制原文作为起点"
                          checked={copy}
                          onCheckedChange={setCopy}
                          disabled={locked}
                        />
                        <UiText text="复制原文作为起点" />
                      </label>
                      <Button
                        className="admin-button admin-button-primary"
                        disabled={locked}
                        onClick={() =>
                          void translations
                            .create(target, copy)
                            .then((result) => {
                              const created = result?.members.find(
                                (member) => member.language === target,
                              );
                              if (created)
                                onNavigate(
                                  `/admin/content/${type}/${created.id}/edit`,
                                );
                            })
                        }
                      >
                        <Icon name="plus" />
                        <UiText text="新建" />
                        {languageName(catalog, target)}
                        <UiText text="译文" />
                      </Button>
                      <Button
                        className="admin-button"
                        disabled={locked}
                        onClick={() => setLinking(target)}
                      >
                        <UiText text="关联已有" />
                        {languageName(catalog, target)}
                        <UiText text="内容" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      )}
      {linking && group && (
        <LinkPicker
          type={type}
          language={linking}
          group={group.id}
          busy={translations.busy}
          error={translations.error}
          onPick={async (target) => Boolean(await translations.link(target))}
          onClose={() => setLinking(null)}
        />
      )}
      {confirm && (
        <ConfirmDialog
          open
          title={
            confirm.action === "unlink"
              ? "解除译文关联？"
              : "将译文移至回收站？"
          }
          description={
            confirm.action === "unlink"
              ? "正文、历史和发布状态保留；这份内容会成为独立的列表条目。"
              : "仅回收这份译文并撤下它的公开版本，其他语言保持。"
          }
          confirmLabel={confirm.action === "unlink" ? "解除关联" : "回收译文"}
          onCancel={() => setConfirm(null)}
          onConfirm={async () =>
            Boolean(
              confirm.action === "unlink"
                ? await translations.unlink(confirm.member.id)
                : await translations.archive(confirm.member, false),
            )
          }
          onConfirmed={() => setConfirm(null)}
          error={translations.error}
        />
      )}
    </>
  );
}
