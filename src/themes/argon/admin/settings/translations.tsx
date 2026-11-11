"use client";

import { useMemo, useState } from "react";
import type {
  TranslationCatalogEntry,
  TranslationChange,
} from "@/core/contracts/settings";
import { useLanguageCatalog, UiText, useT } from "@/core/i18n/provider";
import english from "@/core/i18n/en.json";
import { useTranslationSettings } from "@/core/settings/use-translations";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { Button, Form, TextField } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { Icon } from "../../components/icon";
import { AdminPageHeading } from "../components/page-heading";
import { UnsavedAccountChanges } from "../../account/unsaved";
import { SettingsLayout } from "./section-navigation";
import { SettingsSection } from "./shared";
import styles from "./translations.module.css";

type Scope = "public" | "admin" | "backend";
type Status = "all" | "custom" | "missing" | "fallback" | "stale";
type Item = TranslationCatalogEntry;

const scopes: { value: Scope; label: string; hint: string }[] = [
  {
    value: "public",
    label: "前台界面",
    hint: "访客阅读、搜索、评论和公开组件。",
  },
  {
    value: "admin",
    label: "后台界面",
    hint: "管理页面、表单状态和后台提示。",
  },
  {
    value: "backend",
    label: "API 消息",
    hint: "后端以稳定消息键提供的提示文本。",
  },
];

const frontendCatalog: Item[] = Object.entries(
  english as Record<string, string>,
).map(([source, value]) => ({
  scope: "public",
  key: source,
  owner: "frontend",
  source,
  defaults: { "zh-CN": source, en: value },
}));

function identity(scope: Scope, locale: string, key: string) {
  return `${scope}\0${locale}\0${key}`;
}

function placeholderSignature(value: string) {
  return [...value.matchAll(/(?<!\{)\{([a-zA-Z_]\w*)\}(?!\})/g)]
    .map((match) => match[1])
    .sort()
    .join(",");
}

export function TranslationSettingsPage() {
  const t = useT();
  const languages = useLanguageCatalog();
  const editable = can(useAdminAccount(), "settings:write");
  const editor = useTranslationSettings();
  const [scope, setScope] = useState<Scope>("public");
  const [locale, setLocale] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [page, setPage] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState("");
  const languageOptions = languages.languages
    .filter((item) => item.enabled)
    .map((item) => ({
      value: item.code,
      label: item.name,
      flag: item.flag,
    }));
  const selectedLocale =
    languageOptions.find((item) => item.value === locale)?.value ??
    languageOptions[0]?.value ??
    "zh-CN";
  const selectedLanguage = languages.languages.find(
    (item) => item.code === selectedLocale,
  );
  const fallbackLocale =
    selectedLanguage?.ui_locale ??
    (selectedLocale.toLowerCase().startsWith("en") ? "en" : "zh-CN");
  const catalog = useMemo<Item[]>(() => {
    if (scope === "backend") return editor.saved?.backend_catalog ?? [];
    return frontendCatalog.map((item) => ({ ...item, scope }));
  }, [editor.saved?.backend_catalog, scope]);
  const overrides = useMemo(
    () =>
      new Map(
        (editor.saved?.overrides ?? [])
          .filter(
            (item) => item.scope === scope && item.locale === selectedLocale,
          )
          .map((item) => [item.key, item]),
      ),
    [editor.saved?.overrides, scope, selectedLocale],
  );
  const defaultFor = (item: Item) =>
    item.defaults?.[selectedLocale] ??
    item.defaults?.[fallbackLocale] ??
    item.defaults?.["zh-CN"] ??
    item.defaults?.en ??
    "";
  const needle = search.normalize("NFKC").trim().toLocaleLowerCase();
  const filtered = catalog.filter((item) => {
    const override = overrides.get(item.key);
    const nativeDefault = item.defaults?.[selectedLocale];
    const fallback = defaultFor(item);
    const matchesStatus =
      status === "all"
        ? true
        : status === "custom"
          ? Boolean(override)
          : status === "missing"
            ? !nativeDefault && !override
            : status === "fallback"
              ? !nativeDefault && Boolean(fallback)
              : Boolean(override && override.source !== item.source);
    if (!matchesStatus) return false;
    if (!needle) return true;
    return [item.key, item.source, nativeDefault, override?.value, item.owner]
      .filter((value): value is string => Boolean(value))
      .some((value) =>
        value.normalize("NFKC").toLocaleLowerCase().includes(needle),
      );
  });
  const pageSize = 40;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const draftFor = (item: Item) =>
    drafts[identity(scope, selectedLocale, item.key)] ??
    overrides.get(item.key)?.value ??
    "";
  const setDraft = (item: Item, value: string) => {
    setValidationError("");
    setDrafts((current) => ({
      ...current,
      [identity(scope, selectedLocale, item.key)]: value,
    }));
  };
  const dirtyChanges = useMemo(() => {
    const changes: TranslationChange[] = [];
    for (const [id, value] of Object.entries(drafts)) {
      const [draftScope, draftLocale, ...parts] = id.split("\0");
      const key = parts.join("\0");
      const item = (
        draftScope === "backend"
          ? (editor.saved?.backend_catalog ?? [])
          : frontendCatalog
      ).find((entry) => entry.key === key);
      if (!item) continue;
      const previous =
        editor.saved?.overrides.find(
          (entry) =>
            entry.scope === draftScope &&
            entry.locale === draftLocale &&
            entry.key === key,
        )?.value ?? "";
      if (value.trim() !== previous) {
        changes.push({
          scope: draftScope as Scope,
          locale: draftLocale,
          key,
          source: item.source,
          value: value.trim() || null,
        });
      }
    }
    return changes;
  }, [drafts, editor.saved]);
  const resetDrafts = () => {
    setDrafts({});
  };
  const save = async () => {
    for (const change of dirtyChanges) {
      if (
        change.value &&
        placeholderSignature(change.value) !==
          placeholderSignature(change.source)
      ) {
        setValidationError(
          t("“{source}”的占位符必须与原文一致。", {
            source: change.key,
          }),
        );
        return;
      }
    }
    setValidationError("");
    if (await editor.save(dirtyChanges)) setDrafts({});
  };
  const currentScope = scopes.find((item) => item.value === scope)!;
  return (
    <SettingsLayout fullWidth>
      <UnsavedAccountChanges
        dirty={dirtyChanges.length > 0}
        busy={editor.busy}
      />
      <AdminPageHeading
        title="翻译字符串"
        description="以只读内置语言包为基础，只为当前站点保存差异覆盖。"
      />
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset
          className="admin-settings-form"
          disabled={!editable || editor.busy}
        >
          <SettingsSection
            id="translation-overrides"
            title="翻译覆盖"
            description="筛选已注册的程序文案；留空或恢复默认时使用基础语言包。"
          >
            <div className={styles.workspace}>
              <div className={styles.filters}>
                <div className={styles.filter}>
                  <span className={styles.fieldLabel}>
                    <UiText text="翻译范围" />
                  </span>
                  <Select
                    programOptions
                    name="translation-scope"
                    label="翻译范围"
                    value={scope}
                    options={scopes.map((item) => ({
                      value: item.value,
                      label: item.label,
                    }))}
                    onValueChange={(value) => {
                      setScope(value as Scope);
                      setPage(0);
                    }}
                  />
                </div>
                <div className={styles.filter}>
                  <span className={styles.fieldLabel}>
                    <UiText text="翻译语言" />
                  </span>
                  <Select
                    programOptions
                    name="translation-locale"
                    label="翻译语言"
                    value={selectedLocale}
                    options={languageOptions}
                    onValueChange={(value) => {
                      setLocale(value);
                      setPage(0);
                    }}
                  />
                </div>
                <div className={styles.filter}>
                  <span className={styles.fieldLabel}>
                    <UiText text="翻译状态" />
                  </span>
                  <Select
                    programOptions
                    name="translation-status"
                    label="翻译状态"
                    value={status}
                    options={[
                      { value: "all", label: "全部" },
                      { value: "custom", label: "已自定义" },
                      { value: "missing", label: "未翻译" },
                      { value: "fallback", label: "使用回退" },
                      { value: "stale", label: "原文已变化" },
                    ]}
                    onValueChange={(value) => {
                      setStatus(value as Status);
                      setPage(0);
                    }}
                  />
                </div>
                <div className={styles.filter}>
                  <span className={styles.fieldLabel}>
                    <UiText text="搜索" />
                  </span>
                  <label className="admin-search">
                    <Icon name="search" />
                    <TextField
                      type="search"
                      aria-label="搜索翻译字符串"
                      placeholder="原文、消息键或当前翻译"
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(0);
                      }}
                    />
                  </label>
                </div>
              </div>
              <p className={styles.scopeHint}>
                <UiText text={currentScope.hint} />
                <span>
                  {filtered.length} / {catalog.length}
                </span>
              </p>
              {editor.loading ? (
                <p className={styles.empty} role="status">
                  <UiText text="正在读取翻译设置…" />
                </p>
              ) : rows.length === 0 ? (
                <p className={styles.empty}>
                  <UiText text="没有匹配的翻译字符串。" />
                </p>
              ) : (
                <div className={styles.list}>
                  <div className={styles.columns} aria-hidden="true">
                    <span>
                      <UiText text="原文" />
                    </span>
                    <span>
                      <UiText text="自定义翻译" />
                    </span>
                    <span>
                      <UiText text="状态" />
                    </span>
                  </div>
                  <div className={styles.rows}>
                    {rows.map((item) => {
                      const override = overrides.get(item.key);
                      const value = draftFor(item);
                      const fallback = defaultFor(item);
                      return (
                        <div className={styles.row} key={item.key}>
                          <div className={styles.source}>
                            <strong>{item.source}</strong>
                            <code>{item.key}</code>
                            <span className="admin-badge">{item.owner}</span>
                          </div>
                          <div className={styles.editor}>
                            <TextField
                              aria-label={t("翻译：{source}", {
                                source: item.source,
                              })}
                              value={value}
                              placeholder={
                                fallback
                                  ? t("留空使用：{value}", { value: fallback })
                                  : "暂无基础翻译"
                              }
                              onChange={(event) =>
                                setDraft(item, event.target.value)
                              }
                            />
                            <small>
                              {override ? (
                                <UiText text="正在覆盖基础文本" />
                              ) : fallback ? (
                                <UiText text="当前使用基础文本" />
                              ) : (
                                <UiText text="当前没有可回退的基础文本" />
                              )}
                            </small>
                          </div>
                          <div className={styles.status}>
                            <span
                              className="admin-badge admin-status-badge"
                              data-tone={override ? "positive" : "neutral"}
                            >
                              <Icon name={override ? "check" : "edit"} />
                              {override ? (
                                <UiText text="已自定义" />
                              ) : (
                                <UiText text="基础文本" />
                              )}
                            </span>
                            {override && (
                              <Button
                                className="admin-text-action"
                                onClick={() => setDraft(item, "")}
                              >
                                <UiText text="恢复默认" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className={styles.pagination}>
                <Button
                  className="admin-button"
                  disabled={currentPage === 0}
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                >
                  <Icon name="chevron-left" />
                  <UiText text="上一页" />
                </Button>
                <span>
                  {currentPage + 1} / {pageCount}
                </span>
                <Button
                  className="admin-button"
                  disabled={currentPage + 1 >= pageCount}
                  onClick={() =>
                    setPage((value) => Math.min(pageCount - 1, value + 1))
                  }
                >
                  <UiText text="下一页" />
                  <Icon name="chevron" />
                </Button>
              </div>
            </div>
          </SettingsSection>
        </fieldset>
        {(editor.error || validationError) && (
          <div className="admin-settings-message is-error" role="alert">
            <span>{validationError || editor.error}</span>
            {editor.error && (
              <Button
                className="admin-button"
                onClick={() => void editor.reload()}
              >
                <UiText text="重新读取" />
              </Button>
            )}
          </div>
        )}
        {editor.message && (
          <p className="admin-settings-message" role="status">
            {editor.message}
          </p>
        )}
        <div className="admin-settings-savebar">
          <div>
            <span>
              {dirtyChanges.length
                ? t("有 {count} 项尚未保存", { count: dirtyChanges.length })
                : t("已读取翻译版本 {revision}", {
                    revision: editor.saved?.revision ?? "",
                  })}
            </span>
          </div>
          <div className="admin-settings-actions">
            <Button
              className="admin-button"
              disabled={!dirtyChanges.length || editor.busy}
              onClick={resetDrafts}
            >
              <UiText text="撤销修改" />
            </Button>
            <Button
              className="admin-button admin-button-primary"
              type="submit"
              disabled={!editable || !dirtyChanges.length || editor.busy}
            >
              <Icon name={editor.busy ? "refresh" : "save"} />
              <UiText text={editor.busy ? "正在保存" : "保存更改"} />
            </Button>
          </div>
        </div>
      </Form>
    </SettingsLayout>
  );
}
